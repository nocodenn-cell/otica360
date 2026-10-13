-- Ateliê da Ótica — Schema SQL para Supabase
-- Versão: 1.0.0
-- Data: 2026-01
-- Descrição: Schema completo para o sistema de gestão comercial de ótica

-- ============================================================
-- EXTENSÕES
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABELAS BASE
-- ============================================================

-- Organizações (óticas)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  cnpj TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Perfis de usuário (autenticação Supabase)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'operator' CHECK (role IN ('owner', 'admin', 'operator', 'viewer')),
  phone TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, email)
);

-- ============================================================
-- CRM — CLIENTES
-- ============================================================

CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  origin TEXT NOT NULL DEFAULT 'unknown' CHECK (origin IN ('google', 'instagram', 'indication', 'store', 'whatsapp', 'other', 'unknown')),
  contact_preference TEXT NOT NULL DEFAULT 'whatsapp' CHECK (contact_preference IN ('whatsapp', 'phone', 'email', 'sms', 'none')),
  communication_status TEXT NOT NULL DEFAULT 'pending' CHECK (communication_status IN ('authorized', 'pending', 'declined', 'unsubscribed')),
  notes TEXT DEFAULT '',
  last_purchase_date DATE,
  next_action_date DATE,
  responsible TEXT DEFAULT '',
  archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_customers_org ON customers(organization_id);
CREATE INDEX idx_customers_phone ON customers(organization_id, phone);
CREATE INDEX idx_customers_name ON customers(organization_id, name);
CREATE INDEX idx_customers_archived ON customers(organization_id, archived);

-- ============================================================
-- PRODUTOS
-- ============================================================

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other' CHECK (category IN ('frames', 'lenses', 'sunglasses', 'accessories', 'services', 'other')),
  price NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  cost NUMERIC(12, 2) DEFAULT 0 CHECK (cost >= 0),
  code TEXT DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_products_org ON products(organization_id);
CREATE INDEX idx_products_active ON products(organization_id, active);

-- ============================================================
-- VENDAS
-- ============================================================

CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  number TEXT NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL DEFAULT 'Cliente não identificado',
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
  discount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  payment_method TEXT NOT NULL DEFAULT 'pix' CHECK (payment_method IN ('pix', 'cash', 'credit', 'debit', 'installment', 'other')),
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'cancelled', 'refunded')),
  origin TEXT NOT NULL DEFAULT 'unknown',
  responsible TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, number)
);

CREATE INDEX idx_sales_org ON sales(organization_id);
CREATE INDEX idx_sales_date ON sales(organization_id, sale_date);
CREATE INDEX idx_sales_customer ON sales(customer_id);
CREATE INDEX idx_sales_status ON sales(organization_id, status);

-- Itens da venda
CREATE TABLE sale_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  discount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (total >= 0)
);

CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);

-- ============================================================
-- LEADS & ORÇAMENTOS
-- ============================================================

CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  origin TEXT NOT NULL DEFAULT 'unknown',
  stage TEXT NOT NULL DEFAULT 'new_contact' CHECK (stage IN ('new_contact', 'in_service', 'quote_sent', 'awaiting_return', 'won', 'lost')),
  estimated_value NUMERIC(12, 2) DEFAULT 0,
  responsible TEXT DEFAULT '',
  next_contact_date DATE,
  loss_reason TEXT CHECK (loss_reason IN ('price', 'competitor', 'no_need', 'no_response', 'other')),
  notes TEXT DEFAULT '',
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_leads_org ON leads(organization_id);
CREATE INDEX idx_leads_stage ON leads(organization_id, stage);

CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
  discount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')),
  valid_until DATE,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_quotes_org ON quotes(organization_id);
CREATE INDEX idx_quotes_lead ON quotes(lead_id);

CREATE TABLE quote_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total NUMERIC(12, 2) NOT NULL DEFAULT 0
);

CREATE INDEX idx_quote_items_quote ON quote_items(quote_id);

-- ============================================================
-- PÓS-VENDA & TAREFAS
-- ============================================================

CREATE TABLE follow_up_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('post_purchase', 'satisfaction', 'prescription_review', 'maintenance', 'inactive_client', 'pending_quote', 'other')),
  description TEXT DEFAULT '',
  channel TEXT NOT NULL DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp', 'phone', 'email', 'sms', 'none')),
  scheduled_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'sent', 'responded', 'completed', 'cancelled', 'failed')),
  responsible TEXT DEFAULT '',
  result TEXT DEFAULT '',
  next_action_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_followups_org ON follow_up_tasks(organization_id);
CREATE INDEX idx_followups_customer ON follow_up_tasks(customer_id);
CREATE INDEX idx_followups_status ON follow_up_tasks(organization_id, status);
CREATE INDEX idx_followups_date ON follow_up_tasks(organization_id, scheduled_date);

-- ============================================================
-- MENSAGENS
-- ============================================================

CREATE TABLE message_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp', 'sms', 'email')),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE message_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  template_id UUID REFERENCES message_templates(id) ON DELETE SET NULL,
  template_name TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'sms', 'email')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed', 'blocked')),
  content TEXT NOT NULL,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  failure_reason TEXT DEFAULT '',
  retry_count INTEGER NOT NULL DEFAULT 0,
  is_test_mode BOOLEAN NOT NULL DEFAULT false,
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_org ON message_events(organization_id);
CREATE INDEX idx_messages_customer ON message_events(customer_id);
CREATE INDEX idx_messages_status ON message_events(organization_id, status);

-- ============================================================
-- MARKETING
-- ============================================================

CREATE TABLE marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  platform TEXT DEFAULT '',
  start_date DATE NOT NULL,
  end_date DATE,
  investment NUMERIC(12, 2) NOT NULL DEFAULT 0,
  leads_generated INTEGER NOT NULL DEFAULT 0,
  quotes_related INTEGER NOT NULL DEFAULT 0,
  sales_attributed INTEGER NOT NULL DEFAULT 0,
  revenue_attributed NUMERIC(12, 2) NOT NULL DEFAULT 0,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_campaigns_org ON marketing_campaigns(organization_id);

-- ============================================================
-- AUDITORIA
-- ============================================================

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id UUID,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_org ON audit_logs(organization_id);
CREATE INDEX idx_audit_entity ON audit_logs(entity, entity_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_up_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Políticas de isolamento por organização
-- Usuário só vê dados da sua própria organização

-- Organizations: membros veem sua própria organização
CREATE POLICY "Users can view their organization" ON organizations
  FOR SELECT USING (id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- Profiles: membros veem perfis da sua organização
CREATE POLICY "Users can view profiles in their org" ON profiles
  FOR SELECT USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can manage profiles in their org" ON profiles
  FOR ALL USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'admin'))
  );

-- Customers: isolamento por organização
CREATE POLICY "Org members can view customers" ON customers
  FOR SELECT USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Org members can insert customers" ON customers
  FOR INSERT WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Org members can update customers" ON customers
  FOR UPDATE USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can delete customers" ON customers
  FOR DELETE USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'admin')));

-- Products: isolamento por organização
CREATE POLICY "Org members can view products" ON products
  FOR SELECT USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can manage products" ON products
  FOR ALL USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'admin')));

-- Sales: isolamento por organização
CREATE POLICY "Org members can view sales" ON sales
  FOR SELECT USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Org members can insert sales" ON sales
  FOR INSERT WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can update sales" ON sales
  FOR UPDATE USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'admin')));

-- Sale Items: acesso via sale
CREATE POLICY "Org members can view sale items" ON sale_items
  FOR SELECT USING (sale_id IN (SELECT id FROM sales WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())));

CREATE POLICY "Org members can insert sale items" ON sale_items
  FOR INSERT WITH CHECK (sale_id IN (SELECT id FROM sales WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())));

-- Leads: isolamento por organização
CREATE POLICY "Org members can view leads" ON leads
  FOR SELECT USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Org members can manage leads" ON leads
  FOR ALL USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- Quotes: isolamento por organização
CREATE POLICY "Org members can view quotes" ON quotes
  FOR SELECT USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Org members can manage quotes" ON quotes
  FOR ALL USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- Quote Items: acesso via quote
CREATE POLICY "Org members can view quote items" ON quote_items
  FOR SELECT USING (quote_id IN (SELECT id FROM quotes WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())));

CREATE POLICY "Org members can insert quote items" ON quote_items
  FOR INSERT WITH CHECK (quote_id IN (SELECT id FROM quotes WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())));

-- Follow-ups: isolamento por organização
CREATE POLICY "Org members can view follow-ups" ON follow_up_tasks
  FOR SELECT USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Org members can manage follow-ups" ON follow_up_tasks
  FOR ALL USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- Message templates: isolamento por organização
CREATE POLICY "Org members can view templates" ON message_templates
  FOR SELECT USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can manage templates" ON message_templates
  FOR ALL USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'admin')));

-- Message events: isolamento por organização
CREATE POLICY "Org members can view messages" ON message_events
  FOR SELECT USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Org members can insert messages" ON message_events
  FOR INSERT WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- Campaigns: isolamento por organização
CREATE POLICY "Org members can view campaigns" ON marketing_campaigns
  FOR SELECT USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can manage campaigns" ON marketing_campaigns
  FOR ALL USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'admin')));

-- Audit logs: somente leitura para admins
CREATE POLICY "Admins can view audit logs" ON audit_logs
  FOR SELECT USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'admin')));

-- ============================================================
-- FUNÇÕES AUXILIARES
-- ============================================================

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger a todas as tabelas com updated_at
CREATE TRIGGER trigger_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_sales_updated_at BEFORE UPDATE ON sales FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_quotes_updated_at BEFORE UPDATE ON quotes FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_followups_updated_at BEFORE UPDATE ON follow_up_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_campaigns_updated_at BEFORE UPDATE ON marketing_campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- FUNÇÃO: Registrar auditoria
-- ============================================================

CREATE OR REPLACE FUNCTION log_audit(
  p_org_id UUID,
  p_action TEXT,
  p_entity TEXT,
  p_entity_id UUID,
  p_details JSONB DEFAULT '{}'
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO audit_logs (organization_id, user_id, action, entity, entity_id, details)
  VALUES (p_org_id, auth.uid(), p_action, p_entity, p_entity_id, p_details);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- VIEWS PARA DASHBOARD
-- ============================================================

-- Faturamento mensal por organização
CREATE OR REPLACE VIEW v_monthly_revenue AS
SELECT
  organization_id,
  DATE_TRUNC('month', sale_date) AS month,
  COUNT(*) AS total_sales,
  SUM(total) AS total_revenue,
  AVG(total) AS avg_ticket
FROM sales
WHERE status = 'completed'
GROUP BY organization_id, DATE_TRUNC('month', sale_date);

-- Vendas por origem
CREATE OR REPLACE VIEW v_sales_by_origin AS
SELECT
  organization_id,
  origin,
  COUNT(*) AS total_sales,
  SUM(total) AS total_revenue
FROM sales
WHERE status = 'completed'
GROUP BY organization_id, origin;

-- Taxa de conversão de leads
CREATE OR REPLACE VIEW v_lead_conversion AS
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
FROM leads
GROUP BY organization_id;

-- ============================================================
-- DADOS INICIAIS (SEED)
-- ============================================================

-- Inserir templates padrão
INSERT INTO message_templates (organization_id, name, content, channel)
SELECT id, 'Boas-vindas', 'Olá {{nome}}, seja bem-vindo(a) ao Ateliê da Ótica! Estamos felizes em atendê-lo(a).', 'whatsapp'
FROM organizations;

INSERT INTO message_templates (organization_id, name, content, channel)
SELECT id, 'Pós-venda', 'Olá {{nome}}, como está se adaptando ao seu novo óculos?', 'whatsapp'
FROM organizations;

INSERT INTO message_templates (organization_id, name, content, channel)
SELECT id, 'Revisão', 'Olá {{nome}}, já faz um tempo. Que tal agendar uma revisão?', 'whatsapp'
FROM organizations;
