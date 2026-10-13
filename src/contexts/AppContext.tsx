import React, { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';
import { AppState, Customer, Product, Sale, Lead, Quote, FollowUpTask, MarketingCampaign, MessageEvent } from '../types';
import { loadState, saveState, addCustomer as addCustomerStore, updateCustomer as updateCustomerStore, addProduct as addProductStore, updateProduct as updateProductStore, addSale as addSaleStore, updateSaleStatus as updateSaleStatusStore, addLead as addLeadStore, updateLead as updateLeadStore, addQuote as addQuoteStore, updateQuote as updateQuoteStore, addFollowUp as addFollowUpStore, updateFollowUp as updateFollowUpStore, addCampaign as addCampaignStore, updateCampaign as updateCampaignStore, addMessageEvent as addMessageEventStore } from '../utils/storage';

type Action = { type: 'SET_STATE'; payload: AppState } | { type: 'RESET' };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_STATE': return action.payload;
    case 'RESET': {
      const fresh = loadState();
      return fresh;
    }
    default: return state;
  }
}

interface AppContextType {
  state: AppState;
  toast: string;
  showToast: (msg: string) => void;
  // Customer
  addCustomer: (c: Omit<Customer, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>) => void;
  updateCustomer: (id: string, u: Partial<Customer>) => void;
  // Product
  addProduct: (p: Omit<Product, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>) => void;
  updateProduct: (id: string, u: Partial<Product>) => void;
  // Sale
  addSale: (s: Omit<Sale, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>) => void;
  updateSaleStatus: (id: string, status: Sale['status']) => void;
  // Lead
  addLead: (l: Omit<Lead, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>) => void;
  updateLead: (id: string, u: Partial<Lead>) => void;
  // Quote
  addQuote: (q: Omit<Quote, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>) => void;
  updateQuote: (id: string, u: Partial<Quote>) => void;
  // FollowUp
  addFollowUp: (f: Omit<FollowUpTask, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>) => void;
  updateFollowUp: (id: string, u: Partial<FollowUpTask>) => void;
  // Campaign
  addCampaign: (c: Omit<MarketingCampaign, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>) => void;
  updateCampaign: (id: string, u: Partial<MarketingCampaign>) => void;
  // Messages
  addMessageEvent: (e: Omit<MessageEvent, 'id' | 'organizationId' | 'createdAt'>) => void;
  // Bulk
  importCustomers: (customers: Omit<Customer, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>[]) => void;
  setState: (s: AppState) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, null, () => loadState());
  const [toast, setToast] = React.useState('');

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }, []);

  const persist = useCallback((newState: AppState) => {
    saveState(newState);
    dispatch({ type: 'SET_STATE', payload: newState });
  }, []);

  const addCustomerFn = useCallback((c: Omit<Customer, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>) => {
    const newState = addCustomerStore(state, c);
    persist(newState);
    showToast('Cliente cadastrado com sucesso!');
  }, [state, persist, showToast]);

  const updateCustomerFn = useCallback((id: string, u: Partial<Customer>) => {
    const newState = updateCustomerStore(state, id, u);
    persist(newState);
  }, [state, persist]);

  const addProductFn = useCallback((p: Omit<Product, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>) => {
    const newState = addProductStore(state, p);
    persist(newState);
    showToast('Produto cadastrado!');
  }, [state, persist, showToast]);

  const updateProductFn = useCallback((id: string, u: Partial<Product>) => {
    const newState = updateProductStore(state, id, u);
    persist(newState);
  }, [state, persist]);

  const addSaleFn = useCallback((s: Omit<Sale, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>) => {
    const newState = addSaleStore(state, s);
    persist(newState);
    showToast('Venda registrada!');
  }, [state, persist, showToast]);

  const updateSaleStatusFn = useCallback((id: string, status: Sale['status']) => {
    const newState = updateSaleStatusStore(state, id, status);
    persist(newState);
    showToast('Status atualizado!');
  }, [state, persist, showToast]);

  const addLeadFn = useCallback((l: Omit<Lead, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>) => {
    const newState = addLeadStore(state, l);
    persist(newState);
    showToast('Lead cadastrado!');
  }, [state, persist, showToast]);

  const updateLeadFn = useCallback((id: string, u: Partial<Lead>) => {
    const newState = updateLeadStore(state, id, u);
    persist(newState);
  }, [state, persist]);

  const addQuoteFn = useCallback((q: Omit<Quote, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>) => {
    const newState = addQuoteStore(state, q);
    persist(newState);
    showToast('Orçamento criado!');
  }, [state, persist, showToast]);

  const updateQuoteFn = useCallback((id: string, u: Partial<Quote>) => {
    const newState = updateQuoteStore(state, id, u);
    persist(newState);
  }, [state, persist]);

  const addFollowUpFn = useCallback((f: Omit<FollowUpTask, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>) => {
    const newState = addFollowUpStore(state, f);
    persist(newState);
    showToast('Tarefa criada!');
  }, [state, persist, showToast]);

  const updateFollowUpFn = useCallback((id: string, u: Partial<FollowUpTask>) => {
    const newState = updateFollowUpStore(state, id, u);
    persist(newState);
  }, [state, persist]);

  const addCampaignFn = useCallback((c: Omit<MarketingCampaign, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>) => {
    const newState = addCampaignStore(state, c);
    persist(newState);
    showToast('Campanha criada!');
  }, [state, persist, showToast]);

  const updateCampaignFn = useCallback((id: string, u: Partial<MarketingCampaign>) => {
    const newState = updateCampaignStore(state, id, u);
    persist(newState);
  }, [state, persist]);

  const addMessageEventFn = useCallback((e: Omit<MessageEvent, 'id' | 'organizationId' | 'createdAt'>) => {
    const newState = addMessageEventStore(state, e);
    persist(newState);
  }, [state, persist]);

  const importCustomersFn = useCallback((customers: Omit<Customer, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>[]) => {
    let newState = { ...state };
    for (const c of customers) {
      newState = addCustomerStore(newState, c);
    }
    persist(newState);
    showToast(`${customers.length} cliente(s) importado(s)!`);
  }, [state, persist, showToast]);

  const setStateFn = useCallback((s: AppState) => {
    persist(s);
  }, [persist]);

  const value: AppContextType = {
    state, toast, showToast,
    addCustomer: addCustomerFn, updateCustomer: updateCustomerFn,
    addProduct: addProductFn, updateProduct: updateProductFn,
    addSale: addSaleFn, updateSaleStatus: updateSaleStatusFn,
    addLead: addLeadFn, updateLead: updateLeadFn,
    addQuote: addQuoteFn, updateQuote: updateQuoteFn,
    addFollowUp: addFollowUpFn, updateFollowUp: updateFollowUpFn,
    addCampaign: addCampaignFn, updateCampaign: updateCampaignFn,
    addMessageEvent: addMessageEventFn,
    importCustomers: importCustomersFn,
    setState: setStateFn,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextType {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
