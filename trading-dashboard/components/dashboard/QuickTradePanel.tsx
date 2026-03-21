"use client";

import { useState } from "react";

type OrderType = "market" | "limit";

export const QuickTradePanel = () => {
  const [side, setSide] = useState<"YES" | "NO">("YES");
  const [orderType, setOrderType] = useState<OrderType>("limit");
  const [amount, setAmount] = useState("");
  const [limitPrice, setLimitPrice] = useState("0.71");
  const [platform, setPlatform] = useState<"polymarket" | "kalshi">("polymarket");
  const [selectedMarket, setSelectedMarket] = useState("BTC > $100K June");

  const markets = [
    "BTC > $100K June",
    "ETH > $5K Q3",
    "Fed Rate Cut April",
    "S&P 500 > 6000",
    "GPT-5 launch Q2",
    "SOL above $200",
  ];

  const shares = amount && limitPrice ? (Number(amount) / Number(limitPrice)).toFixed(0) : "0";
  const maxProfit = amount ? (Number(shares) * (1 - Number(limitPrice))).toFixed(2) : "0.00";
  const maxLoss = amount || "0.00";

  return (
    <div className="card bg-base-100 shadow-lg h-full">
      <div className="card-body p-4">
        <h2 className="card-title text-lg">Quick Trade</h2>

        {/* Platform Toggle */}
        <div className="btn-group w-full mt-2">
          <button
            className={`btn btn-sm flex-1 ${platform === "polymarket" ? "btn-active" : ""}`}
            onClick={() => setPlatform("polymarket")}
          >
            Polymarket
          </button>
          <button
            className={`btn btn-sm flex-1 ${platform === "kalshi" ? "btn-active" : ""}`}
            onClick={() => setPlatform("kalshi")}
          >
            Kalshi
          </button>
        </div>

        {/* Market Selection */}
        <select
          className="select select-bordered select-sm w-full mt-3"
          value={selectedMarket}
          onChange={e => setSelectedMarket(e.target.value)}
        >
          {markets.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

        {/* Side Toggle */}
        <div className="grid grid-cols-2 gap-2 mt-3">
          <button
            className={`btn btn-sm ${side === "YES" ? "btn-success" : "btn-ghost border-success/30"}`}
            onClick={() => setSide("YES")}
          >
            Buy YES
          </button>
          <button
            className={`btn btn-sm ${side === "NO" ? "btn-error" : "btn-ghost border-error/30"}`}
            onClick={() => setSide("NO")}
          >
            Buy NO
          </button>
        </div>

        {/* Order Type */}
        <div className="btn-group w-full mt-3">
          <button
            className={`btn btn-xs flex-1 ${orderType === "market" ? "btn-active" : ""}`}
            onClick={() => setOrderType("market")}
          >
            Market
          </button>
          <button
            className={`btn btn-xs flex-1 ${orderType === "limit" ? "btn-active" : ""}`}
            onClick={() => setOrderType("limit")}
          >
            Limit
          </button>
        </div>

        {/* Amount */}
        <div className="form-control mt-3">
          <label className="label py-1">
            <span className="label-text text-xs">Amount (USDC)</span>
            <span className="label-text-alt text-xs">Balance: $1,247.50</span>
          </label>
          <input
            type="number"
            placeholder="0.00"
            className="input input-bordered input-sm w-full font-mono"
            value={amount}
            onChange={e => setAmount(e.target.value)}
          />
        </div>

        {/* Limit Price */}
        {orderType === "limit" && (
          <div className="form-control mt-2">
            <label className="label py-1">
              <span className="label-text text-xs">Limit Price</span>
              <span className="label-text-alt text-xs">Current: 0.71</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max="0.99"
              className="input input-bordered input-sm w-full font-mono"
              value={limitPrice}
              onChange={e => setLimitPrice(e.target.value)}
            />
          </div>
        )}

        {/* Order Summary */}
        <div className="bg-base-200 rounded-lg p-3 mt-3 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-base-content/60">Shares</span>
            <span className="font-mono">{shares}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-base-content/60">Max Profit</span>
            <span className="font-mono text-success">${maxProfit}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-base-content/60">Max Loss</span>
            <span className="font-mono text-error">${maxLoss}</span>
          </div>
        </div>

        {/* Submit */}
        <button className={`btn w-full mt-3 ${side === "YES" ? "btn-success" : "btn-error"}`}>
          {side === "YES" ? "Buy YES" : "Buy NO"} - {selectedMarket}
        </button>
      </div>
    </div>
  );
};
