import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { formatPhone, formatDate, formatCurrency, ORIGIN_LABELS, FOLLOW_UP_REASON_LABELS, FOLLOW_UP_STATUS_LABELS } from '../utils/format';
import { ArrowLeft, Edit2, Phone, Mail, Plus, CalendarCheck } from 'lucide-react';
import { FollowUpReason, ContactPreference, FollowUpStatus } from '../types';

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { state, addFollowUp, showToast } = useApp();
  const [showFollowUpForm, setShowFollowUpForm] = useState(false);
  const [followUpForm, setFollowUpForm] = useState({ reason: 'post_purchase' as FollowUpReason, description: '', channel: 'whatsapp' as ContactPreference, scheduledDate: '', responsible: '' });

  const customer = state.customers.find(c => c.id === id);
  if (!customer) return <div className="p-8 text-center text-gray-500">Cliente não encontrado.</div>;

  const customerSales = state.sales.filter(s => s.customerId === id).sort((a, b) => b.date.localeCompare(a.date));
  const customerFollowUps = state.followUps.filter(f => f.customerId === id).sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate));
  const customerQuotes = state.quotes.filter(q => q.customerId === id);

  const handleCreateFollowUp = () => {
    if (!followUpForm.scheduledDate) { showToast('Informe a data agendada.'); return; }
    addFollowUp({
      customerId: customer.id,
      customerName: customer.name,
      reason: followUpForm.reason,
      description: followUpForm.description,
      channel: followUpForm.channel,
      scheduledDate: followUpForm.scheduledDate,
      status: 'pending' as FollowUpStatus,
      responsible: followUpForm.responsible,
      result: '',
      nextActionDate: null,
    });
    setShowFollowUpForm(false);
    setFollowUpForm({ reason: 'post_purchase', description: '', channel: 'whatsapp', scheduledDate: '', responsible: '' });
  };

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/clientes')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="w-4 h-4" /> Voltar para clientes
      </button>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">{customer.name}</h2>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-500">
              <span className="flex items-center gap-1"><Phone className="w-4 h-4" />{formatPhone(customer.phone)}</span>
              {customer.email && <span className="flex items-center gap-1"><Mail className="w-4 h-4" />{customer.email}</span>}
              <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100">{ORIGIN_LABELS[customer.origin]}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate(`/clientes`)} className="p-2 text-gray-400 hover:text-blue-600 rounded-lg border border-gray-200"><Edit2 className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-100">
          <div><p className="text-xs text-gray-500">Preferência</p><p className="text-sm font-medium capitalize">{customer.contactPreference}</p></div>
          <div><p className="text-xs text-gray-500">Comunicação</p><p className="text-sm font-medium capitalize">{customer.communicationStatus}</p></div>
          <div><p className="text-xs text-gray-500">Última compra</p><p className="text-sm font-medium">{formatDate(customer.lastPurchaseDate)}</p></div>
          <div><p className="text-xs text-gray-500">Responsável</p><p className="text-sm font-medium">{customer.responsible || '—'}</p></div>
        </div>
        {customer.notes && <p className="mt-3 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{customer.notes}</p>}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button onClick={() => setShowFollowUpForm(true)} className="flex items-center gap-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <CalendarCheck className="w-4 h-4" /> Nova Tarefa
        </button>
      </div>

      {/* Sales History */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
        <h3 className="font-semibold text-gray-800 mb-3">Histórico de Compras ({customerSales.length})</h3>
        {customerSales.length > 0 ? (
          <div className="space-y-2">
            {customerSales.map(s => (
              <div key={s.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium">{s.number}</p>
                  <p className="text-xs text-gray-500">{formatDate(s.date)} • {s.items.length} item(ns)</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">{formatCurrency(s.total)}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${s.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {s.status === 'completed' ? 'Concluída' : s.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">Nenhuma compra registrada.</p>
        )}
      </div>

      {/* Follow-ups */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
        <h3 className="font-semibold text-gray-800 mb-3">Tarefas de Acompanhamento ({customerFollowUps.length})</h3>
        {customerFollowUps.length > 0 ? (
          <div className="space-y-2">
            {customerFollowUps.map(f => (
              <div key={f.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium">{FOLLOW_UP_REASON_LABELS[f.reason]}</p>
                  <p className="text-xs text-gray-500">{formatDate(f.scheduledDate)} • {f.description}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${f.status === 'completed' ? 'bg-green-100 text-green-700' : f.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                  {FOLLOW_UP_STATUS_LABELS[f.status]}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">Nenhuma tarefa de acompanhamento.</p>
        )}
      </div>

      {/* Quotes */}
      {customerQuotes.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-3">Orçamentos ({customerQuotes.length})</h3>
          <div className="space-y-2">
            {customerQuotes.map(q => (
              <div key={q.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium">Orçamento #{q.id.substring(0, 6)}</p>
                  <p className="text-xs text-gray-500">{formatDate(q.createdAt.split('T')[0])} • {q.items.length} item(ns)</p>
                </div>
                <p className="text-sm font-bold">{formatCurrency(q.total)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Follow-up Form */}
      {showFollowUpForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold mb-4">Nova Tarefa de Acompanhamento</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Motivo</label>
                <select value={followUpForm.reason} onChange={e => setFollowUpForm({ ...followUpForm, reason: e.target.value as FollowUpReason })} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm">
                  {Object.entries(FOLLOW_UP_REASON_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Descrição</label>
                <textarea value={followUpForm.description} onChange={e => setFollowUpForm({ ...followUpForm, description: e.target.value })} rows={2} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Data</label>
                  <input type="date" value={followUpForm.scheduledDate} onChange={e => setFollowUpForm({ ...followUpForm, scheduledDate: e.target.value })} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Canal</label>
                  <select value={followUpForm.channel} onChange={e => setFollowUpForm({ ...followUpForm, channel: e.target.value as ContactPreference })} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm">
                    <option value="whatsapp">WhatsApp</option>
                    <option value="phone">Telefone</option>
                    <option value="email">E-mail</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Responsável</label>
                <input value={followUpForm.responsible} onChange={e => setFollowUpForm({ ...followUpForm, responsible: e.target.value })} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={handleCreateFollowUp} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Criar Tarefa</button>
              <button onClick={() => setShowFollowUpForm(false)} className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
