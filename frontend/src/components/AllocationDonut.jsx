import React from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { PieChart as PieIcon } from "lucide-react";

const ASSET_COLORS = {
  STOCKS: "#4F46E5",       // Premium Indigo
  MUTUAL_FUND: "#10B981",  // Emerald
  GOLD: "#F59E0B",         // Amber Gold
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
      <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-premium max-w-xs text-xs flex flex-col gap-2">
        <div className="flex items-center gap-2 font-bold text-[#111827] text-sm font-display">
          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: data.color }} />
          {formatAssetLabel(data.assetClass)}
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[#6B7280] font-medium">
          <span>Allocation:</span>
          <span className="text-right text-[#111827] font-bold">{(data.allocationPercentage ?? 0).toFixed(1)}%</span>
          <span>Amount:</span>
          <span className="text-right text-[#111827] font-bold">{formatCurrency(data.allocationAmount)}</span>
        </div>
        {data.reasoning && (
          <div className="mt-1 pt-2 border-t border-[#F1F5F9] text-[#6B7280] font-normal leading-relaxed">
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
      <div className="rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-premium flex flex-col items-center justify-center py-16 text-[#9CA3AF]">
        <PieIcon className="h-8 w-8 mb-2" />
        <p className="text-sm font-medium">No asset allocations available</p>
      </div>
    );
  }

  // Process data
  const chartData = allocations
    .map((a, i) => ({
      ...a,
      name: formatAssetLabel(a.assetClass),
      value: parseFloat((a.allocationPercentage ?? 0).toFixed(1)),
      color: getAssetColor(a.assetClass, i),
    }))
    .filter((item) => item.value > 0);

  const totalPortfolioValue = chartData.reduce((acc, item) => acc + (item.allocationAmount ?? 0), 0);

  if (chartData.length === 0) return null;

  return (
    <div className="rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-premium flex flex-col gap-6 hover:shadow-premium-hover transition-all duration-300">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="bg-primary/10 p-2 rounded-xl text-primary flex items-center justify-center">
          <PieIcon className="h-4.5 w-4.5" />
        </div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#111827] font-mono">
          Optimal Asset Allocation
        </h3>
      </div>

      {/* Donut Chart */}
      <div className="flex justify-center items-center w-full py-2">
        <div className="w-[240px] h-[240px] relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={72}
                outerRadius={102}
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
          {/* Centered Total Portfolio Value */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
            <span className="text-[10px] uppercase tracking-wider font-bold text-[#9CA3AF] font-mono">
              Total Value
            </span>
            <span className="text-base font-extrabold text-[#111827] font-mono mt-0.5 tracking-tight truncate max-w-full">
              {formatCurrency(totalPortfolioValue)}
            </span>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-col gap-2.5 pt-4 border-t border-[#F1F5F9] w-full">
        {chartData.map((item, index) => (
          <div
            key={item.id ?? index}
            className="flex items-center w-full py-1.5 hover:bg-[#F8FAFC]/50 px-2 rounded-xl transition-all duration-200"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0 shadow-sm"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-xs font-bold text-[#111827] truncate font-display">
                {item.name}
              </span>
            </div>
            <span className="text-[11px] font-semibold text-[#6B7280] font-mono ml-6">
              {formatCurrency(item.allocationAmount)}
            </span>
            <span className="text-xs font-bold text-[#111827] font-mono ml-auto">
              {(item.allocationPercentage ?? 0).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
