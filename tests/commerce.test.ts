import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadState,
  saveState,
  addCustomer,
  addProduct,
  addSale,
  updateSaleStatus,
  addLead,
  updateLead,
  addQuote,
  addFollowUp,
} from '../src/utils/storage';
import { AppState } from '../src/types';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

describe('Fluxo Comercial Completo', () => {
  let state: AppState;

  beforeEach(() => {
    localStorageMock.clear();
    state = loadState();
  });

  it('inicializa estado vazio com templates', () => {
    expect(state.customers).toHaveLength(0);
    expect(state.products).toHaveLength(0);
    expect(state.sales).toHaveLength(0);
    expect(state.messageTemplates.length).toBeGreaterThan(0);
    expect(state.organization.id).toBe('org-default');
  });

  it('cadastra cliente com sucesso', () => {
    const newState = addCustomer(state, {
      name: 'João Silva',
      phone: '11999887766',
      email: 'joao@test.com',
      origin: 'store',
      contactPreference: 'whatsapp',
      communicationStatus: 'authorized',
      notes: 'Cliente VIP',
      lastPurchaseDate: null,
      nextActionDate: null,
      responsible: 'Admin',
      archived: false,
    });
    expect(newState.customers).toHaveLength(1);
    expect(newState.customers[0].name).toBe('João Silva');
    expect(newState.customers[0].organizationId).toBe('org-default');
    expect(newState.customers[0].id).toBeTruthy();
  });

  it('cadastra produto com sucesso', () => {
    const newState = addProduct(state, {
      name: 'Armação Ray-Ban',
      category: 'frames',
      price: 450.00,
      cost: 200.00,
      code: 'ARM-001',
      active: true,
    });
    expect(newState.products).toHaveLength(1);
    expect(newState.products[0].price).toBe(450);
    expect(newState.products[0].category).toBe('frames');
  });

  it('registra venda com múltiplos itens', () => {
    // Adicionar produto
    let newState = addProduct(state, {
      name: 'Armação Premium',
      category: 'frames',
      price: 500.00,
      cost: 200.00,
      code: 'ARM-001',
      active: true,
    });
    const productId = newState.products[0].id;

    // Adicionar cliente
    newState = addCustomer(newState, {
      name: 'Maria Santos',
      phone: '21987654321',
      email: '',
      origin: 'instagram',
      contactPreference: 'whatsapp',
      communicationStatus: 'authorized',
      notes: '',
      lastPurchaseDate: null,
      nextActionDate: null,
      responsible: '',
      archived: false,
    });
    const customerId = newState.customers[0].id;

    // Registrar venda
    newState = addSale(newState, {
      number: 'V00001',
      customerId,
      customerName: 'Maria Santos',
      date: '2024-06-15',
      items: [
        { id: 'item-1', productId, productName: 'Armação Premium', quantity: 1, unitPrice: 500, discount: 0, total: 500 },
      ],
      subtotal: 500,
      discount: 50,
      total: 450,
      paymentMethod: 'pix',
      status: 'completed',
      origin: 'instagram',
      responsible: 'Admin',
      notes: '',
    });

    expect(newState.sales).toHaveLength(1);
    expect(newState.sales[0].total).toBe(450);
    expect(newState.sales[0].items).toHaveLength(1);
    // Verificar que lastPurchaseDate do cliente foi atualizado
    expect(newState.customers[0].lastPurchaseDate).toBe('2024-06-15');
  });

  it('cancela venda mantendo histórico', () => {
    let newState = addSale(state, {
      number: 'V00001',
      customerId: null,
      customerName: 'Cliente não identificado',
      date: '2024-06-15',
      items: [{ id: 'item-1', productId: 'p1', productName: 'Produto', quantity: 1, unitPrice: 100, discount: 0, total: 100 }],
      subtotal: 100,
      discount: 0,
      total: 100,
      paymentMethod: 'cash',
      status: 'completed',
      origin: 'unknown',
      responsible: '',
      notes: '',
    });

    newState = updateSaleStatus(newState, newState.sales[0].id, 'cancelled');
    expect(newState.sales[0].status).toBe('cancelled');
    // A venda ainda existe no histórico
    expect(newState.sales).toHaveLength(1);
  });

  it('cria lead e converte em cliente', () => {
    let newState = addLead(state, {
      name: 'Pedro Oliveira',
      phone: '31987654321',
      email: 'pedro@test.com',
      origin: 'google',
      stage: 'new_contact',
      estimatedValue: 800,
      responsible: 'Admin',
      nextContactDate: '2024-07-01',
      lossReason: null,
      notes: 'Interessado em lentes progressivas',
      customerId: null,
    });

    expect(newState.leads).toHaveLength(1);
    expect(newState.leads[0].stage).toBe('new_contact');

    // Avançar estágio
    newState = updateLead(newState, newState.leads[0].id, { stage: 'won' });
    expect(newState.leads[0].stage).toBe('won');
  });

  it('cria orçamento com itens', () => {
    const newState = addQuote(state, {
      leadId: 'lead-1',
      customerId: null,
      customerName: 'Ana Costa',
      items: [
        { id: 'qi-1', productId: 'p1', productName: 'Armação', quantity: 1, unitPrice: 300, total: 300 },
        { id: 'qi-2', productId: 'p2', productName: 'Lentes', quantity: 1, unitPrice: 200, total: 200 },
      ],
      subtotal: 500,
      discount: 50,
      total: 450,
      status: 'sent',
      validUntil: '2024-07-30',
      notes: '',
    });

    expect(newState.quotes).toHaveLength(1);
    expect(newState.quotes[0].total).toBe(450);
    expect(newState.quotes[0].items).toHaveLength(2);
  });

  it('cria tarefa de pós-venda', () => {
    // Primeiro cadastrar cliente
    let newState = addCustomer(state, {
      name: 'Carlos Souza',
      phone: '11912345678',
      email: '',
      origin: 'store',
      contactPreference: 'whatsapp',
      communicationStatus: 'authorized',
      notes: '',
      lastPurchaseDate: '2024-06-01',
      nextActionDate: null,
      responsible: '',
      archived: false,
    });

    newState = addFollowUp(newState, {
      customerId: newState.customers[0].id,
      customerName: 'Carlos Souza',
      reason: 'post_purchase',
      description: 'Verificar adaptação às lentes',
      channel: 'whatsapp',
      scheduledDate: '2024-07-01',
      status: 'pending',
      responsible: 'Admin',
      result: '',
      nextActionDate: null,
    });

    expect(newState.followUps).toHaveLength(1);
    expect(newState.followUps[0].reason).toBe('post_purchase');
    expect(newState.followUps[0].status).toBe('pending');
  });

  it('persiste estado no localStorage', () => {
    const newState = addCustomer(state, {
      name: 'Teste Persistência',
      phone: '11999999999',
      email: '',
      origin: 'unknown',
      contactPreference: 'whatsapp',
      communicationStatus: 'pending',
      notes: '',
      lastPurchaseDate: null,
      nextActionDate: null,
      responsible: '',
      archived: false,
    });
    saveState(newState);

    // Recarregar do localStorage
    const loaded = loadState();
    expect(loaded.customers).toHaveLength(1);
    expect(loaded.customers[0].name).toBe('Teste Persistência');
  });

  it('calcula ticket médio corretamente', () => {
    let newState = state;
    // Adicionar 3 vendas
    newState = addSale(newState, {
      number: 'V00001', customerId: null, customerName: 'A', date: '2024-06-01',
      items: [{ id: 'i1', productId: 'p1', productName: 'P1', quantity: 1, unitPrice: 100, discount: 0, total: 100 }],
      subtotal: 100, discount: 0, total: 100, paymentMethod: 'pix', status: 'completed', origin: 'unknown', responsible: '', notes: '',
    });
    newState = addSale(newState, {
      number: 'V00002', customerId: null, customerName: 'B', date: '2024-06-02',
      items: [{ id: 'i2', productId: 'p1', productName: 'P1', quantity: 1, unitPrice: 200, discount: 0, total: 200 }],
      subtotal: 200, discount: 0, total: 200, paymentMethod: 'pix', status: 'completed', origin: 'unknown', responsible: '', notes: '',
    });
    newState = addSale(newState, {
      number: 'V00003', customerId: null, customerName: 'C', date: '2024-06-03',
      items: [{ id: 'i3', productId: 'p1', productName: 'P1', quantity: 1, unitPrice: 300, discount: 0, total: 300 }],
      subtotal: 300, discount: 0, total: 300, paymentMethod: 'pix', status: 'completed', origin: 'unknown', responsible: '', notes: '',
    });

    const validSales = newState.sales.filter(s => s.status === 'completed');
    const avgTicket = validSales.reduce((sum, s) => sum + s.total, 0) / validSales.length;
    expect(avgTicket).toBe(200); // (100 + 200 + 300) / 3
  });

  it('venda cancelada não conta no faturamento', () => {
    let newState = addSale(state, {
      number: 'V00001', customerId: null, customerName: 'A', date: '2024-06-01',
      items: [{ id: 'i1', productId: 'p1', productName: 'P1', quantity: 1, unitPrice: 500, discount: 0, total: 500 }],
      subtotal: 500, discount: 0, total: 500, paymentMethod: 'pix', status: 'completed', origin: 'unknown', responsible: '', notes: '',
    });
    newState = updateSaleStatus(newState, newState.sales[0].id, 'cancelled');

    const validSales = newState.sales.filter(s => s.status === 'completed');
    expect(validSales).toHaveLength(0);
    expect(newState.sales).toHaveLength(1); // Ainda existe no histórico
  });
});
