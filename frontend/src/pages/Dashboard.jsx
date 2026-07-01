import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import useAuth from "../context/useAuth";
import Navbar from "../components/Navbar";
import { getPortfolio, generatePortfolio, getMarketData } from "../api/portfolioApi";

// Redesigned components
import PortfolioSummary from "../components/PortfolioSummary";
import AllocationDonut from "../components/AllocationDonut";
import AllocationTable from "../components/AllocationTable";
import ForecastSection from "../components/ForecastSection";

// ── Sub-components for General Layout ────────────────

function SectionHeading({ icon, title }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="material-symbols-outlined text-[20px] text-slate-500">{icon}</span>
      <h2
        className="text-[13px] font-bold uppercase tracking-widest text-slate-600 font-mono"
      >
        {title}
      </h2>
    </div>
  );
}

function LoadingSpinner({ label }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-slate-500 bg-white border border-slate-200 rounded-3xl shadow-sm max-w-lg mx-auto mt-12">
      <div className="h-10 w-10 rounded-full border-3 border-slate-100 border-t-blue-600 animate-spin" />
      <p className="text-sm font-semibold text-slate-700">{label}</p>
    </div>
  );
}

function ErrorBanner({ message, onRetry }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-rose-200 bg-rose-50/50 px-5 py-4 text-sm text-rose-700 max-w-2xl mx-auto mt-6 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="material-symbols-outlined text-[20px] shrink-0 mt-0.5">error</span>
        <div className="flex flex-col gap-0.5">
          <span className="font-bold">System Error</span>
          <span className="font-medium text-rose-600/90">{message}</span>
        </div>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="shrink-0 rounded-xl border border-rose-250 bg-white px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer shadow-sm"
        >
          Retry
        </button>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-8 animate-pulse w-full">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-5 border-b border-slate-150 gap-4">
        <div className="flex flex-col gap-2 w-1/3">
          <div className="h-7 bg-slate-200 rounded-lg w-full"></div>
          <div className="h-4 bg-slate-200 rounded-lg w-2/3"></div>
        </div>
        <div className="flex gap-3">
          <div className="h-9 bg-slate-200 rounded-xl w-32"></div>
          <div className="h-9 bg-slate-200 rounded-xl w-28"></div>
        </div>
      </div>

      {/* Summary Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="h-28 bg-slate-200 rounded-2xl"></div>
        <div className="h-28 bg-slate-200 rounded-2xl"></div>
        <div className="h-28 bg-slate-200 rounded-2xl"></div>
      </div>
      <div className="h-36 bg-slate-200 rounded-2xl w-full"></div>

      {/* Donut & Table Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-80 bg-slate-200 rounded-2xl"></div>
        <div className="h-80 bg-slate-200 rounded-2xl"></div>
      </div>
    </div>
  );
}

function EmptyState({ onGenerate }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-6 bg-white border border-slate-200 rounded-3xl shadow-sm gap-6 max-w-lg mx-auto mt-12">
      <span className="material-symbols-outlined text-6xl text-slate-300 select-none">
        folder_open
      </span>
      <div className="flex flex-col gap-1.5">
        <h3 className="text-lg font-bold text-slate-800">No Portfolio Generated Yet</h3>
        <p className="text-sm text-slate-500 max-w-sm leading-relaxed">
          Complete your risk profile onboarding and run our Markowitz optimizer to receive personalized investment weights.
        </p>
      </div>
      <button
        onClick={onGenerate}
        className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 text-sm font-bold transition-all shadow-sm cursor-pointer active:scale-95"
      >
        <span className="material-symbols-outlined text-[18px]">rocket_launch</span>
        Generate Portfolio Now
      </button>
    </div>
  );
}

// ── Market Indices Component ────────────────────────

function MarketCard({ label, price, change, changePct }) {
  const isUp = (change ?? 0) >= 0;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col gap-1 min-w-[150px] flex-1 hover:shadow-md transition-shadow">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
        {label}
      </p>
      <p className="text-lg font-black text-slate-800 tracking-tight">
        {price != null
          ? new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(price)
          : "—"}
      </p>
      <div className={`flex items-center gap-0.5 text-xs font-bold ${isUp ? "text-emerald-600" : "text-rose-500"}`}>
        <span className="material-symbols-outlined text-[14px]">
          {isUp ? "arrow_upward" : "arrow_downward"}
        </span>
        {changePct != null ? `${Math.abs(changePct).toFixed(2)}%` : "—"}
      </div>
    </div>
  );
}

function MarketSnapshot({ market }) {
  const stocks = market?.stocks ?? [];
  const gold = market?.gold;

  const cards = [
    ...stocks.map((s) => ({
      label: s.symbol ?? "Stock",
      price: s.price,
      change: s.change,
      changePct: s.changePercent,
    })),
    ...(gold
      ? [{ label: "Gold", price: gold.price, change: gold.change, changePct: gold.changePercent }]
      : []),
  ];

  if (cards.length === 0) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col gap-4">
      <SectionHeading icon="monitoring" title="Live Market Indices" />
      <div className="flex flex-wrap gap-4">
        {cards.map((c, i) => (
          <MarketCard key={i} {...c} />
        ))}
      </div>
      {market?.timestamp && (
        <p className="text-[10px] text-slate-400 font-medium font-mono">
          Last updated: {new Date(market.timestamp).toLocaleString("en-IN")}
        </p>
      )}
    </div>
  );
}

// ── Main Dashboard ───────────────────────────────────

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [portfolio, setPortfolio] = useState(null);
  const [market, setMarket]       = useState(null);
  const [status, setStatus]       = useState("loading"); // loading | ready | error | generating
  const [error, setError]         = useState("");

  const loadPortfolio = useCallback(async () => {
    if (!user?.token) return;
    try {
      const data = await getPortfolio(user.token);
      setPortfolio(data);
      setStatus("ready");
    } catch (err) {
      if (err?.cause?.response?.status === 404) {
        navigate("/onboarding", { replace: true });
        return;
      }
      setError(err.message ?? "Could not load portfolio.");
      setStatus("error");
    }
  }, [user?.token, navigate]);

  const loadMarket = useCallback(async () => {
    if (!user?.token) return;
    try {
      const data = await getMarketData(user.token);
      setMarket(data);
    } catch {
      // Non-critical fetch, fail silently
    }
  }, [user?.token]);

  useEffect(() => {
    loadPortfolio();
    loadMarket();
  }, [loadPortfolio, loadMarket]);

  const handleGenerate = async () => {
    if (!user?.token) return;
    setStatus("generating");
    setError("");
    try {
      const data = await generatePortfolio(user.token);
      setPortfolio(data);
      setStatus("ready");
    } catch (err) {
      setError(err.message ?? "Portfolio generation failed.");
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans antialiased">
      <Navbar />

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-8">
        {/* ── Loading Skeleton State ── */}
        {status === "loading" && <DashboardSkeleton />}

        {/* ── Generating Spinner State ── */}
        {status === "generating" && (
          <LoadingSpinner label="Running Markowitz portfolio optimization..." />
        )}

        {/* ── Error Banner State ── */}
        {status === "error" && (
          <div className="flex flex-col gap-6 items-center py-12">
            <ErrorBanner message={error} onRetry={loadPortfolio} />
            <p className="text-sm text-slate-500">
              Don't have a portfolio setup?{" "}
              <button
                onClick={handleGenerate}
                className="font-bold text-blue-600 hover:text-blue-700 underline underline-offset-2 cursor-pointer"
              >
                Generate one now
              </button>
            </p>
          </div>
        )}

        {/* ── Ready State (Empty Check) ── */}
        {status === "ready" && !portfolio && (
          <EmptyState onGenerate={handleGenerate} />
        )}

        {/* ── Ready State (Visual Layout) ── */}
        {status === "ready" && portfolio && (
          <>
            {/* Header / Actions Row */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-150 pb-5">
              <div>
                <h1 className="text-2xl font-black text-slate-950 tracking-tight">
                  Investment Dashboard
                </h1>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  Welcome back, {user?.name || "Investor"} · Last updated: {portfolio?.lastUpdated ? new Date(portfolio.lastUpdated).toLocaleDateString("en-IN") : "—"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  id="regenerate-portfolio-btn"
                  onClick={handleGenerate}
                  className="flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 text-xs font-bold transition-all shadow-sm hover:shadow active:scale-95 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">sync</span>
                  Regenerate Portfolio
                </button>
                <button
                  onClick={() => navigate("/onboarding")}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2.5 text-xs font-bold transition-all shadow-sm hover:shadow cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">edit</span>
                  Update Profile
                </button>
              </div>
            </div>

            {/* 1. Portfolio Overview */}
            <PortfolioSummary portfolio={portfolio} />

            {/* 2. Portfolio Allocation */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              <AllocationDonut allocations={portfolio.allocations} />
              <AllocationTable allocations={portfolio.allocations} />
            </div>



            {market && <MarketSnapshot market={market} />}

            {/* 4. AI Forecast */}
            <ForecastSection />
          </>
        )}
      </main>
    </div>
  );
}
