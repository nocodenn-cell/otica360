import React, { useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { formatCurrency, formatDate, isOverdue, isToday } from '../utils/format';
import { TrendingUp, Users, ShoppingCart, Target, CalendarCheck, AlertTriangle, DollarSign, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function Dashboard() {
  const { state } = useApp();
  const { sales, customers, leads, followUps, quotes } = state;

  const stats = useMemo(() => {
    const validSales = sales.filter(s => s.status === 'completed');
    const totalRevenue = validSales.reduce((sum, s) => sum + s.total, 0);
    const avgTicket = validSales.length > 0 ? totalRevenue / validSales.length : 0;
    const activeLeads = leads.filter(l => !['won', 'lost'].includes(l.stage));
    const wonLeads = leads.filter(l => l.stage === 'won');
    const lostLeads = leads.filter(l => l.stage === 'lost');
    const conversionRate = (wonLeads.length + lostLeads.length) > 0
      ? (wonLeads.length / (wonLeads.length + lostLeads.length)) * 100 : 0;
    const pendingFollowUps = followUps.filter(f => f.status === 'pending' || f.status === 'scheduled');
    const overdueFollowUps = followUps.filter(f => (f.status === 'pending' || f.status === 'scheduled') && isOverdue(f.scheduledDate));
    const todayFollowUps = followUps.filter(f => isToday(f.scheduledDate));
    const pendingQuotes = quotes.filter(q => q.status === 'draft' || q.status === 'sent');

    return { totalRevenue, avgTicket, totalSales: validSales.length, totalCustomers: customers.length, activeLeads: activeLeads.length, conversionRate, pendingFollowUps: pendingFollowUps.length, overdueFollowUps: overdueFollowUps.length, todayFollowUps: todayFollowUps.length, pendingQuotes: pendingQuotes.length };
  }, [sales, customers, leads, followUps, quotes]);

  const salesByOrigin = useMemo(() => {
    const map: Record<string, number> = {};
    sales.filter(s => s.status === 'completed').forEach(s => {
      const key = s.origin || 'unknown';
      map[key] = (map[key] || 0) + s.total;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [sales]);

  const monthlySales = useMemo(() => {
    const map: Record<string, number> = {};
    sales.filter(s => s.status === 'completed').forEach(s => {
      const month = s.date.substring(0, 7);
      map[month] = (map[month] || 0) + s.total;
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).slice(-6).map(([name, value]) => ({ name: name.substring(5) + '/' + name.substring(0, 4), value }));
  }, [sales]);

  const topProducts = useMemo(() => {
    const map: Record<string, { name: string; qty: number; revenue: number }> = {};
    sales.filter(s => s.status === 'completed').forEach(s => {
      s.items.forEach(item => {
        if (!map[item.productId]) map[item.productId] = { name: item.productName, qty: 0, revenue: 0 };
        map[item.productId].qty += item.quantity;
        map[item.productId].revenue += item.total;
      });
    });
    return Object.values(map).sort((a, b) => b.qty - a.qty).slice(0, 5);
  }, [sales]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  const cards = [
    { label: 'Faturamento', value: formatCurrency(stats.totalRevenue), icon: DollarSign, color: 'bg-green-50 text-green-600' },
    { label: 'Vendas', value: stats.totalSales.toString(), icon: ShoppingCart, color: 'bg-blue-50 text-blue-600' },
    { label: 'Ticket Médio', value: formatCurrency(stats.avgTicket), icon: TrendingUp, color: 'bg-purple-50 text-purple-600' },
    { label: 'Clientes', value: stats.totalCustomers.toString(), icon: Users, color: 'bg-indigo-50 text-indigo-600' },
    { label: 'Leads Ativos', value: stats.activeLeads.toString(), icon: Target, color: 'bg-orange-50 text-orange-600' },
    { label: 'Conversão', value: `${stats.conversionRate.toFixed(1)}%`, icon: BarChart3, color: 'bg-teal-50 text-teal-600' },
    { label: 'Orçamentos Abertos', value: stats.pendingQuotes.toString(), icon: CalendarCheck, color: 'bg-yellow-50 text-yellow-600' },
    { label: 'Tarefas Atrasadas', value: stats.overdueFollowUps.toString(), icon: AlertTriangle, color: 'bg-red-50 text-red-600' },
  ];

  const hasData = sales.length > 0 || customers.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
        <span className="text-sm text-gray-500">Dados em tempo real</span>
      </div>

      {!hasData && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-blue-800">
          <p className="font-medium">Bem-vindo ao Ateliê da Ótica!</p>
          <p className="text-sm mt-1">Comece cadastrando seus clientes e registrando vendas para visualizar os indicadores aqui.</p>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map(card => (
          <div key={card.label} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${card.color}`}>
                <card.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500">{card.label}</p>
                <p className="text-lg font-bold text-gray-800">{card.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Sales */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4">Vendas Mensais</h3>
          {monthlySales.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlySales}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">Sem dados de vendas</div>
          )}
        </div>

        {/* Sales by Origin */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4">Vendas por Origem</h3>
          {salesByOrigin.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={salesByOrigin} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name }) => name}>
                  {salesByOrigin.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">Sem dados de vendas</div>
          )}
        </div>
      </div>

      {/* Top Products & Pending Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4">Produtos Mais Vendidos</h3>
          {topProducts.length > 0 ? (
            <div className="space-y-3">
              {topProducts.map((p, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">{i + 1}</span>
                    <span className="text-sm text-gray-700">{p.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium text-gray-800">{p.qty} un.</span>
                    <span className="text-xs text-gray-500 ml-2">{formatCurrency(p.revenue)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">Nenhuma venda registrada</p>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4">Próximos Acompanhamentos</h3>
          {stats.todayFollowUps > 0 || stats.overdueFollowUps > 0 ? (
            <div className="space-y-2">
              {stats.overdueFollowUps > 0 && (
                <div className="flex items-center gap-2 p-2 bg-red-50 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <span className="text-sm text-red-700">{stats.overdueFollowUps} tarefa(s) atrasada(s)</span>
                </div>
              )}
              {stats.todayFollowUps > 0 && (
                <div className="flex items-center gap-2 p-2 bg-yellow-50 rounded-lg">
                  <CalendarCheck className="w-4 h-4 text-yellow-600" />
                  <span className="text-sm text-yellow-700">{stats.todayFollowUps} tarefa(s) para hoje</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">Nenhuma tarefa pendente</p>
          )}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-500">Total de tarefas pendentes: <strong>{stats.pendingFollowUps}</strong></p>
          </div>
        </div>
      </div>

      {/* Recent Sales */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
        <h3 className="font-semibold text-gray-800 mb-4">Últimas Vendas</h3>
        {sales.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-2">Número</th>
                  <th className="pb-2">Cliente</th>
                  <th className="pb-2">Data</th>
                  <th className="pb-2 text-right">Total</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {sales.slice(-5).reverse().map(s => (
                  <tr key={s.id} className="border-b border-gray-50">
                    <td className="py-2 font-medium">{s.number}</td>
                    <td className="py-2">{s.customerName || '—'}</td>
                    <td className="py-2">{formatDate(s.date)}</td>
                    <td className="py-2 text-right font-medium">{formatCurrency(s.total)}</td>
                    <td className="py-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${s.status === 'completed' ? 'bg-green-100 text-green-700' : s.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {s.status === 'completed' ? 'Concluída' : s.status === 'cancelled' ? 'Cancelada' : 'Pendente'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-400 text-sm">Nenhuma venda registrada ainda.</p>
        )}
      </div>
    </div>
  );
}
