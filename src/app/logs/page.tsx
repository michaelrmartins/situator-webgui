"use client";

import { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import { ShieldAlert, Fingerprint, CalendarDays, Loader2, Info } from 'lucide-react';
import { startOfDay, endOfDay, subDays } from 'date-fns';
import { motion } from 'framer-motion';

export default function LogsPage() {
  const [dateRange, setDateRange] = useState({
    start: startOfDay(new Date()),
    end: endOfDay(new Date())
  });

  const [authData, setAuthData] = useState([]);
  const [rfidData, setRfidData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const startMs = dateRange.start.getTime();
      const endMs = dateRange.end.getTime();

      const [authRes, rfidRes] = await Promise.all([
        fetch(`/api/reports?type=auth&start=${startMs}&end=${endMs}`),
        fetch(`/api/reports?type=rfid&start=${startMs}&end=${endMs}`)
      ]);

      if (!authRes.ok || !rfidRes.ok) throw new Error('Failed to fetch data');

      setAuthData(await authRes.json());
      setRfidData(await rfidRes.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [dateRange]);

  const handleDateChange = (daysAgo: number) => {
    const start = startOfDay(subDays(new Date(), daysAgo));
    const end = endOfDay(new Date());
    setDateRange({ start, end });
  };

  const authChartOption = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item', backgroundColor: 'rgba(15, 23, 42, 0.9)', textStyle: { color: '#f8fafc' } },
    legend: { bottom: '5%', left: 'center', textStyle: { color: '#94a3b8' } },
    series: [{
      name: 'Authorizations',
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 10, borderColor: 'rgba(15,23,42,0.8)', borderWidth: 2 },
      label: { show: false, position: 'center' },
      emphasis: { label: { show: true, fontSize: 20, fontWeight: 'bold', color: '#fff' } },
      labelLine: { show: false },
      data: authData.map((d: any) => ({
        value: parseInt(d.Count),
        name: d.Authorized === true ? 'Authorized' : 'Unauthorized',
        itemStyle: { color: d.Authorized === true ? '#10b981' : '#f43f5e' }
      }))
    }]
  };

  const rfidChartOption = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item', backgroundColor: 'rgba(15, 23, 42, 0.9)', textStyle: { color: '#f8fafc' } },
    legend: { bottom: '5%', left: 'center', textStyle: { color: '#94a3b8' } },
    series: [{
      name: 'RFID Context',
      type: 'pie',
      radius: '70%',
      itemStyle: { borderRadius: 10, borderColor: 'rgba(15,23,42,0.8)', borderWidth: 2 },
      data: rfidData.map((d: any) => ({
        value: parseInt(d.Count),
        name: d.RFIDStatus,
        itemStyle: { color: d.RFIDStatus === 'Present' ? '#3b82f6' : '#94a3b8' }
      }))
    }]
  };

  return (
    <div className="p-8 h-full flex flex-col overflow-y-auto">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent flex items-center gap-3">
            <ShieldAlert className="text-blue-400" size={32} />
            Authorization & Verification Logs
          </h1>
          <p className="text-slate-400 mt-2">
            Analysis of unauthorized attempts and physical card presence.
          </p>
        </div>
        
        <div className="flex bg-slate-800/50 p-1 rounded-xl border border-white/5 backdrop-blur-md">
          <button onClick={() => handleDateChange(0)} className="px-4 py-2 text-sm font-medium rounded-lg text-white hover:bg-white/10 focus:bg-blue-600 transition-all flex items-center gap-2"><CalendarDays size={16} /> Today</button>
          <button onClick={() => handleDateChange(7)} className="px-4 py-2 text-sm font-medium rounded-lg text-slate-300 hover:bg-white/10 focus:bg-blue-600 transition-all">7 Days</button>
          <button onClick={() => handleDateChange(30)} className="px-4 py-2 text-sm font-medium rounded-lg text-slate-300 hover:bg-white/10 focus:bg-blue-600 transition-all">30 Days</button>
        </div>
      </div>

      {error ? (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
           {error}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-6 rounded-2xl relative shadow-lg">
            <h3 className="text-lg font-semibold text-slate-200 mb-2 flex items-center gap-2">
               <ShieldAlert size={20} className="text-emerald-400" />
               Validation Distribution
            </h3>
            <p className="text-sm text-slate-400 mb-8 max-w-sm">Ratio of successfully authorized accesses vs denied attempts traversing the doors.</p>
            {isLoading ? (
               <div className="h-[300px] flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" /></div>
            ) : (
               <ReactECharts option={authChartOption} style={{ height: '300px' }} theme="dark" />
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-panel p-6 rounded-2xl relative shadow-lg">
            <h3 className="text-lg font-semibold text-slate-200 mb-2 flex items-center gap-2">
               <Fingerprint size={20} className="text-blue-400" />
               RFID Card Usage
            </h3>
            <p className="text-sm text-slate-400 mb-8 max-w-sm">Proportion of accesses where physical RFID credentials were present compared to alternative methods.</p>
            {isLoading ? (
               <div className="h-[300px] flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" /></div>
            ) : (
               <ReactECharts option={rfidChartOption} style={{ height: '300px' }} theme="dark" />
            )}
          </motion.div>
        </div>
      )}
      
      <div className="mt-8 glass-panel p-6 rounded-2xl flex gap-4 items-start border-l-4 border-l-blue-500">
         <Info className="shrink-0 text-blue-400 mt-1" />
         <div>
            <h4 className="font-semibold text-slate-200 mb-1">About Data Interpretation</h4>
            <p className="text-slate-400 text-sm leading-relaxed">
               The unauthorized attempts usually reflect scenarios such as expired documents, improper zones, out-of-schedule accesses, or suspended access cards. The RFID usage pie chart shows whether the recorded events had a registered physical card number attached to the entity's identification pin inside the Situator configuration matrix.
            </p>
         </div>
      </div>
    </div>
  );
}
