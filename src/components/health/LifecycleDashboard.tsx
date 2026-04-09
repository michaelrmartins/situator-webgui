"use client";

import { useEffect, useState, useRef } from "react";
import ReactECharts from "echarts-for-react";

interface ExpirationTimeline {
  EventDate: string;
  ExpirationCount: string;
}

export default function LifecycleDashboard() {
  const [timeline, setTimeline] = useState<ExpirationTimeline[]>([]);

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortControllerRef.current = new AbortController();
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    fetch("/api/health/lifecycle", { cache: 'no-store', signal: abortControllerRef.current?.signal })
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) {
          setTimeline(data.expirationsTimeline);
        }
      })
      .catch((err) => console.error(err));
  }, []);

  const getTimelineOptions = () => ({
    title: {
      text: "Systemic Expiration Rate (Access Churn - 30 Days)",
      textStyle: { color: "#e2e8f0", fontSize: 14, fontWeight: "500" },
      left: "center",
      top: 10,
    },
    tooltip: { trigger: "axis", axisPointer: { type: "cross" } },
    grid: { left: "3%", right: "4%", bottom: "3%", containLabel: true },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: timeline.map((item) => {
        const d = new Date(item.EventDate);
        return `${d.getDate()}/${d.getMonth() + 1}`;
      }),
      axisLine: { lineStyle: { color: "#94a3b8" } },
      axisLabel: { color: "#cbd5e1" },
    },
    yAxis: {
      type: "value",
      axisLine: { lineStyle: { color: "#94a3b8" } },
      splitLine: { lineStyle: { color: "rgba(255, 255, 255, 0.1)" } },
      axisLabel: { color: "#cbd5e1" },
    },
    series: [
      {
        name: "Access Expirations",
        type: "line",
        data: timeline.map((item) => parseInt(item.ExpirationCount)),
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 3, color: "#a855f7" }, // Purple 500
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(168, 85, 247, 0.4)" }, // Purple 500 w/ opacity
              { offset: 1, color: "rgba(168, 85, 247, 0)" },
            ],
          },
        },
      },
    ],
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
      
      {/* Expirations Line Chart */}
      <div className="w-full h-[400px] bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-4 shadow-xl">
        <ReactECharts option={getTimelineOptions()} style={{ height: "100%", width: "100%" }} />
      </div>

    </div>
  );
}
