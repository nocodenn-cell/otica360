import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
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

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
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
      </BrowserRouter>
    </AppProvider>
  );
}
