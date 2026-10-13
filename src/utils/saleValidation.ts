import { SaleItem } from '../types';

export function validateSaleItems(items: SaleItem[], discount: number): string | null {
  if (items.length === 0) return 'Adicione pelo menos um item.';
  if (items.some(item =>
    !Number.isInteger(item.quantity) || item.quantity <= 0 ||
    !Number.isFinite(item.unitPrice) || item.unitPrice < 0 ||
    !Number.isFinite(item.discount) || item.discount < 0 ||
    !Number.isFinite(item.total) ||
    Math.abs(item.total - (item.quantity * item.unitPrice - item.discount)) > 0.01 ||
    item.total < 0
  )) return 'Itens da venda inválidos.';
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  if (!Number.isFinite(discount) || discount < 0 || discount > subtotal) return 'Desconto inválido.';
  return null;
}
