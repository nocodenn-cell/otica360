import { describe, expect, it } from 'vitest';
import { validateSaleItems } from '../src/utils/saleValidation';
import type { SaleItem } from '../src/types';

const item: SaleItem = { id: '1', productId: 'p1', productName: 'Armação', quantity: 2, unitPrice: 100, discount: 0, total: 200 };

describe('validação de vendas', () => {
  it('aceita venda válida', () => expect(validateSaleItems([item], 20)).toBeNull());
  it('rejeita lista vazia', () => expect(validateSaleItems([], 0)).toMatch(/item/));
  it('rejeita quantidade zero, negativa e fracionada', () => {
    for (const quantity of [0, -1, 1.5]) {
      expect(validateSaleItems([{ ...item, quantity }], 0)).toMatch(/inválidos/);
    }
  });
  it('rejeita desconto negativo, excessivo e NaN', () => {
    for (const discount of [-1, 201, NaN]) {
      expect(validateSaleItems([item], discount)).toMatch(/Desconto/);
    }
  });
  it('rejeita preços inválidos e totais inconsistentes', () => {
    expect(validateSaleItems([{ ...item, unitPrice: -1 }], 0)).toMatch(/inválidos/);
    expect(validateSaleItems([{ ...item, total: 100 }], 0)).toMatch(/inválidos/);
  });
});
