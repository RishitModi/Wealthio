import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

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

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-lg max-w-xs text-xs flex flex-col gap-2">
        <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: data.color }} />
          {formatAssetLabel(data.assetClass)}
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-slate-600 font-medium">
          <span>Allocation:</span>
          <span className="text-right text-slate-900 font-bold">{(data.allocationPercentage ?? 0).toFixed(1)}%</span>
          <span>Amount:</span>
          <span className="text-right text-slate-900 font-bold">{formatCurrency(data.allocationAmount)}</span>
        </div>
        {data.reasoning && (
          <div className="mt-1 pt-2 border-t border-slate-100 text-slate-500 font-normal leading-relaxed">
            {data.reasoning}
          </div>
        )}
      </div>
    );
  }
  return null;
};

export default function AllocationDonut({ allocations = [] }) {
  if (!allocations || allocations.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col items-center justify-center py-12 text-slate-400">
        <span className="material-symbols-outlined text-4xl mb-2">donut_large</span>
        <p className="text-sm font-medium">No asset allocations available</p>
      </div>
    );
  }

  // Pre-process chart data using strict backend fields
  const chartData = allocations
    .map((a, i) => ({
      ...a,
      name: formatAssetLabel(a.assetClass),
      value: parseFloat((a.allocationPercentage ?? 0).toFixed(1)),
      color: getAssetColor(a.assetClass, i),
    }))
    .filter((item) => item.value > 0);

  if (chartData.length === 0) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col gap-5">
      {/* 1. Card Title */}
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-blue-600">donut_large</span>
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 font-mono">
          Optimal Asset Allocation
        </h3>
      </div>

      {/* 2. Centered Donut Chart */}
      <div className="flex justify-center items-center w-full py-2">
        <div className="w-[220px] h-[220px] relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={95}
                paddingAngle={3}
                dataKey="value"
                labelLine={false}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          {/* Donut Center Context */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 font-mono">
              Total Assets
            </span>
            <span className="text-2xl font-black text-slate-800 font-mono">
              {chartData.length}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Allocation Legend below the chart */}
      <div className="flex flex-col gap-2.5 pt-4 border-t border-slate-100 w-full">
        {chartData.map((item, index) => (
          <div
            key={item.id ?? index}
            className="flex items-center w-full py-1.5 hover:bg-slate-50/50 px-2 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0 shadow-sm"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-xs font-semibold text-slate-700 truncate">
                {item.name}
              </span>
            </div>
            <span className="text-xs font-medium text-slate-400 font-mono ml-6">
              {formatCurrency(item.allocationAmount)}
            </span>
            <span className="text-sm font-bold text-slate-800 font-mono ml-auto">
              {(item.allocationPercentage ?? 0).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
