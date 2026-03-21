"use client";

type RiskMetric = {
  label: string;
  value: number;
  max: number;
  unit: string;
  status: "safe" | "warning" | "danger";
};

const RISK_METRICS: RiskMetric[] = [
  { label: "Total Exposure", value: 485, max: 2000, unit: "USDC", status: "safe" },
  { label: "Max Position Size", value: 150, max: 500, unit: "USDC", status: "safe" },
  { label: "Daily Loss Limit", value: 12, max: 100, unit: "USDC", status: "safe" },
  { label: "Open Positions", value: 5, max: 20, unit: "positions", status: "safe" },
  { label: "Correlation Risk", value: 35, max: 100, unit: "%", status: "warning" },
  { label: "Drawdown (Peak)", value: 4.2, max: 15, unit: "%", status: "safe" },
];

type RiskRule = {
  name: string;
  enabled: boolean;
  description: string;
};

const RISK_RULES: RiskRule[] = [
  { name: "Max Order Size", enabled: true, description: "Limit single order to $500 USDC" },
  { name: "Daily Loss Cutoff", enabled: true, description: "Stop trading after $100 daily loss" },
  { name: "Kelly Criterion", enabled: true, description: "Position sizing via Kelly formula" },
  { name: "Correlation Guard", enabled: true, description: "Block correlated positions > 40%" },
  { name: "Volatility Filter", enabled: false, description: "Skip markets with > 30% implied vol" },
  { name: "Liquidity Check", enabled: true, description: "Only trade markets with > $50K liquidity" },
];

const statusColor: Record<string, string> = {
  safe: "text-success",
  warning: "text-warning",
  danger: "text-error",
};

const progressColor: Record<string, string> = {
  safe: "progress-success",
  warning: "progress-warning",
  danger: "progress-error",
};

export const RiskManagementPanel = () => {
  const overallRisk = RISK_METRICS.some(m => m.status === "danger")
    ? "DANGER"
    : RISK_METRICS.some(m => m.status === "warning")
    ? "CAUTION"
    : "HEALTHY";

  return (
    <div className="card bg-base-100 shadow-lg h-full">
      <div className="card-body p-4">
        <div className="flex items-center justify-between">
          <h2 className="card-title text-lg">Risk Management</h2>
          <span className={`badge ${
            overallRisk === "HEALTHY" ? "badge-success" :
            overallRisk === "CAUTION" ? "badge-warning" : "badge-error"
          }`}>
            {overallRisk}
          </span>
        </div>

        {/* Risk Metrics */}
        <div className="mt-3 space-y-3">
          {RISK_METRICS.map((metric, i) => (
            <div key={i}>
              <div className="flex justify-between text-sm mb-1">
                <span>{metric.label}</span>
                <span className={`font-mono ${statusColor[metric.status]}`}>
                  {metric.value} / {metric.max} {metric.unit}
                </span>
              </div>
              <progress
                className={`progress ${progressColor[metric.status]} w-full h-2`}
                value={metric.value}
                max={metric.max}
              />
            </div>
          ))}
        </div>

        {/* Risk Rules */}
        <div className="mt-4">
          <h3 className="text-sm font-semibold mb-2">Risk Rules</h3>
          <div className="space-y-1.5">
            {RISK_RULES.map((rule, i) => (
              <div key={i} className="flex items-center justify-between bg-base-200 rounded-lg p-2">
                <div>
                  <div className="text-sm font-medium">{rule.name}</div>
                  <div className="text-xs text-base-content/50">{rule.description}</div>
                </div>
                <input
                  type="checkbox"
                  className="toggle toggle-xs toggle-success"
                  defaultChecked={rule.enabled}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
