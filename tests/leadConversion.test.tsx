import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { normalizePhone, findCustomerByPhone } from '../src/utils/leadConversion';
import { getTodayStr } from '../src/utils/format';
import { addFollowUp as addFollowUpStore } from '../src/utils/storage';
import { toDbFollowUp } from '../src/services/db/mappers';
import { Customer, FollowUpTask, Lead } from '../src/types';

const holder: { ctx: Record<string, unknown> } = { ctx: {} };

vi.mock('../src/contexts/AppContext', () => ({
  useApp: () => holder.ctx,
}));

vi.mock('../src/contexts/AuthContext', () => ({
  useAuth: () => ({ can: () => true }),
}));

function makeCustomer(over: Partial<Customer> = {}): Customer {
  return {
    id: 'c1', organizationId: 'org1', name: 'Cliente Legado Um', phone: '11999990000',
    email: '', origin: 'store', contactPreference: 'whatsapp', communicationStatus: 'pending',
    notes: '', lastPurchaseDate: null, nextActionDate: null, responsible: '', archived: false,
    createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', ...over,
  };
}

function makeLead(over: Partial<Lead> = {}): Lead {
  return {
    id: 'l1', organizationId: 'org1', name: 'Lead Novo', phone: '11977770000', email: '',
    origin: 'indication', stage: 'quote_sent', estimatedValue: 250, responsible: 'Bia',
    nextContactDate: '2026-11-10', lossReason: null, notes: '', customerId: null,
    createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', ...over,
  };
}

function setupCtx(customers: Customer[], leads: Lead[]) {
  let state: Record<string, unknown> = {
    organization: { id: 'org1', name: 'Org' },
    customers, leads, products: [], sales: [], quotes: [], followUps: [],
    messageEvents: [], campaigns: [], messageTemplates: [],
  };
  // Igual ao contexto real: o append produz um array novo, entao a unica forma
  // confiavel de ver a linha gravada apos o await e ler pelo espelho vivo.
  const addCustomer = vi.fn(async (c: Omit<Customer, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>) => {
    state = { ...state, customers: [...(state.customers as Customer[]), { ...c, id: 'cNOVO', organizationId: 'org1', createdAt: '', updatedAt: '' } as Customer] };
    return true;
  });
  const updateLead = vi.fn(async (id: string, u: Partial<Lead>) => {
    const l = (state.leads as Lead[]).find(x => x.id === id);
    if (l && 'customerId' in u) l.customerId = u.customerId ?? null;
    return true;
  });
  holder.ctx = {
    get state() { return state; },
    getState: () => state,
    addCustomer, updateLead, showToast: vi.fn(),
    addLead: vi.fn(async () => true), addQuote: vi.fn(async () => true),
  };
  return { addCustomer, updateLead };
}

beforeEach(() => { vi.resetModules(); holder.ctx = {}; });

describe('findCustomerByPhone', () => {
  it('normaliza formatos diferentes de telefone', () => {
    expect(normalizePhone('(11) 97777-0000')).toBe('11977770000');
    const customers = [makeCustomer({ phone: '(11) 97777-0000' })];
    expect(findCustomerByPhone(customers, makeLead({ phone: '11977770000' }))?.id).toBe('c1');
  });

  it('telefone vazio ou só símbolos não casa com nada', () => {
    const customers = [makeCustomer({ phone: '' })];
    expect(findCustomerByPhone(customers, makeLead({ phone: '' }))).toBeUndefined();
    expect(findCustomerByPhone(customers, makeLead({ phone: '---' }))).toBeUndefined();
  });
});

describe('Conversão de lead (Leads.tsx)', () => {
  it('mover para "Venda concluída" cria cliente e vincula leads.customer_id', async () => {
    const { LeadsPage } = await loadLeads();
    const { addCustomer, updateLead } = setupCtx([], [makeLead()]);
    render(<MemoryRouter><LeadsPage /></MemoryRouter>);
    fireEvent.click(screen.getByText('Lead Novo'));
    const btn = screen.getAllByText('Venda concluída');
    fireEvent.click(btn[btn.length - 1]);
    await waitFor(() => expect(addCustomer).toHaveBeenCalled());
    await waitFor(() => expect(updateLead).toHaveBeenCalledWith('l1', { customerId: 'cNOVO' }));
  });

  it('lead sem cliente, botão "Converter em Cliente" vincula cliente existente por telefone', async () => {
    const { LeadsPage } = await loadLeads();
    const { addCustomer, updateLead } = setupCtx([makeCustomer({ phone: '(11) 97777-0000' })], [makeLead()]);
    render(<MemoryRouter><LeadsPage /></MemoryRouter>);
    fireEvent.click(screen.getByText('Lead Novo'));
    fireEvent.click(screen.getByText('Converter em Cliente'));
    await waitFor(() => expect(updateLead).toHaveBeenCalledWith('l1', { customerId: 'c1' }));
    expect(addCustomer).not.toHaveBeenCalled();
  });

  it('falha ao gravar não exibe sucesso', async () => {
    const { LeadsPage } = await loadLeads();
    setupCtx([], [makeLead()]);
    holder.ctx.updateLead = vi.fn(async () => false);
    const showToast = holder.ctx.showToast as ReturnType<typeof vi.fn>;
    render(<MemoryRouter><LeadsPage /></MemoryRouter>);
    fireEvent.click(screen.getByText('Lead Novo'));
    const btn = screen.getAllByText('Venda concluída');
    fireEvent.click(btn[btn.length - 1]);
    await new Promise(r => setTimeout(r, 10));
    expect(showToast).not.toHaveBeenCalledWith('Lead convertido em venda!');
  });
});

describe('Responsável em tarefas de pós-venda', () => {
  it('payload do servidor inclui responsible', () => {
    const db = toDbFollowUp({ responsible: 'Bia', status: 'pending' });
    expect(db.responsible).toBe('Bia');
  });

  it('reducer do modo demo preserva responsible', () => {
    const base = {
      organization: { id: 'org1', name: 'Org' },
      customers: [], products: [], sales: [], leads: [], quotes: [], messageEvents: [], campaigns: [], messageTemplates: [],
      followUps: [],
    } as never;
    const next = addFollowUpStore(base as never, {
      customerId: 'c1', customerName: 'X', reason: 'satisfaction' as FollowUpReason, description: '',
      channel: 'whatsapp' as ContactPreference, scheduledDate: getTodayStr(), status: 'pending' as FollowUpStatus,
      responsible: 'Bia', result: '', nextActionDate: null,
    } as never);
    const task = (next as { followUps: FollowUpTask[] }).followUps[0];
    expect(task.responsible).toBe('Bia');
  });

  it('FollowUps.tsx envia o responsável preenchido no formulário', async () => {
    const { FollowUpsPage } = await loadFollowUps();
    setupCtx([makeCustomer()], []);
    const addFollowUp = vi.fn(async () => true);
    holder.ctx.addFollowUp = addFollowUp;
    render(<MemoryRouter><FollowUpsPage /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Nova Tarefa' }));
    const modal = screen.getByText('Nova Tarefa de Acompanhamento').closest('div.bg-white') as HTMLElement;
    const sel = modal.querySelectorAll('select')[0];
    fireEvent.change(sel, { target: { value: 'c1' } });
    const resp = [...modal.querySelectorAll('input')].find(i => i.type !== 'date');
    fireEvent.change(resp, { target: { value: 'Bia' } });
    fireEvent.click(screen.getByText('Criar Tarefa'));
    await waitFor(() => expect(addFollowUp).toHaveBeenCalled());
    expect(addFollowUp.mock.calls[0][0].responsible).toBe('Bia');
  });
});

async function loadLeads() {
  const mod = await import('../src/pages/Leads');
  return { LeadsPage: mod.default };
}

async function loadFollowUps() {
  const mod = await import('../src/pages/FollowUps');
  return { FollowUpsPage: mod.default };
}
