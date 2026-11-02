/**
 * Ótica360 — Camada de autenticação
 *
 * Modo supabase: VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY definidos.
 * Modo demo: apenas em build de desenvolvimento; NUNCA em produção.
 */

import { createClient, SupabaseClient, Session } from '@supabase/supabase-js';
import { UserProfile } from '../types';

const DEMO_SESSION_KEY = 'atelie_da_otica_auth';

export type AuthErrorCode =
  | 'invalid_credentials'
  | 'no_profile'
  | 'demo_forbidden'
  | 'network'
  | 'unknown';

export interface AuthResult {
  user: UserProfile | null;
  error: string | null;
  code?: AuthErrorCode;
}

let cachedClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  if (!cachedClient) cachedClient = createClient(url, anonKey);
  return cachedClient;
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseClient() !== null;
}

export function getAuthMode(): 'supabase' | 'demo' {
  return isSupabaseConfigured() ? 'supabase' : 'demo';
}

export function isDemoAllowed(): boolean {
  return !import.meta.env.PROD;
}

interface ProfileRow {
  id: string;
  organization_id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  created_at: string;
}

function toUserProfile(row: ProfileRow): UserProfile {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    email: row.email,
    role: row.role as UserProfile['role'],
    createdAt: row.created_at,
  };
}

async function loadProfile(supabase: SupabaseClient): Promise<{ user: UserProfile | null; error: string | null }> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData.session) {
    return { user: null, error: 'Sessão inválida ou expirada.' };
  }
  const uid = sessionData.session.user.id;
  const { data, error } = await supabase
    .from('profiles')
    .select('id, organization_id, name, email, role, active, created_at')
    .eq('id', uid)
    .maybeSingle();
  if (error) {
    return { user: null, error: 'Não foi possível carregar o perfil. Verifique as políticas de acesso (RLS).' };
  }
  if (!data || (data as ProfileRow).active === false) {
    await supabase.auth.signOut();
    return { user: null, error: 'Usuário sem perfil ativo nesta organização.' };
  }
  return { user: toUserProfile(data as ProfileRow), error: null };
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  if (!email) return { user: null, error: 'E-mail é obrigatório.', code: 'invalid_credentials' };
  if (!password) return { user: null, error: 'Senha é obrigatória.', code: 'invalid_credentials' };

  const supabase = getSupabaseClient();
  if (supabase) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return { user: null, error: 'Credenciais inválidas.', code: 'invalid_credentials' };
    }
    const profile = await loadProfile(supabase);
    if (profile.error || !profile.user) {
      return { user: null, error: profile.error ?? 'Perfil indisponível.', code: profile.user ? 'unknown' : 'no_profile' };
    }
    return { user: profile.user, error: null };
  }

  if (!isDemoAllowed()) {
    return {
      user: null,
      error: 'Autenticação demonstrativa indisponível em produção. Configure o Supabase Auth.',
      code: 'demo_forbidden',
    };
  }
  return signInDemo(email, password);
}

/** Login demonstrativo — somente desenvolvimento. */
export async function signInDemo(email: string, _password: string): Promise<AuthResult> {
  if (!isDemoAllowed()) {
    return { user: null, error: 'Modo demo indisponível em produção.', code: 'demo_forbidden' };
  }
  await new Promise(resolve => setTimeout(resolve, 300));
  if (!email) {
    return { user: null, error: 'E-mail é obrigatório.', code: 'invalid_credentials' };
  }
  const user: UserProfile = {
    id: 'user-demo-' + Date.now(),
    organizationId: 'org-default',
    name: email.split('@')[0] || 'Usuário',
    email,
    role: 'admin',
    createdAt: new Date().toISOString(),
  };
  localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify({ user, loggedInAt: new Date().toISOString() }));
  return { user, error: null };
}

export async function signOut(): Promise<void> {
  const supabase = getSupabaseClient();
  if (supabase) {
    await supabase.auth.signOut();
  }
  localStorage.removeItem(DEMO_SESSION_KEY);
}

/** Sincroniza a sessão demo atual com o perfil carregado do Supabase. */
export function getLocalSession(): UserProfile | null {
  if (isSupabaseConfigured()) return null;
  try {
    const raw = localStorage.getItem(DEMO_SESSION_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return (data.user as UserProfile) || null;
  } catch {
    return null;
  }
}

/** Restaura a sessão no carregamento da app (supabase real ou demo local). */
export async function restoreSession(): Promise<UserProfile | null> {
  const supabase = getSupabaseClient();
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    if (!data.session) return null;
    const profile = await loadProfile(supabase);
    return profile.user;
  }
  if (!isDemoAllowed()) return null;
  return getLocalSession();
}

export async function requestPasswordReset(email: string): Promise<{ ok: boolean; error: string | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { ok: false, error: 'Recuperação de senha exige Supabase configurado.' };
  }
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/redefinir-senha`,
  });
  if (error) return { ok: false, error: 'Não foi possível enviar o e-mail de recuperação.' };
  return { ok: true, error: null };
}

export async function updatePassword(newPassword: string): Promise<{ ok: boolean; error: string | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { ok: false, error: 'Redefinição de senha exige Supabase configurado.' };
  }
  if (!newPassword || newPassword.length < 8) {
    return { ok: false, error: 'A nova senha deve ter ao menos 8 caracteres.' };
  }
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { ok: false, error: 'Não foi possível redefinir a senha. Abra o link recebido no e-mail.' };
  return { ok: true, error: null };
}

export function onAuthChange(callback: (session: Session | null) => void): () => void {
  const supabase = getSupabaseClient();
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session));
  return () => data.subscription.unsubscribe();
}

export type PermissionAction = 'create' | 'edit' | 'delete' | 'export' | 'admin';

const PERMISSIONS: Record<UserProfile['role'], PermissionAction[]> = {
  owner: ['create', 'edit', 'delete', 'export', 'admin'],
  admin: ['create', 'edit', 'delete', 'export'],
  operator: ['create', 'edit'],
  viewer: [],
};

export function hasPermission(user: UserProfile | null, action: PermissionAction): boolean {
  if (!user) return false;
  return PERMISSIONS[user.role]?.includes(action) ?? false;
}
