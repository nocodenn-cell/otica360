import { AppState, Customer, Product, Sale, Lead, Quote, FollowUpTask, MessageEvent, MessageTemplate, MarketingCampaign } from '../types';
import { v4 as uuid } from 'uuid';

const STORAGE_KEY = 'atelie_da_otica_data';

function getInitialState(): AppState {
  const orgId = 'org-default';
  return {
    organization: { id: orgId, name: 'Ateliê da Ótica', createdAt: new Date().toISOString() },
    user: { id: 'user-1', organizationId: orgId, name: 'Administrador', email: 'admin@ateliedaotica.com', role: 'admin', createdAt: new Date().toISOString() },
    customers: [],
    products: [],
    sales: [],
    leads: [],
    quotes: [],
    followUps: [],
    messageEvents: [],
    messageTemplates: [
      { id: uuid(), organizationId: orgId, name: 'Boas-vindas', content: 'Olá {{nome}}, seja bem-vindo(a) ao Ateliê da Ótica! Estamos felizes em atendê-lo(a).', channel: 'whatsapp', active: true, createdAt: new Date().toISOString() },
      { id: uuid(), organizationId: orgId, name: 'Pós-venda', content: 'Olá {{nome}}, como está se adaptando ao seu novo óculos? Estamos à disposição!', channel: 'whatsapp', active: true, createdAt: new Date().toISOString() },
      { id: uuid(), organizationId: orgId, name: 'Lembrete de revisão', content: 'Olá {{nome}}, já faz um tempo desde sua última consulta. Que tal agendar uma revisão?', channel: 'whatsapp', active: true, createdAt: new Date().toISOString() },
    ],
    campaigns: [],
    auditLogs: [],
  };
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error loading state:', e);
  }
  const initial = getInitialState();
  saveState(initial);
  return initial;
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Error saving state:', e);
    throw e;
  }
}

// Customer operations
export function addCustomer(state: AppState, customer: Omit<Customer, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>): AppState {
  const newCustomer: Customer = {
    ...customer,
    id: uuid(),
    organizationId: state.organization.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return { ...state, customers: [...state.customers, newCustomer] };
}

export function updateCustomer(state: AppState, id: string, updates: Partial<Customer>): AppState {
  return {
    ...state,
    customers: state.customers.map(c => c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c),
  };
}

export function findDuplicateCustomers(customers: Customer[], phone: string, excludeId?: string): Customer[] {
  const digits = phone.replace(/\D/g, '');
  return customers.filter(c => {
    if (c.id === excludeId) return false;
    const cDigits = c.phone.replace(/\D/g, '');
    return cDigits === digits || (cDigits.length >= 8 && digits.length >= 8 && cDigits.slice(-8) === digits.slice(-8));
  });
}

// Product operations
export function addProduct(state: AppState, product: Omit<Product, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>): AppState {
  const newProduct: Product = {
    ...product,
    id: uuid(),
    organizationId: state.organization.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return { ...state, products: [...state.products, newProduct] };
}

export function updateProduct(state: AppState, id: string, updates: Partial<Product>): AppState {
  return {
    ...state,
    products: state.products.map(p => p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p),
  };
}

// Sale operations
export function addSale(state: AppState, sale: Omit<Sale, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>): AppState {
  const newSale: Sale = {
    ...sale,
    id: uuid(),
    organizationId: state.organization.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  // Update customer last purchase
  let customers = state.customers;
  if (sale.customerId) {
    customers = customers.map(c => c.id === sale.customerId ? { ...c, lastPurchaseDate: sale.date, updatedAt: new Date().toISOString() } : c);
  }
  return { ...state, sales: [...state.sales, newSale], customers };
}

export function updateSaleStatus(state: AppState, id: string, status: Sale['status']): AppState {
  return {
    ...state,
    sales: state.sales.map(s => s.id === id ? { ...s, status, updatedAt: new Date().toISOString() } : s),
  };
}

// Lead operations
export function addLead(state: AppState, lead: Omit<Lead, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>): AppState {
  const newLead: Lead = {
    ...lead,
    id: uuid(),
    organizationId: state.organization.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return { ...state, leads: [...state.leads, newLead] };
}

export function updateLead(state: AppState, id: string, updates: Partial<Lead>): AppState {
  return {
    ...state,
    leads: state.leads.map(l => l.id === id ? { ...l, ...updates, updatedAt: new Date().toISOString() } : l),
  };
}

// Quote operations
export function addQuote(state: AppState, quote: Omit<Quote, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>): AppState {
  const newQuote: Quote = {
    ...quote,
    id: uuid(),
    organizationId: state.organization.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return { ...state, quotes: [...state.quotes, newQuote] };
}

export function updateQuote(state: AppState, id: string, updates: Partial<Quote>): AppState {
  return {
    ...state,
    quotes: state.quotes.map(q => q.id === id ? { ...q, ...updates, updatedAt: new Date().toISOString() } : q),
  };
}

// Follow-up operations
export function addFollowUp(state: AppState, task: Omit<FollowUpTask, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>): AppState {
  const newTask: FollowUpTask = {
    ...task,
    id: uuid(),
    organizationId: state.organization.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return { ...state, followUps: [...state.followUps, newTask] };
}

export function updateFollowUp(state: AppState, id: string, updates: Partial<FollowUpTask>): AppState {
  return {
    ...state,
    followUps: state.followUps.map(f => f.id === id ? { ...f, ...updates, updatedAt: new Date().toISOString() } : f),
  };
}

// Campaign operations
export function addCampaign(state: AppState, campaign: Omit<MarketingCampaign, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>): AppState {
  const newCampaign: MarketingCampaign = {
    ...campaign,
    id: uuid(),
    organizationId: state.organization.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return { ...state, campaigns: [...state.campaigns, newCampaign] };
}

export function updateCampaign(state: AppState, id: string, updates: Partial<MarketingCampaign>): AppState {
  return {
    ...state,
    campaigns: state.campaigns.map(c => c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c),
  };
}

// Message operations
export function addMessageEvent(state: AppState, event: Omit<MessageEvent, 'id' | 'organizationId' | 'createdAt'>): AppState {
  const newEvent: MessageEvent = {
    ...event,
    id: uuid(),
    organizationId: state.organization.id,
    createdAt: new Date().toISOString(),
  };
  return { ...state, messageEvents: [...state.messageEvents, newEvent] };
}

// CSV import: RFC 4180-style quoted fields, including escaped quotes and newlines.
export function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const input = text.replace(/^\uFEFF/, '');
  if (!input.trim()) return { headers: [], rows: [] };
  const records: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let afterQuote = false;
  let atFieldStart = true;
  const finishField = () => {
    row.push(field);
    field = '';
    atFieldStart = true;
    afterQuote = false;
  };
  const finishRow = () => {
    finishField();
    if (row.some(value => value.length > 0)) records.push(row);
    row = [];
  };
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (inQuotes) {
      if (c === '"') {
        if (input[i + 1] === '"') { field += '"'; i++; }
        else { inQuotes = false; afterQuote = true; }
      } else field += c;
    } else if (c === ',') {
      finishField();
    } else if (c === '\n' || c === '\r') {
      finishRow();
      if (c === '\r' && input[i + 1] === '\n') i++;
    } else if (c === '"' && atFieldStart) {
      inQuotes = true;
      atFieldStart = false;
    } else if (c === '"' || afterQuote) {
      throw new Error('CSV inválido: aspas malformadas');
    } else {
      field += c;
      atFieldStart = false;
    }
  }
  if (inQuotes) throw new Error('CSV inválido: aspas não fechadas');
  if (field !== '' || row.length > 0 || afterQuote) finishRow();
  const [headers = [], ...rows] = records;
  if (rows.some(r => r.length !== headers.length)) {
    throw new Error('CSV inválido: número de colunas inconsistente');
  }
  return { headers, rows };
}

export function exportToCSV(headers: string[], rows: string[][]): string {
  const encode = (value: string) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  return [headers.map(h => /[\",\r\n]/.test(h) ? encode(h) : h).join(','), ...rows.map(row => row.map(encode).join(','))].join('\r\n');
}
