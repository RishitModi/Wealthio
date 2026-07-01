import React from "react";

const SIGNAL_THEMES = {
  BUY: {
    color: "text-emerald-700 bg-emerald-50 border-emerald-200",
    dot: "bg-emerald-500",
    icon: "trending_up"
  },
  HOLD: {
    color: "text-amber-700 bg-amber-50 border-amber-200",
    dot: "bg-amber-500",
    icon: "trending_flat"
  },
  WAIT: {
    color: "text-rose-700 bg-rose-50 border-rose-200",
    dot: "bg-rose-500",
    icon: "trending_down"
  },
  SELL: {
    color: "text-rose-700 bg-rose-50 border-rose-200",
    dot: "bg-rose-500",
    icon: "trending_down"
  },
};

export default function MarketSignals({ marketTimingSignals }) {
  if (!marketTimingSignals) return null;

  // Read defensive keys (supporting both camelCase and snake_case backend names)
  const gold = marketTimingSignals.gold ?? marketTimingSignals.GOLD;
  const nifty = marketTimingSignals.nifty ?? marketTimingSignals.NIFTY;

  if (!gold && !nifty) return null;

  const renderSignalCard = (title, data, defaultIcon) => {
    if (!data) return null;

    const signal = (data.signal ?? "HOLD").toUpperCase();
    const expectedChange = data.expectedChangePercent ?? data.expected_change_percent;
    const message = data.message;
    const theme = SIGNAL_THEMES[signal] ?? SIGNAL_THEMES.HOLD;
    const isPositive = expectedChange >= 0;

    return (
      <div className="flex-1 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between min-w-[280px]">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-slate-500 text-lg select-none">{defaultIcon}</span>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">{title} Signal</span>
            </div>
            {/* Status Badge */}
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold ${theme.color}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${theme.dot}`} />
              {signal}
            </span>
          </div>

          {/* Expected Change */}
          <div className="mb-2">
            <span className="text-xs text-slate-400 font-medium">Expected Forecast Change</span>
            <div className={`flex items-center gap-1 text-base font-extrabold font-mono mt-0.5 ${isPositive ? "text-emerald-600" : "text-rose-500"}`}>
              <span className="material-symbols-outlined text-[16px] font-bold">
                {isPositive ? "arrow_upward" : "arrow_downward"}
              </span>
              {expectedChange != null ? `${Math.abs(expectedChange).toFixed(2)}%` : "0.00%"}
            </div>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-start gap-2">
            <span className="material-symbols-outlined text-slate-400 text-base select-none shrink-0 mt-0.5">
              chat_bubble
            </span>
            <p className="text-xs text-slate-500 font-normal leading-relaxed break-words">
              {message}
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-blue-600">query_stats</span>
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 font-mono">
          AI Market Overlay Signals
        </h3>
      </div>
      <div className="flex flex-wrap gap-5">
        {renderSignalCard("Gold", gold, "workspace_premium")}
        {renderSignalCard("Nifty 50", nifty, "show_chart")}
      </div>
    </div>
  );
}
