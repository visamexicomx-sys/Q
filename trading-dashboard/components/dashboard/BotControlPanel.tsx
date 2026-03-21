"use client";

import { useState } from "react";

type Bot = {
  id: string;
  name: string;
  platform: string;
  strategy: string;
  status: "running" | "stopped" | "error" | "standby";
  pnlToday: number;
  tradesCount: number;
  winRate: number;
  maxDrawdown: number;
  uptime: string;
  description: string;
};

const BOTS: Bot[] = [
  {
    id: "kalshi-ai",
    name: "Kalshi AI Ensemble",
    platform: "Kalshi",
    strategy: "5-Model AI Ensemble (Grok-3, Claude, GPT-4o, Gemini, DeepSeek)",
    status: "standby",
    pnlToday: 0,
    tradesCount: 0,
    winRate: 0,
    maxDrawdown: 0,
    uptime: "--",
    description: "Multi-strategy: Directional (50%), Market Making (40%), Arbitrage (10%)",
  },
  {
    id: "kalshi-deep",
    name: "Deep Trading Bot",
    platform: "Kalshi",
    strategy: "Deep Learning / Neural Network",
    status: "standby",
    pnlToday: 0,
    tradesCount: 0,
    winRate: 0,
    maxDrawdown: 0,
    uptime: "--",
    description: "ML-based price prediction with research integration",
  },
  {
    id: "quant-telebot",
    name: "Quant TeleBot",
    platform: "Kalshi",
    strategy: "News Sentiment + Stat Arb + Volatility",
    status: "standby",
    pnlToday: 0,
    tradesCount: 0,
    winRate: 0,
    maxDrawdown: 0,
    uptime: "--",
    description: "Enterprise-grade quant system with Telegram interface & Kelly sizing",
  },
  {
    id: "poly-agents",
    name: "Polymarket Agents",
    platform: "Polymarket",
    strategy: "AI Agent Framework (LangChain/LangGraph)",
    status: "standby",
    pnlToday: 0,
    tradesCount: 0,
    winRate: 0,
    maxDrawdown: 0,
    uptime: "--",
    description: "Autonomous trading agents with market analysis connectors",
  },
  {
    id: "weather-bot",
    name: "Weather Event Bot",
    platform: "Both",
    strategy: "Weather Event Trading",
    status: "standby",
    pnlToday: 0,
    tradesCount: 0,
    winRate: 0,
    maxDrawdown: 0,
    uptime: "--",
    description: "Cross-platform weather event contracts with Anthropic/Groq LLM",
  },
  {
    id: "btc-arb",
    name: "BTC Arbitrage Bot",
    platform: "Both",
    strategy: "Cross-Platform BTC Price Arbitrage",
    status: "standby",
    pnlToday: 0,
    tradesCount: 0,
    winRate: 0,
    maxDrawdown: 0,
    uptime: "--",
    description: "Detects and exploits BTC price discrepancies between Polymarket & Kalshi",
  },
];

const statusConfig: Record<string, { color: string; label: string }> = {
  running: { color: "badge-success", label: "Running" },
  stopped: { color: "badge-ghost", label: "Stopped" },
  error: { color: "badge-error", label: "Error" },
  standby: { color: "badge-warning", label: "Standby" },
};

export const BotControlPanel = () => {
  const [bots, setBots] = useState<Bot[]>(BOTS);
  const [expandedBot, setExpandedBot] = useState<string | null>(null);

  const toggleBot = (id: string) => {
    setBots(prev =>
      prev.map(bot =>
        bot.id === id
          ? { ...bot, status: bot.status === "running" ? "stopped" : "running" }
          : bot
      )
    );
  };

  const startAll = () => setBots(prev => prev.map(b => ({ ...b, status: "running" as const })));
  const stopAll = () => setBots(prev => prev.map(b => ({ ...b, status: "stopped" as const })));

  const runningCount = bots.filter(b => b.status === "running").length;

  return (
    <div className="card bg-base-100 shadow-lg h-full">
      <div className="card-body p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="card-title text-lg">Bot Control Center</h2>
            <p className="text-xs text-base-content/60 mt-0.5">
              {runningCount}/{bots.length} bots active
            </p>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-success btn-xs" onClick={startAll}>Start All</button>
            <button className="btn btn-error btn-xs" onClick={stopAll}>Stop All</button>
          </div>
        </div>

        <div className="mt-3 space-y-2 max-h-[500px] overflow-y-auto">
          {bots.map(bot => (
            <div key={bot.id} className="bg-base-200 rounded-lg overflow-hidden">
              <div
                className="p-3 cursor-pointer hover:bg-base-300 transition-colors"
                onClick={() => setExpandedBot(expandedBot === bot.id ? null : bot.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      bot.status === "running" ? "bg-success animate-pulse-fast" :
                      bot.status === "error" ? "bg-error" :
                      bot.status === "standby" ? "bg-warning" : "bg-base-content/30"
                    }`} />
                    <div>
                      <div className="font-semibold text-sm">{bot.name}</div>
                      <div className="text-xs text-base-content/60">{bot.platform} | {bot.strategy}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`badge badge-sm ${statusConfig[bot.status].color}`}>
                      {statusConfig[bot.status].label}
                    </span>
                    <button
                      className={`btn btn-xs ${bot.status === "running" ? "btn-error" : "btn-success"}`}
                      onClick={e => {
                        e.stopPropagation();
                        toggleBot(bot.id);
                      }}
                    >
                      {bot.status === "running" ? "Stop" : "Start"}
                    </button>
                  </div>
                </div>

                {bot.status === "running" && (
                  <div className="grid grid-cols-4 gap-2 mt-2 text-center">
                    <div>
                      <div className="text-xs text-base-content/50">P&L Today</div>
                      <div className={`font-mono text-sm ${bot.pnlToday >= 0 ? "text-success" : "text-error"}`}>
                        {bot.pnlToday >= 0 ? "+" : ""}${bot.pnlToday.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-base-content/50">Trades</div>
                      <div className="font-mono text-sm">{bot.tradesCount}</div>
                    </div>
                    <div>
                      <div className="text-xs text-base-content/50">Win Rate</div>
                      <div className="font-mono text-sm">{bot.winRate}%</div>
                    </div>
                    <div>
                      <div className="text-xs text-base-content/50">Drawdown</div>
                      <div className="font-mono text-sm text-error">{bot.maxDrawdown}%</div>
                    </div>
                  </div>
                )}
              </div>

              {expandedBot === bot.id && (
                <div className="px-3 pb-3 border-t border-base-300 pt-2">
                  <p className="text-xs text-base-content/70">{bot.description}</p>
                  <div className="flex items-center justify-between mt-2 text-xs">
                    <span className="text-base-content/50">Uptime: {bot.uptime}</span>
                    <div className="flex gap-1">
                      <button className="btn btn-ghost btn-xs">Configure</button>
                      <button className="btn btn-ghost btn-xs">View Logs</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
