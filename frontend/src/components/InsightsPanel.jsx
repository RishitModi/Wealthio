import React from "react";

const RISK_EXPLANATION = {
  LOW: "Optimized for maximum capital preservation. Focuses heavily on debt, gold, and fixed income to ensure stable returns with minimal drawdown risk.",
  MEDIUM: "A balanced allocation aiming for steady wealth creation. Blends equity and debt asset classes to capture market upside while cushioning against volatility.",
  HIGH: "Equity-heavy allocation tailored for aggressive capital appreciation. Positioned to capture high compounding returns, accepting higher short-term drawdowns.",
  VERY_HIGH: "Aggressive portfolio optimized for maximum risk-adjusted compounding. Leverages high-beta equity assets and alternative classes to maximize capital growth.",
};

const formatAssetLabel = (assetClass) => {
  if (!assetClass) return "Asset";
  return assetClass
    .toLowerCase()
    .replace(/_/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export default function InsightsPanel({ portfolio, marketTimingSignals }) {
  if (!portfolio) return null;

  const riskCategory = portfolio.riskCategory ?? portfolio.risk_category;
  const allocations = portfolio.allocations ?? [];
  const gold = marketTimingSignals?.gold ?? marketTimingSignals?.GOLD;
  const nifty = marketTimingSignals?.nifty ?? marketTimingSignals?.NIFTY;

  const showRisk = !!riskCategory;
  const showAllocations = allocations.some((a) => a.reasoning);
  const showMarket = !!(gold?.message || nifty?.message);

  if (!showRisk && !showAllocations && !showMarket) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-blue-600">lightbulb</span>
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 font-mono">
          Portfolio Intelligence & Insights
        </h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Risk Assessment Card */}
        {showRisk && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col gap-3">
            <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
              <span className="material-symbols-outlined text-amber-500 bg-amber-50 p-2 rounded-xl text-lg select-none">
                verified_user
              </span>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">Risk Framework</span>
                <span className="text-sm font-bold text-slate-800">Risk Assessment</span>
              </div>
            </div>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              Your portfolio is set to <strong className="text-slate-800">{riskCategory}</strong> risk tolerance.
            </p>
            <p className="text-xs text-slate-500 font-normal leading-relaxed">
              {RISK_EXPLANATION[riskCategory.toUpperCase()] ?? "Portfolio risk optimization is calibrated to align with your personal financial profile and target horizon."}
            </p>
          </div>
        )}

        {/* Asset Optimization Insights Card */}
        {showAllocations && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col gap-3">
            <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
              <span className="material-symbols-outlined text-blue-500 bg-blue-50 p-2 rounded-xl text-lg select-none">
                insights
              </span>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">Optimization Model</span>
                <span className="text-sm font-bold text-slate-800">Asset Allocation Insights</span>
              </div>
            </div>
            <div className="flex flex-col gap-3 overflow-y-auto max-h-48 pr-1">
              {allocations
                .filter((a) => a.reasoning)
                .map((a, i) => (
                  <div key={i} className="flex flex-col gap-0.5 text-xs">
                    <span className="font-bold text-slate-700">{formatAssetLabel(a.assetClass)} Allocation:</span>
                    <span className="text-slate-500 font-normal leading-relaxed">{a.reasoning}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Market Overlay Card */}
        {showMarket && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col gap-3">
            <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
              <span className="material-symbols-outlined text-purple-500 bg-purple-50 p-2 rounded-xl text-lg select-none">
                analytics
              </span>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">Market Signals</span>
                <span className="text-sm font-bold text-slate-800">Market Alignment</span>
              </div>
            </div>
            <div className="flex flex-col gap-3.5 text-xs">
              {nifty?.message && (
                <div className="flex flex-col gap-0.5">
                  <span className="font-bold text-slate-700">Nifty 50 Trend:</span>
                  <span className="text-slate-500 font-normal leading-relaxed">{nifty.message}</span>
                </div>
              )}
              {gold?.message && (
                <div className="flex flex-col gap-0.5">
                  <span className="font-bold text-slate-700">Gold Trend:</span>
                  <span className="text-slate-500 font-normal leading-relaxed">{gold.message}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
