import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockGetSession = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockSignOut = vi.fn();
const mockResetPasswordForEmail = vi.fn();
const mockUpdateUser = vi.fn();
const mockFrom = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: {
      getSession: mockGetSession,
      signInWithPassword: mockSignInWithPassword,
      signOut: mockSignOut,
      resetPasswordForEmail: mockResetPasswordForEmail,
      updateUser: mockUpdateUser,
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    from: mockFrom,
  }),
}));

async function loadAuth() {
  vi.resetModules();
  return import('../src/utils/auth');
}

function configureSupabaseEnv() {
  vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key');
}

// .env.local do desenvolvedor pode vazar para o Vitest; unstub restaura o
// valor ambiente, então testes "sem Supabase" precisam stubar undefined.
function clearSupabaseEnv() {
  vi.stubEnv('VITE_SUPABASE_URL', undefined);
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', undefined);
}

function profileQuery(row: unknown, error: unknown = null) {
  mockFrom.mockReturnValue({
    select: () => ({
      eq: () => ({
        maybeSingle: async () => ({ data: row, error }),
      }),
    }),
  });
}

const profileRow = {
  id: 'uid-1',
  organization_id: 'org-1',
  name: 'Gerente',
  email: 'gerente@otica.com',
  role: 'admin',
  active: true,
  created_at: '2026-01-01T00:00:00Z',
};

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('hasPermission', () => {
  const user = (role: string) => ({ id: 'u', organizationId: 'o', name: 'n', email: 'e', role, createdAt: '' }) as never;

  it('owner tem todas as ações incluindo admin', async () => {
    const { hasPermission } = await loadAuth();
    for (const action of ['create', 'edit', 'delete', 'export', 'admin'] as const) {
      expect(hasPermission(user('owner'), action)).toBe(true);
    }
  });

  it('admin não tem ação admin', async () => {
    const { hasPermission } = await loadAuth();
    expect(hasPermission(user('admin'), 'create')).toBe(true);
    expect(hasPermission(user('admin'), 'admin')).toBe(false);
  });

  it('operador só cria e edita', async () => {
    const { hasPermission } = await loadAuth();
    expect(hasPermission(user('operator'), 'create')).toBe(true);
    expect(hasPermission(user('operator'), 'edit')).toBe(true);
    expect(hasPermission(user('operator'), 'delete')).toBe(false);
    expect(hasPermission(user('operator'), 'export')).toBe(false);
  });

  it('visualizador e ausente não têm nenhuma ação', async () => {
    const { hasPermission } = await loadAuth();
    for (const action of ['create', 'edit', 'delete', 'export', 'admin'] as const) {
      expect(hasPermission(user('viewer'), action)).toBe(false);
      expect(hasPermission(null, action)).toBe(false);
    }
  });
});

describe('signIn com Supabase', () => {
  it('credenciais inválidas retornam erro sem revelar detalhe', async () => {
    configureSupabaseEnv();
    const { signIn } = await loadAuth();
    mockSignInWithPassword.mockResolvedValue({ error: { message: 'Invalid login credentials' } });
    const result = await signIn('user@otica.com', 'senha-errada');
    expect(result.user).toBeNull();
    expect(result.error).toBe('Credenciais inválidas.');
    expect(result.code).toBe('invalid_credentials');
  });

  it('login válido carrega perfil da tabela profiles', async () => {
    configureSupabaseEnv();
    const { signIn } = await loadAuth();
    mockSignInWithPassword.mockResolvedValue({ error: null });
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'uid-1' } } } });
    profileQuery(profileRow);
    const result = await signIn('gerente@otica.com', 'senha-ok');
    expect(result.error).toBeNull();
    expect(result.user).toMatchObject({ id: 'uid-1', organizationId: 'org-1', role: 'admin' });
    expect(mockFrom).toHaveBeenCalledWith('profiles');
  });

  it('usuário sem perfil é deslogado', async () => {
    configureSupabaseEnv();
    const { signIn } = await loadAuth();
    mockSignInWithPassword.mockResolvedValue({ error: null });
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'uid-x' } } } });
    profileQuery(null);
    const result = await signIn('semperfil@otica.com', 'senha');
    expect(result.user).toBeNull();
    expect(result.code).toBe('no_profile');
    expect(mockSignOut).toHaveBeenCalled();
  });

  it('email e senha vazios são rejeitados antes de chamar o Supabase', async () => {
    configureSupabaseEnv();
    const { signIn } = await loadAuth();
    const result = await signIn('', '');
    expect(result.code).toBe('invalid_credentials');
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
  });
});

describe('modo demo', () => {
  it('demo é aceito fora de produção', async () => {
    clearSupabaseEnv();
    const { signIn, getAuthMode } = await loadAuth();
    expect(getAuthMode()).toBe('demo');
    const result = await signIn('dev@local', 'qualquer');
    expect(result.user?.role).toBe('admin');
    expect(result.user?.organizationId).toBe('org-default');
  });

  it('demo é bloqueado em produção sem Supabase', async () => {
    clearSupabaseEnv();
    vi.stubEnv('PROD', 'true');
    const { signIn } = await loadAuth();
    const result = await signIn('dev@local', 'qualquer');
    expect(result.user).toBeNull();
    expect(result.code).toBe('demo_forbidden');
  });

  it('signInDemo também é bloqueado em produção mesmo se chamado diretamente', async () => {
    vi.stubEnv('PROD', 'true');
    const { signInDemo } = await loadAuth();
    const result = await signInDemo('dev@local', 'x');
    expect(result.code).toBe('demo_forbidden');
  });
});

describe('recuperação de senha', () => {
  it('sem Supabase configurado retorna erro', async () => {
    clearSupabaseEnv();
    vi.stubEnv('PROD', 'false');
    const { requestPasswordReset } = await loadAuth();
    const result = await requestPasswordReset('a@b.com');
    expect(result.ok).toBe(false);
    expect(result.error).toContain('Supabase');
  });

  it('com Supabase envia resetPasswordForEmail com redirectTo', async () => {
    configureSupabaseEnv();
    const { requestPasswordReset } = await loadAuth();
    mockResetPasswordForEmail.mockResolvedValue({ error: null });
    const result = await requestPasswordReset('a@b.com');
    expect(result.ok).toBe(true);
    expect(mockResetPasswordForEmail).toHaveBeenCalledWith('a@b.com', {
      redirectTo: 'http://localhost:3000/redefinir-senha',
    });
  });

  it('redefine senha curta antes de chamar o servidor', async () => {
    configureSupabaseEnv();
    const { updatePassword } = await loadAuth();
    const result = await updatePassword('123');
    expect(result.ok).toBe(false);
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });
});

describe('restoreSession', () => {
  it('sem sessão supabase retorna null', async () => {
    configureSupabaseEnv();
    const { restoreSession } = await loadAuth();
    mockGetSession.mockResolvedValue({ data: { session: null } });
    expect(await restoreSession()).toBeNull();
  });

  it('com sessão retorna perfil carregado', async () => {
    configureSupabaseEnv();
    const { restoreSession } = await loadAuth();
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'uid-1' } } } });
    profileQuery(profileRow);
    const user = await restoreSession();
    expect(user?.email).toBe('gerente@otica.com');
  });
});
