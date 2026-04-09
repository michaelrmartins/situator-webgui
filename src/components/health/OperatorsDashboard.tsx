"use client";

import { useEffect, useState, useRef } from "react";
import ReactECharts from "echarts-for-react";

interface ProductivityStats {
  UserName: string;
  ActivityCount: string;
}

interface SyncFailure {
  Id: number;
  Date: string;
  UserProfileId: string;
  Message: string;
}

export default function OperatorsDashboard() {
  const [productivity, setProductivity] = useState<ProductivityStats[]>([]);
  const [syncFailures, setSyncFailures] = useState<SyncFailure[]>([]);

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortControllerRef.current = new AbortController();
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    fetch("/api/health/operators", { cache: 'no-store', signal: abortControllerRef.current?.signal })
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) {
          setProductivity(data.productivity);
          setSyncFailures(data.syncFailures);
        }
      })
      .catch((err) => console.error(err));
  }, []);

  const getProductivityOptions = () => ({
    title: {
      text: "Operator Productivity (System Actions - 30 Days)",
      textStyle: { color: "#e2e8f0", fontSize: 14, fontWeight: "500" },
      left: "center",
      top: 10,
    },
    tooltip: { trigger: "item", formatter: "{b}: {c} ({d}%)" },
    legend: {
      orient: "vertical",
      left: "left",
      top: "middle",
      textStyle: { color: "#cbd5e1" },
      formatter: (name: string) => `Operator ${name}`,
    },
    series: [
      {
        name: "Atendimentos",
        type: "pie",
        radius: ["40%", "70%"],
        center: ["60%", "55%"],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: "#0f172a", // Match background for a gap effect
          borderWidth: 2,
        },
        label: { show: false, position: "center" },
        emphasis: {
          label: {
            show: true,
            fontSize: 20,
            fontWeight: "bold",
            color: "#f8fafc",
            formatter: "{c} actions"
          },
        },
        labelLine: { show: false },
        data: productivity.map((item) => ({
          name: item.UserName || "Unknown",
          value: parseInt(item.ActivityCount),
        })),
        color: [
          "#3b82f6", // Blue 500
          "#8b5cf6", // Violet 500
          "#ec4899", // Pink 500
          "#f59e0b", // Amber 500
          "#10b981", // Emerald 500
          "#06b6d4", // Cyan 500
        ],
      },
    ],
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[400px]">
        
        {/* Productivity Pie Chart */}
        <div className="h-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-4 shadow-xl">
          <ReactECharts option={getProductivityOptions()} style={{ height: "100%", width: "100%" }} />
        </div>

        {/* Auditoria de Falhas de Permissão Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col h-full overflow-hidden">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-rose-400">Permission Sync Failures</h3>
            <p className="text-sm text-slate-400">Visitors who may be blocked at turnstiles (Last 7 days)</p>
          </div>
          
          <div className="overflow-y-auto flex-1 space-y-3 pr-2 custom-scrollbar">
            {syncFailures.length > 0 ? syncFailures.map((failure) => {
              // Extract name and device from message
              // Example: "Falha ao realizar a sincronização da pessoa "CRISTIANO..." no dispositivo "Entrada..."
              const match = failure.Message.match(/pessoa "(.*?)" no dispositivo "(.*?)"/);
              const personName = match ? match[1] : "Pessoa desconhecida";
              const deviceName = match ? match[2] : "Dispositivo desconhecido";
              const parsedDate = new Date(failure.Date).toLocaleString("pt-BR", { 
                day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' 
              });

              return (
                 <div key={failure.Id} className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-semibold text-rose-100">{personName}</span>
                      <span className="text-xs text-rose-300/70 font-mono">{parsedDate}</span>
                    </div>
                    <p className="text-xs text-rose-200">Failed syncing to: <span className="font-bold">{deviceName}</span></p>
                 </div>
              );
            }) : (
              <div className="flex h-full items-center justify-center">
                 <span className="text-emerald-400 font-medium">✨ No recent failures. All accesses synced!</span>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
