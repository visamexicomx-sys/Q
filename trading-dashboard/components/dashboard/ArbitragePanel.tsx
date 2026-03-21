"use client";

type ArbOpportunity = {
  market: string;
  polyPrice: number;
  kalshiPrice: number;
  spread: number;
  expectedProfit: number;
  confidence: "high" | "medium" | "low";
  timeWindow: string;
};

const ARBS: ArbOpportunity[] = [
  { market: "BTC > $100K June", polyPrice: 0.71, kalshiPrice: 0.68, spread: 3.0, expectedProfit: 42.0, confidence: "high", timeWindow: "< 2min" },
  { market: "Fed Rate Cut April", polyPrice: 0.29, kalshiPrice: 0.32, spread: 3.0, expectedProfit: 30.0, confidence: "medium", timeWindow: "< 5min" },
  { market: "S&P > 6000 May", polyPrice: 0.61, kalshiPrice: 0.58, spread: 3.0, expectedProfit: 24.0, confidence: "medium", timeWindow: "< 3min" },
  { market: "ETH > $5K Q3", polyPrice: 0.38, kalshiPrice: 0.41, spread: 3.0, expectedProfit: 21.0, confidence: "low", timeWindow: "< 8min" },
];

const confidenceColor: Record<string, string> = {
  high: "badge-success",
  medium: "badge-warning",
  low: "badge-error",
};

export const ArbitragePanel = () => {
  const totalOpportunities = ARBS.length;
  const totalExpectedProfit = ARBS.reduce((sum, a) => sum + a.expectedProfit, 0);

  return (
    <div className="card bg-base-100 shadow-lg h-full">
      <div className="card-body p-4">
        <div className="flex items-center justify-between">
          <h2 className="card-title text-lg">Arbitrage Scanner</h2>
          <div className="badge badge-accent badge-outline text-xs">{totalOpportunities} opps</div>
        </div>

        <div className="bg-base-200 rounded-lg p-2 mt-2 text-center">
          <div className="text-xs text-base-content/60">Total Expected Profit</div>
          <div className="text-lg font-bold font-mono text-success">${totalExpectedProfit.toFixed(2)}</div>
        </div>

        <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
          {ARBS.map((arb, i) => (
            <div key={i} className="bg-base-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm">{arb.market}</span>
                <span className={`badge badge-xs ${confidenceColor[arb.confidence]}`}>
                  {arb.confidence}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div>
                  <div className="text-base-content/50">Polymarket</div>
                  <div className="font-mono font-semibold">{arb.polyPrice.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-base-content/50">Kalshi</div>
                  <div className="font-mono font-semibold">{arb.kalshiPrice.toFixed(2)}</div>
                </div>
              </div>
              <div className="flex items-center justify-between mt-2 text-xs">
                <span>Spread: <span className="font-mono text-success">{arb.spread.toFixed(1)}%</span></span>
                <span>Profit: <span className="font-mono text-success">${arb.expectedProfit.toFixed(2)}</span></span>
                <span className="text-base-content/50">{arb.timeWindow}</span>
              </div>
              <button className="btn btn-xs btn-success w-full mt-2">Execute Arb</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
