import { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { formatDate, formatDateTime, formatPhone } from '../utils/format';
import { MessageCircle, AlertTriangle, Send, Settings, Info } from 'lucide-react';
import { MessageStatus } from '../types';

export default function Messages() {
  const { state, addMessageEvent, showToast } = useApp();
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');

  const handleSend = (isTest: boolean) => {
    if (!selectedTemplate || !selectedCustomer) {
      showToast('Selecione um template e um cliente.');
      return;
    }
    const template = state.messageTemplates.find(t => t.id === selectedTemplate);
    const customer = state.customers.find(c => c.id === selectedCustomer);
    if (!template || !customer) return;

    if (customer.communicationStatus === 'unsubscribed' || customer.communicationStatus === 'declined') {
      showToast('Cliente não autoriza recebimento de mensagens.');
      return;
    }

    const content = template.content.replace('{{nome}}', customer.name.split(' ')[0]);

    addMessageEvent({
      customerId: customer.id,
      customerName: customer.name,
      templateId: template.id,
      templateName: template.name,
      channel: template.channel,
      status: isTest ? 'sent' as MessageStatus : 'pending' as MessageStatus,
      content,
      sentAt: isTest ? new Date().toISOString() : null,
      deliveredAt: null,
      failedAt: null,
      failureReason: isTest ? '' : 'Integração não configurada',
      retryCount: 0,
      isTestMode: isTest,
    });

    showToast(isTest ? 'Mensagem de teste registrada (modo demonstração).' : 'Mensagem agendada (aguardando configuração da integração).');
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    sent: 'bg-blue-100 text-blue-700',
    delivered: 'bg-green-100 text-green-700',
    read: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
    blocked: 'bg-gray-100 text-gray-700',
  };

  const statusLabels: Record<string, string> = {
    pending: 'Pendente',
    sent: 'Enviada (teste)',
    delivered: 'Entregue',
    read: 'Lida',
    failed: 'Falha',
    blocked: 'Bloqueada',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Mensagens</h2>
      </div>

      {/* Demo Mode Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-600 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">Modo Demonstração</p>
            <p className="text-sm text-amber-700 mt-1">
              As mensagens não são enviadas de verdade. Para ativar o envio real, configure a integração com a WhatsApp Business Platform ou um provedor autorizado nas variáveis de ambiente.
            </p>
          </div>
        </div>
      </div>

      {/* Send Message */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
        <h3 className="font-semibold text-gray-800 mb-4">Enviar Mensagem</h3>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700">Template</label>
            <select value={selectedTemplate} onChange={e => setSelectedTemplate(e.target.value)} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm">
              <option value="">Selecione um template...</option>
              {state.messageTemplates.filter(t => t.active).map(t => <option key={t.id} value={t.id}>{t.name} ({t.channel})</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Cliente</label>
            <select value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm">
              <option value="">Selecione um cliente...</option>
              {state.customers.filter(c => !c.archived && c.communicationStatus !== 'unsubscribed' && c.communicationStatus !== 'declined').map(c => (
                <option key={c.id} value={c.id}>{c.name} - {formatPhone(c.phone)}</option>
              ))}
            </select>
          </div>
          {selectedTemplate && selectedCustomer && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Pré-visualização:</p>
              <p className="text-sm text-gray-700">
                {state.messageTemplates.find(t => t.id === selectedTemplate)?.content.replace('{{nome}}', state.customers.find(c => c.id === selectedCustomer)?.name.split(' ')[0] || '')}
              </p>
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={() => handleSend(true)} className="flex items-center gap-1 px-4 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200">
              <Send className="w-4 h-4" /> Enviar (Teste)
            </button>
            <button onClick={() => handleSend(false)} className="flex items-center gap-1 px-4 py-2 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">
              <Send className="w-4 h-4" /> Agendar (Real)
            </button>
          </div>
        </div>
      </div>

      {/* Message History */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
        <h3 className="font-semibold text-gray-800 mb-4">Histórico de Mensagens</h3>
        {state.messageEvents.length === 0 ? (
          <p className="text-sm text-gray-400">Nenhuma mensagem registrada.</p>
        ) : (
          <div className="space-y-2">
            {state.messageEvents.slice().reverse().map(event => (
              <div key={event.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{event.customerName}</p>
                    {event.isTestMode && <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-100 text-blue-700">TESTE</span>}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{event.templateName} • {event.channel} • {formatDateTime(event.createdAt)}</p>
                  {event.failureReason && <p className="text-xs text-red-500 mt-0.5">{event.failureReason}</p>}
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs ${statusColors[event.status]}`}>{statusLabels[event.status]}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Templates */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800">Templates de Mensagem</h3>
          <Settings className="w-4 h-4 text-gray-400" />
        </div>
        <div className="space-y-2">
          {state.messageTemplates.map(t => (
            <div key={t.id} className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{t.name}</p>
                <span className="text-xs text-gray-500 capitalize">{t.channel}</span>
              </div>
              <p className="text-xs text-gray-600 mt-1">{t.content}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
