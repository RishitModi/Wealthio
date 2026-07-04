import React from "react";
import { Table } from "lucide-react";

const ASSET_COLORS = {
  STOCKS: "#4F46E5",       // Indigo
  MUTUAL_FUND: "#10B981",  // Emerald
  GOLD: "#F59E0B",         // Amber
  ETF: "#7C3AED",          // Purple
  FD: "#06B6D4",           // Cyan
  CRYPTO: "#F97316",       // Orange
  BONDS: "#6366F1",        // Violet
};

const FALLBACK_COLORS = ["#4F46E5", "#10B981", "#F59E0B", "#7C3AED", "#06B6D4", "#F97316", "#6366F1"];

const getAssetColor = (assetClass, index) => {
  if (!assetClass) return FALLBACK_COLORS[index % FALLBACK_COLORS.length];
  const key = assetClass.toUpperCase().replace(/\s+/g, "_");
  return ASSET_COLORS[key] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length];
};

const formatAssetLabel = (assetClass) => {
  if (!assetClass) return "Other";
  if (assetClass.toUpperCase() === "ETF") return "ETF";
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
    <div className="h-full rounded-3xl border border-[#E5E7EB] bg-white shadow-premium overflow-hidden flex flex-col hover:shadow-premium-hover transition-all duration-300">
      {/* Header */}
      <div className="p-6 border-b border-[#F1F5F9] flex items-center gap-2">
        <div className="bg-primary/10 p-2 rounded-xl text-primary flex items-center justify-center">
          <Table className="h-4.5 w-4.5" />
        </div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#111827] font-mono">
          Allocation Breakdown
        </h3>
      </div>

      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-xs border-collapse text-left">
          <thead>
            <tr className="bg-[#F8FAFC]/50 border-b border-[#E5E7EB]">
              <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-wider text-[#6B7280] font-mono">
                Asset Class
              </th>
              <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-wider text-[#6B7280] font-mono">
                Weight
              </th>
              <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-wider text-[#6B7280] font-mono w-24">
                Allocation
              </th>
              <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-wider text-[#6B7280] font-mono">
                Amount
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1F5F9]">
            {allocations.map((a, i) => {
              const assetColor = getAssetColor(a.assetClass, i);
              const weight = a.allocationPercentage ?? 0;
              return (
                <tr key={a.id ?? i} className="hover:bg-[#F8FAFC] transition-colors duration-150">
                  {/* Asset class label */}
                  <td className="px-5 py-4 font-bold text-[#111827] whitespace-nowrap font-display">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: assetColor }} />
                      {formatAssetLabel(a.assetClass)}
                    </div>
                  </td>

                  {/* Percentage weight */}
                  <td className="px-5 py-4 font-bold text-[#111827] font-mono whitespace-nowrap">
                    {weight.toFixed(1)}%
                  </td>

                  {/* Allocation Weight progress bar */}
                  <td className="px-5 py-4 whitespace-nowrap">
                    <div className="w-full bg-[#F1F5F9] rounded-full h-1.5 overflow-hidden border border-[#E5E7EB]/50">
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
                  <td className="px-5 py-4 font-extrabold text-[#111827] font-mono whitespace-nowrap">
                    {formatCurrency(a.allocationAmount)}
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
