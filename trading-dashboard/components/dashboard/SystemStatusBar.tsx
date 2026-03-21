"use client";

import { useEffect, useState } from "react";

type BotStatus = {
  name: string;
  platform: string;
  status: "running" | "stopped" | "error" | "standby";
};

const BOTS: BotStatus[] = [
  { name: "Kalshi AI Ensemble", platform: "Kalshi", status: "standby" },
  { name: "Deep Trading Bot", platform: "Kalshi", status: "standby" },
  { name: "Quant TeleBot", platform: "Kalshi", status: "standby" },
  { name: "Polymarket Agents", platform: "Polymarket", status: "standby" },
  { name: "Weather Bot", platform: "Both", status: "standby" },
  { name: "BTC Arbitrage", platform: "Both", status: "standby" },
  { name: "Whale Tracker", platform: "Polymarket", status: "standby" },
  { name: "News Intel", platform: "Polymarket", status: "standby" },
];

const statusColors: Record<string, string> = {
  running: "bg-success",
  stopped: "bg-base-content/30",
  error: "bg-error",
  standby: "bg-warning",
};

export const SystemStatusBar = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [bots] = useState<BotStatus[]>(BOTS);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const runningCount = bots.filter(b => b.status === "running").length;
  const errorCount = bots.filter(b => b.status === "error").length;

  return (
    <div className="bg-base-300 border-b border-base-content/10 px-4 py-1.5 flex items-center justify-between text-xs font-mono">
      <div className="flex items-center gap-4">
        <span className="font-semibold text-base-content">SYS</span>
        <span className="text-base-content/60">
          Bots: <span className="text-success">{runningCount} active</span>
          {errorCount > 0 && <span className="text-error ml-1">| {errorCount} error</span>}
          {" | "}{bots.length - runningCount - errorCount} standby
        </span>
        <div className="flex items-center gap-1">
          {bots.map((bot, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full ${statusColors[bot.status]} tooltip tooltip-bottom`}
              data-tip={`${bot.name} (${bot.platform}): ${bot.status}`}
            />
          ))}
        </div>
      </div>
      <div className="flex items-center gap-4 text-base-content/60">
        <span>Polyrouter: <span className="text-success">Connected</span></span>
        <span>API: <span className="text-success">OK</span></span>
        <span>{currentTime.toLocaleTimeString()}</span>
      </div>
    </div>
  );
};
