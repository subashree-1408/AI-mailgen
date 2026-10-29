import React, { useState } from 'react';
import { Send, Shield, AlertCircle, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';

export const AuthPage: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Administrator access required.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden p-8 space-y-6">
        {/* Brand & Admin Badge */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl text-white flex items-center justify-center mx-auto shadow-md shadow-indigo-100">
            <Send className="w-6 h-6 -rotate-12" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">MailPilot AI</h1>
          <div className="inline-flex items-center space-x-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase">
            <Shield className="w-3.5 h-3.5 text-indigo-600" />
            <span>Administrator Portal</span>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Restricted Access &bull; Authorized Admin Personnel Only
          </p>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl text-xs flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Security Notice */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-xs text-slate-600 flex items-start space-x-2.5">
          <Lock className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            This platform is strictly restricted. Only the authorized <strong>Administrator</strong> can access and handle this website.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Admin Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Subashreekamal@gmail.com"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Admin Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl font-bold shadow-xs transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <span>Sign In to Admin Console</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
