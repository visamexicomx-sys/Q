"use client";

import { useState } from "react";

type Market = {
  title: string;
  yesPrice: number;
  noPrice: number;
  volume24h: number;
  change24h: number;
  platform: "Polymarket" | "Kalshi" | "Limitless";
  category: string;
  liquidity: number;
  endDate: string;
};

const TRENDING_MARKETS: Market[] = [
  { title: "BTC above $100K on June 30?", yesPrice: 0.71, noPrice: 0.29, volume24h: 892400, change24h: 5.2, platform: "Polymarket", category: "Crypto", liquidity: 2100000, endDate: "Jun 30" },
  { title: "ETH above $5,000 by Q3 2026?", yesPrice: 0.38, noPrice: 0.62, volume24h: 456000, change24h: -2.1, platform: "Polymarket", category: "Crypto", liquidity: 980000, endDate: "Sep 30" },
  { title: "Fed cuts rates in April?", yesPrice: 0.29, noPrice: 0.71, volume24h: 1200000, change24h: -8.4, platform: "Kalshi", category: "Economics", liquidity: 3400000, endDate: "Apr 30" },
  { title: "S&P 500 above 6,000 by May?", yesPrice: 0.61, noPrice: 0.39, volume24h: 320000, change24h: 1.8, platform: "Kalshi", category: "Markets", liquidity: 890000, endDate: "May 31" },
  { title: "Will GPT-5 launch in Q2 2026?", yesPrice: 0.44, noPrice: 0.56, volume24h: 678000, change24h: 12.3, platform: "Polymarket", category: "Tech", liquidity: 1560000, endDate: "Jun 30" },
  { title: "SOL above $200 by April?", yesPrice: 0.52, noPrice: 0.48, volume24h: 234000, change24h: 3.7, platform: "Polymarket", category: "Crypto", liquidity: 670000, endDate: "Apr 30" },
];

export const MarketDataPanel = () => {
  const [filter, setFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"volume" | "change">("volume");

  const filtered = TRENDING_MARKETS
    .filter(m => filter === "all" || m.platform.toLowerCase() === filter || m.category.toLowerCase() === filter)
    .sort((a, b) => sortBy === "volume" ? b.volume24h - a.volume24h : Math.abs(b.change24h) - Math.abs(a.change24h));

  return (
    <div className="card bg-base-100 shadow-lg h-full">
      <div className="card-body p-4">
        <div className="flex items-center justify-between">
          <h2 className="card-title text-lg">Trending Markets</h2>
          <select
            className="select select-xs select-bordered"
            value={filter}
            onChange={e => setFilter(e.target.value)}
          >
            <option value="all">All</option>
            <option value="polymarket">Polymarket</option>
            <option value="kalshi">Kalshi</option>
            <option value="crypto">Crypto</option>
            <option value="economics">Economics</option>
          </select>
        </div>

        <div className="flex gap-1 mt-1">
          <button
            className={`btn btn-xs ${sortBy === "volume" ? "btn-active" : "btn-ghost"}`}
            onClick={() => setSortBy("volume")}
          >
            By Volume
          </button>
          <button
            className={`btn btn-xs ${sortBy === "change" ? "btn-active" : "btn-ghost"}`}
            onClick={() => setSortBy("change")}
          >
            By Change
          </button>
        </div>

        <div className="mt-2 space-y-2 max-h-80 overflow-y-auto">
          {filtered.map((market, i) => (
            <div key={i} className="bg-base-200 rounded-lg p-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{market.title}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="badge badge-xs badge-outline">{market.platform}</span>
                    <span className="badge badge-xs badge-ghost">{market.category}</span>
                    <span className="text-xs text-base-content/50">Ends {market.endDate}</span>
                  </div>
                </div>
                <div className={`text-xs font-mono ${market.change24h >= 0 ? "text-success" : "text-error"}`}>
                  {market.change24h >= 0 ? "+" : ""}{market.change24h.toFixed(1)}%
                </div>
              </div>
              <div className="flex items-center justify-between mt-2">
                <div className="flex gap-3">
                  <div className="text-center">
                    <div className="text-xs text-base-content/50">YES</div>
                    <div className="font-mono text-sm font-semibold text-success">{market.yesPrice.toFixed(2)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-base-content/50">NO</div>
                    <div className="font-mono text-sm font-semibold text-error">{market.noPrice.toFixed(2)}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-base-content/50">24h Vol</div>
                  <div className="font-mono text-xs">${(market.volume24h / 1000).toFixed(0)}K</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
