"use client";

import { useState } from "react";
import type { NextPage } from "next";
import { PortfolioPanel } from "~~/components/dashboard/PortfolioPanel";
import { MarketDataPanel } from "~~/components/dashboard/MarketDataPanel";
import { BotControlPanel } from "~~/components/dashboard/BotControlPanel";
import { WhaleTrackerPanel } from "~~/components/dashboard/WhaleTrackerPanel";
import { ArbitragePanel } from "~~/components/dashboard/ArbitragePanel";
import { RiskManagementPanel } from "~~/components/dashboard/RiskManagementPanel";
import { NewsIntelPanel } from "~~/components/dashboard/NewsIntelPanel";
import { AIEnsemblePanel } from "~~/components/dashboard/AIEnsemblePanel";
import { PerformanceChart } from "~~/components/dashboard/PerformanceChart";
import { OrderBookPanel } from "~~/components/dashboard/OrderBookPanel";
import { QuickTradePanel } from "~~/components/dashboard/QuickTradePanel";
import { SystemStatusBar } from "~~/components/dashboard/SystemStatusBar";

const Dashboard: NextPage = () => {
  const [activeTab, setActiveTab] = useState<string>("overview");

  const tabs = [
    { id: "overview", label: "Overview", icon: "◉" },
    { id: "trading", label: "Trading", icon: "⇄" },
    { id: "bots", label: "Bot Control", icon: "⚙" },
    { id: "intelligence", label: "Intelligence", icon: "◈" },
    { id: "risk", label: "Risk", icon: "△" },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-base-200">
      <SystemStatusBar />

      {/* Dashboard Header */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-base-content">Trading Command Center</h1>
            <p className="text-sm text-base-content/60 mt-1">
              Polymarket + Kalshi | All Bots | Real-time Analytics
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="badge badge-success gap-1">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse-fast" />
              LIVE
            </div>
            <div className="text-sm font-mono text-base-content/70">
              {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="tabs tabs-boxed mt-4 bg-base-300 p-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`tab tab-sm md:tab-md gap-1 ${activeTab === tab.id ? "tab-active font-semibold" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span>{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="flex-1 p-4 overflow-auto">
        {activeTab === "overview" && <OverviewTab />}
        {activeTab === "trading" && <TradingTab />}
        {activeTab === "bots" && <BotsTab />}
        {activeTab === "intelligence" && <IntelligenceTab />}
        {activeTab === "risk" && <RiskTab />}
      </div>
    </div>
  );
};

const OverviewTab = () => (
  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
    {/* Top row - Key metrics */}
    <div className="lg:col-span-8">
      <PerformanceChart />
    </div>
    <div className="lg:col-span-4">
      <PortfolioPanel />
    </div>

    {/* Middle row */}
    <div className="lg:col-span-4">
      <MarketDataPanel />
    </div>
    <div className="lg:col-span-4">
      <WhaleTrackerPanel />
    </div>
    <div className="lg:col-span-4">
      <ArbitragePanel />
    </div>

    {/* Bottom row */}
    <div className="lg:col-span-6">
      <NewsIntelPanel />
    </div>
    <div className="lg:col-span-6">
      <AIEnsemblePanel />
    </div>
  </div>
);

const TradingTab = () => (
  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
    <div className="lg:col-span-4">
      <QuickTradePanel />
    </div>
    <div className="lg:col-span-4">
      <OrderBookPanel />
    </div>
    <div className="lg:col-span-4">
      <PortfolioPanel />
    </div>
    <div className="lg:col-span-8">
      <PerformanceChart />
    </div>
    <div className="lg:col-span-4">
      <MarketDataPanel />
    </div>
  </div>
);

const BotsTab = () => (
  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
    <div className="lg:col-span-8">
      <BotControlPanel />
    </div>
    <div className="lg:col-span-4">
      <AIEnsemblePanel />
    </div>
    <div className="lg:col-span-6">
      <PerformanceChart />
    </div>
    <div className="lg:col-span-6">
      <RiskManagementPanel />
    </div>
  </div>
);

const IntelligenceTab = () => (
  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
    <div className="lg:col-span-6">
      <NewsIntelPanel />
    </div>
    <div className="lg:col-span-6">
      <WhaleTrackerPanel />
    </div>
    <div className="lg:col-span-8">
      <MarketDataPanel />
    </div>
    <div className="lg:col-span-4">
      <ArbitragePanel />
    </div>
  </div>
);

const RiskTab = () => (
  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
    <div className="lg:col-span-8">
      <RiskManagementPanel />
    </div>
    <div className="lg:col-span-4">
      <PortfolioPanel />
    </div>
    <div className="lg:col-span-12">
      <PerformanceChart />
    </div>
  </div>
);

export default Dashboard;
