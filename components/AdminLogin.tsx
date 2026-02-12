'use client';

import { useState } from 'react';

export default function AdminLogin({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would verify against a secure API or NextAuth
    // For this prototype, we'll use a hardcoded "master key"
    if (password === 'evo-admin-2026') {
      onLogin();
    } else {
      setError(true);
    }
  };

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center">
      <div className="w-full max-w-md bg-white p-10 rounded-3xl border border-slate-200 shadow-2xl space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-heading font-extrabold text-slate-950">Command Access</h1>
          <p className="text-slate-500 text-sm">Restricted to Level 5 Architects.</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter Access Key"
              className="w-full px-5 py-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all text-center tracking-widest font-mono"
            />
          </div>
          <button 
            type="submit"
            className="w-full bg-slate-950 text-white py-4 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-blue-600 transition-colors shadow-lg"
          >
            Authenticate
          </button>
        </form>
        
        {error && (
          <p className="text-red-500 text-xs text-center font-bold animate-pulse">
            ACCESS DENIED. INVALID CREDENTIALS.
          </p>
        )}
      </div>
    </div>
  );
}
