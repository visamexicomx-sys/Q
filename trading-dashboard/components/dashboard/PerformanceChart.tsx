"use client";

import { useState } from "react";
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

type TimeRange = "1H" | "24H" | "7D" | "30D" | "ALL";

const generateData = (range: TimeRange) => {
  const counts: Record<TimeRange, number> = { "1H": 12, "24H": 24, "7D": 7, "30D": 30, "ALL": 90 };
  const n = counts[range];
  let val = 1000;
  const pnlData: number[] = [];
  const labels: string[] = [];

  for (let i = 0; i < n; i++) {
    val += (Math.random() - 0.42) * 30;
    pnlData.push(Math.round(val * 100) / 100);
    if (range === "1H") labels.push(`${i * 5}m`);
    else if (range === "24H") labels.push(`${i}:00`);
    else if (range === "7D") labels.push(`Day ${i + 1}`);
    else if (range === "30D") labels.push(`${i + 1}`);
    else labels.push(`W${Math.floor(i / 7) + 1}`);
  }
  return { labels, pnlData };
};

export const PerformanceChart = () => {
  const [range, setRange] = useState<TimeRange>("7D");
  const { labels, pnlData } = generateData(range);

  const startVal = pnlData[0];
  const endVal = pnlData[pnlData.length - 1];
  const change = endVal - startVal;
  const changePct = ((change / startVal) * 100).toFixed(2);
  const isPositive = change >= 0;

  const data = {
    labels,
    datasets: [
      {
        label: "Portfolio Value (USDC)",
        data: pnlData,
        borderColor: isPositive ? "#34EEB6" : "#FF8863",
        backgroundColor: (ctx: any) => {
          const chart = ctx.chart;
          const { ctx: canvasCtx, chartArea } = chart;
          if (!chartArea) return "transparent";
          const gradient = canvasCtx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, isPositive ? "rgba(52, 238, 182, 0.3)" : "rgba(255, 136, 99, 0.3)");
          gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
          return gradient;
        },
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 4,
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { intersect: false, mode: "index" as const },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "rgba(33, 38, 56, 0.95)",
        titleColor: "#F9FBFF",
        bodyColor: "#F9FBFF",
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          label: (ctx: any) => `$${ctx.parsed.y.toFixed(2)} USDC`,
        },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { maxTicksLimit: 8, font: { size: 10 } } },
      y: { grid: { color: "rgba(255,255,255,0.05)" }, ticks: { font: { size: 10 }, callback: (v: any) => `$${v}` } },
    },
  };

  return (
    <div className="card bg-base-100 shadow-lg h-full">
      <div className="card-body p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="card-title text-lg">Performance</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl font-bold font-mono">${endVal.toFixed(2)}</span>
              <span className={`text-sm font-mono ${isPositive ? "text-success" : "text-error"}`}>
                {isPositive ? "▲" : "▼"} ${Math.abs(change).toFixed(2)} ({changePct}%)
              </span>
            </div>
          </div>
          <div className="btn-group">
            {(["1H", "24H", "7D", "30D", "ALL"] as TimeRange[]).map(r => (
              <button
                key={r}
                className={`btn btn-xs ${range === r ? "btn-active" : "btn-ghost"}`}
                onClick={() => setRange(r)}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        <div className="h-64 mt-2">
          <Line data={data} options={options} />
        </div>
      </div>
    </div>
  );
};
