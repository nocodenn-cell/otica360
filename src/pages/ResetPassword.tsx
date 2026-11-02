import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { updatePassword } from '../utils/auth';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('As senhas não coincidem.');
      return;
    }
    setLoading(true);
    const result = await updatePassword(password);
    setLoading(false);
    if (result.ok) {
      navigate('/login');
    } else {
      setError(result.error ?? 'Falha ao redefinir a senha.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <h1 className="text-xl font-bold text-gray-800 mb-2">Definir nova senha</h1>
        <p className="text-sm text-gray-600 mb-6">Abra este página a partir do link enviado ao seu e-mail.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Nova senha (mín. 8 caracteres)"
            required
            minLength={8}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder="Confirmar nova senha"
            required
            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {error && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Salvando...' : 'Redefinir senha'}
          </button>
        </form>
        <p className="text-sm text-center mt-4">
          <Link to="/login" className="text-blue-600 hover:underline">Voltar ao login</Link>
        </p>
      </div>
    </div>
  );
}
