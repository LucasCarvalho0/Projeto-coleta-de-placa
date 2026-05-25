'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [matricula, setMatricula] = useState('');
  const [senha, setSenha] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!matricula || !senha) {
      setError('Preencha matrícula e senha.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matricula, senha }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao fazer login.');
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    } catch {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-red-900/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-slate-800/40 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo / Cabeçalho */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-600 rounded-2xl mb-4 shadow-lg shadow-red-900/40">
            <span className="text-white font-black text-2xl">N</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Nissan Scan</h1>
          <p className="text-slate-400 text-sm mt-1">Sistema de Coleta de Placas</p>
        </div>

        {/* Card de login */}
        <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-8 shadow-2xl shadow-black/40">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Matrícula */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Matrícula
              </label>
              <input
                type="text"
                id="matricula"
                autoComplete="username"
                value={matricula}
                onChange={(e) => setMatricula(e.target.value)}
                placeholder="Ex: 116221"
                className="w-full bg-slate-800 border border-slate-600 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all"
                disabled={loading}
                autoFocus
              />
            </div>

            {/* Senha */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  id="senha"
                  autoComplete="current-password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-800 border border-slate-600 text-white placeholder-slate-500 rounded-xl px-4 py-3 pr-12 text-base focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Erro */}
            {error && (
              <div className="flex items-center gap-2 bg-red-900/30 border border-red-700/50 text-red-300 rounded-xl px-4 py-3 text-sm">
                <AlertCircle size={16} className="shrink-0" />
                {error}
              </div>
            )}

            {/* Botão */}
            <button
              type="submit"
              id="btn-entrar"
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-500 disabled:bg-red-800 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-900/30 text-base mt-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Entrando...
                </>
              ) : (
                <>
                  <LogIn size={18} />
                  Entrar
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-600 text-xs mt-8">
          Nissan do Brasil · Controle de Emplacamento
        </p>
      </div>
    </div>
  );
}
