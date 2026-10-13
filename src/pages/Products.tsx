import React, { useState, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { formatCurrency, CATEGORY_LABELS } from '../utils/format';
import { Product, ProductCategory } from '../types';
import { Plus, Search, Edit2, X, Package } from 'lucide-react';

export default function Products() {
  const { state, addProduct, updateProduct, showToast } = useApp();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', category: 'frames' as ProductCategory, price: 0, cost: 0, code: '', active: true });
  const [errors, setErrors] = useState<string[]>([]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return state.products.filter(p => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q) || CATEGORY_LABELS[p.category].toLowerCase().includes(q));
  }, [state.products, search]);

  const handleSave = () => {
    const errs: string[] = [];
    if (!form.name.trim()) errs.push('Nome é obrigatório');
    if (form.price <= 0) errs.push('Preço deve ser maior que zero');
    if (errs.length > 0) { setErrors(errs); return; }

    if (editingId) {
      updateProduct(editingId, form);
      showToast('Produto atualizado!');
    } else {
      addProduct(form);
    }
    resetForm();
  };

  const resetForm = () => {
    setForm({ name: '', category: 'frames', price: 0, cost: 0, code: '', active: true });
    setEditingId(null);
    setShowForm(false);
    setErrors([]);
  };

  const handleEdit = (p: Product) => {
    setForm({ name: p.name, category: p.category, price: p.price, cost: p.cost, code: p.code, active: p.active });
    setEditingId(p.id);
    setShowForm(true);
  };

  const toggleActive = (id: string, active: boolean) => {
    updateProduct(id, { active: !active });
    showToast(active ? 'Produto desativado.' : 'Produto ativado.');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-gray-800">Produtos</h2>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Novo Produto
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar produtos..." className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      <p className="text-sm text-gray-500">{filtered.length} produto(s)</p>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Nenhum produto cadastrado.</p>
            <p className="text-sm mt-1">Cadastre armações, lentes, óculos de sol e acessórios.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left text-gray-500">
                  <th className="px-4 py-3">Produto</th>
                  <th className="px-4 py-3 hidden md:table-cell">Categoria</th>
                  <th className="px-4 py-3 hidden md:table-cell">Código</th>
                  <th className="px-4 py-3 text-right">Preço</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{p.name}</td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">{CATEGORY_LABELS[p.category]}</span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-gray-500">{p.code || '—'}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatCurrency(p.price)}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleActive(p.id, p.active)} className={`px-2 py-0.5 rounded-full text-xs ${p.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {p.active ? 'Ativo' : 'Inativo'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleEdit(p)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded"><Edit2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">{editingId ? 'Editar Produto' : 'Novo Produto'}</h3>
              <button onClick={resetForm}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            {errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                {errors.map((e, i) => <p key={i} className="text-sm text-red-700">{e}</p>)}
              </div>
            )}
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Nome *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Categoria</label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value as ProductCategory })} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm">
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Preço de venda *</label>
                  <input type="number" step="0.01" value={form.price || ''} onChange={e => setForm({ ...form, price: parseFloat(e.target.value) || 0 })} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Custo (opcional)</label>
                  <input type="number" step="0.01" value={form.cost || ''} onChange={e => setForm({ ...form, cost: parseFloat(e.target.value) || 0 })} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Código (opcional)</label>
                <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={handleSave} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                {editingId ? 'Salvar' : 'Cadastrar'}
              </button>
              <button onClick={resetForm} className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
