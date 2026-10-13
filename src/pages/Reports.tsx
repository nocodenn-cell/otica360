import React, { useState, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { formatCurrency, formatDate, formatPhone, ORIGIN_LABELS, PAYMENT_LABELS, SALE_STATUS_LABELS, FOLLOW_UP_REASON_LABELS, FOLLOW_UP_STATUS_LABELS, isOverdue, isToday } from '../utils/format';
import { exportToCSV } from '../utils/storage';
import { Download, FileText, AlertTriangle, CalendarCheck, Users, ShoppingCart } from 'lucide-react';

export default function Reports() {
  const { state, showToast } = useApp();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const filteredSales = useMemo(() => {
    let sales = state.sales.filter(s => s.status === 'completed');
    if (dateFrom) sales = sales.filter(s => s.date >= dateFrom);
    if (dateTo) sales = sales.filter(s => s.date <= dateTo);
    return sales;
  }, [state.sales, dateFrom, dateTo]);

  const filteredCustomers = useMemo(() => {
    let customers = state.customers.filter(c => !c.archived);
    if (dateFrom) customers = customers.filter(c => c.createdAt >= dateFrom);
    if (dateTo) customers = customers.filter(c => c.createdAt <= dateTo + 'T23:59:59');
    return customers;
  }, [state.customers, dateFrom, dateTo]);

  // Routine data
  const todayFollowUps = state.followUps.filter(f => isToday(f.scheduledDate) && f.status !== 'completed');
  const overdueFollowUps = state.followUps.filter(f => isOverdue(f.scheduledDate) && f.status !== 'completed' && f.status !== 'cancelled');
  const pendingQuotes = state.quotes.filter(q => q.status === 'sent' || q.status === 'draft');
  const leadsWithoutContact = state.leads.filter(l => !['won', 'lost'].includes(l.stage) && isOverdue(l.nextContactDate));
  const failedMessages = state.messageEvents.filter(m => m.status === 'failed');

  const totalRevenue = filteredSales.reduce((s, sale) => s + sale.total, 0);
  const avgTicket = filteredSales.length > 0 ? totalRevenue / filteredSales.length : 0;

  const exportSales = () => {
    const headers = ['Número', 'Cliente', 'Data', 'Subtotal', 'Desconto', 'Total', 'Pagamento', 'Status', 'Origem', 'Responsável'];
    const rows = filteredSales.map(s => [s.number, s.customerName, s.date, s.subtotal.toString(), s.discount.toString(), s.total.toString(), PAYMENT_LABELS[s.paymentMethod], SALE_STATUS_LABELS[s.status], ORIGIN_LABELS[s.origin], s.responsible]);
    const csv = exportToCSV(headers, rows);
    downloadCSV(csv, 'vendas_otica360.csv');
    showToast('Exportação concluída!');
  };

  const exportCustomers = () => {
    const headers = ['Nome', 'Telefone', 'Email', 'Origem', 'Data Cadastro', 'Última Compra'];
    const rows = filteredCustomers.map(c => [c.name, c.phone, c.email, ORIGIN_LABELS[c.origin], c.createdAt.split('T')[0], c.lastPurchaseDate || '']);
    const csv = exportToCSV(headers, rows);
    downloadCSV(csv, 'clientes_otica360.csv');
    showToast('Exportação concluída!');
  };

  const downloadCSV = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  // Payment breakdown
  const paymentBreakdown = useMemo(() => {
    const map: Record<string, { count: number; total: number }> = {};
    filteredSales.forEach(s => {
      if (!map[s.paymentMethod]) map[s.paymentMethod] = { count: 0, total: 0 };
      map[s.paymentMethod].count++;
      map[s.paymentMethod].total += s.total;
    });
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total);
  }, [filteredSales]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Relatórios & Rotina</h2>

      {/* My Routine */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <CalendarCheck className="w-5 h-5 text-blue-600" /> Minha Rotina
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <RoutineCard icon={<CalendarCheck className="w-5 h-5 text-yellow-600" />} title="Acompanhamentos de hoje" count={todayFollowUps.length} color="bg-yellow-50 border-yellow-200" />
          <RoutineCard icon={<AlertTriangle className="w-5 h-5 text-red-600" />} title="Tarefas atrasadas" count={overdueFollowUps.length} color="bg-red-50 border-red-200" />
          <RoutineCard icon={<FileText className="w-5 h-5 text-purple-600" />} title="Orçamentos pendentes" count={pendingQuotes.length} color="bg-purple-50 border-purple-200" />
          <RoutineCard icon={<Users className="w-5 h-5 text-orange-600" />} title="Leads sem retorno" count={leadsWithoutContact.length} color="bg-orange-50 border-orange-200" />
          <RoutineCard icon={<AlertTriangle className="w-5 h-5 text-red-600" />} title="Mensagens com falha" count={failedMessages.length} color="bg-red-50 border-red-200" />
          <RoutineCard icon={<ShoppingCart className="w-5 h-5 text-blue-600" />} title="Vendas no período" count={filteredSales.length} color="bg-blue-50 border-blue-200" />
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
        <h3 className="font-semibold text-gray-800 mb-3">Filtros por Período</h3>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs text-gray-500">De</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="block mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-500">Até</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="block mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          </div>
          <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700">Limpar</button>
        </div>
      </div>

      {/* Sales Report */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800">Relatório de Vendas</h3>
          <button onClick={exportSales} className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-50 text-green-700 rounded-lg hover:bg-green-100">
            <Download className="w-4 h-4" /> Exportar CSV
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">Faturamento</p>
            <p className="text-lg font-bold text-green-600">{formatCurrency(totalRevenue)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">Nº de Vendas</p>
            <p className="text-lg font-bold">{filteredSales.length}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">Ticket Médio</p>
            <p className="text-lg font-bold">{formatCurrency(avgTicket)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">Clientes no período</p>
            <p className="text-lg font-bold">{filteredCustomers.length}</p>
          </div>
        </div>

        {/* Payment Breakdown */}
        {paymentBreakdown.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Por forma de pagamento:</p>
            <div className="space-y-2">
              {paymentBreakdown.map(([method, data]) => (
                <div key={method} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm">
                  <span>{PAYMENT_LABELS[method]} ({data.count}x)</span>
                  <span className="font-medium">{formatCurrency(data.total)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Customer Report */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800">Relatório de Clientes</h3>
          <button onClick={exportCustomers} className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-50 text-green-700 rounded-lg hover:bg-green-100">
            <Download className="w-4 h-4" /> Exportar CSV
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">Total de clientes</p>
            <p className="text-lg font-bold">{filteredCustomers.length}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">Novos no período</p>
            <p className="text-lg font-bold">{filteredCustomers.filter(c => dateFrom ? c.createdAt >= dateFrom : true).length}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">Com compra registrada</p>
            <p className="text-lg font-bold">{filteredCustomers.filter(c => c.lastPurchaseDate).length}</p>
          </div>
        </div>

        {/* Origin breakdown */}
        {(() => {
          const originMap: Record<string, number> = {};
          filteredCustomers.forEach(c => { originMap[c.origin] = (originMap[c.origin] || 0) + 1; });
          const entries = Object.entries(originMap).sort((a, b) => b[1] - a[1]);
          if (entries.length === 0) return null;
          return (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Por origem:</p>
              <div className="space-y-2">
                {entries.map(([origin, count]) => (
                  <div key={origin} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm">
                    <span>{ORIGIN_LABELS[origin]}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Overdue Follow-ups Detail */}
      {overdueFollowUps.length > 0 && (
        <div className="bg-white rounded-xl border border-red-200 p-5 shadow-sm">
          <h3 className="font-semibold text-red-700 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" /> Tarefas Atrasadas — Ação Necessária
          </h3>
          <div className="space-y-2">
            {overdueFollowUps.slice(0, 10).map(f => (
              <div key={f.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium">{f.customerName}</p>
                  <p className="text-xs text-gray-500">{FOLLOW_UP_REASON_LABELS[f.reason]} • Previsto: {formatDate(f.scheduledDate)}</p>
                </div>
                <span className="text-xs text-red-600 font-medium">{Math.ceil((new Date().getTime() - new Date(f.scheduledDate).getTime()) / (1000 * 60 * 60 * 24))} dias atrasado</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RoutineCard({ icon, title, count, color }: { icon: React.ReactNode; title: string; count: number; color: string }) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border ${color}`}>
      {icon}
      <div>
        <p className="text-sm font-medium text-gray-800">{title}</p>
        <p className="text-lg font-bold">{count}</p>
      </div>
    </div>
  );
}
