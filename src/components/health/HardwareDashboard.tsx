"use client";

import { useEffect, useState, useRef } from "react";
import ReactECharts from "echarts-for-react";

interface HardwareStats {
  ServerName: string;
  DisconnectionCount: string;
}

interface SyncStats {
  ServerName: string;
  Duration: string;
}

export default function HardwareDashboard() {
  const [instabilities, setInstabilities] = useState<HardwareStats[]>([]);
  const [syncBottlenecks, setSyncBottlenecks] = useState<SyncStats[]>([]);
  const [globalDowntime, setGlobalDowntime] = useState(0);

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortControllerRef.current = new AbortController();
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    fetch("/api/health/hardware", { cache: 'no-store', signal: abortControllerRef.current?.signal })
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) {
          setInstabilities(data.instabilities);
          setGlobalDowntime(data.globalAvgDowntime);
          setSyncBottlenecks(data.syncBottlenecks);
        }
      })
      .catch((err) => console.error(err));
  }, []);

  const getInstabilitiesOptions = () => ({
    title: {
      text: "Top 10 Connection Instabilities (30 Days)",
      textStyle: { color: "#e2e8f0", fontSize: 14, fontWeight: "500" },
      left: "center",
      top: 10,
    },
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    grid: { left: "3%", right: "4%", bottom: "3%", containLabel: true },
    xAxis: {
      type: "value",
      axisLine: { lineStyle: { color: "#94a3b8" } },
      splitLine: { lineStyle: { color: "rgba(255, 255, 255, 0.1)" } },
      axisLabel: { color: "#cbd5e1" },
    },
    yAxis: {
      type: "category",
      data: instabilities.map((item) => item.ServerName).reverse(),
      axisLine: { lineStyle: { color: "#94a3b8" } },
      axisLabel: {
        color: "#f8fafc",
        width: 150,
        overflow: "truncate",
      },
    },
    series: [
      {
        name: "Disconnections",
        type: "bar",
        data: instabilities.map((item) => parseInt(item.DisconnectionCount)).reverse(),
        itemStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 1,
            y2: 0,
            colorStops: [
              { offset: 0, color: "#f43f5e" }, // Rose 500
              { offset: 1, color: "#be123c" }, // Rose 700
            ],
          },
          borderRadius: [0, 4, 4, 0],
        },
        label: { show: true, position: "right", color: "#f8fafc" },
      },
    ],
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* KPI Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col justify-center">
          <h3 className="text-sm font-medium text-slate-400 mb-1">Global Average Downtime (30 days)</h3>
          <p className="text-4xl font-bold text-white tracking-tight">
            {Math.round(globalDowntime)} <span className="text-sm text-slate-400 font-normal">seconds</span>
          </p>
        </div>

        {/* Sync Bottlenecks Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col overflow-hidden max-h-64">
           <h3 className="text-sm font-medium text-slate-400 mb-2 border-b border-white/10 pb-2">Recent Sync Bottlenecks</h3>
           <div className="overflow-y-auto pr-2 space-y-2">
             {syncBottlenecks.length > 0 ? syncBottlenecks.map((sync, idx) => (
                <div key={idx} className="flex justify-between items-center text-sm py-1">
                  <span className="text-slate-200 truncate pr-2 flex-1 font-medium">{sync.ServerName || 'Device'}</span>
                  <span className="text-rose-400 font-mono bg-rose-500/10 px-2 py-0.5 rounded text-xs">{sync.Duration}</span>
                </div>
             )) : <span className="text-slate-500 text-sm">No data</span>}
           </div>
        </div>
      </div>

      <div className="w-full h-[400px] bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-4 shadow-xl">
        <ReactECharts option={getInstabilitiesOptions()} style={{ height: "100%", width: "100%" }} />
      </div>
    </div>
  );
}
