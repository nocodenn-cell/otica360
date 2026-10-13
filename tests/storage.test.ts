import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  findDuplicateCustomers,
  parseCSV,
  exportToCSV,
} from '../src/utils/storage';
import { Customer } from '../src/types';

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

describe('findDuplicateCustomers', () => {
  const customers: Customer[] = [
    {
      id: '1', organizationId: 'org1', name: 'João Silva', phone: '11999887766',
      email: 'joao@test.com', origin: 'store', contactPreference: 'whatsapp',
      communicationStatus: 'authorized', notes: '', lastPurchaseDate: null,
      nextActionDate: null, responsible: '', archived: false,
      createdAt: '2024-01-01', updatedAt: '2024-01-01',
    },
    {
      id: '2', organizationId: 'org1', name: 'Maria Santos', phone: '2133445566',
      email: '', origin: 'google', contactPreference: 'phone',
      communicationStatus: 'pending', notes: '', lastPurchaseDate: null,
      nextActionDate: null, responsible: '', archived: false,
      createdAt: '2024-01-02', updatedAt: '2024-01-02',
    },
  ];

  it('encontra duplicatas por telefone exato', () => {
    const dupes = findDuplicateCustomers(customers, '11999887766');
    expect(dupes).toHaveLength(1);
    expect(dupes[0].id).toBe('1');
  });

  it('encontra duplicatas por últimos 8 dígitos', () => {
    const dupes = findDuplicateCustomers(customers, '999887766');
    expect(dupes).toHaveLength(1);
    expect(dupes[0].id).toBe('1');
  });

  it('exclui o próprio registro quando excludeId é fornecido', () => {
    const dupes = findDuplicateCustomers(customers, '11999887766', '1');
    expect(dupes).toHaveLength(0);
  });

  it('não encontra duplicatas quando não há match', () => {
    const dupes = findDuplicateCustomers(customers, '31987654321');
    expect(dupes).toHaveLength(0);
  });

  it('ignora formatação do telefone', () => {
    const dupes = findDuplicateCustomers(customers, '(11) 99988-7766');
    expect(dupes).toHaveLength(1);
  });
});

describe('parseCSV', () => {
  it('parseia CSV simples', () => {
    const csv = 'Nome,Telefone,Email\nJoão,11999887766,joao@test.com\nMaria,2133445566,';
    const result = parseCSV(csv);
    expect(result.headers).toEqual(['Nome', 'Telefone', 'Email']);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual(['João', '11999887766', 'joao@test.com']);
    expect(result.rows[1]).toEqual(['Maria', '2133445566', '']);
  });

  it('handle CSV vazio', () => {
    const result = parseCSV('');
    expect(result.headers).toEqual([]);
    expect(result.rows).toEqual([]);
  });

  it('handle CSV com apenas headers', () => {
    const result = parseCSV('Nome,Telefone');
    expect(result.headers).toEqual(['Nome', 'Telefone']);
    expect(result.rows).toEqual([]);
  });

  it('remove aspas duplas dos valores', () => {
    const csv = '"Nome","Telefone"\n"João Silva","11999887766"';
    const result = parseCSV(csv);
    expect(result.headers).toEqual(['Nome', 'Telefone']);
    expect(result.rows[0]).toEqual(['João Silva', '11999887766']);
  });
});

describe('exportToCSV', () => {
  it('gera CSV válido', () => {
    const headers = ['Nome', 'Telefone'];
    const rows = [['João', '11999887766'], ['Maria', '2133445566']];
    const csv = exportToCSV(headers, rows);
    expect(csv).toContain('Nome,Telefone');
    expect(csv).toContain('"João","11999887766"');
    expect(csv).toContain('"Maria","2133445566"');
  });

  it('escapa aspas duplas nos valores', () => {
    const headers = ['Nome'];
    const rows = [['João "O Grande"']];
    const csv = exportToCSV(headers, rows);
    expect(csv).toContain('"João ""O Grande"""');
  });

  it('handle valores vazios', () => {
    const headers = ['Nome', 'Email'];
    const rows = [['João', '']];
    const csv = exportToCSV(headers, rows);
    expect(csv).toContain('"João",""');
  });
});

describe('regressões CSV', () => {
  it('preserva vírgulas, aspas e quebras de linha entre aspas', () => {
    const input = 'Nome,Notas\r\n"Maria, Silva","Linha 1\nLinha ""2"""';
    expect(parseCSV(input)).toEqual({ headers: ['Nome', 'Notas'], rows: [['Maria, Silva', 'Linha 1\nLinha "2"']] });
  });
  it('remove BOM e aceita CRLF', () => {
    expect(parseCSV('\uFEFFNome,Telefone\r\nJoão,11999999999\r\n').rows).toEqual([['João', '11999999999']]);
  });
  it('rejeita aspas abertas e quantidade de colunas inválida', () => {
    expect(() => parseCSV('Nome,Nota\nJoão,"aberta')).toThrow(/aspas não fechadas/);
    expect(() => parseCSV('Nome,Nota\nJoão')).toThrow(/colunas/);
  });
  it('faz round-trip de cabeçalhos e campos especiais', () => {
    const headers = ['Nome, completo', 'Notas'];
    const rows = [['João "J"', 'linha 1\nlinha 2']];
    expect(parseCSV(exportToCSV(headers, rows))).toEqual({ headers, rows });
  });
});

describe('falhas de persistência', () => {
  it('propaga falhas de gravação em vez de confirmar sucesso', async () => {
    const { saveState, loadState } = await import('../src/utils/storage');
    const original = globalThis.localStorage;
    const failing = { ...original, setItem: () => { throw new Error('quota exceeded'); } };
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: failing });
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      expect(() => saveState({} as any)).toThrow('quota exceeded');
    } finally {
      spy.mockRestore();
      Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: original });
    }
  });
});
