import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { requestPasswordReset } from '../utils/auth';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    const result = await requestPasswordReset(email);
    setLoading(false);
    if (result.ok) {
      setMessage('Se o e-mail estiver cadastrado, enviaremos um link de redefinição.');
    } else {
      setError(result.error ?? 'Falha ao solicitar recuperação.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <h1 className="text-xl font-bold text-gray-800 mb-2">Recuperar acesso</h1>
        <p className="text-sm text-gray-600 mb-6">Informe seu e-mail para receber o link de redefinição de senha.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="seu@email.com"
            required
            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {message && <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">{message}</p>}
          {error && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Enviando...' : 'Enviar link de recuperação'}
          </button>
        </form>
        <p className="text-sm text-center mt-4">
          <Link to="/login" className="text-blue-600 hover:underline">Voltar ao login</Link>
        </p>
      </div>
    </div>
  );
}
