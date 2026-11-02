-- ============================================================
-- Ótica360 — Migration 002: correção de RLS e isolamento multiempresa
-- Revisão: Sprint 05 (Etapa 3)
--
-- Corrige falhas da 001:
--  1. Políticas de profiles consultavam profiles sob RLS → recursão.
--     Agora: funções auxiliares SECURITY DEFINER + search_path fixo.
--  2. Políticas FOR ALL sem WITH CHECK → permitiam mover linha de
--     organização (escalada). Agora: org imutável em toda UPDATE.
--  3. Admin podia alterar o próprio role /organization_id. Agora:
--     trigger enforce_profile_changes (owner altera role de OUTROS;
--     organização é sempre imutável).
--  4. Views agregavam dados de todas as orgs (dono da view bypassa
--     RLS). Agora: security_invoker = true.
--  5. log_audit era SECURITY DEFINER executável por qualquer um com
--     org arbitrária. Agora: valida corrente + search_path + grants.
--  6. Papéis coerentes com a UI: viewer somente leitura; operator
--     cria/edita; admin também exclui; owner administra membros.
--  7. Onboarding de usuários: trigger handle_new_user cria profile a
--     partir do metadata definido por admin/service_role no convite.
-- ============================================================

-- ------------------------------------------------------------
-- FUNÇÕES AUXILIARES (SECURITY DEFINER, sem recursão de RLS)
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_org_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(public.current_user_role() IN ('owner', 'admin'), false);
$$;

CREATE OR REPLACE FUNCTION public.is_org_owner()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(public.current_user_role() = 'owner', false);
$$;

REVOKE ALL ON FUNCTION public.current_org_id(), public.current_user_role(),
  public.is_org_admin(), public.is_org_owner() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_org_id(), public.current_user_role(),
  public.is_org_admin(), public.is_org_owner() TO authenticated;

-- ------------------------------------------------------------
-- DROPA DAS POLÍTICAS INSEGURAS DA 001
-- ------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view their organization" ON public.organizations;
DROP POLICY IF EXISTS "Users can view profiles in their org" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage profiles in their org" ON public.profiles;
DROP POLICY IF EXISTS "Org members can view customers" ON public.customers;
DROP POLICY IF EXISTS "Org members can insert customers" ON public.customers;
DROP POLICY IF EXISTS "Org members can update customers" ON public.customers;
DROP POLICY IF EXISTS "Admins can delete customers" ON public.customers;
DROP POLICY IF EXISTS "Org members can view products" ON public.products;
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
DROP POLICY IF EXISTS "Org members can view sales" ON public.sales;
DROP POLICY IF EXISTS "Org members can insert sales" ON public.sales;
DROP POLICY IF EXISTS "Admins can update sales" ON public.sales;
DROP POLICY IF EXISTS "Org members can view sale items" ON public.sale_items;
DROP POLICY IF EXISTS "Org members can insert sale items" ON public.sale_items;
DROP POLICY IF EXISTS "Org members can view leads" ON public.leads;
DROP POLICY IF EXISTS "Org members can manage leads" ON public.leads;
DROP POLICY IF EXISTS "Org members can view quotes" ON public.quotes;
DROP POLICY IF EXISTS "Org members can manage quotes" ON public.quotes;
DROP POLICY IF EXISTS "Org members can view quote items" ON public.quote_items;
DROP POLICY IF EXISTS "Org members can insert quote items" ON public.quote_items;
DROP POLICY IF EXISTS "Org members can view follow-ups" ON public.follow_up_tasks;
DROP POLICY IF EXISTS "Org members can manage follow-ups" ON public.follow_up_tasks;
DROP POLICY IF EXISTS "Org members can view templates" ON public.message_templates;
DROP POLICY IF EXISTS "Admins can manage templates" ON public.message_templates;
DROP POLICY IF EXISTS "Org members can view messages" ON public.message_events;
DROP POLICY IF EXISTS "Org members can insert messages" ON public.message_events;
DROP POLICY IF EXISTS "Org members can view campaigns" ON public.marketing_campaigns;
DROP POLICY IF EXISTS "Admins can manage campaigns" ON public.marketing_campaigns;
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;

-- ------------------------------------------------------------
-- ORGANIZATIONS
-- Membros leem a própria org; admins editam configurações da própria
-- org; criação/exclusão de org: apenas service_role (console/API),
-- nunca via anon. Isso mantém o cadastro de nova ótica fora do app.
-- ------------------------------------------------------------

CREATE POLICY org_select ON public.organizations
  FOR SELECT TO authenticated
  USING (id = public.current_org_id());

CREATE POLICY org_update_admin ON public.organizations
  FOR UPDATE TO authenticated
  USING (id = public.current_org_id() AND public.is_org_admin())
  WITH CHECK (id = public.current_org_id());

-- ------------------------------------------------------------
-- PROFILES
-- ------------------------------------------------------------

CREATE POLICY profiles_select ON public.profiles
  FOR SELECT TO authenticated
  USING (organization_id = public.current_org_id());

CREATE POLICY profiles_insert_admin ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.current_org_id()
    AND public.is_org_admin()
    AND role IN ('owner', 'admin', 'operator', 'viewer')
  );

CREATE POLICY profiles_update ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    organization_id = public.current_org_id()
    AND (id = auth.uid() OR public.is_org_admin())
  )
  WITH CHECK (organization_id = public.current_org_id());

-- Trigger: organização do perfil é imutável; só owner altera papéis;
-- ninguém altera o próprio papel.
CREATE OR REPLACE FUNCTION public.enforce_profile_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
    RAISE EXCEPTION 'organization_id de profile é imutável';
  END IF;
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF NEW.id = auth.uid() THEN
      RAISE EXCEPTION 'não é possível alterar o próprio papel';
    END IF;
    IF NOT public.is_org_owner() THEN
      RAISE EXCEPTION 'apenas o owner pode alterar papéis';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_profiles_enforce_changes ON public.profiles;
CREATE TRIGGER trigger_profiles_enforce_changes
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_profile_changes();

-- ------------------------------------------------------------
-- TABELAS COMUNS (customers, products, leads, quotes, follow_up_tasks,
-- message_events): leitura para todos os membros; escrita para
-- operator+; exclusão para admin+. Org sempre imutável no WITH CHECK.
-- ------------------------------------------------------------

CREATE POLICY customers_select ON public.customers FOR SELECT TO authenticated
  USING (organization_id = public.current_org_id());
CREATE POLICY customers_insert ON public.customers FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.current_org_id() AND public.current_user_role() IN ('owner','admin','operator'));
CREATE POLICY customers_update ON public.customers FOR UPDATE TO authenticated
  USING (organization_id = public.current_org_id() AND public.current_user_role() IN ('owner','admin','operator'))
  WITH CHECK (organization_id = public.current_org_id());
CREATE POLICY customers_delete ON public.customers FOR DELETE TO authenticated
  USING (organization_id = public.current_org_id() AND public.is_org_admin());

CREATE POLICY products_select ON public.products FOR SELECT TO authenticated
  USING (organization_id = public.current_org_id());
CREATE POLICY products_insert ON public.products FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.current_org_id() AND public.current_user_role() IN ('owner','admin','operator'));
CREATE POLICY products_update ON public.products FOR UPDATE TO authenticated
  USING (organization_id = public.current_org_id() AND public.current_user_role() IN ('owner','admin','operator'))
  WITH CHECK (organization_id = public.current_org_id());
CREATE POLICY products_delete ON public.products FOR DELETE TO authenticated
  USING (organization_id = public.current_org_id() AND public.is_org_admin());

CREATE POLICY leads_select ON public.leads FOR SELECT TO authenticated
  USING (organization_id = public.current_org_id());
CREATE POLICY leads_insert ON public.leads FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.current_org_id() AND public.current_user_role() IN ('owner','admin','operator'));
CREATE POLICY leads_update ON public.leads FOR UPDATE TO authenticated
  USING (organization_id = public.current_org_id() AND public.current_user_role() IN ('owner','admin','operator'))
  WITH CHECK (organization_id = public.current_org_id());
CREATE POLICY leads_delete ON public.leads FOR DELETE TO authenticated
  USING (organization_id = public.current_org_id() AND public.is_org_admin());

CREATE POLICY quotes_select ON public.quotes FOR SELECT TO authenticated
  USING (organization_id = public.current_org_id());
CREATE POLICY quotes_insert ON public.quotes FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.current_org_id() AND public.current_user_role() IN ('owner','admin','operator'));
CREATE POLICY quotes_update ON public.quotes FOR UPDATE TO authenticated
  USING (organization_id = public.current_org_id() AND public.current_user_role() IN ('owner','admin','operator'))
  WITH CHECK (organization_id = public.current_org_id());
CREATE POLICY quotes_delete ON public.quotes FOR DELETE TO authenticated
  USING (organization_id = public.current_org_id() AND public.is_org_admin());

CREATE POLICY followups_select ON public.follow_up_tasks FOR SELECT TO authenticated
  USING (organization_id = public.current_org_id());
CREATE POLICY followups_insert ON public.follow_up_tasks FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.current_org_id() AND public.current_user_role() IN ('owner','admin','operator'));
CREATE POLICY followups_update ON public.follow_up_tasks FOR UPDATE TO authenticated
  USING (organization_id = public.current_org_id() AND public.current_user_role() IN ('owner','admin','operator'))
  WITH CHECK (organization_id = public.current_org_id());
CREATE POLICY followups_delete ON public.follow_up_tasks FOR DELETE TO authenticated
  USING (organization_id = public.current_org_id() AND public.is_org_admin());

CREATE POLICY message_events_select ON public.message_events FOR SELECT TO authenticated
  USING (organization_id = public.current_org_id());
CREATE POLICY message_events_insert ON public.message_events FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.current_org_id() AND public.current_user_role() IN ('owner','admin','operator'));
CREATE POLICY message_events_update ON public.message_events FOR UPDATE TO authenticated
  USING (organization_id = public.current_org_id() AND public.current_user_role() IN ('owner','admin','operator'))
  WITH CHECK (organization_id = public.current_org_id());
CREATE POLICY message_events_delete ON public.message_events FOR DELETE TO authenticated
  USING (organization_id = public.current_org_id() AND public.is_org_admin());

-- ------------------------------------------------------------
-- SALES: operator registra e atualiza status; admin+ exclui/cancela
-- valores sensíveis. Trigger impede operator de alterar valores.
-- ------------------------------------------------------------

CREATE POLICY sales_select ON public.sales FOR SELECT TO authenticated
  USING (organization_id = public.current_org_id());
CREATE POLICY sales_insert ON public.sales FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.current_org_id() AND public.current_user_role() IN ('owner','admin','operator'));
CREATE POLICY sales_update ON public.sales FOR UPDATE TO authenticated
  USING (organization_id = public.current_org_id() AND public.current_user_role() IN ('owner','admin','operator'))
  WITH CHECK (organization_id = public.current_org_id());
CREATE POLICY sales_delete ON public.sales FOR DELETE TO authenticated
  USING (organization_id = public.current_org_id() AND public.is_org_admin());

CREATE OR REPLACE FUNCTION public.enforce_sales_values()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_org_admin()
     AND (NEW.subtotal IS DISTINCT FROM OLD.subtotal
          OR NEW.discount IS DISTINCT FROM OLD.discount
          OR NEW.total IS DISTINCT FROM OLD.total
          OR NEW.payment_method IS DISTINCT FROM OLD.payment_method) THEN
    RAISE EXCEPTION 'operador não pode alterar valores da venda';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sales_enforce_values ON public.sales;
CREATE TRIGGER trigger_sales_enforce_values
  BEFORE UPDATE ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.enforce_sales_values();

-- ------------------------------------------------------------
-- SALE_ITEMS / QUOTE_ITEMS: herdam isolamento do pai; pai imutável.
-- ------------------------------------------------------------

CREATE POLICY sale_items_select ON public.sale_items FOR SELECT TO authenticated
  USING (sale_id IN (SELECT id FROM public.sales WHERE organization_id = public.current_org_id()));
CREATE POLICY sale_items_insert ON public.sale_items FOR INSERT TO authenticated
  WITH CHECK (
    sale_id IN (SELECT id FROM public.sales WHERE organization_id = public.current_org_id())
    AND public.current_user_role() IN ('owner','admin','operator')
  );
CREATE POLICY sale_items_update ON public.sale_items FOR UPDATE TO authenticated
  USING (
    sale_id IN (SELECT id FROM public.sales WHERE organization_id = public.current_org_id())
    AND public.current_user_role() IN ('owner','admin','operator')
  )
  WITH CHECK (
    sale_id IN (SELECT id FROM public.sales WHERE organization_id = public.current_org_id())
  );
-- Imutabilidade do pai: um item jamais migra de venda/orçamento.
CREATE OR REPLACE FUNCTION public.enforce_sale_item_parent()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.sale_id IS DISTINCT FROM OLD.sale_id THEN
    RAISE EXCEPTION 'sale_id de sale_item é imutável';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_quote_item_parent()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.quote_id IS DISTINCT FROM OLD.quote_id THEN
    RAISE EXCEPTION 'quote_id de quote_item é imutável';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sale_items_parent ON public.sale_items;
CREATE TRIGGER trigger_sale_items_parent
  BEFORE UPDATE ON public.sale_items
  FOR EACH ROW EXECUTE FUNCTION public.enforce_sale_item_parent();

DROP TRIGGER IF EXISTS trigger_quote_items_parent ON public.quote_items;
CREATE TRIGGER trigger_quote_items_parent
  BEFORE UPDATE ON public.quote_items
  FOR EACH ROW EXECUTE FUNCTION public.enforce_quote_item_parent();

CREATE POLICY sale_items_delete ON public.sale_items FOR DELETE TO authenticated
  USING (sale_id IN (SELECT id FROM public.sales WHERE organization_id = public.current_org_id()) AND public.is_org_admin());

CREATE POLICY quote_items_select ON public.quote_items FOR SELECT TO authenticated
  USING (quote_id IN (SELECT id FROM public.quotes WHERE organization_id = public.current_org_id()));
CREATE POLICY quote_items_insert ON public.quote_items FOR INSERT TO authenticated
  WITH CHECK (
    quote_id IN (SELECT id FROM public.quotes WHERE organization_id = public.current_org_id())
    AND public.current_user_role() IN ('owner','admin','operator')
  );
CREATE POLICY quote_items_update ON public.quote_items FOR UPDATE TO authenticated
  USING (
    quote_id IN (SELECT id FROM public.quotes WHERE organization_id = public.current_org_id())
    AND public.current_user_role() IN ('owner','admin','operator')
  )
  WITH CHECK (quote_id IN (SELECT id FROM public.quotes WHERE organization_id = public.current_org_id()));
CREATE POLICY quote_items_delete ON public.quote_items FOR DELETE TO authenticated
  USING (quote_id IN (SELECT id FROM public.quotes WHERE organization_id = public.current_org_id()) AND public.is_org_admin());

-- ------------------------------------------------------------
-- MESSAGE_TEMPLATES / MARKETING_CAMPAIGNS: escrita só admin+
-- ------------------------------------------------------------

CREATE POLICY templates_select ON public.message_templates FOR SELECT TO authenticated
  USING (organization_id = public.current_org_id());
CREATE POLICY templates_insert ON public.message_templates FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.current_org_id() AND public.is_org_admin());
CREATE POLICY templates_update ON public.message_templates FOR UPDATE TO authenticated
  USING (organization_id = public.current_org_id() AND public.is_org_admin())
  WITH CHECK (organization_id = public.current_org_id());
CREATE POLICY templates_delete ON public.message_templates FOR DELETE TO authenticated
  USING (organization_id = public.current_org_id() AND public.is_org_admin());

CREATE POLICY campaigns_select ON public.marketing_campaigns FOR SELECT TO authenticated
  USING (organization_id = public.current_org_id());
CREATE POLICY campaigns_insert ON public.marketing_campaigns FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.current_org_id() AND public.is_org_admin());
CREATE POLICY campaigns_update ON public.marketing_campaigns FOR UPDATE TO authenticated
  USING (organization_id = public.current_org_id() AND public.is_org_admin())
  WITH CHECK (organization_id = public.current_org_id());
CREATE POLICY campaigns_delete ON public.marketing_campaigns FOR DELETE TO authenticated
  USING (organization_id = public.current_org_id() AND public.is_org_admin());

-- ------------------------------------------------------------
-- AUDIT_LOGS: leitura admin+; escrita exclusivamente via log_audit
-- ------------------------------------------------------------

CREATE POLICY audit_select ON public.audit_logs FOR SELECT TO authenticated
  USING (organization_id = public.current_org_id() AND public.is_org_admin());

CREATE OR REPLACE FUNCTION public.log_audit(
  p_org_id UUID,
  p_action TEXT,
  p_entity TEXT,
  p_entity_id UUID,
  p_details JSONB DEFAULT '{}'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_org_id IS DISTINCT FROM public.current_org_id() THEN
    RAISE EXCEPTION 'log_audit: organização divergente da sessão';
  END IF;
  INSERT INTO public.audit_logs (organization_id, user_id, action, entity, entity_id, details)
  VALUES (p_org_id, auth.uid(), p_action, p_entity, p_entity_id, p_details);
END;
$$;

REVOKE ALL ON FUNCTION public.log_audit(UUID, TEXT, TEXT, UUID, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.log_audit(UUID, TEXT, TEXT, UUID, JSONB) FROM anon;
GRANT EXECUTE ON FUNCTION public.log_audit(UUID, TEXT, TEXT, UUID, JSONB) TO authenticated;

-- ------------------------------------------------------------
-- VIEWS: security_invoker para respeitar RLS do consulente
-- ------------------------------------------------------------

CREATE OR REPLACE VIEW public.v_monthly_revenue
WITH (security_invoker = true)
AS
SELECT
  organization_id,
  DATE_TRUNC('month', sale_date) AS month,
  COUNT(*) AS total_sales,
  SUM(total) AS total_revenue,
  AVG(total) AS avg_ticket
FROM public.sales
WHERE status = 'completed'
GROUP BY organization_id, DATE_TRUNC('month', sale_date);

CREATE OR REPLACE VIEW public.v_sales_by_origin
WITH (security_invoker = true)
AS
SELECT
  organization_id,
  origin,
  COUNT(*) AS total_sales,
  SUM(total) AS total_revenue
FROM public.sales
WHERE status = 'completed'
GROUP BY organization_id, origin;

CREATE OR REPLACE VIEW public.v_lead_conversion
WITH (security_invoker = true)
AS
SELECT
  organization_id,
  COUNT(*) FILTER (WHERE stage = 'won') AS won,
  COUNT(*) FILTER (WHERE stage = 'lost') AS lost,
  COUNT(*) FILTER (WHERE stage NOT IN ('won', 'lost')) AS active,
  CASE
    WHEN COUNT(*) FILTER (WHERE stage IN ('won', 'lost')) > 0
    THEN ROUND(COUNT(*) FILTER (WHERE stage = 'won')::NUMERIC / COUNT(*) FILTER (WHERE stage IN ('won', 'lost')) * 100, 2)
    ELSE 0
  END AS conversion_rate
FROM public.leads
GROUP BY organization_id;

-- ------------------------------------------------------------
-- ONBOARDING: profile criado automaticamente quando o admin cadastra
-- o usuário (Dashboard > Auth > Create user, com organization_id e
-- role em user metadata). Sem metadados válidos, sem profile: o
-- login falha com "Usuário sem perfil ativo" (comportamento
-- intencional — nenhum acesso anônimo).
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org UUID := NULLIF(current_setting('request.jwt.claim.organization_id', true), '')::UUID;
  v_meta_org UUID := NULLIF((NEW.raw_user_meta_data->>'organization_id'), '')::UUID;
  v_role TEXT := COALESCE(NEW.raw_user_meta_data->>'role', 'operator');
BEGIN
  IF v_meta_org IS NULL THEN
    v_meta_org := v_org;
  END IF;
  IF v_meta_org IS NULL THEN
    RETURN NEW; -- sem org no convite: sem profile (acesso negado)
  END IF;
  IF v_role NOT IN ('owner', 'admin', 'operator', 'viewer') THEN
    v_role := 'operator';
  END IF;
  INSERT INTO public.profiles (id, organization_id, name, email, role)
  VALUES (
    NEW.id,
    v_meta_org,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    v_role
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_on_auth_user_created ON auth.users;
CREATE TRIGGER trigger_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------
-- FUNÇÕES PRIVILEGIADAS: reassert owner para evitar busca de path
-- em triggers auxiliares
-- ------------------------------------------------------------

ALTER FUNCTION public.update_updated_at() SET search_path = public;
