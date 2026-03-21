"use client";

import { useState } from "react";

type OrderLevel = {
  price: number;
  size: number;
  total: number;
};

const generateOrderBook = () => {
  const bids: OrderLevel[] = [];
  const asks: OrderLevel[] = [];
  let bidTotal = 0;
  let askTotal = 0;

  for (let i = 0; i < 10; i++) {
    const bidSize = Math.round(Math.random() * 5000 + 500);
    const askSize = Math.round(Math.random() * 5000 + 500);
    bidTotal += bidSize;
    askTotal += askSize;
    bids.push({ price: 0.70 - i * 0.01, size: bidSize, total: bidTotal });
    asks.push({ price: 0.71 + i * 0.01, size: askSize, total: askTotal });
  }
  return { bids, asks };
};

export const OrderBookPanel = () => {
  const [selectedMarket] = useState("BTC > $100K June");
  const { bids, asks } = generateOrderBook();

  const maxTotal = Math.max(bids[bids.length - 1]?.total || 0, asks[asks.length - 1]?.total || 0);
  const spread = ((asks[0].price - bids[0].price) / asks[0].price * 100).toFixed(2);
  const midPrice = ((asks[0].price + bids[0].price) / 2).toFixed(3);

  return (
    <div className="card bg-base-100 shadow-lg h-full">
      <div className="card-body p-4">
        <div className="flex items-center justify-between">
          <h2 className="card-title text-lg">Order Book</h2>
          <span className="text-xs text-base-content/60">{selectedMarket}</span>
        </div>

        {/* Spread Info */}
        <div className="flex justify-between bg-base-200 rounded-lg p-2 mt-2 text-xs">
          <span>Mid: <span className="font-mono font-semibold">{midPrice}</span></span>
          <span>Spread: <span className="font-mono text-warning">{spread}%</span></span>
        </div>

        {/* Order Book Table */}
        <div className="mt-2 text-xs font-mono">
          {/* Header */}
          <div className="grid grid-cols-3 text-base-content/50 pb-1 border-b border-base-300">
            <span>Price</span>
            <span className="text-right">Size</span>
            <span className="text-right">Total</span>
          </div>

          {/* Asks (reversed so lowest ask is at bottom) */}
          <div className="max-h-40 overflow-y-auto">
            {[...asks].reverse().map((ask, i) => (
              <div key={`ask-${i}`} className="grid grid-cols-3 py-0.5 relative">
                <div
                  className="absolute inset-0 bg-error/10 rounded-sm"
                  style={{ width: `${(ask.total / maxTotal) * 100}%`, right: 0, left: 'auto' }}
                />
                <span className="text-error relative z-10">{ask.price.toFixed(3)}</span>
                <span className="text-right relative z-10">{ask.size.toLocaleString()}</span>
                <span className="text-right text-base-content/60 relative z-10">{ask.total.toLocaleString()}</span>
              </div>
            ))}
          </div>

          {/* Current Price */}
          <div className="py-1 text-center font-semibold text-sm border-y border-base-300 my-1">
            {midPrice}
          </div>

          {/* Bids */}
          <div className="max-h-40 overflow-y-auto">
            {bids.map((bid, i) => (
              <div key={`bid-${i}`} className="grid grid-cols-3 py-0.5 relative">
                <div
                  className="absolute inset-0 bg-success/10 rounded-sm"
                  style={{ width: `${(bid.total / maxTotal) * 100}%`, right: 0, left: 'auto' }}
                />
                <span className="text-success relative z-10">{bid.price.toFixed(3)}</span>
                <span className="text-right relative z-10">{bid.size.toLocaleString()}</span>
                <span className="text-right text-base-content/60 relative z-10">{bid.total.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
