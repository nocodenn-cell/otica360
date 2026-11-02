-- ============================================================
-- Ótica360 — Migration 004: RPC transacional de orçamento
-- Espelha 003 para quotes: cria orçamento + itens em uma única
-- transação, revalidando totais e pertencimento de produtos à
-- organização do chamador. SECURITY DEFINER; grants restritos.
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_quote_with_items(
  p_lead_id UUID,
  p_customer_id UUID,
  p_customer_name TEXT,
  p_discount NUMERIC,
  p_status TEXT,
  p_valid_until DATE,
  p_notes TEXT,
  p_items JSONB -- [{product_id, product_name, quantity, unit_price, total}]
)
RETURNS public.quotes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org UUID := public.current_org_id();
  v_role TEXT := public.current_user_role();
  v_subtotal NUMERIC := 0;
  v_total NUMERIC;
  v_quote public.quotes;
  v_item JSONB;
  v_item_row RECORD;
BEGIN
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'sem organização na sessão';
  END IF;
  IF v_role NOT IN ('owner', 'admin', 'operator') THEN
    RAISE EXCEPTION 'papel sem permissão para registrar orçamentos';
  END IF;
  IF p_status NOT IN ('draft', 'sent', 'accepted', 'rejected', 'expired') THEN
    RAISE EXCEPTION 'status de orçamento inválido';
  END IF;
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'o orçamento precisa de pelo menos um item';
  END IF;

  -- lead precisa pertencer à organização da sessão
  SELECT id INTO v_item_row FROM public.leads
    WHERE id = p_lead_id AND organization_id = v_org;
  IF v_item_row IS NULL THEN
    RAISE EXCEPTION 'lead fora da organização';
  END IF;

  IF p_customer_id IS NOT NULL THEN
    SELECT id INTO v_item_row FROM public.customers
      WHERE id = p_customer_id AND organization_id = v_org;
    IF v_item_row IS NULL THEN
      RAISE EXCEPTION 'cliente fora da organização';
    END IF;
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    IF (v_item->>'quantity')::INT <= 0
       OR (v_item->>'unit_price')::NUMERIC < 0
       OR abs(((v_item->>'quantity')::INT * (v_item->>'unit_price')::NUMERIC)
              - (v_item->>'total')::NUMERIC) > 0.01
       OR (v_item->>'total')::NUMERIC < 0 THEN
      RAISE EXCEPTION 'item de orçamento inválido';
    END IF;
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

  INSERT INTO public.quotes (
    organization_id, lead_id, customer_id, customer_name,
    subtotal, discount, total, status, valid_until, notes
  )
  VALUES (
    v_org, p_lead_id, p_customer_id, p_customer_name,
    v_subtotal, p_discount, v_total, p_status, p_valid_until, p_notes
  )
  RETURNING * INTO v_quote;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO public.quote_items (
      quote_id, product_id, product_name, quantity, unit_price, total
    )
    VALUES (
      v_quote.id,
      NULLIF(v_item->>'product_id', '')::UUID,
      v_item->>'product_name',
      (v_item->>'quantity')::INT,
      (v_item->>'unit_price')::NUMERIC,
      (v_item->>'total')::NUMERIC
    );
  END LOOP;

  INSERT INTO public.audit_logs (organization_id, user_id, action, entity, entity_id, details)
  VALUES (v_org, auth.uid(), 'CREATE', 'quote', v_quote.id,
          jsonb_build_object('total', v_total, 'status', p_status));

  RETURN v_quote;
END;
$$;

REVOKE ALL ON FUNCTION public.create_quote_with_items(UUID, UUID, TEXT, NUMERIC, TEXT, DATE, TEXT, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_quote_with_items(UUID, UUID, TEXT, NUMERIC, TEXT, DATE, TEXT, JSONB) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_quote_with_items(UUID, UUID, TEXT, NUMERIC, TEXT, DATE, TEXT, JSONB) TO authenticated;
