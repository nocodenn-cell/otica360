import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatDate,
  formatPhone,
  maskPhone,
  isValidPhone,
  isValidEmail,
  generateSaleNumber,
  isOverdue,
  isToday,
  getTodayStr,
} from '../src/utils/format';

describe('formatCurrency', () => {
  it('formata valores em BRL corretamente', () => {
    expect(formatCurrency(0)).toBe('R$ 0,00');
    expect(formatCurrency(100)).toBe('R$ 100,00');
    expect(formatCurrency(1234.56)).toBe('R$ 1.234,56');
    expect(formatCurrency(0.5)).toBe('R$ 0,50');
  });

  it('formata valores negativos', () => {
    expect(formatCurrency(-100)).toBe('-R$ 100,00');
  });

  it('formata valores grandes', () => {
    expect(formatCurrency(1000000)).toBe('R$ 1.000.000,00');
  });
});

describe('formatDate', () => {
  it('formata datas em formato brasileiro', () => {
    expect(formatDate('2024-01-15')).toBe('15/01/2024');
    expect(formatDate('2024-12-31')).toBe('31/12/2024');
  });

  it('retorna — para null', () => {
    expect(formatDate(null)).toBe('—');
  });
});

describe('formatPhone', () => {
  it('formata telefone com 11 dígitos', () => {
    expect(formatPhone('11999887766')).toBe('(11) 99988-7766');
  });

  it('formata telefone com 10 dígitos', () => {
    expect(formatPhone('1133445566')).toBe('(11) 3344-5566');
  });

  it('retorna valor original se não tiver 10 ou 11 dígitos', () => {
    expect(formatPhone('12345')).toBe('12345');
  });

  it('remove caracteres não numéricos antes de formatar', () => {
    expect(formatPhone('(11) 99988-7766')).toBe('(11) 99988-7766');
  });
});

describe('maskPhone', () => {
  it('aplica máscara progressivamente', () => {
    expect(maskPhone('11')).toBe('11');
    expect(maskPhone('119')).toBe('(11) 9');
    expect(maskPhone('1199988')).toBe('(11) 99988');
    expect(maskPhone('11999887766')).toBe('(11) 99988-7766');
  });

  it('limita a 11 dígitos', () => {
    expect(maskPhone('1199988776612345')).toBe('(11) 99988-7766');
  });
});

describe('isValidPhone', () => {
  it('valida telefones brasileiros', () => {
    expect(isValidPhone('11999887766')).toBe(true);
    expect(isValidPhone('1133445566')).toBe(true);
    expect(isValidPhone('(11) 99988-7766')).toBe(true);
  });

  it('rejeita telefones inválidos', () => {
    expect(isValidPhone('123')).toBe(false);
    expect(isValidPhone('')).toBe(false);
    expect(isValidPhone('123456789012')).toBe(false);
  });
});

describe('isValidEmail', () => {
  it('valida e-mails corretos', () => {
    expect(isValidEmail('test@example.com')).toBe(true);
    expect(isValidEmail('user.name@domain.org')).toBe(true);
  });

  it('rejeita e-mails inválidos', () => {
    expect(isValidEmail('invalid')).toBe(false);
    expect(isValidEmail('test@')).toBe(false);
    expect(isValidEmail('@domain.com')).toBe(false);
  });

  it('aceita string vazia (campo opcional)', () => {
    expect(isValidEmail('')).toBe(true);
  });
});

describe('generateSaleNumber', () => {
  it('gera números sequenciais', () => {
    expect(generateSaleNumber([])).toBe('V00001');
    expect(generateSaleNumber([{ number: 'V00001' }])).toBe('V00002');
    expect(generateSaleNumber([{ number: 'V00099' }])).toBe('V00100');
  });

  it('encontra o maior número existente', () => {
    const sales = [{ number: 'V00001' }, { number: 'V00050' }, { number: 'V00025' }];
    expect(generateSaleNumber(sales)).toBe('V00051');
  });
});

describe('getTodayStr', () => {
  it('retorna data no formato YYYY-MM-DD', () => {
    const today = getTodayStr();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('isOverdue', () => {
  it('identifica datas atrasadas', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    expect(isOverdue(yesterdayStr)).toBe(true);
  });

  it('não considera data futura como atrasada', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    expect(isOverdue(tomorrowStr)).toBe(false);
  });

  it('retorna false para null', () => {
    expect(isOverdue(null)).toBe(false);
  });
});

describe('isToday', () => {
  it('identifica data de hoje', () => {
    const today = getTodayStr();
    expect(isToday(today)).toBe(true);
  });

  it('não identifica data diferente como hoje', () => {
    expect(isToday('2020-01-01')).toBe(false);
  });

  it('retorna false para null', () => {
    expect(isToday(null)).toBe(false);
  });
});
