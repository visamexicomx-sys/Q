"use client";

type AIModel = {
  name: string;
  provider: string;
  signal: "BUY" | "SELL" | "HOLD" | "N/A";
  confidence: number;
  reasoning: string;
  latency: number;
  status: "online" | "offline" | "error";
};

const AI_MODELS: AIModel[] = [
  { name: "Grok-3", provider: "xAI", signal: "BUY", confidence: 78, reasoning: "Strong BTC momentum + ETF inflow data supports upside", latency: 240, status: "online" },
  { name: "Claude Opus", provider: "Anthropic", signal: "BUY", confidence: 72, reasoning: "Macro conditions favorable, but Fed uncertainty adds risk", latency: 310, status: "online" },
  { name: "GPT-4o", provider: "OpenAI", signal: "HOLD", confidence: 61, reasoning: "Mixed signals - bullish crypto but bearish macro indicators", latency: 280, status: "online" },
  { name: "Gemini Pro", provider: "Google", signal: "BUY", confidence: 69, reasoning: "Technical analysis shows breakout pattern forming", latency: 350, status: "online" },
  { name: "DeepSeek-R1", provider: "DeepSeek", signal: "HOLD", confidence: 55, reasoning: "Insufficient conviction - waiting for clearer price action", latency: 420, status: "online" },
];

const signalColors: Record<string, string> = {
  BUY: "text-success",
  SELL: "text-error",
  HOLD: "text-warning",
  "N/A": "text-base-content/30",
};

const signalBg: Record<string, string> = {
  BUY: "badge-success",
  SELL: "badge-error",
  HOLD: "badge-warning",
  "N/A": "badge-ghost",
};

export const AIEnsemblePanel = () => {
  const onlineModels = AI_MODELS.filter(m => m.status === "online");
  const buyCount = onlineModels.filter(m => m.signal === "BUY").length;
  const sellCount = onlineModels.filter(m => m.signal === "SELL").length;
  const holdCount = onlineModels.filter(m => m.signal === "HOLD").length;

  const avgConfidence = onlineModels.length > 0
    ? onlineModels.reduce((sum, m) => sum + m.confidence, 0) / onlineModels.length
    : 0;

  const consensusSignal = buyCount > sellCount && buyCount > holdCount
    ? "BUY"
    : sellCount > buyCount && sellCount > holdCount
    ? "SELL"
    : "HOLD";

  return (
    <div className="card bg-base-100 shadow-lg h-full">
      <div className="card-body p-4">
        <div className="flex items-center justify-between">
          <h2 className="card-title text-lg">AI Ensemble</h2>
          <span className="text-xs text-base-content/50">{onlineModels.length}/{AI_MODELS.length} online</span>
        </div>

        {/* Consensus Signal */}
        <div className="bg-base-200 rounded-lg p-3 mt-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-base-content/50 uppercase">Consensus Signal</div>
              <div className={`text-2xl font-bold ${signalColors[consensusSignal]}`}>
                {consensusSignal}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-base-content/50">Avg Confidence</div>
              <div className="text-2xl font-bold font-mono">{avgConfidence.toFixed(0)}%</div>
            </div>
          </div>
          <div className="flex gap-3 mt-2 text-xs">
            <span className="text-success">{buyCount} Buy</span>
            <span className="text-error">{sellCount} Sell</span>
            <span className="text-warning">{holdCount} Hold</span>
          </div>
        </div>

        {/* Individual Models */}
        <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
          {AI_MODELS.map((model, i) => (
            <div key={i} className="bg-base-200 rounded-lg p-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    model.status === "online" ? "bg-success" : "bg-error"
                  }`} />
                  <div>
                    <span className="font-semibold text-sm">{model.name}</span>
                    <span className="text-xs text-base-content/40 ml-1">({model.provider})</span>
                  </div>
                </div>
                <span className={`badge badge-sm ${signalBg[model.signal]}`}>{model.signal}</span>
              </div>
              <div className="mt-1.5 flex items-center justify-between">
                <p className="text-xs text-base-content/60 flex-1 mr-2">{model.reasoning}</p>
                <div className="text-right flex-shrink-0">
                  <div className="text-xs font-mono">{model.confidence}%</div>
                  <div className="text-xs text-base-content/40">{model.latency}ms</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
