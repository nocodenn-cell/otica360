-- ============================================================
-- Ótica360 — Verificação de isolamento multiempresa (RLS)
-- Onde rodar: SQL editor do projeto de HOMOLOGAÇÃO ou psql local
-- (supabase db reset já aplicou 001→002→003). NUNCA produção.
--
-- Toda a suíte roda em uma transação e termina com ROLLBACK:
-- nada persiste. Qualquer violação de isolamento faz RAISE e
-- derruba a suíte. Sucesso = NOTICEs "OK:" sem exceções.
--
-- Impersonação: SET LOCAL ROLE authenticated +
-- request.jwt.claims com o 'sub' do usuário testado; auth.uid()
-- do Supabase lê exatamente esse claim.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. CENÁRIO: duas organizações, donos separados, dados exclusivos
-- ------------------------------------------------------------

INSERT INTO public.organizations (id, name) VALUES
  ('11111111-1111-1111-1111-111111111111', 'RLS Test Org A'),
  ('22222222-2222-2222-2222-222222222222', 'RLS Test Org B');

-- auth.users sem metadata de org: o trigger handle_new_user não
-- cria profile (comportamento esperado); criamos os perfis abaixo.
INSERT INTO auth.users (id, aud, role, email) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'rls-a@test.local'),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'rls-b@test.local'),
  ('eeeeeeee-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'rls-op-a@test.local');

INSERT INTO public.profiles (id, organization_id, name, email, role) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Owner A', 'rls-a@test.local', 'owner'),
  ('bbbbbbbb-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'Owner B', 'rls-b@test.local', 'owner'),
  ('eeeeeeee-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Operador A', 'rls-op-a@test.local', 'operator');

INSERT INTO public.products (id, organization_id, name, category, price) VALUES
  ('f0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Óculos A', 'frames', 150),
  ('f0000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'Óculos B', 'frames', 250);

INSERT INTO public.customers (id, organization_id, name, phone) VALUES
  ('cccccccc-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Cliente da A', '11000000001'),
  ('cccccccc-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'Cliente da B', '11000000002');

INSERT INTO public.sales (id, organization_id, number, customer_name, sale_date, subtotal, total, status) VALUES
  ('dddddddd-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '9001', 'Cliente da A', CURRENT_DATE, 100, 100, 'completed'),
  ('dddddddd-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', '9002', 'Cliente da B', CURRENT_DATE, 200, 200, 'completed');

-- ------------------------------------------------------------
-- 2. COMO OWNER DA ORG A: visibilidade restrita à própria org
-- ------------------------------------------------------------

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  json_build_object('sub', 'aaaaaaaa-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);

DO $$
DECLARE n INT; v NUMERIC;
BEGIN
  SELECT count(*) INTO n FROM public.customers;
  IF n <> 1 THEN RAISE EXCEPTION 'FALHA RLS: A viu % clientes, esperava 1 (só o seu)', n; END IF;

  SELECT count(*) INTO n FROM public.sales;
  IF n <> 1 THEN RAISE EXCEPTION 'FALHA RLS: A viu % vendas, esperava 1', n; END IF;

  SELECT count(*) INTO n FROM public.products;
  IF n <> 1 THEN RAISE EXCEPTION 'FALHA RLS: A viu % produtos, esperava 1', n; END IF;

  SELECT count(*) INTO n FROM public.profiles;
  IF n <> 2 THEN RAISE EXCEPTION 'FALHA RLS: A viu % perfis, esperava 2 (owner+operador da A)', n; END IF;

  SELECT count(*) INTO n FROM public.organizations;
  IF n <> 1 THEN RAISE EXCEPTION 'FALHA RLS: A viu % organizações, esperava 1', n; END IF;

  -- linha da outra org é invisível em SELECT (0 linhas, não erro):
  PERFORM 1 FROM public.customers WHERE id = 'cccccccc-0000-0000-0000-000000000002';
  IF FOUND THEN RAISE EXCEPTION 'FALHA RLS: A leu cliente da org B'; END IF;

  -- views agregadas com security_invoker não vazam a outra org:
  SELECT count(*) INTO n FROM public.v_monthly_revenue;
  IF n <> 1 THEN RAISE EXCEPTION 'FALHA RLS: v_monthly_revenue retornou % linhas (vazamento?)', n; END IF;

  SELECT COALESCE(sum(total_revenue), 0) INTO v FROM public.v_monthly_revenue;
  IF v <> 100 THEN RAISE EXCEPTION 'FALHA RLS: receita da A deveria ser 100, veio %', v; END IF;

  RAISE NOTICE 'OK: leitura da org A isolada (clientes/vendas/produtos/perfis/views)';
END $$;

-- ------------------------------------------------------------
-- 3. COMO A: escritas cruzadas e escaladas devem FALHAR
-- ------------------------------------------------------------

DO $$
DECLARE n INT;
BEGIN
  -- INSERT em org alheia → RLS WITH CHECK → insufficient_privilege
  BEGIN
    INSERT INTO public.customers (organization_id, name, phone)
    VALUES ('22222222-2222-2222-2222-222222222222', 'Invasor', '11999999999');
    RAISE EXCEPTION 'FALHA RLS: inserção em org alheia foi permitida';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'OK: insert cross-org bloqueado (42501)';
  END;

  -- Tentativa de mover cliente próprio para a org B → WITH CHECK
  BEGIN
    UPDATE public.customers SET organization_id = '22222222-2222-2222-2222-222222222222'
    WHERE id = 'cccccccc-0000-0000-0000-000000000001';
    RAISE EXCEPTION 'FALHA RLS: migração de cliente para outra org foi permitida';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'OK: mudança de org em cliente bloqueada (42501)';
  END;

  -- UPDATE em linha alheia: 0 linhas afetadas (USING esconde o alvo)
  UPDATE public.customers SET name = 'Hijack' WHERE id = 'cccccccc-0000-0000-0000-000000000002';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN RAISE EXCEPTION 'FALHA RLS: A atualizou cliente da org B'; END IF;
  RAISE NOTICE 'OK: update em linha alheia não afeta nenhuma linha';

  -- DELETE em linha alheia: idem, 0 linhas
  DELETE FROM public.sales WHERE id = 'dddddddd-0000-0000-0000-000000000002';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN RAISE EXCEPTION 'FALHA RLS: A apagou venda da org B'; END IF;
  RAISE NOTICE 'OK: delete em linha alheia não afeta nenhuma linha';

  -- dono não muda o próprio papel (trigger enforce_profile_changes)
  BEGIN
    UPDATE public.profiles SET role = 'operator'
    WHERE id = 'aaaaaaaa-0000-0000-0000-000000000001';
    RAISE EXCEPTION 'FALHA: usuário alterou o próprio papel';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE '%papel%' THEN RAISE; END IF;
    RAISE NOTICE 'OK: auto-alteração de papel bloqueada';
  END;

  -- org do profile é imutável
  BEGIN
    UPDATE public.profiles SET organization_id = '22222222-2222-2222-2222-222222222222'
    WHERE id = 'eeeeeeee-0000-0000-0000-000000000001';
    RAISE EXCEPTION 'FALHA: perfil migrou de organização';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE '%imut%' THEN RAISE; END IF;
    RAISE NOTICE 'OK: organização do profile é imutável';
  END;

  -- log_audit rejeita org divergente da sessão
  BEGIN
    PERFORM public.log_audit('22222222-2222-2222-2222-222222222222', 'X', 'customers', NULL);
    RAISE EXCEPTION 'FALHA: log_audit aceitou org divergente';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE '%divergente%' THEN RAISE; END IF;
    RAISE NOTICE 'OK: log_audit valida org da sessão';
  END;

  -- log_audit com a própria org funciona (escrita via função definer)
  PERFORM public.log_audit('11111111-1111-1111-1111-111111111111', 'TEST', 'customers',
    'cccccccc-0000-0000-0000-000000000001');
  SELECT count(*) INTO n FROM public.audit_logs WHERE action = 'TEST';
  IF n <> 1 THEN RAISE EXCEPTION 'FALHA: log_audit legítimo não gravou (linhas=%)', n; END IF;
  RAISE NOTICE 'OK: trilha de auditoria gravada para a própria org';
END $$;

-- ------------------------------------------------------------
-- 4. COMO A: RPC transacional create_sale_with_items
-- ------------------------------------------------------------

DO $$
DECLARE v_sale public.sales; n INT; d DATE;
BEGIN
  v_sale := public.create_sale_with_items(
    'cccccccc-0000-0000-0000-000000000001', 'Cliente da A', CURRENT_DATE,
    10, 'pix', 'store', 'Owner A', 'teste rls',
    '[{"product_id":"f0000000-0000-0000-0000-000000000001","product_name":"Óculos A",
      "quantity":2,"unit_price":150,"discount":0,"total":300}]'::jsonb);

  IF v_sale.total <> 290 THEN RAISE EXCEPTION 'FALHA RPC: total deveria ser 290, veio %', v_sale.total; END IF;

  SELECT count(*) INTO n FROM public.sale_items WHERE sale_id = v_sale.id;
  IF n <> 1 THEN RAISE EXCEPTION 'FALHA RPC: item não gravado junto da venda'; END IF;

  SELECT last_purchase_date INTO d FROM public.customers
   WHERE id = 'cccccccc-0000-0000-0000-000000000001';
  IF d IS NULL THEN RAISE EXCEPTION 'FALHA RPC: cliente não recebeu last_purchase_date'; END IF;

  RAISE NOTICE 'OK: venda + item + cliente + auditoria gravados atomicamente (número %)', v_sale.number;

  -- item com produto de OUTRA org deve falhar (revalidação server-side)
  BEGIN
    PERFORM public.create_sale_with_items(
      'cccccccc-0000-0000-0000-000000000001', 'Cliente da A', CURRENT_DATE,
      0, 'pix', 'store', 'Owner A', 'ataque',
      '[{"product_id":"f0000000-0000-0000-0000-000000000002","product_name":"Óculos B",
        "quantity":1,"unit_price":250,"discount":0,"total":250}]'::jsonb);
    RAISE EXCEPTION 'FALHA RPC: venda aceitou produto de outra org';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE '%fora da%' THEN RAISE; END IF;
    RAISE NOTICE 'OK: RPC rejeita produto de outra org';
  END;

  -- total do item inconsistente (fraude de cliente) deve falhar
  BEGIN
    PERFORM public.create_sale_with_items(
      'cccccccc-0000-0000-0000-000000000001', 'Cliente da A', CURRENT_DATE,
      0, 'pix', 'store', 'Owner A', 'fraude',
      '[{"product_id":"f0000000-0000-0000-0000-000000000001","product_name":"Óculos A",
        "quantity":1,"unit_price":150,"discount":0,"total":1}]'::jsonb);
    RAISE EXCEPTION 'FALHA RPC: total de item inconsistente foi aceito';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE '%item de venda%' THEN RAISE; END IF;
    RAISE NOTICE 'OK: RPC revalida totais dos itens (anti-fraude)';
  END;
END $$;

-- ------------------------------------------------------------
-- 5. COMO OPERADOR DA ORG A: sem delete, sem alterar valores
-- ------------------------------------------------------------

SELECT set_config('request.jwt.claims',
  json_build_object('sub', 'eeeeeeee-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);

DO $$
DECLARE n INT;
BEGIN
  -- DELETE exige admin: 0 linhas para o operador
  DELETE FROM public.customers WHERE id = 'cccccccc-0000-0000-0000-000000000001';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN RAISE EXCEPTION 'FALHA RLS: operador excluiu cliente (delete é admin+)'; END IF;
  RAISE NOTICE 'OK: delete bloqueado para operador';

  -- operador pode mudar status, mas NÃO valores (trigger enforce_sales_values)
  UPDATE public.sales SET status = 'pending'
   WHERE id = 'dddddddd-0000-0000-0000-000000000001';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'FALHA: operador não conseguiu atualizar status (esperado)'; END IF;

  BEGIN
    UPDATE public.sales SET total = 1
     WHERE id = 'dddddddd-0000-0000-0000-000000000001';
    RAISE EXCEPTION 'FALHA: operador alterou valores da venda';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE '%alterar valores da venda%' THEN RAISE; END IF;
    RAISE NOTICE 'OK: valores de venda protegidos contra operador';
  END;
END $$;

-- ------------------------------------------------------------
-- 6. COMO OWNER DA ORG B: só enxerga o próprio mundo
-- ------------------------------------------------------------

SELECT set_config('request.jwt.claims',
  json_build_object('sub', 'bbbbbbbb-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);

DO $$
DECLARE n INT; v NUMERIC;
BEGIN
  SELECT count(*) INTO n FROM public.customers;
  IF n <> 1 THEN RAISE EXCEPTION 'FALHA RLS: B viu % clientes, esperava 1', n; END IF;

  SELECT count(*) INTO n FROM public.sales;
  IF n <> 1 THEN RAISE EXCEPTION 'FALHA RLS: B viu % vendas, esperava 1', n; END IF;

  SELECT count(*) INTO n FROM public.audit_logs;
  IF n <> 0 THEN RAISE EXCEPTION 'FALHA RLS: B viu auditoria da org A (% linhas)', n; END IF;

  SELECT COALESCE(sum(total_revenue), 0) INTO v FROM public.v_monthly_revenue;
  IF v <> 200 THEN RAISE EXCEPTION 'FALHA RLS: receita de B deveria ser 200, veio %', v; END IF;

  RAISE NOTICE 'OK: org B isolada da org A (inclusive auditoria e views)';
END $$;

ROLLBACK; -- nada persiste; para inspeção manual troque por COMMIT com cuidado
