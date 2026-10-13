import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Users, Package, ShoppingCart, Target, CalendarCheck, MessageCircle, BarChart3, Megaphone, Menu, X, Eye } from 'lucide-react';
import { useApp } from '../contexts/AppContext';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/clientes', icon: Users, label: 'Clientes' },
  { to: '/produtos', icon: Package, label: 'Produtos' },
  { to: '/vendas', icon: ShoppingCart, label: 'Vendas' },
  { to: '/leads', icon: Target, label: 'Leads & Orçamentos' },
  { to: '/followups', icon: CalendarCheck, label: 'Pós-venda' },
  { to: '/mensagens', icon: MessageCircle, label: 'Mensagens' },
  { to: '/marketing', icon: Megaphone, label: 'Marketing' },
  { to: '/relatorios', icon: BarChart3, label: 'Relatórios' },
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { toast } = useApp();

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
          <Eye className="w-7 h-7 text-blue-600" />
          <span className="text-lg font-bold text-gray-800">Ótica360</span>
          <button className="ml-auto lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <nav className="p-3 space-y-1">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <div className="w-2 h-2 rounded-full bg-green-400"></div>
            Modo demonstração — dados locais
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-30">
          <button className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-6 h-6 text-gray-600" />
          </button>
          <h1 className="text-lg font-semibold text-gray-800 hidden sm:block">Sistema de Gestão Comercial</h1>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm text-gray-500">Administrador</span>
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm">A</div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg z-[100] animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  );
}
