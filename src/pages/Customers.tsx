import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { formatPhone, formatDate, ORIGIN_LABELS, isValidPhone, isValidEmail, maskPhone } from '../utils/format';
import { findDuplicateCustomers, parseCSV } from '../utils/storage';
import { Customer, CustomerOrigin, ContactPreference, CommunicationStatus } from '../types';
import { Plus, Search, Upload, Download, Edit2, Archive, AlertTriangle, X, FileText, Users } from 'lucide-react';
import { exportToCSV } from '../utils/storage';

export default function Customers() {
  const { state, addCustomer, updateCustomer, importCustomers, showToast } = useApp();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', email: '', origin: 'unknown' as CustomerOrigin, contactPreference: 'whatsapp' as ContactPreference, communicationStatus: 'authorized' as CommunicationStatus, notes: '', responsible: '' });
  const [errors, setErrors] = useState<string[]>([]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return state.customers.filter(c => !c.archived && (c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.email.toLowerCase().includes(q)));
  }, [state.customers, search]);

  const handleSave = () => {
    const errs: string[] = [];
    if (!form.name.trim()) errs.push('Nome é obrigatório');
    if (!isValidPhone(form.phone)) errs.push('Telefone inválido');
    if (!isValidEmail(form.email)) errs.push('E-mail inválido');
    if (errs.length > 0) { setErrors(errs); return; }

    const duplicates = findDuplicateCustomers(state.customers, form.phone, editingId || undefined);
    if (duplicates.length > 0) {
      const confirm = window.confirm(`Possível duplicidade encontrada: ${duplicates.map(d => d.name).join(', ')}. Deseja continuar?`);
      if (!confirm) return;
    }

    const customerData = { ...form, lastPurchaseDate: null as string | null, nextActionDate: null as string | null, archived: false };
    if (editingId) {
      updateCustomer(editingId, form);
      showToast('Cliente atualizado!');
    } else {
      addCustomer(customerData);
    }
    resetForm();
  };

  const resetForm = () => {
    setForm({ name: '', phone: '', email: '', origin: 'unknown', contactPreference: 'whatsapp', communicationStatus: 'authorized', notes: '', responsible: '' });
    setEditingId(null);
    setShowForm(false);
    setErrors([]);
  };

  const handleEdit = (c: Customer) => {
    setForm({ name: c.name, phone: c.phone, email: c.email, origin: c.origin, contactPreference: c.contactPreference, communicationStatus: c.communicationStatus, notes: c.notes, responsible: c.responsible });
    setEditingId(c.id);
    setShowForm(true);
  };

  const handleArchive = (id: string) => {
    if (window.confirm('Arquivar este cliente?')) {
      updateCustomer(id, { archived: true });
      showToast('Cliente arquivado.');
    }
  };

  const handleExport = () => {
    const headers = ['Nome', 'Telefone', 'Email', 'Origem', 'Preferência Contato', 'Status Comunicação', 'Observações', 'Responsável', 'Data Cadastro'];
    const rows = filtered.map(c => [c.name, c.phone, c.email, c.origin, c.contactPreference, c.communicationStatus, c.notes, c.responsible, c.createdAt]);
    const csv = exportToCSV(headers, rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'clientes_atelie_da_otica.csv'; a.click();
    URL.revokeObjectURL(url);
    showToast('Exportação concluída!');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-gray-800">Clientes</h2>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setShowImport(true)} className="flex items-center gap-1 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
            <Upload className="w-4 h-4" /> Importar CSV
          </button>
          <button onClick={handleExport} className="flex items-center gap-1 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
            <Download className="w-4 h-4" /> Exportar
          </button>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" /> Novo Cliente
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome, telefone ou e-mail..." className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      <p className="text-sm text-gray-500">{filtered.length} cliente(s) encontrado(s)</p>

      {/* Customer List */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Nenhum cliente encontrado.</p>
            <p className="text-sm mt-1">Cadastre seu primeiro cliente ou importe de uma planilha.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left text-gray-500">
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3 hidden md:table-cell">Telefone</th>
                  <th className="px-4 py-3 hidden lg:table-cell">Origem</th>
                  <th className="px-4 py-3 hidden lg:table-cell">Última Compra</th>
                  <th className="px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id} className="border-t border-gray-50 hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/clientes/${c.id}`)}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">{c.name}</div>
                      <div className="text-xs text-gray-400 md:hidden">{formatPhone(c.phone)}</div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-gray-600">{formatPhone(c.phone)}</td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">{ORIGIN_LABELS[c.origin]}</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-gray-600">{formatDate(c.lastPurchaseDate)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                        <button onClick={() => handleEdit(c)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleArchive(c.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded"><Archive className="w-4 h-4" /></button>
                      </div>
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
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">{editingId ? 'Editar Cliente' : 'Novo Cliente'}</h3>
              <button onClick={resetForm}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            {errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                {errors.map((e, i) => <p key={i} className="text-sm text-red-700">{e}</p>)}
              </div>
            )}
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Nome completo *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Telefone *</label>
                <input value={form.phone} onChange={e => setForm({ ...form, phone: maskPhone(e.target.value) })} placeholder="(11) 99999-9999" className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">E-mail</label>
                <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} type="email" className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Origem</label>
                  <select value={form.origin} onChange={e => setForm({ ...form, origin: e.target.value as CustomerOrigin })} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm">
                    {Object.entries(ORIGIN_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Preferência</label>
                  <select value={form.contactPreference} onChange={e => setForm({ ...form, contactPreference: e.target.value as ContactPreference })} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm">
                    <option value="whatsapp">WhatsApp</option>
                    <option value="phone">Telefone</option>
                    <option value="email">E-mail</option>
                    <option value="sms">SMS</option>
                    <option value="none">Não contatar</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Status de Comunicação</label>
                <select value={form.communicationStatus} onChange={e => setForm({ ...form, communicationStatus: e.target.value as CommunicationStatus })} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm">
                  <option value="authorized">Autorizado</option>
                  <option value="pending">Pendente</option>
                  <option value="declined">Recusado</option>
                  <option value="unsubscribed">Descadastrado</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Responsável</label>
                <input value={form.responsible} onChange={e => setForm({ ...form, responsible: e.target.value })} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Observações</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={handleSave} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                {editingId ? 'Salvar Alterações' : 'Cadastrar'}
              </button>
              <button onClick={resetForm} className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImport && <ImportModal onClose={() => setShowImport(false)} onImport={importCustomers} showToast={showToast} />}
    </div>
  );
}

function ImportModal({ onClose, onImport, showToast }: { onClose: () => void; onImport: (customers: any[]) => void; showToast: (msg: string) => void }) {
  const [csvText, setCsvText] = useState('');
  const [preview, setPreview] = useState<{ headers: string[]; rows: string[][] } | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [importErrors, setImportErrors] = useState<string[]>([]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setCsvText(text);
      const parsed = parseCSV(text);
      setPreview(parsed);
      // Auto-map
      const autoMap: Record<string, string> = {};
      parsed.headers.forEach(h => {
        const lower = h.toLowerCase();
        if (lower.includes('nome') || lower.includes('name')) autoMap[h] = 'name';
        else if (lower.includes('telefone') || lower.includes('phone') || lower.includes('celular')) autoMap[h] = 'phone';
        else if (lower.includes('email') || lower.includes('e-mail')) autoMap[h] = 'email';
        else if (lower.includes('origem') || lower.includes('origin')) autoMap[h] = 'origin';
      });
      setMapping(autoMap);
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    if (!preview) return;
    const errs: string[] = [];
    const customers: any[] = [];
    preview.rows.forEach((row, i) => {
      const obj: Record<string, string> = {};
      preview.headers.forEach((h, j) => { obj[h] = row[j] || ''; });
      const name = obj[Object.keys(mapping).find(k => mapping[k] === 'name') || ''] || '';
      const phone = obj[Object.keys(mapping).find(k => mapping[k] === 'phone') || ''] || '';
      if (!name.trim()) { errs.push(`Linha ${i + 2}: Nome obrigatório`); return; }
      if (!isValidPhone(phone)) { errs.push(`Linha ${i + 2}: Telefone inválido (${phone})`); return; }
      customers.push({
        name: name.trim(),
        phone,
        email: obj[Object.keys(mapping).find(k => mapping[k] === 'email') || ''] || '',
        origin: 'unknown' as CustomerOrigin,
        contactPreference: 'whatsapp' as ContactPreference,
        communicationStatus: 'pending' as CommunicationStatus,
        notes: '',
        lastPurchaseDate: null,
        nextActionDate: null,
        responsible: '',
        archived: false,
      });
    });
    if (errs.length > 0) { setImportErrors(errs); return; }
    if (customers.length === 0) { showToast('Nenhum cliente válido encontrado.'); return; }
    onImport(customers);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">Importar Clientes (CSV)</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        {!preview ? (
          <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center">
            <FileText className="w-10 h-10 mx-auto text-gray-300 mb-3" />
            <p className="text-sm text-gray-500 mb-3">Selecione um arquivo CSV com os dados dos clientes</p>
            <input type="file" accept=".csv" onChange={handleFile} className="text-sm" />
            <p className="text-xs text-gray-400 mt-3">Colunas esperadas: Nome, Telefone, E-mail, Origem</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Mapeamento de colunas:</p>
              <div className="grid grid-cols-2 gap-2">
                {preview.headers.map(h => (
                  <div key={h} className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-24 truncate">{h}:</span>
                    <select value={mapping[h] || ''} onChange={e => setMapping({ ...mapping, [h]: e.target.value })} className="flex-1 text-sm border border-gray-200 rounded px-2 py-1">
                      <option value="">Ignorar</option>
                      <option value="name">Nome</option>
                      <option value="phone">Telefone</option>
                      <option value="email">E-mail</option>
                      <option value="origin">Origem</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Pré-visualização ({preview.rows.length} linhas):</p>
              <div className="max-h-40 overflow-auto border rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50"><tr>{preview.headers.map(h => <th key={h} className="px-2 py-1 text-left">{h}</th>)}</tr></thead>
                  <tbody>{preview.rows.slice(0, 5).map((row, i) => <tr key={i} className="border-t">{row.map((v, j) => <td key={j} className="px-2 py-1">{v}</td>)}</tr>)}</tbody>
                </table>
              </div>
            </div>
            {importErrors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm font-medium text-red-700 mb-1">Erros encontrados:</p>
                {importErrors.slice(0, 10).map((e, i) => <p key={i} className="text-xs text-red-600">{e}</p>)}
                {importErrors.length > 10 && <p className="text-xs text-red-600">...e mais {importErrors.length - 10} erro(s)</p>}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2 mt-5">
          <button onClick={handleImport} disabled={!preview} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            Importar
          </button>
          <button onClick={onClose} className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
        </div>
      </div>
    </div>
  );
}


