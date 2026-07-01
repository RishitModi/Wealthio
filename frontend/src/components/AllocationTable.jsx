import React from "react";

const ASSET_COLORS = {
  STOCKS: "#2563EB",       // Blue
  MUTUAL_FUND: "#10B981",  // Green
  GOLD: "#F59E0B",         // Gold
  ETF: "#8B5CF6",          // Purple
  FD: "#06B6D4",           // Cyan
  CRYPTO: "#F97316",       // Orange
  BONDS: "#6366F1",        // Indigo
};

const FALLBACK_COLORS = ["#2563EB", "#10B981", "#F59E0B", "#8B5CF6", "#06B6D4", "#F97316", "#6366F1"];

const getAssetColor = (assetClass, index) => {
  if (!assetClass) return FALLBACK_COLORS[index % FALLBACK_COLORS.length];
  const key = assetClass.toUpperCase().replace(/\s+/g, "_");
  return ASSET_COLORS[key] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length];
};

const formatAssetLabel = (assetClass) => {
  if (!assetClass) return "Other";
  return assetClass
    .toLowerCase()
    .replace(/_/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const formatCurrency = (val) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(val ?? 0);
};

export default function AllocationTable({ allocations = [] }) {
  if (!allocations || allocations.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
      <div className="p-6 border-b border-slate-100 flex items-center gap-2">
        <span className="material-symbols-outlined text-blue-600">table_chart</span>
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 font-mono">
          Allocation Breakdown
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse text-left">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-150">
              <th className="px-3 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
                Asset Class
              </th>
              <th className="px-3 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
                Weight
              </th>
              <th className="px-3 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500 font-mono w-24">
                Allocation
              </th>
              <th className="px-3 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
                Amount
              </th>
              <th className="px-3 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
                Reasoning
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {allocations.map((a, i) => {
              const assetColor = getAssetColor(a.assetClass, i);
              const weight = a.allocationPercentage ?? 0;
              return (
                <tr key={a.id ?? i} className="hover:bg-slate-50/50 transition-colors">
                  {/* Asset class label */}
                  <td className="px-3 py-3.5 font-semibold text-slate-900 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: assetColor }} />
                      {formatAssetLabel(a.assetClass)}
                    </div>
                  </td>

                  {/* Percentage weight */}
                  <td className="px-3 py-3.5 font-bold text-slate-800 font-mono whitespace-nowrap">
                    {weight.toFixed(1)}%
                  </td>

                  {/* Allocation Weight progress bar */}
                  <td className="px-3 py-3.5 whitespace-nowrap">
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500 ease-out"
                        style={{
                          width: `${Math.min(100, Math.max(0, weight))}%`,
                          backgroundColor: assetColor,
                        }}
                      />
                    </div>
                  </td>

                  {/* Allocation amount */}
                  <td className="px-3 py-3.5 font-semibold text-slate-700 font-mono whitespace-nowrap">
                    {formatCurrency(a.allocationAmount)}
                  </td>

                  {/* Optimization reasoning */}
                  <td className="px-3 py-3.5 text-slate-500 text-xs font-normal leading-relaxed whitespace-normal break-words max-w-[200px]">
                    {a.reasoning ?? "Optimized based on historical returns and user risk aversion profile."}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
