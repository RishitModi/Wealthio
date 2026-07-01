import React from "react";

const RISK_META = {
  LOW: { label: "Conservative", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  MEDIUM: { label: "Moderate", color: "bg-amber-50 text-amber-700 border-amber-200" },
  HIGH: { label: "Aggressive", color: "bg-rose-50 text-rose-700 border-rose-200" },
  VERY_HIGH: { label: "Very Aggressive", color: "bg-red-50 text-red-700 border-red-200" },
};

const formatCurrency = (val) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(val ?? 0);
};

export default function PortfolioSummary({ portfolio }) {
  if (!portfolio) return null;

  // Bind strictly to actual backend properties
  const totalInvestableAmount = portfolio.totalInvestableAmount;
  const riskCategory = portfolio.riskCategory;

  const showAmount = totalInvestableAmount != null;
  const showRisk = !!riskCategory;

  if (!showAmount && !showRisk) return null;

  const risk = RISK_META[riskCategory?.toUpperCase()] ?? { 
    label: riskCategory ?? "Moderate", 
    color: "bg-slate-50 text-slate-700 border-slate-200" 
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {/* Investable Amount Card */}
      {showAmount && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-2">
            <span className="material-symbols-outlined text-blue-600 bg-blue-50 p-2 rounded-xl text-lg select-none">
              payments
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-mono">
              Total Investable Amount
            </span>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {formatCurrency(totalInvestableAmount)}
          </p>
        </div>
      )}

      {/* Risk Profile Card */}
      {showRisk && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <span className="material-symbols-outlined text-amber-500 bg-amber-50 p-2 rounded-xl text-lg select-none">
              shield
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-mono">
              Risk Profile
            </span>
          </div>
          <div className="flex items-center">
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${risk.color}`}>
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {risk.label}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
