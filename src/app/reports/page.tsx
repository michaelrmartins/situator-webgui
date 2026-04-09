"use client";

import { useState, useEffect, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import { BarChart3, CalendarDays, Loader2, ShieldAlert } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { motion } from 'framer-motion';

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState({
    start: startOfDay(new Date()),
    end: endOfDay(new Date())
  });
  
  const [hourlyData, setHourlyData] = useState([]);
  const [doorData, setDoorData] = useState([]);
  const [dailyData, setDailyData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Flat UI Colors
  const flatColors = ['#1abc9c', '#3498db', '#e74c3c', '#f1c40f', '#9b59b6', '#34495e', '#e67e22', '#2ecc71', '#16a085', '#2980b9'];

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortControllerRef.current = new AbortController();
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const getSignal = () => abortControllerRef.current?.signal;

  const fetchReports = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const startMs = dateRange.start.getTime();
      const endMs = dateRange.end.getTime();

      const [hourlyRes, doorsRes, dailyRes] = await Promise.all([
        fetch(`/api/reports?type=hourly&start=${startMs}&end=${endMs}`, { cache: 'no-store', signal: getSignal() }),
        fetch(`/api/reports?type=doors&start=${startMs}&end=${endMs}`, { cache: 'no-store', signal: getSignal() }),
        fetch(`/api/reports?type=daily&start=${startMs}&end=${endMs}`, { cache: 'no-store', signal: getSignal() })
      ]);

      if (!hourlyRes.ok || !doorsRes.ok || !dailyRes.ok) {
         throw new Error('Failed to fetch report data');
      }

      const hourly = await hourlyRes.json();
      const doors = await doorsRes.json();
      const daily = await dailyRes.json();
      
      setHourlyData(hourly);
      setDoorData(doors);
      setDailyData(daily);
    } catch (err: any) {
      if (err.name !== 'AbortError') setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [dateRange]);

  const handleDateChange = (daysAgo: number) => {
    const start = startOfDay(subDays(new Date(), daysAgo));
    const end = endOfDay(new Date());
    setDateRange({ start, end });
  };

  const hourlyChartOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: 'rgba(15, 23, 42, 0.9)',
      borderColor: 'rgba(255, 255, 255, 0.1)',
      textStyle: { color: '#f8fafc' }
    },
    legend: {
      data: ['Total Accesses', 'Unique People'],
      textStyle: { color: '#95a5a6' },
      top: 0
    },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '15%', containLabel: true },
    xAxis: {
      type: 'category',
      data: hourlyData.map((d: any) => `${d.Hour}:00`),
      axisLabel: { color: '#94a3b8' },
      axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.1)' } }
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#94a3b8' },
      splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.05)' } }
    },
    series: [
      {
        name: 'Total Accesses',
        type: 'bar',
        barGap: '10%',
        data: hourlyData.map((d: any) => parseInt(d.AccessCount)),
        itemStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: '#3498db' }, // Peter River
              { offset: 1, color: '#2980b9' }  // Belize Hole
            ]
          },
          borderRadius: [4, 4, 0, 0]
        }
      },
      {
        name: 'Unique People',
        type: 'bar',
        data: hourlyData.map((d: any) => parseInt(d.UniquePeople)),
        itemStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: '#9b59b6' }, // Amethyst
              { offset: 1, color: '#8e44ad' }  // Wisteria
            ]
          },
          borderRadius: [4, 4, 0, 0]
        }
      }
    ]
  };

  const dailyChartOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: 'rgba(236, 240, 241, 0.95)', // Clouds
      borderColor: 'rgba(189, 195, 199, 0.2)', // Silver
      textStyle: { color: '#2c3e50' } // Midnight Blue
    },
    legend: {
      data: ['Total Accesses', 'Unique People'],
      textStyle: { color: '#95a5a6' },
      top: 0
    },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '15%', containLabel: true },
    xAxis: {
      type: 'category',
      data: dailyData.map((d: any) => format(new Date(d.Day), 'dd/MM')),
      axisLabel: { color: '#95a5a6' }, // Concrete
      axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.1)' } }
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#95a5a6' },
      splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.05)' } }
    },
    series: [
      {
        name: 'Total Accesses',
        type: 'bar',
        barGap: '10%',
        data: dailyData.map((d: any) => parseInt(d.AccessCount)),
        itemStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: '#1abc9c' }, // Turquoise
              { offset: 1, color: '#16a085' }  // Green Sea
            ]
          },
          borderRadius: [4, 4, 0, 0]
        }
      },
      {
        name: 'Unique People',
        type: 'bar',
        data: dailyData.map((d: any) => parseInt(d.UniquePeople)),
        itemStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: '#3498db' }, // Peter River
              { offset: 1, color: '#2980b9' }  // Belize Hole
            ]
          },
          borderRadius: [4, 4, 0, 0]
        }
      }
    ]
  };

  const doorPieOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(15, 23, 42, 0.9)',
      borderColor: 'rgba(255, 255, 255, 0.1)',
      textStyle: { color: '#f8fafc' }
    },
    color: flatColors,
    legend: {
      type: 'scroll',
      orient: 'vertical',
      right: '2%',
      top: 'middle',
      textStyle: { color: '#95a5a6' } // Concrete
    },
    series: [
      {
        name: 'Accesses by Door',
        type: 'pie',
        radius: ['50%', '75%'],
        center: ['35%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 8,
          borderColor: 'rgba(15, 23, 42, 0.8)',
          borderWidth: 2
        },
        label: { show: false, position: 'center' },
        emphasis: {
          label: { show: true, fontSize: 18, fontWeight: 'bold', color: '#f8fafc' }
        },
        labelLine: { show: false },
        data: doorData.map((d: any) => ({
          name: d.Door,
          value: parseInt(d.TotalCount) || 0
        }))
      }
    ]
  };

  return (
    <div className="p-8 h-full flex flex-col overflow-y-auto">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent flex items-center gap-3">
            <BarChart3 className="text-blue-400" size={32} />
            Analytics & Reports
          </h1>
          <p className="text-slate-400 mt-2">
            Detailed breakdown of access patterns.
          </p>
        </div>
        
        {/* Date Filters */}
        <div className="flex bg-slate-800/50 p-1 rounded-xl border border-white/5 backdrop-blur-md">
          <button 
            onClick={() => handleDateChange(0)} 
            className="px-4 py-2 text-sm font-medium rounded-lg text-white hover:bg-white/10 focus:bg-blue-600 focus:text-white transition-all flex items-center gap-2"
          >
            <CalendarDays size={16} /> Today
          </button>
          <button 
            onClick={() => handleDateChange(7)} 
            className="px-4 py-2 text-sm font-medium rounded-lg text-slate-300 hover:bg-white/10 focus:bg-blue-600 focus:text-white transition-all"
          >
            7 Days
          </button>
          <button 
            onClick={() => handleDateChange(30)} 
            className="px-4 py-2 text-sm font-medium rounded-lg text-slate-300 hover:bg-white/10 focus:bg-blue-600 focus:text-white transition-all"
          >
            30 Days
          </button>
        </div>
      </div>

      {error ? (
        <div className="glass-panel p-6 rounded-2xl flex flex-col items-center justify-center h-64 border-red-500/20">
          <ShieldAlert className="text-red-400 w-16 h-16 mb-4" />
          <h3 className="text-xl font-bold text-slate-200">Error Loading Reports</h3>
          <p className="text-slate-400 mt-2">{error}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             className="glass-panel p-6 rounded-2xl col-span-1 lg:col-span-2 shadow-lg"
           >
             <h3 className="text-lg font-semibold text-slate-200 mb-6">Hourly Access Volume</h3>
             {isLoading ? (
               <div className="h-[350px] flex items-center justify-center">
                 <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
               </div>
             ) : (
               <ReactECharts
                 option={hourlyChartOption}
                 style={{ height: '350px', width: '100%' }}
                 theme="dark"
               />
             )}
           </motion.div>

           <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.1 }}
             className="glass-panel p-6 rounded-2xl col-span-1 shadow-lg"
           >
             <h3 className="text-lg font-semibold text-slate-200 mb-6">Distribution by Door</h3>
             {isLoading ? (
               <div className="h-[300px] flex items-center justify-center">
                 <Loader2 className="w-8 h-8 animate-spin text-[#3498db]" />
               </div>
             ) : (
               <ReactECharts
                 option={doorPieOption}
                 style={{ height: '300px', width: '100%' }}
                 theme="dark"
               />
             )}
           </motion.div>

           <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.2 }}
             className="glass-panel p-6 rounded-2xl col-span-1 lg:col-span-2 shadow-lg"
           >
             <h3 className="text-lg font-semibold text-slate-200 mb-6">Accesses per Day</h3>
             {isLoading ? (
               <div className="h-[350px] flex items-center justify-center">
                 <Loader2 className="w-8 h-8 animate-spin text-[#1abc9c]" />
               </div>
             ) : (
               <ReactECharts
                 option={dailyChartOption}
                 style={{ height: '350px', width: '100%' }}
                 theme="dark"
               />
             )}
           </motion.div>
        </div>
      )}
    </div>
  );
}
