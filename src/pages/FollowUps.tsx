import { useState, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { formatDate, formatPhone, FOLLOW_UP_STATUS_LABELS, FOLLOW_UP_REASON_LABELS, isOverdue, isToday } from '../utils/format';
import { FollowUpTask, FollowUpStatus, FollowUpReason, ContactPreference } from '../types';
import { Plus, X, CalendarCheck, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { getTodayStr } from '../utils/format';

export default function FollowUps() {
  const { state, addFollowUp, updateFollowUp, showToast } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'overdue' | 'today' | 'completed'>('all');
  const [form, setForm] = useState({ customerId: '', reason: 'post_purchase' as FollowUpReason, description: '', channel: 'whatsapp' as ContactPreference, scheduledDate: getTodayStr(), responsible: '' });
  const [resultForm, setResultForm] = useState<Record<string, string>>({});

  const filtered = useMemo(() => {
    let tasks = [...state.followUps];
    if (filter === 'pending') tasks = tasks.filter(f => f.status === 'pending' || f.status === 'scheduled');
    else if (filter === 'overdue') tasks = tasks.filter(f => (f.status === 'pending' || f.status === 'scheduled') && isOverdue(f.scheduledDate));
    else if (filter === 'today') tasks = tasks.filter(f => isToday(f.scheduledDate));
    else if (filter === 'completed') tasks = tasks.filter(f => f.status === 'completed');
    return tasks.sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
  }, [state.followUps, filter]);

  const handleSave = () => {
    if (!form.customerId) { showToast('Selecione um cliente.'); return; }
    if (!form.scheduledDate) { showToast('Informe a data.'); return; }
    const customer = state.customers.find(c => c.id === form.customerId);
    if (!customer) return;
    addFollowUp({
      customerId: form.customerId,
      customerName: customer.name,
      reason: form.reason,
      description: form.description,
      channel: form.channel,
      scheduledDate: form.scheduledDate,
      status: 'pending',
      responsible: form.responsible,
      result: '',
      nextActionDate: null,
    });
    setShowForm(false);
    setForm({ customerId: '', reason: 'post_purchase', description: '', channel: 'whatsapp', scheduledDate: getTodayStr(), responsible: '' });
  };

  const handleStatusChange = (id: string, status: FollowUpStatus) => {
    updateFollowUp(id, { status });
    if (status === 'completed') showToast('Tarefa concluída!');
  };

  const handleSaveResult = (id: string) => {
    updateFollowUp(id, { result: resultForm[id] || '' });
    showToast('Resultado registrado.');
  };

  const filters = [
    { key: 'all', label: 'Todas', count: state.followUps.length },
    { key: 'pending', label: 'Pendentes', count: state.followUps.filter(f => f.status === 'pending' || f.status === 'scheduled').length },
    { key: 'overdue', label: 'Atrasadas', count: state.followUps.filter(f => (f.status === 'pending' || f.status === 'scheduled') && isOverdue(f.scheduledDate)).length },
    { key: 'today', label: 'Hoje', count: state.followUps.filter(f => isToday(f.scheduledDate)).length },
    { key: 'completed', label: 'Concluídas', count: state.followUps.filter(f => f.status === 'completed').length },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-gray-800">Pós-venda & Acompanhamentos</h2>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Nova Tarefa
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {filters.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key as any)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === f.key ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {f.label} <span className="ml-1 text-xs opacity-70">({f.count})</span>
          </button>
        ))}
      </div>

      {/* Task List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-gray-400">
            <CalendarCheck className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Nenhuma tarefa encontrada.</p>
          </div>
        ) : (
          filtered.map(task => (
            <div key={task.id} className={`bg-white rounded-xl border p-4 shadow-sm ${isOverdue(task.scheduledDate) && task.status !== 'completed' ? 'border-red-200' : 'border-gray-100'}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-gray-800">{task.customerName}</h4>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${task.status === 'completed' ? 'bg-green-100 text-green-700' : task.status === 'failed' ? 'bg-red-100 text-red-700' : isOverdue(task.scheduledDate) ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {FOLLOW_UP_STATUS_LABELS[task.status]}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-gray-500">
                    <span>{FOLLOW_UP_REASON_LABELS[task.reason]}</span>
                    <span className="flex items-center gap-1">
                      {isOverdue(task.scheduledDate) && task.status !== 'completed' ? <AlertTriangle className="w-3 h-3 text-red-500" /> : <Clock className="w-3 h-3" />}
                      {formatDate(task.scheduledDate)}
                    </span>
                    <span className="capitalize">{task.channel}</span>
                    {task.responsible && <span>Resp: {task.responsible}</span>}
                  </div>
                  {task.description && <p className="text-sm text-gray-600 mt-1">{task.description}</p>}
                  {task.result && <p className="text-sm text-green-700 mt-1 bg-green-50 p-2 rounded">Resultado: {task.result}</p>}
                </div>
              </div>

              {/* Actions */}
              {task.status !== 'completed' && task.status !== 'cancelled' && (
                <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-2">
                  <div className="flex-1">
                    <input value={resultForm[task.id] || ''} onChange={e => setResultForm({ ...resultForm, [task.id]: e.target.value })} placeholder="Registrar resultado..." className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm" />
                  </div>
                  <button onClick={() => handleSaveResult(task.id)} className="px-3 py-1.5 text-xs bg-gray-100 rounded-lg hover:bg-gray-200">Salvar</button>
                  <button onClick={() => handleStatusChange(task.id, 'completed')} className="px-3 py-1.5 text-xs bg-green-100 text-green-700 rounded-lg hover:bg-green-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Concluir
                  </button>
                  <button onClick={() => handleStatusChange(task.id, 'cancelled')} className="px-3 py-1.5 text-xs bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">Cancelar</button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Nova Tarefa de Acompanhamento</h3>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Cliente *</label>
                <select value={form.customerId} onChange={e => setForm({ ...form, customerId: e.target.value })} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm">
                  <option value="">Selecionar cliente...</option>
                  {state.customers.filter(c => !c.archived).map(c => <option key={c.id} value={c.id}>{c.name} - {formatPhone(c.phone)}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Motivo</label>
                <select value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value as FollowUpReason })} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm">
                  {Object.entries(FOLLOW_UP_REASON_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Descrição</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Data agendada</label>
                  <input type="date" value={form.scheduledDate} onChange={e => setForm({ ...form, scheduledDate: e.target.value })} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Canal</label>
                  <select value={form.channel} onChange={e => setForm({ ...form, channel: e.target.value as ContactPreference })} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm">
                    <option value="whatsapp">WhatsApp</option>
                    <option value="phone">Telefone</option>
                    <option value="email">E-mail</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Responsável</label>
                <input value={form.responsible} onChange={e => setForm({ ...form, responsible: e.target.value })} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={handleSave} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Criar Tarefa</button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
