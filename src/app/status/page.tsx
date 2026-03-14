"use client";

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Users, DoorOpen, Loader2, ShieldAlert } from 'lucide-react';

interface DoorStatus {
  Door: string;
  TotalCount: string;
  AuthorizedCount: string;
  DeniedCount: string;
}

export default function StatusPage() {
  const [doorData, setDoorData] = useState<DoorStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/reports?type=doors');
        if (!res.ok) throw new Error('Failed to fetch door data');
        const data = await res.json();
        setDoorData(data);
        setError(null);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 5000); // 5s realtime update
    return () => clearInterval(interval);
  }, []);

  const totalAccesses = doorData.reduce((acc, curr) => acc + parseInt(curr.TotalCount, 10), 0);
  const totalDenied = doorData.reduce((acc, curr) => acc + parseInt(curr.DeniedCount, 10), 0);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-8 h-full overflow-y-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent flex items-center gap-3">
          <LayoutDashboard className="text-blue-400" size={32} />
          Door Status Overview
        </h1>
        <p className="text-slate-400 mt-2">
          Real-time access counters for all active doors for today.
        </p>
      </div>

      {!error && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <div className="glass-panel p-6 rounded-2xl border-t-2 border-t-[#3498db]">
             <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#3498db]/10 flex items-center justify-center text-[#3498db]">
                   <DoorOpen size={24} />
                </div>
                <div>
                   <p className="text-slate-400 text-sm font-medium">Active Doors</p>
                   <h3 className="text-3xl font-bold text-slate-100">{doorData.length}</h3>
                </div>
             </div>
          </div>
          
          <div className="glass-panel p-6 rounded-2xl border-t-2 border-t-[#2ecc71]">
             <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#2ecc71]/10 flex items-center justify-center text-[#2ecc71]">
                   <Users size={24} />
                </div>
                <div>
                   <p className="text-slate-400 text-sm font-medium">Total Accesses Today</p>
                   <h3 className="text-3xl font-bold text-slate-100">{totalAccesses}</h3>
                </div>
             </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl border-t-2 border-t-[#e74c3c]">
             <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#e74c3c]/10 flex items-center justify-center text-[#e74c3c]">
                   <ShieldAlert size={24} />
                </div>
                <div>
                   <p className="text-slate-400 text-sm font-medium">Denied Attempts Today</p>
                   <h3 className="text-3xl font-bold text-slate-100">{totalDenied}</h3>
                </div>
             </div>
          </div>
        </motion.div>
      )}

      {error ? (
         <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
            {error} (Check DB Settings)
         </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <AnimatePresence>
            {doorData.map((d, index) => (
              <motion.div
                key={`${d.Door}-${d.TotalCount}`} // Key changes on count update, triggering animation on the whole card
                initial={{ opacity: 0.8, y: 0, scale: 0.98, backgroundColor: 'rgba(52, 152, 219, 0.3)' }} // Flash color (Blue)
                animate={{ 
                  opacity: 1, 
                  y: 0, 
                  scale: 1,
                  backgroundColor: 'rgba(30, 41, 59, 0.4)' // Revert to normal glass background
                }}
                transition={{ 
                  duration: 0.8,
                  backgroundColor: { duration: 1.5, ease: "easeOut" },
                  scale: { duration: 0.4, type: "spring", stiffness: 200 }
                }}
                className="relative glass-card p-5 rounded-2xl border-t-2 border-[#1abc9c]/50 overflow-hidden group"
              >
                 <div className="flex justify-between items-start mb-4">
                    <h4 className="font-semibold text-slate-200 line-clamp-2 leading-tight">
                      {d.Door}
                    </h4>
                 </div>
                 
                 <div className="flex items-end gap-2 text-[#3498db]">
                    <span 
                       className="text-4xl font-bold tracking-tighter tabular-nums leading-none"
                    >
                       {d.TotalCount}
                    </span>
                    <span className="text-sm font-medium text-[#7f8c8d] mb-1 leading-none">
                       accesses
                    </span>
                 </div>

                 {parseInt(d.DeniedCount, 10) > 0 && (
                    <motion.div 
                       key={d.DeniedCount}
                       initial={{ scale: 1.5 }}
                       animate={{ scale: 1 }}
                       className="absolute top-4 right-4 flex items-center gap-1.5 px-2.5 py-1 rounded border border-[#e74c3c]/30 bg-[#e74c3c]/10 text-[#e74c3c] text-xs font-bold"
                    >
                       <ShieldAlert size={12} /> {d.DeniedCount}
                    </motion.div>
                 )}
                 
                 {/* Progress bar visual */}
                 <div className="w-full h-1.5 bg-slate-800 rounded-full mt-5 overflow-hidden flex">
                    <motion.div 
                       initial={{ width: 0 }}
                       animate={{ width: `${Math.min((parseInt(d.AuthorizedCount)/Math.max(1, totalAccesses))*300, 100)}%` }}
                       className="h-full bg-gradient-to-r from-[#1abc9c] to-[#2ecc71]"
                    />
                    <motion.div 
                       initial={{ width: 0 }}
                       animate={{ width: `${Math.min((parseInt(d.DeniedCount)/Math.max(1, totalAccesses))*300, 100)}%` }}
                       className="h-full bg-gradient-to-r from-[#e67e22] to-[#e74c3c]"
                    />
                 </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {doorData.length === 0 && (
             <div className="col-span-full py-12 text-center text-slate-500">
                No doors found for today.
             </div>
          )}
        </div>
      )}
    </div>
  );
}
