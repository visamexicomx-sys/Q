"use client";

type NewsItem = {
  title: string;
  source: string;
  timestamp: string;
  sentiment: "bullish" | "bearish" | "neutral";
  impact: "high" | "medium" | "low";
  relatedMarkets: string[];
  summary: string;
};

const NEWS_FEED: NewsItem[] = [
  {
    title: "Bitcoin ETF inflows hit $1.2B daily record",
    source: "CoinDesk",
    timestamp: "12m ago",
    sentiment: "bullish",
    impact: "high",
    relatedMarkets: ["BTC > $100K June", "SOL above $200"],
    summary: "Institutional demand surges as BlackRock and Fidelity lead massive inflows",
  },
  {
    title: "Fed officials signal patience on rate cuts",
    source: "Reuters",
    timestamp: "34m ago",
    sentiment: "bearish",
    impact: "high",
    relatedMarkets: ["Fed Rate Cut March", "S&P 500 > 6000"],
    summary: "Multiple FOMC members indicate inflation concerns outweigh growth risks",
  },
  {
    title: "OpenAI previews GPT-5 capabilities at demo event",
    source: "TechCrunch",
    timestamp: "1h ago",
    sentiment: "bullish",
    impact: "medium",
    relatedMarkets: ["GPT-5 launch Q2"],
    summary: "Sam Altman showcases reasoning and multimodal improvements, hints at Q2 release",
  },
  {
    title: "Ethereum Pectra upgrade confirmed for May",
    source: "The Block",
    timestamp: "2h ago",
    sentiment: "bullish",
    impact: "medium",
    relatedMarkets: ["ETH > $5K Q3"],
    summary: "Core devs finalize Pectra scope including account abstraction improvements",
  },
  {
    title: "US jobs report stronger than expected",
    source: "Bloomberg",
    timestamp: "3h ago",
    sentiment: "neutral",
    impact: "medium",
    relatedMarkets: ["Fed Rate Cut March", "S&P 500 > 6000"],
    summary: "Non-farm payrolls beat estimates, mixed signal for rate cut timing",
  },
];

const sentimentConfig: Record<string, { color: string; icon: string }> = {
  bullish: { color: "text-success", icon: "▲" },
  bearish: { color: "text-error", icon: "▼" },
  neutral: { color: "text-warning", icon: "◆" },
};

const impactBadge: Record<string, string> = {
  high: "badge-error",
  medium: "badge-warning",
  low: "badge-ghost",
};

export const NewsIntelPanel = () => {
  return (
    <div className="card bg-base-100 shadow-lg h-full">
      <div className="card-body p-4">
        <div className="flex items-center justify-between">
          <h2 className="card-title text-lg">News Intelligence</h2>
          <div className="flex items-center gap-2">
            <div className="badge badge-success badge-xs gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse-fast" />
              Live Feed
            </div>
          </div>
        </div>

        {/* Sentiment Summary */}
        <div className="grid grid-cols-3 gap-2 mt-2">
          <div className="bg-base-200 rounded-lg p-2 text-center">
            <div className="text-xs text-base-content/50">Bullish</div>
            <div className="text-lg font-bold text-success">
              {NEWS_FEED.filter(n => n.sentiment === "bullish").length}
            </div>
          </div>
          <div className="bg-base-200 rounded-lg p-2 text-center">
            <div className="text-xs text-base-content/50">Bearish</div>
            <div className="text-lg font-bold text-error">
              {NEWS_FEED.filter(n => n.sentiment === "bearish").length}
            </div>
          </div>
          <div className="bg-base-200 rounded-lg p-2 text-center">
            <div className="text-xs text-base-content/50">Neutral</div>
            <div className="text-lg font-bold text-warning">
              {NEWS_FEED.filter(n => n.sentiment === "neutral").length}
            </div>
          </div>
        </div>

        {/* News Feed */}
        <div className="mt-3 space-y-2 max-h-72 overflow-y-auto">
          {NEWS_FEED.map((news, i) => (
            <div key={i} className="bg-base-200 rounded-lg p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`font-bold ${sentimentConfig[news.sentiment].color}`}>
                      {sentimentConfig[news.sentiment].icon}
                    </span>
                    <span className="font-medium text-sm">{news.title}</span>
                  </div>
                  <p className="text-xs text-base-content/60 mt-1">{news.summary}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {news.relatedMarkets.map((market, j) => (
                      <span key={j} className="badge badge-xs badge-outline">{market}</span>
                    ))}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className={`badge badge-xs ${impactBadge[news.impact]}`}>{news.impact}</span>
                  <div className="text-xs text-base-content/40 mt-1">{news.source}</div>
                  <div className="text-xs text-base-content/40">{news.timestamp}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
