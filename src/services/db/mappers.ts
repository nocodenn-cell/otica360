import { Customer, Product, Sale, SaleItem, Lead, Quote, QuoteItem, FollowUpTask, MessageEvent, MessageTemplate, MarketingCampaign } from '../../types';

type Row = Record<string, unknown>;

const str = (v: unknown, fallback = ''): string => (v === null || v === undefined ? fallback : String(v));
const num = (v: unknown, fallback = 0): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};
const bool = (v: unknown): boolean => Boolean(v);
const isoOrNull = (v: unknown): string | null => (v === null || v === undefined ? null : String(v));
const dateOrNull = (v: unknown): string | null => (v === null || v === undefined ? null : String(v));
const textToNull = (v: string | null | undefined): string | null => (v === '' ? null : v ?? null);

export function toAppCustomer(row: Row): Customer {
  return {
    id: str(row.id),
    organizationId: str(row.organization_id),
    name: str(row.name),
    phone: str(row.phone),
    email: str(row.email),
    origin: str(row.origin, 'unknown') as Customer['origin'],
    contactPreference: str(row.contact_preference, 'whatsapp') as Customer['contactPreference'],
    communicationStatus: str(row.communication_status, 'pending') as Customer['communicationStatus'],
    notes: str(row.notes),
    lastPurchaseDate: dateOrNull(row.last_purchase_date),
    nextActionDate: dateOrNull(row.next_action_date),
    responsible: str(row.responsible),
    archived: bool(row.archived),
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
  };
}

export function toDbCustomer(c: Partial<Customer>): Row {
  const db: Row = {};
  if (c.id !== undefined) db.id = c.id;
  if (c.organizationId !== undefined) db.organization_id = c.organizationId;
  if (c.name !== undefined) db.name = c.name;
  if (c.phone !== undefined) db.phone = c.phone;
  if (c.email !== undefined) db.email = textToNull(c.email);
  if (c.origin !== undefined) db.origin = c.origin;
  if (c.contactPreference !== undefined) db.contact_preference = c.contactPreference;
  if (c.communicationStatus !== undefined) db.communication_status = c.communicationStatus;
  if (c.notes !== undefined) db.notes = c.notes;
  if (c.lastPurchaseDate !== undefined) db.last_purchase_date = c.lastPurchaseDate || null;
  if (c.nextActionDate !== undefined) db.next_action_date = c.nextActionDate || null;
  if (c.responsible !== undefined) db.responsible = c.responsible;
  if (c.archived !== undefined) db.archived = c.archived;
  return db;
}

export function toAppProduct(row: Row): Product {
  return {
    id: str(row.id),
    organizationId: str(row.organization_id),
    name: str(row.name),
    category: str(row.category, 'other') as Product['category'],
    price: num(row.price),
    cost: num(row.cost),
    code: str(row.code),
    active: bool(row.active),
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
  };
}

export function toDbProduct(p: Partial<Product>): Row {
  const db: Row = {};
  if (p.id !== undefined) db.id = p.id;
  if (p.organizationId !== undefined) db.organization_id = p.organizationId;
  if (p.name !== undefined) db.name = p.name;
  if (p.category !== undefined) db.category = p.category;
  if (p.price !== undefined) db.price = p.price;
  if (p.cost !== undefined) db.cost = p.cost;
  if (p.code !== undefined) db.code = p.code;
  if (p.active !== undefined) db.active = p.active;
  return db;
}

export function toAppSaleItem(row: Row): SaleItem {
  return {
    id: str(row.id),
    productId: str(row.product_id),
    productName: str(row.product_name),
    quantity: num(row.quantity, 1),
    unitPrice: num(row.unit_price),
    discount: num(row.discount),
    total: num(row.total),
  };
}

export function toDbSaleItem(itemId: string, saleId: string, i: SaleItem): Row {
  return {
    id: itemId,
    sale_id: saleId,
    product_id: i.productId || null,
    product_name: i.productName,
    quantity: i.quantity,
    unit_price: i.unitPrice,
    discount: i.discount ?? 0,
    total: i.total,
  };
}

export function toAppSale(row: Row, itemRows: Row[] = []): Sale {
  return {
    id: str(row.id),
    organizationId: str(row.organization_id),
    number: str(row.number),
    customerId: row.customer_id ? str(row.customer_id) : null,
    customerName: str(row.customer_name, 'Cliente não identificado'),
    date: str(row.sale_date),
    items: itemRows.map(toAppSaleItem),
    subtotal: num(row.subtotal),
    discount: num(row.discount),
    total: num(row.total),
    paymentMethod: str(row.payment_method, 'pix') as Sale['paymentMethod'],
    status: str(row.status, 'completed') as Sale['status'],
    origin: str(row.origin, 'unknown') as Sale['origin'],
    responsible: str(row.responsible),
    notes: str(row.notes),
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
  };
}

export function toAppQuoteItem(row: Row): QuoteItem {
  return {
    id: str(row.id),
    productId: str(row.product_id),
    productName: str(row.product_name),
    quantity: num(row.quantity, 1),
    unitPrice: num(row.unit_price),
    total: num(row.total),
  };
}

export function toAppQuote(row: Row, itemRows: Row[] = []): Quote {
  return {
    id: str(row.id),
    organizationId: str(row.organization_id),
    leadId: str(row.lead_id),
    customerId: row.customer_id ? str(row.customer_id) : null,
    customerName: str(row.customer_name),
    items: itemRows.map(toAppQuoteItem),
    subtotal: num(row.subtotal),
    discount: num(row.discount),
    total: num(row.total),
    status: str(row.status, 'draft') as Quote['status'],
    validUntil: str(row.valid_until),
    notes: str(row.notes),
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
  };
}

export function toAppLead(row: Row): Lead {
  return {
    id: str(row.id),
    organizationId: str(row.organization_id),
    name: str(row.name),
    phone: str(row.phone),
    email: str(row.email),
    origin: str(row.origin, 'unknown') as Lead['origin'],
    stage: str(row.stage, 'new_contact') as Lead['stage'],
    estimatedValue: num(row.estimated_value),
    responsible: str(row.responsible),
    nextContactDate: str(row.next_contact_date),
    lossReason: row.loss_reason ? (str(row.loss_reason) as Lead['lossReason']) : null,
    notes: str(row.notes),
    customerId: row.customer_id ? str(row.customer_id) : null,
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
  };
}

export function toDbLead(l: Partial<Lead>): Row {
  const db: Row = {};
  if (l.id !== undefined) db.id = l.id;
  if (l.organizationId !== undefined) db.organization_id = l.organizationId;
  if (l.name !== undefined) db.name = l.name;
  if (l.phone !== undefined) db.phone = l.phone;
  if (l.email !== undefined) db.email = l.email;
  if (l.origin !== undefined) db.origin = l.origin;
  if (l.stage !== undefined) db.stage = l.stage;
  if (l.estimatedValue !== undefined) db.estimated_value = l.estimatedValue;
  if (l.responsible !== undefined) db.responsible = l.responsible;
  if (l.nextContactDate !== undefined) db.next_contact_date = l.nextContactDate || null;
  if (l.lossReason !== undefined) db.loss_reason = l.lossReason || null;
  if (l.notes !== undefined) db.notes = l.notes;
  if (l.customerId !== undefined) db.customer_id = l.customerId || null;
  return db;
}

export function toAppFollowUp(row: Row): FollowUpTask {
  return {
    id: str(row.id),
    organizationId: str(row.organization_id),
    customerId: str(row.customer_id),
    customerName: str(row.customer_name),
    reason: str(row.reason, 'other') as FollowUpTask['reason'],
    description: str(row.description),
    channel: str(row.channel, 'whatsapp') as FollowUpTask['channel'],
    scheduledDate: str(row.scheduled_date),
    status: str(row.status, 'pending') as FollowUpTask['status'],
    responsible: str(row.responsible),
    result: str(row.result),
    nextActionDate: dateOrNull(row.next_action_date),
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
  };
}

export function toDbFollowUp(f: Partial<FollowUpTask>): Row {
  const db: Row = {};
  if (f.id !== undefined) db.id = f.id;
  if (f.organizationId !== undefined) db.organization_id = f.organizationId;
  if (f.customerId !== undefined) db.customer_id = f.customerId;
  if (f.customerName !== undefined) db.customer_name = f.customerName;
  if (f.reason !== undefined) db.reason = f.reason;
  if (f.description !== undefined) db.description = f.description;
  if (f.channel !== undefined) db.channel = f.channel;
  if (f.scheduledDate !== undefined) db.scheduled_date = f.scheduledDate;
  if (f.status !== undefined) db.status = f.status;
  if (f.responsible !== undefined) db.responsible = f.responsible;
  if (f.result !== undefined) db.result = f.result;
  if (f.nextActionDate !== undefined) db.next_action_date = f.nextActionDate || null;
  return db;
}

export function toAppMessageEvent(row: Row): MessageEvent {
  return {
    id: str(row.id),
    organizationId: str(row.organization_id),
    customerId: str(row.customer_id),
    customerName: str(row.customer_name),
    templateId: str(row.template_id),
    templateName: str(row.template_name),
    channel: str(row.channel, 'whatsapp') as MessageEvent['channel'],
    status: str(row.status, 'pending') as MessageEvent['status'],
    content: str(row.content),
    sentAt: isoOrNull(row.sent_at),
    deliveredAt: isoOrNull(row.delivered_at),
    failedAt: isoOrNull(row.failed_at),
    failureReason: str(row.failure_reason),
    retryCount: num(row.retry_count),
    isTestMode: bool(row.is_test_mode),
    createdAt: str(row.created_at),
  };
}

export function toDbMessageEvent(m: Partial<MessageEvent>): Row {
  const db: Row = {};
  if (m.id !== undefined) db.id = m.id;
  if (m.organizationId !== undefined) db.organization_id = m.organizationId;
  if (m.customerId !== undefined) db.customer_id = m.customerId;
  if (m.customerName !== undefined) db.customer_name = m.customerName;
  if (m.templateId !== undefined) db.template_id = m.templateId || null;
  if (m.templateName !== undefined) db.template_name = m.templateName;
  if (m.channel !== undefined) db.channel = m.channel;
  if (m.status !== undefined) db.status = m.status;
  if (m.content !== undefined) db.content = m.content;
  if (m.sentAt !== undefined) db.sent_at = m.sentAt;
  if (m.deliveredAt !== undefined) db.delivered_at = m.deliveredAt;
  if (m.failedAt !== undefined) db.failed_at = m.failedAt;
  if (m.failureReason !== undefined) db.failure_reason = m.failureReason;
  if (m.retryCount !== undefined) db.retry_count = m.retryCount;
  if (m.isTestMode !== undefined) db.is_test_mode = m.isTestMode;
  return db;
}

export function toAppTemplate(row: Row): MessageTemplate {
  return {
    id: str(row.id),
    organizationId: str(row.organization_id),
    name: str(row.name),
    content: str(row.content),
    channel: str(row.channel, 'whatsapp') as MessageTemplate['channel'],
    active: bool(row.active),
    createdAt: str(row.created_at),
  };
}

export function toDbTemplate(t: Partial<MessageTemplate>): Row {
  const db: Row = {};
  if (t.id !== undefined) db.id = t.id;
  if (t.organizationId !== undefined) db.organization_id = t.organizationId;
  if (t.name !== undefined) db.name = t.name;
  if (t.content !== undefined) db.content = t.content;
  if (t.channel !== undefined) db.channel = t.channel;
  if (t.active !== undefined) db.active = t.active;
  return db;
}

export function toAppCampaign(row: Row): MarketingCampaign {
  return {
    id: str(row.id),
    organizationId: str(row.organization_id),
    name: str(row.name),
    platform: str(row.platform),
    startDate: str(row.start_date),
    endDate: str(row.end_date),
    investment: num(row.investment),
    leadsGenerated: num(row.leads_generated),
    quotesRelated: num(row.quotes_related),
    salesAttributed: num(row.sales_attributed),
    revenueAttributed: num(row.revenue_attributed),
    notes: str(row.notes),
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
  };
}

export function toDbCampaign(c: Partial<MarketingCampaign>): Row {
  const db: Row = {};
  if (c.id !== undefined) db.id = c.id;
  if (c.organizationId !== undefined) db.organization_id = c.organizationId;
  if (c.name !== undefined) db.name = c.name;
  if (c.platform !== undefined) db.platform = c.platform;
  if (c.startDate !== undefined) db.start_date = c.startDate;
  if (c.endDate !== undefined) db.end_date = c.endDate || null;
  if (c.investment !== undefined) db.investment = c.investment;
  if (c.leadsGenerated !== undefined) db.leads_generated = c.leadsGenerated;
  if (c.quotesRelated !== undefined) db.quotes_related = c.quotesRelated;
  if (c.salesAttributed !== undefined) db.sales_attributed = c.salesAttributed;
  if (c.revenueAttributed !== undefined) db.revenue_attributed = c.revenueAttributed;
  if (c.notes !== undefined) db.notes = c.notes;
  return db;
}

export function toRpcSaleItem(i: SaleItem) {
  return {
    product_id: i.productId || null,
    product_name: i.productName,
    quantity: i.quantity,
    unit_price: i.unitPrice,
    discount: i.discount ?? 0,
    total: i.total,
  };
}

export function toRpcQuoteItem(i: QuoteItem) {
  return {
    product_id: i.productId || null,
    product_name: i.productName,
    quantity: i.quantity,
    unit_price: i.unitPrice,
    total: i.total,
  };
}

export function toDbQuote(q: Partial<Quote>): Row {
  const db: Row = {};
  if (q.id !== undefined) db.id = q.id;
  if (q.organizationId !== undefined) db.organization_id = q.organizationId;
  if (q.leadId !== undefined) db.lead_id = q.leadId;
  if (q.customerId !== undefined) db.customer_id = q.customerId || null;
  if (q.customerName !== undefined) db.customer_name = q.customerName;
  if (q.subtotal !== undefined) db.subtotal = q.subtotal;
  if (q.discount !== undefined) db.discount = q.discount;
  if (q.total !== undefined) db.total = q.total;
  if (q.status !== undefined) db.status = q.status;
  if (q.validUntil !== undefined) db.valid_until = q.validUntil || null;
  if (q.notes !== undefined) db.notes = q.notes;
  return db;
}

export function toDbQuoteItem(itemId: string, quoteId: string, i: QuoteItem): Row {
  return {
    id: itemId,
    quote_id: quoteId,
    product_id: i.productId || null,
    product_name: i.productName,
    quantity: i.quantity,
    unit_price: i.unitPrice,
    total: i.total,
  };
}

export function toDbSale(s: Partial<Sale>): Row {
  const db: Row = {};
  if (s.id !== undefined) db.id = s.id;
  if (s.organizationId !== undefined) db.organization_id = s.organizationId;
  if (s.number !== undefined) db.number = s.number;
  if (s.customerId !== undefined) db.customer_id = s.customerId || null;
  if (s.customerName !== undefined) db.customer_name = s.customerName;
  if (s.date !== undefined) db.sale_date = s.date;
  if (s.subtotal !== undefined) db.subtotal = s.subtotal;
  if (s.discount !== undefined) db.discount = s.discount;
  if (s.total !== undefined) db.total = s.total;
  if (s.paymentMethod !== undefined) db.payment_method = s.paymentMethod;
  if (s.status !== undefined) db.status = s.status;
  if (s.origin !== undefined) db.origin = s.origin;
  if (s.responsible !== undefined) db.responsible = s.responsible;
  if (s.notes !== undefined) db.notes = s.notes;
  return db;
}
