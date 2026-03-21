"use client";

import { useState } from "react";

type Position = {
  market: string;
  side: "YES" | "NO";
  shares: number;
  avgPrice: number;
  currentPrice: number;
  pnl: number;
  platform: "Polymarket" | "Kalshi";
};

const MOCK_POSITIONS: Position[] = [
  { market: "BTC > $100K by June?", side: "YES", shares: 150, avgPrice: 0.62, currentPrice: 0.71, pnl: 13.5, platform: "Polymarket" },
  { market: "ETH > $5K by Q3?", side: "NO", shares: 200, avgPrice: 0.45, currentPrice: 0.38, pnl: 14.0, platform: "Polymarket" },
  { market: "Fed Rate Cut March?", side: "YES", shares: 100, avgPrice: 0.33, currentPrice: 0.29, pnl: -4.0, platform: "Kalshi" },
  { market: "S&P 500 > 6000?", side: "YES", shares: 80, avgPrice: 0.55, currentPrice: 0.61, pnl: 4.8, platform: "Kalshi" },
  { market: "Trump wins 2028?", side: "NO", shares: 300, avgPrice: 0.72, currentPrice: 0.68, pnl: 12.0, platform: "Polymarket" },
];

export const PortfolioPanel = () => {
  const [positions] = useState<Position[]>(MOCK_POSITIONS);

  const totalPnl = positions.reduce((sum, p) => sum + p.pnl, 0);
  const totalValue = positions.reduce((sum, p) => sum + p.shares * p.currentPrice, 0);

  return (
    <div className="card bg-base-100 shadow-lg h-full">
      <div className="card-body p-4">
        <div className="flex items-center justify-between">
          <h2 className="card-title text-lg">Portfolio</h2>
          <div className="badge badge-outline text-xs">{positions.length} positions</div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div className="bg-base-200 rounded-lg p-3 text-center">
            <div className="text-xs text-base-content/60 uppercase">Total Value</div>
            <div className="text-xl font-bold font-mono">${totalValue.toFixed(2)}</div>
          </div>
          <div className="bg-base-200 rounded-lg p-3 text-center">
            <div className="text-xs text-base-content/60 uppercase">Total P&L</div>
            <div className={`text-xl font-bold font-mono ${totalPnl >= 0 ? "text-success" : "text-error"}`}>
              {totalPnl >= 0 ? "+" : ""}${totalPnl.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Positions List */}
        <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
          {positions.map((pos, i) => (
            <div key={i} className="flex items-center justify-between bg-base-200 rounded-lg p-2.5 text-sm">
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{pos.market}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`badge badge-xs ${pos.side === "YES" ? "badge-success" : "badge-error"}`}>
                    {pos.side}
                  </span>
                  <span className="text-xs text-base-content/60">{pos.shares} shares @ {pos.avgPrice.toFixed(2)}</span>
                  <span className="text-xs text-base-content/40">{pos.platform}</span>
                </div>
              </div>
              <div className="text-right ml-2">
                <div className="font-mono text-sm">{pos.currentPrice.toFixed(2)}</div>
                <div className={`text-xs font-mono ${pos.pnl >= 0 ? "text-success" : "text-error"}`}>
                  {pos.pnl >= 0 ? "+" : ""}{pos.pnl.toFixed(1)}%
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Balance */}
        <div className="mt-3 pt-3 border-t border-base-300">
          <div className="flex justify-between text-sm">
            <span className="text-base-content/60">Available Balance</span>
            <span className="font-mono font-semibold">$1,247.50 USDC</span>
          </div>
        </div>
      </div>
    </div>
  );
};
