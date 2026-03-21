"use client";

import { useState } from "react";

type WhaleActivity = {
  wallet: string;
  action: "BUY" | "SELL";
  market: string;
  side: "YES" | "NO";
  amount: number;
  timestamp: string;
  isInsider: boolean;
  profitHistory: number;
};

const WHALE_DATA: WhaleActivity[] = [
  { wallet: "0x1f2d...6f6a", action: "BUY", market: "BTC > $100K by June?", side: "YES", amount: 45000, timestamp: "2m ago", isInsider: true, profitHistory: 89.2 },
  { wallet: "0xa8c3...b4e2", action: "SELL", market: "Fed Rate Cut March?", side: "YES", amount: 32000, timestamp: "8m ago", isInsider: false, profitHistory: 67.4 },
  { wallet: "0x7d9e...c1f8", action: "BUY", market: "ETH > $5K by Q3?", side: "NO", amount: 28000, timestamp: "14m ago", isInsider: false, profitHistory: 72.1 },
  { wallet: "0x3b6f...d9a4", action: "BUY", market: "GPT-5 launch Q2?", side: "YES", amount: 55000, timestamp: "21m ago", isInsider: true, profitHistory: 91.5 },
  { wallet: "0xf2e1...87c3", action: "SELL", market: "S&P 500 > 6000?", side: "NO", amount: 19000, timestamp: "35m ago", isInsider: false, profitHistory: 58.3 },
  { wallet: "0x9c4a...e5b7", action: "BUY", market: "SOL above $200?", side: "YES", amount: 67000, timestamp: "42m ago", isInsider: true, profitHistory: 94.7 },
];

export const WhaleTrackerPanel = () => {
  const [showInsidersOnly, setShowInsidersOnly] = useState(false);

  const filtered = showInsidersOnly ? WHALE_DATA.filter(w => w.isInsider) : WHALE_DATA;

  const totalVolume = WHALE_DATA.reduce((sum, w) => sum + w.amount, 0);
  const buyVolume = WHALE_DATA.filter(w => w.action === "BUY").reduce((sum, w) => sum + w.amount, 0);
  const buyPressure = ((buyVolume / totalVolume) * 100).toFixed(0);

  return (
    <div className="card bg-base-100 shadow-lg h-full">
      <div className="card-body p-4">
        <div className="flex items-center justify-between">
          <h2 className="card-title text-lg">Whale Tracker</h2>
          <label className="label cursor-pointer gap-2">
            <span className="label-text text-xs">Insiders</span>
            <input
              type="checkbox"
              className="toggle toggle-xs toggle-warning"
              checked={showInsidersOnly}
              onChange={e => setShowInsidersOnly(e.target.checked)}
            />
          </label>
        </div>

        {/* Buy/Sell Pressure Bar */}
        <div className="mt-2">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-success">Buy Pressure {buyPressure}%</span>
            <span className="text-error">Sell {100 - Number(buyPressure)}%</span>
          </div>
          <div className="w-full bg-error rounded-full h-2">
            <div className="bg-success h-2 rounded-full" style={{ width: `${buyPressure}%` }} />
          </div>
        </div>

        {/* Whale Activity Feed */}
        <div className="mt-3 space-y-2 max-h-72 overflow-y-auto">
          {filtered.map((whale, i) => (
            <div key={i} className="bg-base-200 rounded-lg p-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`badge badge-xs ${whale.action === "BUY" ? "badge-success" : "badge-error"}`}>
                    {whale.action}
                  </span>
                  <span className="font-mono text-xs">{whale.wallet}</span>
                  {whale.isInsider && (
                    <span className="badge badge-xs badge-warning">INSIDER</span>
                  )}
                </div>
                <span className="text-xs text-base-content/50">{whale.timestamp}</span>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <div>
                  <div className="text-sm truncate max-w-[200px]">{whale.market}</div>
                  <span className={`text-xs ${whale.side === "YES" ? "text-success" : "text-error"}`}>
                    {whale.side}
                  </span>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm font-semibold">${(whale.amount / 1000).toFixed(0)}K</div>
                  <div className="text-xs text-base-content/50">{whale.profitHistory}% win</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-2 text-center">
          <span className="text-xs text-base-content/40">
            24h Whale Volume: ${(totalVolume / 1000).toFixed(0)}K across {WHALE_DATA.length} trades
          </span>
        </div>
      </div>
    </div>
  );
};
