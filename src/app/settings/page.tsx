"use client";

import { useState, useEffect } from 'react';
import { Database, Save, Activity, ShieldAlert, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SettingsPage() {
  const [config, setConfig] = useState({
    host: '',
    port: '',
    database: '',
    user: '',
    password: '',
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) {
           setConfig({
             host: data.host || '',
             port: data.port || '',
             database: data.database || '',
             user: data.user || '',
             password: '', // Do not expose password
           });
        }
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfig({ ...config, [e.target.name]: e.target.value });
  };

  const handleTest = async () => {
    setIsTesting(true);
    setMessage({ text: '', type: '' });
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...config, testOnly: true }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ text: 'Connection successful!', type: 'success' });
      } else {
        setMessage({ text: data.error || 'Connection failed', type: 'error' });
      }
    } catch (err: any) {
      setMessage({ text: 'Network error', type: 'error' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage({ text: '', type: '' });
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ text: 'Settings saved successfully!', type: 'success' });
      } else {
        setMessage({ text: data.error || 'Failed to save settings', type: 'error' });
      }
    } catch (err: any) {
      setMessage({ text: 'Network error', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-8 h-full overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto"
      >
        <div className="mb-8">
           <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent flex items-center gap-3">
             <Database className="text-blue-400" size={32} />
             Database Configuration
           </h1>
           <p className="text-slate-400 mt-2">
             Configure Postgres connection for the Situator system.
           </p>
        </div>

        <div className="glass-panel p-8 rounded-2xl">
          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300 ml-1">Host URL / IP</label>
                <input
                  type="text"
                  name="host"
                  value={config.host}
                  onChange={handleChange}
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  placeholder="e.g., 192.168.1.100 or localhost"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300 ml-1">Port</label>
                <input
                  type="number"
                  name="port"
                  value={config.port}
                  onChange={handleChange}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  placeholder="5432"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-slate-300 ml-1">Database Name</label>
                <input
                  type="text"
                  name="database"
                  value={config.database}
                  onChange={handleChange}
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  placeholder="situator_db"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300 ml-1">Username</label>
                <input
                  type="text"
                  name="user"
                  value={config.user}
                  onChange={handleChange}
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  placeholder="postgres"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300 ml-1">Password</label>
                <input
                  type="password"
                  name="password"
                  value={config.password}
                  onChange={handleChange}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  placeholder="Leave blank to keep unchanged"
                />
              </div>
            </div>

            <div className="pt-6 flex items-center justify-between border-t border-white/10">
              <AnimatePresence>
                 {message.text && (
                   <motion.div
                     initial={{ opacity: 0, x: -10 }}
                     animate={{ opacity: 1, x: 0 }}
                     exit={{ opacity: 0 }}
                     className={`flex items-center gap-2 text-sm px-4 py-2 rounded-lg 
                        ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}
                   >
                     {message.type === 'success' ? <Activity size={16} /> : <ShieldAlert size={16} />}
                     {message.text}
                   </motion.div>
                 )}
              </AnimatePresence>

              <div className="flex items-center gap-3 ml-auto">
                <button
                  type="button"
                  onClick={handleTest}
                  disabled={isTesting || isSaving}
                  className="px-5 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:bg-white/5 transition-all font-medium disabled:opacity-50 flex items-center gap-2"
                >
                  {isTesting ? <Loader2 size={18} className="animate-spin" /> : 'Test Connection'}
                </button>
                <button
                  type="submit"
                  disabled={isTesting || isSaving}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-all font-medium shadow-lg shadow-blue-500/20 disabled:opacity-50 flex items-center gap-2"
                >
                  {isSaving ? <Loader2 size={18} className="animate-spin" /> : <><Save size={18} /> Save Config</>}
                </button>
              </div>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
