import React, { useState } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { Zap, Mail, Lock, AlertCircle } from 'lucide-react';

interface AuthViewProps {
  onLogin: (user: any) => void;
}

const AuthView: React.FC<AuthViewProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!isSupabaseConfigured()) {
      setError('Supabase no configurado. Crea un archivo .env con VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY');
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        const { data, error: err } = await supabase.auth.signUp({ email, password });
        if (err) throw err;
        if (data.user) onLogin(data.user);
      } else {
        const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
        if (data.user) onLogin(data.user);
      }
    } catch (err: any) {
      setError(err.message || 'Error de autenticación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 relative overflow-hidden">
      <div className="absolute w-[600px] h-[600px] rounded-full bg-indigo-500/10 blur-3xl -top-1/4 -left-1/4 animate-pulse" />
      <div className="absolute w-[400px] h-[400px] rounded-full bg-purple-500/10 blur-3xl -bottom-1/4 -right-1/4 animate-pulse" />

      <div className="relative z-10 w-full max-w-sm mx-4">
        <div className="bg-slate-900/60 backdrop-blur-xl border border-indigo-500/20 rounded-3xl p-10">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl flex items-center justify-center">
              <Zap size={32} className="text-white" />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">FILEHUB</h1>
            <p className="text-[10px] font-bold text-indigo-300/60 uppercase tracking-[0.2em] mt-1">Inteligencia de Gestión</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required
                className="w-full bg-slate-950/60 border border-indigo-500/20 rounded-xl py-3.5 pl-11 pr-4 text-white text-sm font-semibold placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
            </div>
            <div className="relative">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña" required minLength={6}
                className="w-full bg-slate-950/60 border border-indigo-500/20 rounded-xl py-3.5 pl-11 pr-4 text-white text-sm font-semibold placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-400 text-xs font-semibold bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                <AlertCircle size={14} /> {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-bold text-sm py-3.5 rounded-xl hover:from-indigo-600 hover:to-indigo-700 transition-all disabled:opacity-50">
              {loading ? 'Conectando...' : isSignUp ? 'Crear cuenta' : 'Iniciar sesión'}
            </button>
          </form>

          <button onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
            className="w-full text-center text-xs text-indigo-400/60 font-semibold mt-4 hover:text-indigo-400 transition-colors">
            {isSignUp ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthView;
