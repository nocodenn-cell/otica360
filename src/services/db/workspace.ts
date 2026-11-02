import { getSupabaseClient } from '../../utils/auth';
import {
  AppState, Customer, Product, Sale, SaleItem, Lead, Quote, FollowUpTask,
  MessageEvent, MessageTemplate, MarketingCampaign,
} from '../../types';
import * as m from './mappers';

type Row = Record<string, unknown>;

export interface CommitResult<T = undefined> {
  ok: boolean;
  error: string | null;
  data?: T;
}

export interface WorkspaceData {
  organizationName: string;
  customers: Customer[];
  products: Product[];
  sales: Sale[];
  leads: Lead[];
  quotes: Quote[];
  followUps: FollowUpTask[];
  messageEvents: MessageEvent[];
  messageTemplates: MessageTemplate[];
  campaigns: MarketingCampaign[];
}

type NewEntity<T extends { id: string; organizationId: string }> =
  Omit<T, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'> & { organizationId: string };

const CHUNK = 200;

function errorFrom(e: unknown): string {
  const err = e as { message?: string; code?: string; details?: string; hint?: string };
  if (err?.code === '42501') return 'Permissão negada pelo servidor (isolamento por organização).';
  if (err?.code === '23505') return 'Registro duplicado: já existe um igual no servidor.';
  if (err?.code === '23503') return 'Referência inválida: o registro vinculado não existe nesta organização.';
  return err?.message ?? 'Falha de comunicação com o servidor.';
}

function client() {
  const c = getSupabaseClient();
  if (!c) throw new Error('Supabase não configurado');
  return c;
}

function fail(e: unknown): CommitResult<never> {
  return { ok: false, error: errorFrom(e) };
}

async function selectAll(table: string, orgId: string, orderBy = 'created_at'): Promise<Row[]> {
  const rows = await client().from(table).select('*').eq('organization_id', orgId).order(orderBy);
  if (rows.error) throw rows.error;
  return rows.data ?? [];
}

function chunks<T>(arr: T[], size = CHUNK): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function loadWorkspace(orgId: string): Promise<CommitResult<WorkspaceData>> {
  try {
    const c = client();
    const [org, customers, products, leads, followUps, templates, campaigns, messages] = await Promise.all([
      c.from('organizations').select('name').eq('id', orgId).maybeSingle(),
      selectAll('customers', orgId),
      selectAll('products', orgId),
      selectAll('leads', orgId),
      selectAll('follow_up_tasks', orgId, 'scheduled_date'),
      selectAll('message_templates', orgId),
      selectAll('marketing_campaigns', orgId),
      selectAll('message_events', orgId),
    ]);
    if (org.error) throw org.error;

    const salesRes = await c.from('sales')
      .select('*, sale_items(*)')
      .eq('organization_id', orgId)
      .order('sale_date');
    if (salesRes.error) throw salesRes.error;

    const quotesRes = await c.from('quotes')
      .select('*, quote_items(*)')
      .eq('organization_id', orgId)
      .order('created_at');
    if (quotesRes.error) throw quotesRes.error;

    return {
      ok: true,
      error: null,
      data: {
        organizationName: (org.data?.name as string) ?? 'Ateliê da Ótica',
        customers: customers.map(m.toAppCustomer),
        products: products.map(m.toAppProduct),
        leads: leads.map(m.toAppLead),
        followUps: followUps.map(m.toAppFollowUp),
        messageTemplates: templates.map(m.toAppTemplate),
        campaigns: campaigns.map(m.toAppCampaign),
        messageEvents: messages.map(m.toAppMessageEvent),
        sales: (salesRes.data ?? []).map((row: Row) => m.toAppSale(row, (row.sale_items as Row[]) ?? [])),
        quotes: (quotesRes.data ?? []).map((row: Row) => m.toAppQuote(row, (row.quote_items as Row[]) ?? [])),
      },
    };
  } catch (e) {
    return fail(e);
  }
}

async function insertRow<T>(table: string, row: Row, map: (r: Row) => T): Promise<CommitResult<T>> {
  try {
    const res = await client().from(table).insert(row).select().single();
    if (res.error) throw res.error;
    return { ok: true, error: null, data: map(res.data as Row) };
  } catch (e) {
    return fail(e);
  }
}

async function updateRow<T>(table: string, id: string, patch: Row, map: (r: Row) => T): Promise<CommitResult<T>> {
  try {
    const res = await client().from(table).update(patch).eq('id', id).select().single();
    if (res.error) throw res.error;
    return { ok: true, error: null, data: map(res.data as Row) };
  } catch (e) {
    return fail(e);
  }
}

export const customersRepo = {
  insert: (c: NewEntity<Customer>) => insertRow('customers', m.toDbCustomer(c), m.toAppCustomer),
  update: (id: string, patch: Partial<Customer>) => updateRow('customers', id, m.toDbCustomer(patch), m.toAppCustomer),
  bulkInsert: async (list: NewEntity<Customer>[]): Promise<CommitResult<Customer[]>> => {
    try {
      const rows: Customer[] = [];
      for (const part of chunks(list)) {
        const res = await client().from('customers').insert(part.map(m.toDbCustomer)).select();
        if (res.error) throw res.error;
        rows.push(...(res.data as Row[]).map(m.toAppCustomer));
      }
      return { ok: true, error: null, data: rows };
    } catch (e) {
      return fail(e);
    }
  },
};

export const productsRepo = {
  insert: (p: NewEntity<Product>) => insertRow('products', m.toDbProduct(p), m.toAppProduct),
  update: (id: string, patch: Partial<Product>) => updateRow('products', id, m.toDbProduct(patch), m.toAppProduct),
};

export const leadsRepo = {
  insert: (l: NewEntity<Lead>) => insertRow('leads', m.toDbLead(l), m.toAppLead),
  update: (id: string, patch: Partial<Lead>) => updateRow('leads', id, m.toDbLead(patch), m.toAppLead),
};

export const followUpsRepo = {
  insert: (f: NewEntity<FollowUpTask>) => insertRow('follow_up_tasks', m.toDbFollowUp(f), m.toAppFollowUp),
  update: (id: string, patch: Partial<FollowUpTask>) => updateRow('follow_up_tasks', id, m.toDbFollowUp(patch), m.toAppFollowUp),
};

export const campaignsRepo = {
  insert: (c: NewEntity<MarketingCampaign>) => insertRow('marketing_campaigns', m.toDbCampaign(c), m.toAppCampaign),
  update: (id: string, patch: Partial<MarketingCampaign>) => updateRow('marketing_campaigns', id, m.toDbCampaign(patch), m.toAppCampaign),
};

export const messagesRepo = {
  insert: (ev: Omit<MessageEvent, 'id' | 'organizationId' | 'createdAt'> & { organizationId: string }) =>
    insertRow('message_events', m.toDbMessageEvent(ev), m.toAppMessageEvent),
};

export async function createSale(s: NewEntity<Sale>): Promise<CommitResult<Sale>> {
  try {
    const res = await client().rpc('create_sale_with_items', {
      p_customer_id: s.customerId || null,
      p_customer_name: s.customerName,
      p_sale_date: s.date,
      p_discount: s.discount,
      p_payment_method: s.paymentMethod,
      p_origin: s.origin,
      p_responsible: s.responsible,
      p_notes: s.notes,
      p_items: s.items.map(m.toRpcSaleItem),
    });
    if (res.error) throw res.error;
    return {
      ok: true,
      error: null,
      data: { ...m.toAppSale(res.data as Row), items: s.items, organizationId: s.organizationId },
    };
  } catch (e) {
    return fail(e);
  }
}

export async function updateSaleStatus(id: string, status: Sale['status']): Promise<CommitResult<Sale>> {
  return updateRow('sales', id, { status }, (row) => m.toAppSale(row));
}

export async function createQuote(q: NewEntity<Quote>): Promise<CommitResult<Quote>> {
  try {
    const res = await client().rpc('create_quote_with_items', {
      p_lead_id: q.leadId,
      p_customer_id: q.customerId || null,
      p_customer_name: q.customerName,
      p_discount: q.discount,
      p_status: q.status,
      p_valid_until: q.validUntil || null,
      p_notes: q.notes,
      p_items: q.items.map(m.toRpcQuoteItem),
    });
    if (res.error) throw res.error;
    return {
      ok: true,
      error: null,
      data: { ...m.toAppQuote(res.data as Row), items: q.items, organizationId: q.organizationId },
    };
  } catch (e) {
    return fail(e);
  }
}

export async function updateQuote(id: string, patch: Partial<Quote>): Promise<CommitResult<Quote>> {
  return updateRow('quotes', id, m.toDbQuote(patch), m.toAppQuote);
}

export function isEmptyWorkspace(w: WorkspaceData): boolean {
  return w.customers.length === 0 && w.products.length === 0 && w.sales.length === 0 &&
    w.leads.length === 0 && w.quotes.length === 0 && w.followUps.length === 0 &&
    w.messageEvents.length === 0 && w.campaigns.length === 0;
}

// Upload do acervo local (org-default do modo demonstração) para a
// organização real, preservando ids (FKs internas) e numeração de vendas.
export async function uploadLegacyWorkspace(legacy: AppState, orgId: string): Promise<CommitResult<number>> {
  try {
    const c = client();
    let uploaded = 0;

    const withOrg = <T extends { organizationId: string }>(x: T) => ({ ...x, organizationId: orgId });
    const post = async (table: string, rows: Row[]) => {
      for (const part of chunks(rows)) {
        const res = await c.from(table).insert(part);
        if (res.error) throw res.error;
        uploaded += part.length;
      }
    };

    const templates = legacy.messageTemplates.map(t => m.toDbTemplate(withOrg(t)));
    if (templates.length) await post('message_templates', templates);

    const customers = legacy.customers.map(cu => m.toDbCustomer({
      ...withOrg(cu), organizationId: orgId,
    }));
    if (customers.length) await post('customers', customers);

    const products = legacy.products.map(p => m.toDbProduct({ ...withOrg(p), organizationId: orgId }));
    if (products.length) await post('products', products);

    const leads = legacy.leads.map(l => m.toDbLead({ ...withOrg(l), organizationId: orgId }));
    if (leads.length) await post('leads', leads);

    const sales = legacy.sales.map((s, i) => ({
      ...m.toDbSale({ ...withOrg(s), organizationId: orgId }),
      number: s.number || String(i + 1),
    }));
    if (sales.length) await post('sales', sales);

    const saleItems: Row[] = [];
    for (const s of legacy.sales) {
      for (const item of s.items) saleItems.push(m.toDbSaleItem(item.id, s.id, item));
    }
    if (saleItems.length) await post('sale_items', saleItems);

    const quotes = legacy.quotes.map(q => m.toDbQuote({ ...withOrg(q), organizationId: orgId }));
    if (quotes.length) await post('quotes', quotes);

    const quoteItems: Row[] = [];
    for (const q of legacy.quotes) {
      for (const item of q.items) quoteItems.push(m.toDbQuoteItem(item.id, q.id, item));
    }
    if (quoteItems.length) await post('quote_items', quoteItems);

    const followUps = legacy.followUps.map(f => m.toDbFollowUp({ ...withOrg(f), organizationId: orgId }));
    if (followUps.length) await post('follow_up_tasks', followUps);

    const events = legacy.messageEvents.map(ev => m.toDbMessageEvent({ ...withOrg(ev), organizationId: orgId }));
    if (events.length) await post('message_events', events);

    const campaigns = legacy.campaigns.map(cp => m.toDbCampaign({ ...withOrg(cp), organizationId: orgId }));
    if (campaigns.length) await post('marketing_campaigns', campaigns);

    return { ok: true, error: null, data: uploaded };
  } catch (e) {
    return fail(e);
  }
}

export type { SaleItem, Quote };
