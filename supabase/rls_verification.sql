-- ============================================================
-- Ótica360 — Verificação de isolamento multiempresa (RLS)
-- Onde rodar: SQL editor do projeto de HOMOLOGAÇÃO (nunca produção).
-- O script todo roda em uma transação e termina com ROLLBACK,
-- então nada persiste. Qualquer acesso cruzado faz RAISE e falha.
--
-- auth.uid() do Supabase lê request.jwt.claims; impersonamos cada
-- usuário com set_config(local) antes das asserções.
-- ============================================================

BEGIN;

-- 1. Cenário: duas organizações, um owner cada, dados exclusivos.
INSERT INTO public.organizations (id, name) VALUES
  ('11111111-1111-1111-1111-111111111111', 'RLS Test Org A'),
  ('22222222-2222-2222-2222-222222222222', 'RLS Test Org B');

INSERT INTO auth.users (id, email) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', 'rls-a@test.local'),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'rls-b@test.local');

-- handle_new_user criaria os profiles; criamos direto para o teste.
INSERT INTO public.profiles (id, organization_id, name, email, role) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Owner A', 'rls-a@test.local', 'owner'),
  ('bbbbbbbb-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'Owner B', 'rls-b@test.local', 'owner');

INSERT INTO public.customers (id, organization_id, name, phone) VALUES
  ('cccccccc-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Cliente da A', '11000000001'),
  ('cccccccc-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'Cliente da B', '11000000002');

INSERT INTO public.sales (id, organization_id, number, customer_name, sale_date, subtotal, total, status) VALUES
  ('dddddddd-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '9001', 'Cliente da A', CURRENT_DATE, 100, 100, 'completed'),
  ('dddddddd-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', '9002', 'Cliente da B', CURRENT_DATE, 200, 200, 'completed');

-- 2. Impersona usuário da ORG A
SELECT set_config('role', 'authenticated', true);
SELECT set_config('request.jwt.claims',
  json_build_object('sub', 'aaaaaaaa-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);

DO $$
DECLARE n INT;
BEGIN
  SELECT count(*) INTO n FROM public.customers;
  IF n <> 1 THEN RAISE EXCEPTION 'FALHA RLS: A deveria ver exatamente 1 cliente, viu %', n; END IF;

  SELECT count(*) INTO n FROM public.sales;
  IF n <> 1 THEN RAISE EXCEPTION 'FALHA RLS: A deveria ver exatamente 1 venda, viu %', n; END IF;

  SELECT count(*) INTO n FROM public.organizations;
  IF n <> 1 THEN RAISE EXCEPTION 'FALHA RLS: A deveria ver 1 organização, viu %', n; END IF;

  -- Views agregadas respeitam security_invoker:
  SELECT count(*) INTO n FROM public.v_monthly_revenue;
  IF n <> 1 THEN RAISE EXCEPTION 'FALHA RLS: v_monthly_revenue vaza outra org (linhas=%)', n; END IF;

  SELECT COALESCE(sum(total_revenue), 0) INTO n FROM public.v_monthly_revenue;
  IF n <> 100 THEN RAISE EXCEPTION 'FALHA RLS: receita da A deveria ser 100, veio %', n; END IF;
END $$;

-- 3. Ações cruzadas devem FALHAR
DO $$
BEGIN
  BEGIN
    INSERT INTO public.customers (organization_id, name, phone)
    VALUES ('22222222-2222-2222-2222-222222222222', 'Invasor', '11999999999');
    RAISE EXCEPTION 'FALHA RLS: inserção em org alheia foi permitida';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL; -- esperado
  END;

  BEGIN
    UPDATE public.customers SET organization_id = '22222222-2222-2222-2222-222222222222'
    WHERE id = 'cccccccc-0000-0000-0000-000000000001';
    RAISE EXCEPTION 'FALHA RLS: migração de cliente para outra org foi permitida';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  BEGIN
    UPDATE public.profiles SET role = 'admin'
    WHERE id = 'aaaaaaaa-0000-0000-0000-000000000001';
    RAISE EXCEPTION 'FALHA: usuário alterou o próprio papel';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%pr%C3%B3prio papel%' AND SQLERRM NOT LIKE '%prop%' THEN RAISE; END IF;
  END;

  BEGIN
    SELECT public.log_audit('22222222-2222-2222-2222-222222222222', 'X', 'customers', NULL);
    RAISE EXCEPTION 'FALHA: log_audit aceitou org divergente';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%divergente%' THEN RAISE; END IF;
  END;

  -- SELECT de linha alheia: invisível (0 linhas), não erro
  PERFORM 1 FROM public.customers WHERE id = 'cccccccc-0000-0000-0000-000000000002';
  IF FOUND THEN RAISE EXCEPTION 'FALHA RLS: A leu cliente da B'; END IF;
END $$;

-- 4. Repete o essencial impersonando a ORG B
SELECT set_config('request.jwt.claims',
  json_build_object('sub', 'bbbbbbbb-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);

DO $$
DECLARE n INT;
BEGIN
  SELECT count(*) INTO n FROM public.customers;
  IF n <> 1 THEN RAISE EXCEPTION 'FALHA RLS: B deveria ver 1 cliente, viu %', n; END IF;
  SELECT count(*) INTO n FROM public.sales;
  IF n <> 1 THEN RAISE EXCEPTION 'FALHA RLS: B deveria ver 1 venda, viu %', n; END IF;
END $$;

ROLLBACK; -- nada persiste; para inspeção manual troque por COMMIT com cuidado
