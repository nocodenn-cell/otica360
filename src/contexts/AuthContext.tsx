import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { UserProfile } from '../types';
import {
  restoreSession,
  signIn as signInService,
  signOut as signOutService,
  onAuthChange,
  hasPermission,
  getAuthMode,
  PermissionAction,
} from '../utils/auth';

export type { PermissionAction } from '../utils/auth';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextType {
  user: UserProfile | null;
  status: AuthStatus;
  mode: 'supabase' | 'demo';
  signIn: (email: string, password: string) => Promise<{ ok: boolean; error: string | null }>;
  signOut: () => Promise<void>;
  can: (action: PermissionAction) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const mode = getAuthMode();

  useEffect(() => {
    let cancelled = false;
    restoreSession().then(session => {
      if (cancelled) return;
      setUser(session);
      setStatus(session ? 'authenticated' : 'unauthenticated');
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (mode !== 'supabase') return;
    return onAuthChange(session => {
      if (session) {
        restoreSession().then(u => {
          setUser(u);
          setStatus(u ? 'authenticated' : 'unauthenticated');
        });
      } else {
        setUser(null);
        setStatus('unauthenticated');
      }
    });
  }, [mode]);

  const signIn = useCallback(async (email: string, password: string) => {
    const result = await signInService(email, password);
    if (result.user) {
      setUser(result.user);
      setStatus('authenticated');
      return { ok: true, error: null };
    }
    return { ok: false, error: result.error };
  }, []);

  const signOut = useCallback(async () => {
    await signOutService();
    setUser(null);
    setStatus('unauthenticated');
  }, []);

  const can = useCallback((action: PermissionAction) => hasPermission(user, action), [user]);

  return (
    <AuthContext.Provider value={{ user, status, mode, signIn, signOut, can }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
