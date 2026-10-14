import { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { formatCurrency, formatDate } from '../utils/format';
import { MarketingCampaign } from '../types';
import { Plus, X, Megaphone, TrendingUp } from 'lucide-react';

export default function Marketing() {
  const { state, addCampaign, updateCampaign, showToast } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', platform: '', startDate: '', endDate: '', investment: 0, leadsGenerated: 0, quotesRelated: 0, salesAttributed: 0, revenueAttributed: 0, notes: '' });

  const handleSave = () => {
    if (!form.name.trim()) { showToast('Nome é obrigatório.'); return; }
    if (!form.startDate) { showToast('Data de início é obrigatória.'); return; }
    addCampaign(form);
    setShowForm(false);
    setForm({ name: '', platform: '', startDate: '', endDate: '', investment: 0, leadsGenerated: 0, quotesRelated: 0, salesAttributed: 0, revenueAttributed: 0, notes: '' });
  };

  const totalInvestment = state.campaigns.reduce((s, c) => s + c.investment, 0);
  const totalRevenue = state.campaigns.reduce((s, c) => s + c.revenueAttributed, 0);
  const totalLeads = state.campaigns.reduce((s, c) => s + c.leadsGenerated, 0);
  const overallROAS = totalInvestment > 0 ? (totalRevenue / totalInvestment) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-gray-800">Marketing & Atribuição</h2>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Nova Campanha
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Nota:</strong> Os valores de leads, vendas e receita são informados manualmente. Futuras integrações com Google Ads e Meta Ads permitirão importação automática de métricas.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500">Investimento Total</p>
          <p className="text-lg font-bold">{formatCurrency(totalInvestment)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500">Receita Atribuída</p>
          <p className="text-lg font-bold text-green-600">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500">ROAS</p>
          <p className="text-lg font-bold">{overallROAS > 0 ? `${overallROAS.toFixed(2)}x` : '—'}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500">Leads Gerados</p>
          <p className="text-lg font-bold">{totalLeads}</p>
        </div>
      </div>

      {/* Campaign List */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Campanhas ({state.campaigns.length})</h3>
        </div>
        {state.campaigns.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Nenhuma campanha registrada.</p>
            <p className="text-sm mt-1">Registre suas campanhas de marketing para acompanhar resultados.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left text-gray-500">
                  <th className="px-4 py-3">Campanha</th>
                  <th className="px-4 py-3 hidden md:table-cell">Plataforma</th>
                  <th className="px-4 py-3 hidden md:table-cell">Período</th>
                  <th className="px-4 py-3 text-right">Investimento</th>
                  <th className="px-4 py-3 text-right hidden lg:table-cell">Receita</th>
                  <th className="px-4 py-3 text-right">ROAS</th>
                  <th className="px-4 py-3 text-right hidden lg:table-cell">CPL</th>
                </tr>
              </thead>
              <tbody>
                {state.campaigns.map(c => {
                  const roas = c.investment > 0 ? c.revenueAttributed / c.investment : 0;
                  const cpl = c.leadsGenerated > 0 ? c.investment / c.leadsGenerated : 0;
                  return (
                    <tr key={c.id} className="border-t border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{c.name}</td>
                      <td className="px-4 py-3 hidden md:table-cell text-gray-600">{c.platform || '—'}</td>
                      <td className="px-4 py-3 hidden md:table-cell text-gray-600 text-xs">{formatDate(c.startDate)} — {formatDate(c.endDate)}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(c.investment)}</td>
                      <td className="px-4 py-3 text-right hidden lg:table-cell text-green-600">{formatCurrency(c.revenueAttributed)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-medium ${roas >= 1 ? 'text-green-600' : roas > 0 ? 'text-yellow-600' : 'text-gray-400'}`}>
                          {roas > 0 ? `${roas.toFixed(2)}x` : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right hidden lg:table-cell">{cpl > 0 ? formatCurrency(cpl) : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Sales by Origin */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
        <h3 className="font-semibold text-gray-800 mb-4">Vendas por Origem</h3>
        {(() => {
          const originMap: Record<string, { count: number; revenue: number }> = {};
          state.sales.filter(s => s.status === 'completed').forEach(s => {
            if (!originMap[s.origin]) originMap[s.origin] = { count: 0, revenue: 0 };
            originMap[s.origin].count++;
            originMap[s.origin].revenue += s.total;
          });
          const entries = Object.entries(originMap);
          if (entries.length === 0) return <p className="text-sm text-gray-400">Sem dados de vendas.</p>;
          return (
            <div className="space-y-2">
              {entries.sort((a, b) => b[1].revenue - a[1].revenue).map(([origin, data]) => (
                <div key={origin} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium capitalize">{origin === 'unknown' ? 'Não informado' : origin}</p>
                    <p className="text-xs text-gray-500">{data.count} venda(s)</p>
                  </div>
                  <p className="text-sm font-bold">{formatCurrency(data.revenue)}</p>
                </div>
              ))}
            </div>
          );
        })()}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Nova Campanha</h3>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <div><label className="text-sm font-medium text-gray-700">Nome da campanha *</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" /></div>
              <div><label className="text-sm font-medium text-gray-700">Plataforma</label><input value={form.platform} onChange={e => setForm({ ...form, platform: e.target.value })} placeholder="Google Ads, Instagram, Facebook..." className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium text-gray-700">Data início *</label><input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" /></div>
                <div><label className="text-sm font-medium text-gray-700">Data fim</label><input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" /></div>
              </div>
              <div><label className="text-sm font-medium text-gray-700">Investimento (R$)</label><input type="number" step="0.01" value={form.investment || ''} onChange={e => setForm({ ...form, investment: parseFloat(e.target.value) || 0 })} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="text-sm font-medium text-gray-700">Leads</label><input type="number" value={form.leadsGenerated || ''} onChange={e => setForm({ ...form, leadsGenerated: parseInt(e.target.value) || 0 })} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" /></div>
                <div><label className="text-sm font-medium text-gray-700">Orçamentos</label><input type="number" value={form.quotesRelated || ''} onChange={e => setForm({ ...form, quotesRelated: parseInt(e.target.value) || 0 })} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" /></div>
                <div><label className="text-sm font-medium text-gray-700">Vendas</label><input type="number" value={form.salesAttributed || ''} onChange={e => setForm({ ...form, salesAttributed: parseInt(e.target.value) || 0 })} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" /></div>
              </div>
              <div><label className="text-sm font-medium text-gray-700">Receita atribuída (R$)</label><input type="number" step="0.01" value={form.revenueAttributed || ''} onChange={e => setForm({ ...form, revenueAttributed: parseFloat(e.target.value) || 0 })} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" /></div>
              <div><label className="text-sm font-medium text-gray-700">Observações</label><textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" /></div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={handleSave} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Salvar Campanha</button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
