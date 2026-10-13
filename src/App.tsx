import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './contexts/AppContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import CustomerDetail from './pages/CustomerDetail';
import Products from './pages/Products';
import Sales from './pages/Sales';
import Leads from './pages/Leads';
import FollowUps from './pages/FollowUps';
import Messages from './pages/Messages';
import Marketing from './pages/Marketing';
import Reports from './pages/Reports';
import LoginPage from './pages/Login';
import { getSession, signOutDemo } from './utils/auth';
import { UserProfile } from './types';

function ProtectedRoute({ children, user }: { children: React.ReactNode; user: UserProfile | null }) {
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const [user, setUser] = useState<UserProfile | null>(getSession());

  useEffect(() => {
    // Verificar sessão ao montar
    const session = getSession();
    setUser(session);
  }, []);

  const handleLogin = (loggedInUser: UserProfile) => {
    setUser(loggedInUser);
  };

  const handleLogout = async () => {
    await signOutDemo();
    setUser(null);
  };

  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route element={<Layout onLogout={handleLogout} user={user} />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/clientes" element={<Customers />} />
        <Route path="/clientes/:id" element={<CustomerDetail />} />
        <Route path="/produtos" element={<Products />} />
        <Route path="/vendas" element={<Sales />} />
        <Route path="/leads" element={<Leads />} />
        <Route path="/followups" element={<FollowUps />} />
        <Route path="/mensagens" element={<Messages />} />
        <Route path="/marketing" element={<Marketing />} />
        <Route path="/relatorios" element={<Reports />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AppProvider>
  );
}
