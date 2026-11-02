-- ============================================================
-- Ótica360 — Migration 003: RPC transacional de venda
-- Registra venda + itens + atualização do cliente em uma única
-- transação. SECURITY DEFINER executa como dono e valida a
-- organização pela sessão; nunca aceita org arbitrária.
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_sale_with_items(
  p_customer_id UUID,
  p_customer_name TEXT,
  p_sale_date DATE,
  p_discount NUMERIC,
  p_payment_method TEXT,
  p_origin TEXT,
  p_responsible TEXT,
  p_notes TEXT,
  p_items JSONB -- [{product_id, product_name, quantity, unit_price, discount, total}]
)
RETURNS public.sales
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org UUID := public.current_org_id();
  v_role TEXT := public.current_user_role();
  v_number TEXT;
  v_subtotal NUMERIC := 0;
  v_total NUMERIC;
  v_sale public.sales;
  v_item JSONB;
  v_item_row RECORD;
BEGIN
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'sem organização na sessão';
  END IF;
  IF v_role NOT IN ('owner', 'admin', 'operator') THEN
    RAISE EXCEPTION 'papel sem permissão para registrar vendas';
  END IF;
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'a venda precisa de pelo menos um item';
  END IF;

  -- Revalidação server-side dos itens (nunca confiar no cliente)
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    IF (v_item->>'quantity')::INT <= 0
       OR (v_item->>'unit_price')::NUMERIC < 0
       OR COALESCE((v_item->>'discount')::NUMERIC, 0) < 0
       OR abs(((v_item->>'quantity')::INT * (v_item->>'unit_price')::NUMERIC
               - COALESCE((v_item->>'discount')::NUMERIC, 0))
              - (v_item->>'total')::NUMERIC) > 0.01
       OR (v_item->>'total')::NUMERIC < 0 THEN
      RAISE EXCEPTION 'item de venda inválido';
    END IF;
    -- produto, se informado, precisa pertencer à organização
    IF (v_item->>'product_id') IS NOT NULL THEN
      SELECT id INTO v_item_row FROM public.products
        WHERE id = (v_item->>'product_id')::UUID AND organization_id = v_org;
      IF v_item_row IS NULL THEN
        RAISE EXCEPTION 'produto fora da organização';
      END IF;
    END IF;
    v_subtotal := v_subtotal + (v_item->>'total')::NUMERIC;
  END LOOP;

  IF p_discount < 0 OR p_discount > v_subtotal THEN
    RAISE EXCEPTION 'desconto inválido';
  END IF;
  v_total := GREATEST(v_subtotal - p_discount, 0);

  -- número sequencial por organização: max existente + 1
  SELECT COALESCE(MAX(number::INT), 0) + 1 INTO v_number
    FROM public.sales WHERE organization_id = v_org AND number ~ '^[0-9]+$';

  INSERT INTO public.sales (
    organization_id, number, customer_id, customer_name, sale_date,
    subtotal, discount, total, payment_method, origin, responsible, notes, created_by
  )
  VALUES (
    v_org, v_number::TEXT, p_customer_id, p_customer_name, p_sale_date,
    v_subtotal, p_discount, v_total, p_payment_method, p_origin, p_responsible, p_notes, auth.uid()
  )
  RETURNING * INTO v_sale;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO public.sale_items (
      sale_id, product_id, product_name, quantity, unit_price, discount, total
    )
    VALUES (
      v_sale.id,
      NULLIF(v_item->>'product_id', '')::UUID,
      v_item->>'product_name',
      (v_item->>'quantity')::INT,
      (v_item->>'unit_price')::NUMERIC,
      COALESCE((v_item->>'discount')::NUMERIC, 0),
      (v_item->>'total')::NUMERIC
    );
  END LOOP;

  UPDATE public.customers
     SET last_purchase_date = p_sale_date, updated_at = NOW()
   WHERE id = p_customer_id AND organization_id = v_org;

  INSERT INTO public.audit_logs (organization_id, user_id, action, entity, entity_id, details)
  VALUES (v_org, auth.uid(), 'CREATE', 'sale', v_sale.id, jsonb_build_object('number', v_sale.number, 'total', v_total));

  RETURN v_sale;
END;
$$;

REVOKE ALL ON FUNCTION public.create_sale_with_items(UUID, TEXT, DATE, NUMERIC, TEXT, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_sale_with_items(UUID, TEXT, DATE, NUMERIC, TEXT, TEXT, TEXT, TEXT, JSONB) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_sale_with_items(UUID, TEXT, DATE, NUMERIC, TEXT, TEXT, TEXT, TEXT, JSONB) TO authenticated;
