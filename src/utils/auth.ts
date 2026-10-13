/**
 * Ateliê da Ótica — Camada de Autenticação
 * 
 * Esta camada está preparada para integração com Supabase Auth.
 * No momento, opera em modo demonstração (mock).
 * 
 * Para ativar autenticação real:
 * 1. Configure as variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
 * 2. Substitua as funções mock por chamadas reais ao Supabase Auth
 * 3. Configure as políticas de RLS no banco de dados
 */

import { UserProfile } from '../types';

export interface AuthState {
  isAuthenticated: boolean;
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
}

export interface AuthConfig {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
}

// Verifica se Supabase está configurado
export function isSupabaseConfigured(): boolean {
  return !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
}

// Modo de operação atual
export function getAuthMode(): 'supabase' | 'demo' {
  return isSupabaseConfigured() ? 'supabase' : 'demo';
}

/**
 * Login em modo demonstração
 * Em produção, substituir por: supabase.auth.signInWithPassword({ email, password })
 */
export async function signInDemo(email: string, _password: string): Promise<{ user: UserProfile | null; error: string | null }> {
  // Simula delay de rede
  await new Promise(resolve => setTimeout(resolve, 500));

  // Aceita qualquer e-mail/senha no modo demo
  if (!email) {
    return { user: null, error: 'E-mail é obrigatório.' };
  }

  const user: UserProfile = {
    id: 'user-demo-' + Date.now(),
    organizationId: 'org-default',
    name: email.split('@')[0] || 'Usuário',
    email,
    role: 'admin',
    createdAt: new Date().toISOString(),
  };

  // Salvar sessão no localStorage
  localStorage.setItem('atelie_da_otica_auth', JSON.stringify({ user, loggedInAt: new Date().toISOString() }));

  return { user, error: null };
}

/**
 * Logout em modo demonstração
 */
export async function signOutDemo(): Promise<void> {
  localStorage.removeItem('atelie_da_otica_auth');
}

/**
 * Verifica sessão atual
 */
export function getSession(): UserProfile | null {
  try {
    const raw = localStorage.getItem('atelie_da_otica_auth');
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data.user || null;
  } catch {
    return null;
  }
}

/**
 * Verifica se usuário tem permissão para ação
 */
export function hasPermission(user: UserProfile | null, action: 'create' | 'edit' | 'delete' | 'export' | 'admin'): boolean {
  if (!user) return false;
  
  const permissions: Record<string, string[]> = {
    owner: ['create', 'edit', 'delete', 'export', 'admin'],
    admin: ['create', 'edit', 'delete', 'export', 'admin'],
    operator: ['create', 'edit'],
    viewer: [],
  };

  return permissions[user.role]?.includes(action) || false;
}

/**
 * Variáveis de ambiente necessárias para produção:
 * 
 * VITE_SUPABASE_URL=https://xxx.supabase.co
 * VITE_SUPABASE_ANON_KEY=eyJ...
 * 
 * NUNCA expor a service_role key no frontend.
 */
