import React, { useState, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { formatCurrency, formatDate, formatPhone, PAYMENT_LABELS, SALE_STATUS_LABELS, ORIGIN_LABELS, generateSaleNumber, getTodayStr } from '../utils/format';
import { Sale, SaleItem, PaymentMethod, SaleStatus, CustomerOrigin } from '../types';
import { Plus, Search, X, ShoppingCart, Trash2 } from 'lucide-react';

export default function Sales() {
  const { state, addSale, updateSaleStatus, showToast } = useApp();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedQty, setSelectedQty] = useState(1);
  const [form, setForm] = useState({ customerId: '' as string | null, customerName: '', date: getTodayStr(), paymentMethod: 'pix' as PaymentMethod, origin: 'unknown' as CustomerOrigin, discount: 0, responsible: '', notes: '' });

  const filteredSales = useMemo(() => {
    const q = search.toLowerCase();
    return state.sales.filter(s => s.number.toLowerCase().includes(q) || s.customerName.toLowerCase().includes(q)).sort((a, b) => b.date.localeCompare(a.date));
  }, [state.sales, search]);

  const subtotal = saleItems.reduce((sum, i) => sum + i.total, 0);
  const total = Math.max(0, subtotal - form.discount);

  const addItem = () => {
    if (!selectedProductId || !Number.isInteger(selectedQty) || selectedQty <= 0) { showToast('Informe uma quantidade válida.'); return; }
    const product = state.products.find(p => p.id === selectedProductId);
    if (!product) return;
    const existing = saleItems.find(i => i.productId === selectedProductId);
    if (existing) {
      setSaleItems(saleItems.map(i => i.productId === selectedProductId ? { ...i, quantity: i.quantity + selectedQty, total: (i.quantity + selectedQty) * i.unitPrice - i.discount } : i));
    } else {
      const item: SaleItem = { id: `item-${Date.now()}`, productId: product.id, productName: product.name, quantity: selectedQty, unitPrice: product.price, discount: 0, total: selectedQty * product.price };
      setSaleItems([...saleItems, item]);
    }
    setSelectedProductId('');
    setSelectedQty(1);
  };

  const removeItem = (itemId: string) => {
    setSaleItems(saleItems.filter(i => i.id !== itemId));
  };

  const handleSave = () => {
    if (saleItems.length === 0) { showToast('Adicione pelo menos um item.'); return; }
    if (!form.date) { showToast('Informe a data da venda.'); return; }
    if (!Number.isFinite(form.discount) || form.discount < 0 || form.discount > subtotal) { showToast('Desconto inválido.'); return; }
    if (saleItems.some(item => !Number.isInteger(item.quantity) || item.quantity <= 0 || !Number.isFinite(item.unitPrice) || item.unitPrice < 0)) { showToast('Itens da venda inválidos.'); return; }

    const saleNumber = generateSaleNumber(state.sales);
    addSale({
      number: saleNumber,
      customerId: form.customerId || null,
      customerName: form.customerName || 'Cliente não identificado',
      date: form.date,
      items: saleItems,
      subtotal,
      discount: form.discount,
      total,
      paymentMethod: form.paymentMethod,
      status: 'completed',
      origin: form.origin,
      responsible: form.responsible,
      notes: form.notes,
    });
    resetForm();
  };

  const resetForm = () => {
    setSaleItems([]);
    setForm({ customerId: null, customerName: '', date: getTodayStr(), paymentMethod: 'pix', origin: 'unknown', discount: 0, responsible: '', notes: '' });
    setShowForm(false);
  };

  const handleCancel = (id: string) => {
    if (window.confirm('Cancelar esta venda? O registro será mantido no histórico.')) {
      updateSaleStatus(id, 'cancelled');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-gray-800">Vendas</h2>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Nova Venda
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por número ou cliente..." className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {filteredSales.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Nenhuma venda registrada.</p>
            <p className="text-sm mt-1">Registre sua primeira venda para começar.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left text-gray-500">
                  <th className="px-4 py-3">Número</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3 hidden md:table-cell">Data</th>
                  <th className="px-4 py-3 hidden md:table-cell">Pagamento</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.map(s => (
                  <tr key={s.id} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{s.number}</td>
                    <td className="px-4 py-3">{s.customerName}</td>
                    <td className="px-4 py-3 hidden md:table-cell">{formatDate(s.date)}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-gray-600">{PAYMENT_LABELS[s.paymentMethod]}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatCurrency(s.total)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${s.status === 'completed' ? 'bg-green-100 text-green-700' : s.status === 'cancelled' ? 'bg-red-100 text-red-700' : s.status === 'refunded' ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {SALE_STATUS_LABELS[s.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {s.status === 'completed' && (
                        <button onClick={() => handleCancel(s.id)} className="text-xs text-red-500 hover:text-red-700">Cancelar</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Sale Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Nova Venda</h3>
              <button onClick={resetForm}><X className="w-5 h-5 text-gray-400" /></button>
            </div>

            {/* Customer Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Cliente (opcional)</label>
                <select value={form.customerId || ''} onChange={e => {
                  const c = state.customers.find(cu => cu.id === e.target.value);
                  setForm({ ...form, customerId: e.target.value || null, customerName: c?.name || '' });
                }} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm">
                  <option value="">Venda sem cliente identificado</option>
                  {state.customers.filter(c => !c.archived).map(c => <option key={c.id} value={c.id}>{c.name} - {formatPhone(c.phone)}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Data</label>
                <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
            </div>

            {/* Add Items */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Adicionar itens</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <select value={selectedProductId} onChange={e => setSelectedProductId(e.target.value)} className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm">
                  <option value="">Selecione um produto...</option>
                  {state.products.filter(p => p.active).map(p => <option key={p.id} value={p.id}>{p.name} - {formatCurrency(p.price)}</option>)}
                </select>
                <input type="number" min={1} value={selectedQty} onChange={e => setSelectedQty(parseInt(e.target.value) || 1)} className="w-20 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                <button onClick={addItem} disabled={!selectedProductId} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">Adicionar</button>
              </div>
            </div>

            {/* Items List */}
            {saleItems.length > 0 && (
              <div className="mb-4">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr className="text-left text-gray-500">
                      <th className="px-3 py-2">Produto</th>
                      <th className="px-3 py-2 text-center">Qtd</th>
                      <th className="px-3 py-2 text-right">Preço</th>
                      <th className="px-3 py-2 text-right">Total</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {saleItems.map(item => (
                      <tr key={item.id} className="border-t border-gray-100">
                        <td className="px-3 py-2">{item.productName}</td>
                        <td className="px-3 py-2 text-center">{item.quantity}</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(item.unitPrice)}</td>
                        <td className="px-3 py-2 text-right font-medium">{formatCurrency(item.total)}</td>
                        <td className="px-3 py-2"><button onClick={() => removeItem(item.id)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Totals */}
            <div className="bg-blue-50 rounded-lg p-4 mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-600">Desconto:</span>
                <input type="number" step="0.01" min={0} value={form.discount || ''} onChange={e => setForm({ ...form, discount: parseFloat(e.target.value) || 0 })} className="w-24 px-2 py-1 border border-blue-200 rounded text-sm text-right" />
              </div>
              <div className="flex justify-between text-base font-bold pt-2 border-t border-blue-200">
                <span>Total:</span>
                <span className="text-blue-700">{formatCurrency(total)}</span>
              </div>
            </div>

            {/* Payment & Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Forma de pagamento</label>
                <select value={form.paymentMethod} onChange={e => setForm({ ...form, paymentMethod: e.target.value as PaymentMethod })} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm">
                  {Object.entries(PAYMENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Origem do cliente</label>
                <select value={form.origin} onChange={e => setForm({ ...form, origin: e.target.value as CustomerOrigin })} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm">
                  {Object.entries(ORIGIN_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Responsável</label>
                <input value={form.responsible} onChange={e => setForm({ ...form, responsible: e.target.value })} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Observações</label>
                <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={handleSave} disabled={saleItems.length === 0} className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                Registrar Venda
              </button>
              <button onClick={resetForm} className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
