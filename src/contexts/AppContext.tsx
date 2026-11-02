import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import { AppState, Customer, Product, Sale, Lead, Quote, FollowUpTask, MarketingCampaign, MessageEvent } from '../types';
import { loadState, saveState, addCustomer as addCustomerStore, updateCustomer as updateCustomerStore, addProduct as addProductStore, updateProduct as updateProductStore, addSale as addSaleStore, updateSaleStatus as updateSaleStatusStore, addLead as addLeadStore, updateLead as updateLeadStore, addQuote as addQuoteStore, updateQuote as updateQuoteStore, addFollowUp as addFollowUpStore, updateFollowUp as updateFollowUpStore, addCampaign as addCampaignStore, updateCampaign as updateCampaignStore, addMessageEvent as addMessageEventStore } from '../utils/storage';

// Use functional updates to avoid stale closure issues
type Action =
  | { type: 'SET_STATE'; payload: AppState }
  | { type: 'ADD_CUSTOMER'; customer: Omit<Customer, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'> }
  | { type: 'UPDATE_CUSTOMER'; id: string; updates: Partial<Customer> }
  | { type: 'ADD_PRODUCT'; product: Omit<Product, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'> }
  | { type: 'UPDATE_PRODUCT'; id: string; updates: Partial<Product> }
  | { type: 'ADD_SALE'; sale: Omit<Sale, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'> }
  | { type: 'UPDATE_SALE_STATUS'; id: string; status: Sale['status'] }
  | { type: 'ADD_LEAD'; lead: Omit<Lead, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'> }
  | { type: 'UPDATE_LEAD'; id: string; updates: Partial<Lead> }
  | { type: 'ADD_QUOTE'; quote: Omit<Quote, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'> }
  | { type: 'UPDATE_QUOTE'; id: string; updates: Partial<Quote> }
  | { type: 'ADD_FOLLOW_UP'; task: Omit<FollowUpTask, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'> }
  | { type: 'UPDATE_FOLLOW_UP'; id: string; updates: Partial<FollowUpTask> }
  | { type: 'ADD_CAMPAIGN'; campaign: Omit<MarketingCampaign, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'> }
  | { type: 'UPDATE_CAMPAIGN'; id: string; updates: Partial<MarketingCampaign> }
  | { type: 'ADD_MESSAGE_EVENT'; event: Omit<MessageEvent, 'id' | 'organizationId' | 'createdAt'> }
  | { type: 'IMPORT_CUSTOMERS'; customers: Omit<Customer, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>[] }
  | { type: 'RESET' };

function reducer(state: AppState, action: Action): AppState {
  let newState: AppState;
  switch (action.type) {
    case 'SET_STATE':
      return action.payload;
    case 'RESET':
      return loadState();
    case 'ADD_CUSTOMER':
      newState = addCustomerStore(state, action.customer);
      break;
    case 'UPDATE_CUSTOMER':
      newState = updateCustomerStore(state, action.id, action.updates);
      break;
    case 'ADD_PRODUCT':
      newState = addProductStore(state, action.product);
      break;
    case 'UPDATE_PRODUCT':
      newState = updateProductStore(state, action.id, action.updates);
      break;
    case 'ADD_SALE':
      newState = addSaleStore(state, action.sale);
      break;
    case 'UPDATE_SALE_STATUS':
      newState = updateSaleStatusStore(state, action.id, action.status);
      break;
    case 'ADD_LEAD':
      newState = addLeadStore(state, action.lead);
      break;
    case 'UPDATE_LEAD':
      newState = updateLeadStore(state, action.id, action.updates);
      break;
    case 'ADD_QUOTE':
      newState = addQuoteStore(state, action.quote);
      break;
    case 'UPDATE_QUOTE':
      newState = updateQuoteStore(state, action.id, action.updates);
      break;
    case 'ADD_FOLLOW_UP':
      newState = addFollowUpStore(state, action.task);
      break;
    case 'UPDATE_FOLLOW_UP':
      newState = updateFollowUpStore(state, action.id, action.updates);
      break;
    case 'ADD_CAMPAIGN':
      newState = addCampaignStore(state, action.campaign);
      break;
    case 'UPDATE_CAMPAIGN':
      newState = updateCampaignStore(state, action.id, action.updates);
      break;
    case 'ADD_MESSAGE_EVENT':
      newState = addMessageEventStore(state, action.event);
      break;
    case 'IMPORT_CUSTOMERS':
      newState = { ...state };
      for (const c of action.customers) {
        newState = addCustomerStore(newState, c);
      }
      break;
    default:
      return state;
  }
  return newState;
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
  const [state, setStateValue] = useState<AppState>(() => loadState());
  const stateRef = useRef(state);
  const [toast, setToast] = React.useState('');
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToast(''), 3000);
  }, []);

  // Persist synchronously before publishing the new state or confirming success.
  // A ref keeps consecutive operations based on the latest committed state.
  const dispatch = useCallback((action: Action): boolean => {
    try {
      const next = reducer(stateRef.current, action);
      if (next !== stateRef.current) {
        saveState(next);
        stateRef.current = next;
        setStateValue(next);
      }
      return true;
    } catch (error) {
      console.error('Não foi possível persistir a operação:', error);
      showToast('Erro ao salvar. Nenhuma alteração foi confirmada.');
      return false;
    }
  }, [showToast]);

  // All dispatches use action objects — no stale closures
  const addCustomer = useCallback((c: Omit<Customer, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>) => {
    if (dispatch({ type: 'ADD_CUSTOMER', customer: c })) {
    showToast('Cliente cadastrado com sucesso!'); }
  }, [showToast]);

  const updateCustomer = useCallback((id: string, u: Partial<Customer>) => {
    dispatch({ type: 'UPDATE_CUSTOMER', id, updates: u });
  }, []);

  const addProduct = useCallback((p: Omit<Product, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>) => {
    if (dispatch({ type: 'ADD_PRODUCT', product: p })) {
    showToast('Produto cadastrado!'); }
  }, [showToast]);

  const updateProduct = useCallback((id: string, u: Partial<Product>) => {
    dispatch({ type: 'UPDATE_PRODUCT', id, updates: u });
  }, []);

  const addSale = useCallback((s: Omit<Sale, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>) => {
    if (dispatch({ type: 'ADD_SALE', sale: s })) {
    showToast('Venda registrada!'); }
  }, [showToast]);

  const updateSaleStatus = useCallback((id: string, status: Sale['status']) => {
    if (dispatch({ type: 'UPDATE_SALE_STATUS', id, status })) {
    showToast('Status atualizado!'); }
  }, [showToast]);

  const addLead = useCallback((l: Omit<Lead, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>) => {
    if (dispatch({ type: 'ADD_LEAD', lead: l })) {
    showToast('Lead cadastrado!'); }
  }, [showToast]);

  const updateLead = useCallback((id: string, u: Partial<Lead>) => {
    dispatch({ type: 'UPDATE_LEAD', id, updates: u });
  }, []);

  const addQuote = useCallback((q: Omit<Quote, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>) => {
    if (dispatch({ type: 'ADD_QUOTE', quote: q })) {
    showToast('Orçamento criado!'); }
  }, [showToast]);

  const updateQuote = useCallback((id: string, u: Partial<Quote>) => {
    dispatch({ type: 'UPDATE_QUOTE', id, updates: u });
  }, []);

  const addFollowUp = useCallback((f: Omit<FollowUpTask, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>) => {
    if (dispatch({ type: 'ADD_FOLLOW_UP', task: f })) {
    showToast('Tarefa criada!'); }
  }, [showToast]);

  const updateFollowUp = useCallback((id: string, u: Partial<FollowUpTask>) => {
    dispatch({ type: 'UPDATE_FOLLOW_UP', id, updates: u });
  }, []);

  const addCampaign = useCallback((c: Omit<MarketingCampaign, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>) => {
    if (dispatch({ type: 'ADD_CAMPAIGN', campaign: c })) {
    showToast('Campanha criada!'); }
  }, [showToast]);

  const updateCampaign = useCallback((id: string, u: Partial<MarketingCampaign>) => {
    dispatch({ type: 'UPDATE_CAMPAIGN', id, updates: u });
  }, []);

  const addMessageEvent = useCallback((e: Omit<MessageEvent, 'id' | 'organizationId' | 'createdAt'>) => {
    dispatch({ type: 'ADD_MESSAGE_EVENT', event: e });
  }, []);

  const importCustomers = useCallback((customers: Omit<Customer, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>[]) => {
    if (dispatch({ type: 'IMPORT_CUSTOMERS', customers })) {
    showToast(`${customers.length} cliente(s) importado(s)!`); }
  }, [showToast]);

  const setState = useCallback((s: AppState) => {
    dispatch({ type: 'SET_STATE', payload: s });
  }, []);

  const value: AppContextType = {
    state, toast, showToast,
    addCustomer, updateCustomer,
    addProduct, updateProduct,
    addSale, updateSaleStatus,
    addLead, updateLead,
    addQuote, updateQuote,
    addFollowUp, updateFollowUp,
    addCampaign, updateCampaign,
    addMessageEvent,
    importCustomers,
    setState,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextType {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
