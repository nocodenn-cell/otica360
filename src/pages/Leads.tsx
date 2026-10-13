import React, { useState, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { formatCurrency, formatDate, STAGE_LABELS, STAGE_COLORS, ORIGIN_LABELS, LOSS_REASON_LABELS, isOverdue } from '../utils/format';
import { Lead, LeadStage, CustomerOrigin, LossReason, QuoteItem } from '../types';
import { Plus, X, Target, ChevronRight, AlertTriangle, FileText } from 'lucide-react';
import { v4 as uuid } from 'uuid';

export default function Leads() {
  const { state, addLead, updateLead, addQuote, addCustomer, showToast } = useApp();
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [leadForm, setLeadForm] = useState({ name: '', phone: '', email: '', origin: 'unknown' as CustomerOrigin, estimatedValue: 0, responsible: '', nextContactDate: '', notes: '' });
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);
  const [quoteDiscount, setQuoteDiscount] = useState(0);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quoteQty, setQuoteQty] = useState(1);

  const stages: LeadStage[] = ['new_contact', 'in_service', 'quote_sent', 'awaiting_return', 'won', 'lost'];

  const leadsByStage = useMemo(() => {
    const map: Record<string, Lead[]> = {};
    stages.forEach(s => { map[s] = []; });
    state.leads.forEach(l => { if (map[l.stage]) map[l.stage].push(l); });
    return map;
  }, [state.leads]);

  const handleSaveLead = () => {
    if (!leadForm.name.trim()) { showToast('Nome é obrigatório.'); return; }
    addLead({ ...leadForm, stage: 'new_contact', lossReason: null, customerId: null });
    setLeadForm({ name: '', phone: '', email: '', origin: 'unknown', estimatedValue: 0, responsible: '', nextContactDate: '', notes: '' });
    setShowLeadForm(false);
  };

  const handleStageChange = (lead: Lead, newStage: LeadStage) => {
    updateLead(lead.id, { stage: newStage });
    if (newStage === 'won') {
      // Convert to customer if not already
      if (!lead.customerId) {
        const existing = state.customers.find(c => c.phone.replace(/\D/g, '') === lead.phone.replace(/\D/g, ''));
        if (existing) {
          updateLead(lead.id, { customerId: existing.id });
        } else {
          addCustomer({ name: lead.name, phone: lead.phone, email: lead.email, origin: lead.origin, contactPreference: 'whatsapp', communicationStatus: 'pending', notes: lead.notes, lastPurchaseDate: null, nextActionDate: null, responsible: lead.responsible, archived: false });
        }
      }
      showToast('Lead convertido em venda!');
    }
  };

  const handleConvertToCustomer = (lead: Lead) => {
    const existing = state.customers.find(c => c.phone.replace(/\D/g, '') === lead.phone.replace(/\D/g, ''));
    if (existing) {
      updateLead(lead.id, { customerId: existing.id });
      showToast('Lead vinculado ao cliente existente.');
    } else {
      addCustomer({ name: lead.name, phone: lead.phone, email: lead.email, origin: lead.origin, contactPreference: 'whatsapp', communicationStatus: 'pending', notes: lead.notes, lastPurchaseDate: null, nextActionDate: null, responsible: lead.responsible, archived: false });
      showToast('Lead convertido em cliente!');
    }
  };

  const addQuoteItem = () => {
    if (!selectedProductId) return;
    const product = state.products.find(p => p.id === selectedProductId);
    if (!product) return;
    const item: QuoteItem = { id: uuid(), productId: product.id, productName: product.name, quantity: quoteQty, unitPrice: product.price, total: quoteQty * product.price };
    setQuoteItems([...quoteItems, item]);
    setSelectedProductId('');
    setQuoteQty(1);
  };

  const handleSaveQuote = () => {
    if (!selectedLead || quoteItems.length === 0) return;
    const sub = quoteItems.reduce((s, i) => s + i.total, 0);
    addQuote({
      leadId: selectedLead.id,
      customerId: selectedLead.customerId,
      customerName: selectedLead.name,
      items: quoteItems,
      subtotal: sub,
      discount: quoteDiscount,
      total: Math.max(0, sub - quoteDiscount),
      status: 'sent',
      validUntil: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      notes: '',
    });
    updateLead(selectedLead.id, { stage: 'quote_sent' });
    setShowQuoteForm(false);
    setQuoteItems([]);
    setQuoteDiscount(0);
    showToast('Orçamento criado e enviado!');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-gray-800">Leads & Orçamentos</h2>
        <button onClick={() => setShowLeadForm(true)} className="flex items-center gap-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Novo Lead
        </button>
      </div>

      {/* Pipeline View */}
      <div className="flex gap-3 overflow-x-auto pb-4">
        {stages.map(stage => (
          <div key={stage} className="min-w-[250px] flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className={`px-2 py-1 rounded-lg text-xs font-medium ${STAGE_COLORS[stage]}`}>{STAGE_LABELS[stage]}</span>
              <span className="text-xs text-gray-400">{leadsByStage[stage]?.length || 0}</span>
            </div>
            <div className="space-y-2">
              {(leadsByStage[stage] || []).map(lead => (
                <div key={lead.id} className="bg-white rounded-lg border border-gray-100 p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedLead(lead)}>
                  <p className="font-medium text-sm text-gray-800">{lead.name}</p>
                  <p className="text-xs text-gray-500 mt-1">{ORIGIN_LABELS[lead.origin]}</p>
                  {lead.estimatedValue > 0 && <p className="text-xs font-medium text-green-600 mt-1">{formatCurrency(lead.estimatedValue)}</p>}
                  {lead.nextContactDate && (
                    <p className={`text-xs mt-1 ${isOverdue(lead.nextContactDate) ? 'text-red-500 flex items-center gap-1' : 'text-gray-400'}`}>
                      {isOverdue(lead.nextContactDate) && <AlertTriangle className="w-3 h-3" />}
                      {formatDate(lead.nextContactDate)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500">Total de leads</p>
          <p className="text-xl font-bold">{state.leads.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500">Taxa de conversão</p>
          <p className="text-xl font-bold">{((leadsByStage['won']?.length || 0) / Math.max(1, state.leads.filter(l => ['won', 'lost'].includes(l.stage)).length) * 100).toFixed(1)}%</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500">Valor em pipeline</p>
          <p className="text-xl font-bold">{formatCurrency(state.leads.filter(l => !['won', 'lost'].includes(l.stage)).reduce((s, l) => s + l.estimatedValue, 0))}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500">Retornos atrasados</p>
          <p className="text-xl font-bold text-red-600">{state.leads.filter(l => !['won', 'lost'].includes(l.stage) && isOverdue(l.nextContactDate)).length}</p>
        </div>
      </div>

      {/* Lead Detail Panel */}
      {selectedLead && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">{selectedLead.name}</h3>
              <button onClick={() => setSelectedLead(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-500">Telefone:</span> <span className="font-medium">{selectedLead.phone}</span></div>
                <div><span className="text-gray-500">E-mail:</span> <span className="font-medium">{selectedLead.email || '—'}</span></div>
                <div><span className="text-gray-500">Origem:</span> <span className="font-medium">{ORIGIN_LABELS[selectedLead.origin]}</span></div>
                <div><span className="text-gray-500">Valor estimado:</span> <span className="font-medium">{formatCurrency(selectedLead.estimatedValue)}</span></div>
                <div><span className="text-gray-500">Próximo contato:</span> <span className={`font-medium ${isOverdue(selectedLead.nextContactDate) ? 'text-red-600' : ''}`}>{formatDate(selectedLead.nextContactDate)}</span></div>
                <div><span className="text-gray-500">Responsável:</span> <span className="font-medium">{selectedLead.responsible || '—'}</span></div>
              </div>
              {selectedLead.notes && <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{selectedLead.notes}</p>}

              {/* Stage Actions */}
              <div className="border-t pt-3">
                <p className="text-sm font-medium text-gray-700 mb-2">Mover para:</p>
                <div className="flex flex-wrap gap-2">
                  {stages.filter(s => s !== selectedLead.stage).map(s => (
                    <button key={s} onClick={() => { handleStageChange(selectedLead, s); setSelectedLead(null); }} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${STAGE_COLORS[s]} hover:opacity-80`}>
                      {STAGE_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="border-t pt-3 flex flex-wrap gap-2">
                <button onClick={() => { setShowQuoteForm(true); }} className="flex items-center gap-1 px-3 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                  <FileText className="w-4 h-4" /> Criar Orçamento
                </button>
                {!selectedLead.customerId && (
                  <button onClick={() => { handleConvertToCustomer(selectedLead); setSelectedLead(null); }} className="flex items-center gap-1 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700">
                    <Target className="w-4 h-4" /> Converter em Cliente
                  </button>
                )}
              </div>

              {/* Loss Reason (if lost) */}
              {selectedLead.stage === 'lost' && (
                <div className="border-t pt-3">
                  <p className="text-sm font-medium text-gray-700 mb-2">Motivo da perda:</p>
                  <select value={selectedLead.lossReason || ''} onChange={e => { updateLead(selectedLead.id, { lossReason: e.target.value as LossReason }); }} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                    <option value="">Selecionar...</option>
                    {Object.entries(LOSS_REASON_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* New Lead Form */}
      {showLeadForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Novo Lead</h3>
              <button onClick={() => setShowLeadForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <div><label className="text-sm font-medium text-gray-700">Nome *</label><input value={leadForm.name} onChange={e => setLeadForm({ ...leadForm, name: e.target.value })} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" /></div>
              <div><label className="text-sm font-medium text-gray-700">Telefone</label><input value={leadForm.phone} onChange={e => setLeadForm({ ...leadForm, phone: e.target.value })} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" /></div>
              <div><label className="text-sm font-medium text-gray-700">E-mail</label><input value={leadForm.email} onChange={e => setLeadForm({ ...leadForm, email: e.target.value })} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium text-gray-700">Origem</label>
                  <select value={leadForm.origin} onChange={e => setLeadForm({ ...leadForm, origin: e.target.value as CustomerOrigin })} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm">
                    {Object.entries(ORIGIN_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div><label className="text-sm font-medium text-gray-700">Valor estimado</label><input type="number" value={leadForm.estimatedValue || ''} onChange={e => setLeadForm({ ...leadForm, estimatedValue: parseFloat(e.target.value) || 0 })} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" /></div>
              </div>
              <div><label className="text-sm font-medium text-gray-700">Próximo contato</label><input type="date" value={leadForm.nextContactDate} onChange={e => setLeadForm({ ...leadForm, nextContactDate: e.target.value })} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" /></div>
              <div><label className="text-sm font-medium text-gray-700">Responsável</label><input value={leadForm.responsible} onChange={e => setLeadForm({ ...leadForm, responsible: e.target.value })} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" /></div>
              <div><label className="text-sm font-medium text-gray-700">Observações</label><textarea value={leadForm.notes} onChange={e => setLeadForm({ ...leadForm, notes: e.target.value })} rows={2} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" /></div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={handleSaveLead} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Cadastrar Lead</button>
              <button onClick={() => setShowLeadForm(false)} className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Quote Form */}
      {showQuoteForm && selectedLead && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Orçamento para {selectedLead.name}</h3>
              <button onClick={() => { setShowQuoteForm(false); setQuoteItems([]); }}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <select value={selectedProductId} onChange={e => setSelectedProductId(e.target.value)} className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm">
                  <option value="">Selecione um produto...</option>
                  {state.products.filter(p => p.active).map(p => <option key={p.id} value={p.id}>{p.name} - {formatCurrency(p.price)}</option>)}
                </select>
                <input type="number" min={1} value={quoteQty} onChange={e => setQuoteQty(parseInt(e.target.value) || 1)} className="w-16 px-2 py-2 border border-gray-200 rounded-lg text-sm" />
                <button onClick={addQuoteItem} disabled={!selectedProductId} className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50">Adicionar</button>
              </div>
            </div>
            {quoteItems.length > 0 && (
              <div className="mb-4">
                {quoteItems.map(item => (
                  <div key={item.id} className="flex justify-between items-center py-2 border-b border-gray-100 text-sm">
                    <span>{item.productName} x{item.quantity}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{formatCurrency(item.total)}</span>
                      <button onClick={() => setQuoteItems(quoteItems.filter(i => i.id !== item.id))} className="text-red-400"><X className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between items-center mt-3 text-sm">
                  <span>Desconto:</span>
                  <input type="number" step="0.01" value={quoteDiscount || ''} onChange={e => setQuoteDiscount(parseFloat(e.target.value) || 0)} className="w-24 px-2 py-1 border border-gray-200 rounded text-sm text-right" />
                </div>
                <div className="flex justify-between font-bold mt-2">
                  <span>Total:</span>
                  <span>{formatCurrency(Math.max(0, quoteItems.reduce((s, i) => s + i.total, 0) - quoteDiscount))}</span>
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={handleSaveQuote} disabled={quoteItems.length === 0} className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50">Enviar Orçamento</button>
              <button onClick={() => { setShowQuoteForm(false); setQuoteItems([]); }} className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
