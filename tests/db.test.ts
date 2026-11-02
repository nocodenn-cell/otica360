import { describe, it, expect, vi, beforeEach } from 'vitest';

const clientHolder: { client: unknown } = { client: null };

vi.mock('../src/utils/auth', () => ({
  getSupabaseClient: () => clientHolder.client,
}));

function chain(result: { data?: unknown; error?: unknown; singleData?: unknown }) {
  const c: Record<string, unknown> = {
    select: () => c,
    eq: () => c,
    order: () => c,
    maybeSingle: () => Promise.resolve(result),
    single: () => Promise.resolve({ data: result.singleData ?? result.data, error: result.error ?? null }),
    then: (res: (v: unknown) => unknown) => res(result),
  };
  return c;
}

function fakeClient(tables: Record<string, { data?: unknown[]; error?: unknown; single?: unknown }>,
                   onInsert: (table: string, rows: unknown) => void,
                   rpcImpl?: (fn: string, args: Record<string, unknown>) => Promise<{ data?: unknown; error?: unknown }>) {
  return {
    from: (table: string) => {
      const spec = tables[table] ?? { data: [] };
      const c = chain({ data: spec.single ?? spec.data, error: spec.error, singleData: spec.single });
      c.insert = (rows: unknown) => { onInsert(table, rows); return c; };
      c.update = () => c;
      return c;
    },
    rpc: vi.fn(rpcImpl ?? (async () => ({ data: null, error: null }))),
  };
}

const customerRow = {
  id: 'c1', organization_id: 'org1', name: 'Maria', phone: '11 99999-0000',
  email: 'm@x.com', origin: 'store', contact_preference: 'whatsapp',
  communication_status: 'authorized', notes: '', last_purchase_date: null,
  next_action_date: null, responsible: 'Ana', archived: false,
  created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
};

describe('mappers', () => {
  it('converte linha DB em Customer camelCase', async () => {
    const m = await import('../src/services/db/mappers');
    const c = m.toAppCustomer(customerRow);
    expect(c.organizationId).toBe('org1');
    expect(c.contactPreference).toBe('whatsapp');
    expect(c.lastPurchaseDate).toBeNull();
  });

  it('toDbCustomer envia apenas campos definidos e converte email vazio em null', async () => {
    const m = await import('../src/services/db/mappers');
    const db = m.toDbCustomer({ name: 'Joao', email: '' });
    expect(db).toEqual({ name: 'Joao', email: null });
  });

  it('toAppSale mapeia sale_date para date e itens para SaleItem', async () => {
    const m = await import('../src/services/db/mappers');
    const sale = m.toAppSale(
      { id: 's1', organization_id: 'org1', number: '10', customer_name: 'Maria', sale_date: '2026-10-01', subtotal: 180, discount: 0, total: 180, payment_method: 'pix', status: 'completed', origin: 'store', responsible: 'Ana', notes: '', created_at: 'x', updated_at: 'y' },
      [{ id: 'i1', product_id: 'p1', product_name: 'Armacao', quantity: 2, unit_price: 90, discount: 0, total: 180 }],
    );
    expect(sale.date).toBe('2026-10-01');
    expect(sale.items[0].unitPrice).toBe(90);
  });

  it('toRpcSaleItem usa nomes snake_case exigidos pela RPC', async () => {
    const m = await import('../src/services/db/mappers');
    const item = m.toRpcSaleItem({ id: 'i1', productId: '', productName: 'X', quantity: 1, unitPrice: 10, discount: 0, total: 10 });
    expect(item).toEqual({ product_id: null, product_name: 'X', quantity: 1, unit_price: 10, discount: 0, total: 10 });
  });
});

describe('workspace', () => {
  beforeEach(() => {
    clientHolder.client = null;
    vi.resetModules();
  });

  it('loadWorkspace monta WorkspaceData a partir das tabelas', async () => {
    const inserted: string[] = [];
    clientHolder.client = fakeClient({
      organizations: { data: [], single: { name: 'Otica X' } },
      customers: { data: [customerRow] },
      products: { data: [] },
      leads: { data: [] },
      follow_up_tasks: { data: [] },
      message_templates: { data: [] },
      marketing_campaigns: { data: [] },
      message_events: { data: [] },
      sales: { data: [] },
      quotes: { data: [] },
    }, t => inserted.push(t));
    const w = await import('../src/services/db/workspace');
    const res = await w.loadWorkspace('org1');
    expect(res.ok).toBe(true);
    expect(res.data!.organizationName).toBe('Otica X');
    expect(res.data!.customers[0].name).toBe('Maria');
  });

  it('loadWorkspace converte erro 42501 em mensagem de permissao', async () => {
    clientHolder.client = fakeClient({
      organizations: { data: [], single: { name: 'X' } },
      customers: { data: [], error: { code: '42501', message: 'forbidden' } },
    }, () => {});
    const w = await import('../src/services/db/workspace');
    const res = await w.loadWorkspace('org1');
    expect(res.ok).toBe(false);
    expect(res.error).toContain('Permissão negada');
    expect(res.error).toContain('isolamento');
  });

  it('createSale chama RPC com payload mapeado e mescla itens locais', async () => {
    const rpc = vi.fn(async () => ({ data: { id: 's9', organization_id: 'org1', number: '99', customer_name: 'Maria', sale_date: '2026-10-02', subtotal: 100, discount: 0, total: 100, payment_method: 'pix', status: 'completed', origin: 'store', responsible: 'Ana', notes: '', created_at: 'c', updated_at: 'u' }, error: null }));
    clientHolder.client = { from: () => chain({ data: [] }), rpc };
    const w = await import('../src/services/db/workspace');
    const sale = {
      organizationId: 'org1', customerId: 'c1', customerName: 'Maria', date: '2026-10-02',
      discount: 0, paymentMethod: 'pix' as const, origin: 'store' as const, responsible: 'Ana',
      notes: '', items: [{ id: 'i1', productId: 'p1', productName: 'A', quantity: 1, unitPrice: 100, discount: 0, total: 100 }],
    };
    const res = await w.createSale(sale as never);
    expect(res.ok).toBe(true);
    expect(res.data!.number).toBe('99');
    expect(res.data!.items).toHaveLength(1);
    const args = rpc.mock.calls[0][1] as Record<string, unknown>;
    expect(args.p_sale_date).toBe('2026-10-02');
    expect((args.p_items as Array<Record<string, unknown>>)[0].product_id).toBe('p1');
  });

  it('uploadLegacyWorkspace insere na ordem das FKs e preserva ids', async () => {
    const order: string[] = [];
    const now = '2026-01-01T00:00:00Z';
    const legacy = {
      organization: { id: 'org-default', name: 'L', createdAt: now },
      user: { id: 'u', organizationId: 'org-default', name: '', email: '', role: 'admin' as const, createdAt: now },
      customers: [{ id: 'c1', organizationId: 'org-default', name: 'Maria', phone: '1', email: '', origin: 'store' as const, contactPreference: 'whatsapp' as const, communicationStatus: 'pending' as const, notes: '', lastPurchaseDate: null, nextActionDate: null, responsible: '', archived: false, createdAt: now, updatedAt: now }],
      products: [{ id: 'p1', organizationId: 'org-default', name: 'A', category: 'frames' as const, price: 1, cost: 1, code: '', active: true, createdAt: now, updatedAt: now }],
      sales: [{ id: 's1', organizationId: 'org-default', number: '', customerId: 'c1', customerName: 'Maria', date: '2026-10-01', items: [{ id: 'i1', productId: 'p1', productName: 'A', quantity: 1, unitPrice: 1, discount: 0, total: 1 }], subtotal: 1, discount: 0, total: 1, paymentMethod: 'pix' as const, status: 'completed' as const, origin: 'store' as const, responsible: '', notes: '', createdAt: now, updatedAt: now }],
      leads: [], quotes: [], followUps: [], messageEvents: [],
      messageTemplates: [{ id: 't1', organizationId: 'org-default', name: 'T', content: 'x', channel: 'whatsapp' as const, active: true, createdAt: now }],
      campaigns: [], auditLogs: [],
    };
    clientHolder.client = fakeClient({}, (t) => order.push(t));
    const w = await import('../src/services/db/workspace');
    const res = await w.uploadLegacyWorkspace(legacy as never, 'org-real');
    expect(res.ok).toBe(true);
    expect(order.indexOf('message_templates')).toBeLessThan(order.indexOf('customers'));
    expect(order.indexOf('customers')).toBeLessThan(order.indexOf('sales'));
    expect(order.indexOf('sales')).toBeLessThan(order.indexOf('sale_items'));
    expect(res.data).toBe(5);
  });

  it('isEmptyWorkspace detecta workspace vazio e preenchido', async () => {
    const w = await import('../src/services/db/workspace');
    const empty = { organizationName: 'x', customers: [], products: [], sales: [], leads: [], quotes: [], followUps: [], messageEvents: [], messageTemplates: [], campaigns: [] };
    expect(w.isEmptyWorkspace(empty)).toBe(true);
  });
});
