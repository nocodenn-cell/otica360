import React, { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from 'react';
import { AppState, Customer, Product, Sale, Lead, Quote, FollowUpTask, MarketingCampaign, MessageEvent } from '../types';
import { useAuth, PermissionAction } from './AuthContext';
import { loadState, saveState } from '../utils/storage';
import {
  addCustomer as addCustomerStore, updateCustomer as updateCustomerStore,
  addProduct as addProductStore, updateProduct as updateProductStore,
  addSale as addSaleStore, updateSaleStatus as updateSaleStatusStore,
  addLead as addLeadStore, updateLead as updateLeadStore,
  addQuote as addQuoteStore, updateQuote as updateQuoteStore,
  addFollowUp as addFollowUpStore, updateFollowUp as updateFollowUpStore,
  addCampaign as addCampaignStore, updateCampaign as updateCampaignStore,
  addMessageEvent as addMessageEventStore,
} from '../utils/storage';
import {
  loadWorkspace, uploadLegacyWorkspace, isEmptyWorkspace,
  customersRepo, productsRepo, leadsRepo, followUpsRepo, campaignsRepo, messagesRepo,
  createSale, updateSaleStatus as repoUpdateSaleStatus, createQuote, updateQuote as repoUpdateQuote,
  CommitResult, WorkspaceData,
} from '../services/db/workspace';

export type DataStatus = 'demo' | 'loading' | 'ready' | 'error';

const MIGRATION_KEY = 'atelie_da_otica_migrated_orgs';

type NewOf<T extends { id: string; organizationId: string }> =
  Omit<T, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'> & { organizationId: string };

function baseDemoState(): AppState {
  return loadState();
}

function appendRow<K extends 'customers' | 'products' | 'sales' | 'leads' | 'quotes' | 'followUps' | 'messageEvents' | 'campaigns'>(
  state: AppState, key: K, row: AppState[K][number],
): AppState {
  return { ...state, [key]: [...(state[key] as unknown[]), row] } as AppState;
}

function replaceRow<K extends 'customers' | 'products' | 'sales' | 'leads' | 'quotes' | 'followUps' | 'campaigns'>(
  state: AppState, key: K, id: string, patch: Partial<AppState[K][number]>,
): AppState {
  const list = state[key] as Array<{ id: string }>;
  return {
    ...state,
    [key]: list.map(r => (r.id === id ? { ...r, ...patch } : r)),
  } as AppState;
}

function workspaceToState(w: WorkspaceData, orgId: string, orgName: string, user: AppState['user']): AppState {
  return {
    organization: { id: orgId, name: orgName, createdAt: new Date().toISOString() },
    user,
    customers: w.customers,
    products: w.products,
    sales: w.sales,
    leads: w.leads,
    quotes: w.quotes,
    followUps: w.followUps,
    messageEvents: w.messageEvents,
    messageTemplates: w.messageTemplates,
    campaigns: w.campaigns,
    auditLogs: [],
  };
}

function legacyHasRecords(s: AppState): boolean {
  return [s.customers, s.products, s.sales, s.leads, s.quotes, s.followUps, s.campaigns, s.messageEvents]
    .some(list => list.length > 0);
}

interface AppContextType {
  state: AppState;
  toast: string;
  showToast: (msg: string) => void;
  dataStatus: DataStatus;
  reload: () => void;
  addCustomer: (c: Omit<Customer, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>) => void;
  updateCustomer: (id: string, u: Partial<Customer>) => void;
  addProduct: (p: Omit<Product, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>) => void;
  updateProduct: (id: string, u: Partial<Product>) => void;
  addSale: (s: Omit<Sale, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>) => void;
  updateSaleStatus: (id: string, status: Sale['status']) => void;
  addLead: (l: Omit<Lead, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>) => void;
  updateLead: (id: string, u: Partial<Lead>) => void;
  addQuote: (q: Omit<Quote, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>) => void;
  updateQuote: (id: string, u: Partial<Quote>) => void;
  addFollowUp: (f: Omit<FollowUpTask, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>) => void;
  updateFollowUp: (id: string, u: Partial<FollowUpTask>) => void;
  addCampaign: (c: Omit<MarketingCampaign, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>) => void;
  updateCampaign: (id: string, u: Partial<MarketingCampaign>) => void;
  addMessageEvent: (e: Omit<MessageEvent, 'id' | 'organizationId' | 'createdAt'>) => void;
  importCustomers: (customers: Omit<Customer, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>[]) => void;
  setState: (s: AppState) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const { user, mode, can } = useAuth();
  const isServer = mode === 'supabase' && !!user;

  const [state, setStateValue] = useState<AppState>(() => baseDemoState());
  const stateRef = useRef(state);
  const [toast, setToast] = React.useState('');
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const [dataStatus, setDataStatus] = useState<DataStatus>(isServer ? 'loading' : 'demo');
  const loadedOrgRef = useRef<string | null>(null);
  const loadSeqRef = useRef(0);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToast(''), 3000);
  }, []);

  const guard = useCallback((action: PermissionAction): boolean => {
    if (!can(action)) {
      showToast('Você não tem permissão para esta ação.');
      return false;
    }
    return true;
  }, [can, showToast]);

  const publishState = useCallback((next: AppState) => {
    stateRef.current = next;
    // Em modo servidor a fonte da verdade é o banco; não sobrescrever a chave
    // do modo demonstração, que precisa permanecer intacta para a migração.
    if (!isServer) {
      try {
        saveState(next);
      } catch {
        // cache local indisponível (ex.: cota); estado em memória continua válido
      }
    }
    setStateValue(next);
  }, [isServer]);

  const patchState = useCallback((fn: (s: AppState) => AppState) => {
    publishState(fn(stateRef.current));
  }, [publishState]);

  // --- carregamento do workspace quando autenticado em Supabase ---
  const runLoad = useCallback(async () => {
    if (!user) return;
    const seq = ++loadSeqRef.current;
    const orgId = user.organizationId;
    setDataStatus('loading');
    const res = await loadWorkspace(orgId);
    if (seq !== loadSeqRef.current) return;
    if (!res.ok || !res.data) {
      setDataStatus('error');
      showToast('Não foi possível carregar os dados da organização. Nenhuma alteração será gravada.');
      return;
    }
    let data = res.data;

    // Migração progressiva: org vazia no servidor + acervo local + usuário administrador.
    const legacy = loadState();
    let migrated: string[] = [];
    try {
      migrated = JSON.parse(localStorage.getItem(MIGRATION_KEY) || '[]');
    } catch { migrated = []; }

    if (
      isEmptyWorkspace(data) &&
      legacy.organization?.id !== orgId &&
      legacyHasRecords(legacy) &&
      !migrated.includes(orgId) &&
      can('create')
    ) {
      const up = await uploadLegacyWorkspace(legacy, orgId);
      if (seq !== loadSeqRef.current) return;
      if (!up.ok) {
        setDataStatus('error');
        showToast('Falha ao migrar os dados locais; nada foi apagado.');
        return;
      }
      try {
        localStorage.setItem(MIGRATION_KEY, JSON.stringify([...migrated, orgId]));
      } catch { /* marker é melhor esforço */ }
      const reload = await loadWorkspace(orgId);
      if (seq !== loadSeqRef.current) return;
      if (reload.ok && reload.data) data = reload.data;
      showToast(`${up.data} registro(s) local(is) migrado(s) para o servidor.`);
    }

    publishState(workspaceToState(data, orgId, data.organizationName, user));
    loadedOrgRef.current = orgId;
    setDataStatus('ready');
  }, [user, can, publishState, showToast]);

  useEffect(() => {
    if (!isServer) {
      loadedOrgRef.current = null;
      setDataStatus('demo');
      return;
    }
    if (user && loadedOrgRef.current !== user.organizationId) {
      void runLoad();
    }
  }, [isServer, user, runLoad]);

  // Atualiza o usuário exibido sem recarregar o workspace.
  useEffect(() => {
    if (user && stateRef.current.user?.id !== user.id && loadedOrgRef.current === user.organizationId) {
      patchState(s => ({ ...s, user }));
    }
  }, [user, patchState]);

  // --- commit server-first: grava no banco, só então publica estado/toast ---
  const serverCommit = useCallback(async <T,>(
    run: () => Promise<CommitResult<T>>,
    onOk: (row: T) => void,
    successMsg: string | null,
  ): Promise<void> => {
    const res = await run();
    if (!res.ok || res.data === undefined) {
      showToast(res.error ?? 'Falha ao gravar no servidor. Nenhuma alteração foi confirmada.');
      return;
    }
    onOk(res.data);
    if (successMsg) showToast(successMsg);
  }, [showToast]);

  // --- operações síncronas (modo demonstração, persistindo em localStorage) ---
  const dispatch = useCallback((action: Parameters<typeof reducerAction>[1]): boolean => {
    try {
      const next = reducerAction(stateRef.current, action);
      if (next !== stateRef.current) publishState(next);
      return true;
    } catch (error) {
      console.error('Não foi possível persistir a operação:', error);
      showToast('Erro ao salvar. Nenhuma alteração foi confirmada.');
      return false;
    }
  }, [publishState, showToast]);

  const orgId = user?.organizationId ?? state.organization.id;

  // ---------- Customer ----------
  const addCustomer = useCallback((c: Omit<Customer, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>) => {
    if (!guard('create')) return;
    if (isServer) {
      void serverCommit(
        () => customersRepo.insert({ ...c, organizationId: orgId } as NewOf<Customer>),
        row => patchState(s => appendRow(s, 'customers', row)),
        'Cliente cadastrado com sucesso!',
      );
      return;
    }
    if (dispatch({ type: 'ADD_CUSTOMER', customer: c })) showToast('Cliente cadastrado com sucesso!');
  }, [guard, isServer, orgId, serverCommit, patchState, dispatch, showToast]);

  const updateCustomer = useCallback((id: string, u: Partial<Customer>) => {
    if (!guard('edit')) return;
    if (isServer) {
      void serverCommit(
        () => customersRepo.update(id, u),
        row => patchState(s => replaceRow(s, 'customers', id, row)),
        null,
      );
      return;
    }
    dispatch({ type: 'UPDATE_CUSTOMER', id, updates: u });
  }, [guard, isServer, serverCommit, patchState, dispatch]);

  const importCustomers = useCallback((list: Omit<Customer, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>[]) => {
    if (!guard('create')) return;
    if (isServer) {
      void serverCommit(
        () => customersRepo.bulkInsert(list.map(c => ({ ...c, organizationId: orgId })) as NewOf<Customer>[]),
        rows => patchState(s => ({ ...s, customers: [...s.customers, ...rows] })),
        `${list.length} cliente(s) importado(s)!`,
      );
      return;
    }
    if (dispatch({ type: 'IMPORT_CUSTOMERS', customers: list })) showToast(`${list.length} cliente(s) importado(s)!`);
  }, [guard, isServer, orgId, serverCommit, patchState, dispatch, showToast]);

  // ---------- Product ----------
  const addProduct = useCallback((p: Omit<Product, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>) => {
    if (!guard('create')) return;
    if (isServer) {
      void serverCommit(
        () => productsRepo.insert({ ...p, organizationId: orgId } as NewOf<Product>),
        row => patchState(s => appendRow(s, 'products', row)),
        'Produto cadastrado!',
      );
      return;
    }
    if (dispatch({ type: 'ADD_PRODUCT', product: p })) showToast('Produto cadastrado!');
  }, [guard, isServer, orgId, serverCommit, patchState, dispatch, showToast]);

  const updateProduct = useCallback((id: string, u: Partial<Product>) => {
    if (!guard('edit')) return;
    if (isServer) {
      void serverCommit(() => productsRepo.update(id, u), row => patchState(s => replaceRow(s, 'products', id, row)), null);
      return;
    }
    dispatch({ type: 'UPDATE_PRODUCT', id, updates: u });
  }, [guard, isServer, serverCommit, patchState, dispatch]);

  // ---------- Sale ----------
  const addSale = useCallback((s: Omit<Sale, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>) => {
    if (!guard('create')) return;
    if (isServer) {
      void serverCommit(
        () => createSale({ ...s, organizationId: orgId } as NewOf<Sale>),
        row => patchState(st => {
          let next = appendRow(st, 'sales', row);
          if (row.customerId) {
            next = replaceRow(next, 'customers', row.customerId, { lastPurchaseDate: row.date });
          }
          return next;
        }),
        'Venda registrada!',
      );
      return;
    }
    if (dispatch({ type: 'ADD_SALE', sale: s })) showToast('Venda registrada!');
  }, [guard, isServer, orgId, serverCommit, patchState, dispatch, showToast]);

  const updateSaleStatus = useCallback((id: string, status: Sale['status']) => {
    if (!guard('edit')) return;
    if (isServer) {
      void serverCommit(
        () => repoUpdateSaleStatus(id, status),
        row => patchState(s => replaceRow(s, 'sales', id, { status, updatedAt: row.updatedAt })),
        'Status atualizado!',
      );
      return;
    }
    if (dispatch({ type: 'UPDATE_SALE_STATUS', id, status })) showToast('Status atualizado!');
  }, [guard, isServer, serverCommit, patchState, dispatch, showToast]);

  // ---------- Lead ----------
  const addLead = useCallback((l: Omit<Lead, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>) => {
    if (!guard('create')) return;
    if (isServer) {
      void serverCommit(
        () => leadsRepo.insert({ ...l, organizationId: orgId } as NewOf<Lead>),
        row => patchState(s => appendRow(s, 'leads', row)),
        'Lead cadastrado!',
      );
      return;
    }
    if (dispatch({ type: 'ADD_LEAD', lead: l })) showToast('Lead cadastrado!');
  }, [guard, isServer, orgId, serverCommit, patchState, dispatch, showToast]);

  const updateLead = useCallback((id: string, u: Partial<Lead>) => {
    if (!guard('edit')) return;
    if (isServer) {
      void serverCommit(() => leadsRepo.update(id, u), row => patchState(s => replaceRow(s, 'leads', id, row)), null);
      return;
    }
    dispatch({ type: 'UPDATE_LEAD', id, updates: u });
  }, [guard, isServer, serverCommit, patchState, dispatch]);

  // ---------- Quote ----------
  const addQuote = useCallback((q: Omit<Quote, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>) => {
    if (!guard('create')) return;
    if (isServer) {
      void serverCommit(
        () => createQuote({ ...q, organizationId: orgId } as NewOf<Quote>),
        row => patchState(s => appendRow(s, 'quotes', row)),
        'Orçamento criado!',
      );
      return;
    }
    if (dispatch({ type: 'ADD_QUOTE', quote: q })) showToast('Orçamento criado!');
  }, [guard, isServer, orgId, serverCommit, patchState, dispatch, showToast]);

  const updateQuote = useCallback((id: string, u: Partial<Quote>) => {
    if (!guard('edit')) return;
    if (isServer) {
      void serverCommit(() => repoUpdateQuote(id, u), row => patchState(s => replaceRow(s, 'quotes', id, { ...u, ...row })), null);
      return;
    }
    dispatch({ type: 'UPDATE_QUOTE', id, updates: u });
  }, [guard, isServer, serverCommit, patchState, dispatch]);

  // ---------- FollowUp ----------
  const addFollowUp = useCallback((f: Omit<FollowUpTask, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>) => {
    if (!guard('create')) return;
    if (isServer) {
      void serverCommit(
        () => followUpsRepo.insert({ ...f, organizationId: orgId } as NewOf<FollowUpTask>),
        row => patchState(s => appendRow(s, 'followUps', row)),
        'Tarefa criada!',
      );
      return;
    }
    if (dispatch({ type: 'ADD_FOLLOW_UP', task: f })) showToast('Tarefa criada!');
  }, [guard, isServer, orgId, serverCommit, patchState, dispatch, showToast]);

  const updateFollowUp = useCallback((id: string, u: Partial<FollowUpTask>) => {
    if (!guard('edit')) return;
    if (isServer) {
      void serverCommit(() => followUpsRepo.update(id, u), row => patchState(s => replaceRow(s, 'followUps', id, row)), null);
      return;
    }
    dispatch({ type: 'UPDATE_FOLLOW_UP', id, updates: u });
  }, [guard, isServer, serverCommit, patchState, dispatch]);

  // ---------- Campaign ----------
  const addCampaign = useCallback((c: Omit<MarketingCampaign, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>) => {
    if (!guard('create')) return;
    if (isServer) {
      void serverCommit(
        () => campaignsRepo.insert({ ...c, organizationId: orgId } as NewOf<MarketingCampaign>),
        row => patchState(s => appendRow(s, 'campaigns', row)),
        'Campanha criada!',
      );
      return;
    }
    if (dispatch({ type: 'ADD_CAMPAIGN', campaign: c })) showToast('Campanha criada!');
  }, [guard, isServer, orgId, serverCommit, patchState, dispatch, showToast]);

  const updateCampaign = useCallback((id: string, u: Partial<MarketingCampaign>) => {
    if (!guard('edit')) return;
    if (isServer) {
      void serverCommit(() => campaignsRepo.update(id, u), row => patchState(s => replaceRow(s, 'campaigns', id, row)), null);
      return;
    }
    dispatch({ type: 'UPDATE_CAMPAIGN', id, updates: u });
  }, [guard, isServer, serverCommit, patchState, dispatch]);

  // ---------- Message ----------
  const addMessageEvent = useCallback((e: Omit<MessageEvent, 'id' | 'organizationId' | 'createdAt'>) => {
    if (!guard('create')) return;
    if (isServer) {
      void serverCommit(
        () => messagesRepo.insert({ ...e, organizationId: orgId }),
        row => patchState(s => appendRow(s, 'messageEvents', row)),
        null,
      );
      return;
    }
    dispatch({ type: 'ADD_MESSAGE_EVENT', event: e });
  }, [guard, isServer, orgId, serverCommit, patchState, dispatch]);

  // ---------- Admin ----------
  const setState = useCallback((s: AppState) => {
    if (guard('admin')) publishState(s);
  }, [guard, publishState]);

  const value: AppContextType = {
    state, toast, showToast, dataStatus, reload: () => { void runLoad(); },
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

  // Em modo servidor, bloqueia a UI até o workspace estar carregado:
  // evita exibir/mexer em dados de outra organização ou locais obsoletos.
  if (isServer && dataStatus === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-2">
        <p className="text-gray-600">Carregando dados da organização...</p>
        <p className="text-xs text-gray-400">Se esta tela permanecer, verifique sua conexão e tente novamente.</p>
        <button onClick={() => { void runLoad(); }} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg">
          Tentar novamente
        </button>
      </div>
    );
  }
  if (isServer && dataStatus === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-3 p-4">
        <p className="text-red-700 font-medium">Não foi possível conectar aos dados da organização.</p>
        <p className="text-sm text-gray-500 text-center max-w-md">
          Nada foi alterado. Verifique a conexão com o servidor e tente novamente.
        </p>
        <button onClick={() => { void runLoad(); }} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg">
          Tentar novamente
        </button>
      </div>
    );
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// ---------- reducer do modo demonstração (localStorage) ----------
type DemoAction =
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
  | { type: 'IMPORT_CUSTOMERS'; customers: Omit<Customer, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>[] };

function reducerAction(state: AppState, action: DemoAction): AppState {
  switch (action.type) {
    case 'ADD_CUSTOMER': return addCustomerStore(state, action.customer);
    case 'UPDATE_CUSTOMER': return updateCustomerStore(state, action.id, action.updates);
    case 'ADD_PRODUCT': return addProductStore(state, action.product);
    case 'UPDATE_PRODUCT': return updateProductStore(state, action.id, action.updates);
    case 'ADD_SALE': return addSaleStore(state, action.sale);
    case 'UPDATE_SALE_STATUS': return updateSaleStatusStore(state, action.id, action.status);
    case 'ADD_LEAD': return addLeadStore(state, action.lead);
    case 'UPDATE_LEAD': return updateLeadStore(state, action.id, action.updates);
    case 'ADD_QUOTE': return addQuoteStore(state, action.quote);
    case 'UPDATE_QUOTE': return updateQuoteStore(state, action.id, action.updates);
    case 'ADD_FOLLOW_UP': return addFollowUpStore(state, action.task);
    case 'UPDATE_FOLLOW_UP': return updateFollowUpStore(state, action.id, action.updates);
    case 'ADD_CAMPAIGN': return addCampaignStore(state, action.campaign);
    case 'UPDATE_CAMPAIGN': return updateCampaignStore(state, action.id, action.updates);
    case 'ADD_MESSAGE_EVENT': return addMessageEventStore(state, action.event);
    case 'IMPORT_CUSTOMERS': {
      let next = state;
      for (const c of action.customers) next = addCustomerStore(next, c);
      return next;
    }
    default: return state;
  }
}

export function useApp(): AppContextType {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
