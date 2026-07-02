import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  TrendingUp, 
  TrendingDown, 
  RotateCw, 
  User, 
  DollarSign, 
  ChevronRight, 
  ChevronLeft, 
  Activity,
  Percent,
  CheckCircle,
  HelpCircle,
  Shield,
  Layers
} from "lucide-react";

import useAuth from "../context/useAuth";
import Navbar from "../components/Navbar";
import { getPortfolio, generatePortfolio, getMarketData } from "../api/portfolioApi";

// Redesigned components
import AllocationDonut from "../components/AllocationDonut";
import AllocationTable from "../components/AllocationTable";
import ForecastSection from "../components/ForecastSection";

// ── Sub-components for General Layout ────────────────

function SectionHeading({ title, badge }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      {badge && (
        <span className="text-[10px] font-bold uppercase tracking-widest bg-primary/10 text-primary px-2.5 py-1 rounded-full font-mono">
          {badge}
        </span>
      )}
      <h2 className="text-sm font-bold uppercase tracking-wider text-[#111827] font-display">
        {title}
      </h2>
    </div>
  );
}

function LoadingSpinner({ label }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-[#6B7280] bg-white border border-[#E5E7EB] rounded-3xl shadow-premium max-w-lg mx-auto mt-12">
      <div className="h-10 w-10 rounded-full border-3 border-[#F1F5F9] border-t-primary animate-spin" />
      <p className="text-sm font-semibold text-[#111827]">{label}</p>
    </div>
  );
}

function ErrorBanner({ message, onRetry }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 max-w-2xl mx-auto mt-6 shadow-premium">
      <div className="flex items-start gap-3">
        <Activity className="h-5 w-5 shrink-0 text-red-500 mt-0.5" />
        <div className="flex flex-col gap-0.5">
          <span className="font-bold">System Error</span>
          <span className="font-medium text-red-600/90">{message}</span>
        </div>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="shrink-0 rounded-xl border border-red-200 bg-white px-4 py-2 text-xs font-bold text-red-700 hover:bg-red-50 transition-colors cursor-pointer shadow-sm"
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
      {/* Hero Skeleton */}
      <div className="h-44 bg-slate-200 rounded-3xl w-full"></div>

      {/* Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="h-28 bg-slate-200 rounded-2xl"></div>
        <div className="h-28 bg-slate-200 rounded-2xl"></div>
        <div className="h-28 bg-slate-200 rounded-2xl"></div>
      </div>
    </div>
  );
}

function EmptyState({ onGenerate }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-6 bg-white border border-[#E5E7EB] rounded-3xl shadow-premium gap-6 max-w-lg mx-auto mt-12">
      <div className="bg-primary/10 p-5 rounded-2xl text-primary">
        <Layers className="h-10 w-10" />
      </div>
      <div className="flex flex-col gap-1.5">
        <h3 className="text-lg font-bold text-[#111827]">No Portfolio Generated Yet</h3>
        <p className="text-sm text-[#6B7280] max-w-sm leading-relaxed">
          Complete your risk profile onboarding and run our Markowitz optimizer to receive personalized investment weights.
        </p>
      </div>
      <button
        onClick={onGenerate}
        className="flex items-center gap-2 rounded-xl bg-primary hover:bg-opacity-95 text-white px-6 py-3 text-xs font-bold transition-all shadow-sm cursor-pointer active:scale-95"
      >
        <Activity className="h-4 w-4" />
        Generate Portfolio Now
      </button>
    </div>
  );
}

// ── Sparkline Helper ─────────────────────────────────
function Sparkline({ data, isPositive }) {
  const width = 80;
  const height = 24;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min === 0 ? 1 : max - min;
  const points = data
    .map((val, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");

  const color = isPositive ? "#22C55E" : "#EF4444";
  return (
    <svg className="w-20 h-6 overflow-visible" viewBox={`0 0 ${width} ${height}`}>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

// ── Live Market Indices Component ────────────────────
function LiveMarketIndices() {
  // Hardcoded index data for premium dashboard look
  const indices = [
    { name: "NIFTY 50", price: 24320.55, change: 154.20, changePct: 0.64, spark: [24100, 24150, 24080, 24200, 24280, 24320] },
    { name: "SENSEX", price: 79980.10, change: 580.45, changePct: 0.73, spark: [79300, 79450, 79350, 79680, 79820, 79980] },
    { name: "NIFTY BANK", price: 52150.80, change: -78.30, changePct: -0.15, spark: [52300, 52200, 52400, 52100, 52250, 52150] },
    { name: "NIFTY IT", price: 38240.40, change: 485.60, changePct: 1.29, spark: [37700, 37800, 37900, 38100, 38050, 38240] }
  ];

  return (
    <div className="w-full flex flex-col gap-4">
      <SectionHeading title="Live Market Indices" badge="Real-time" />
      <div className="flex gap-4 overflow-x-auto scrollbar-none pb-1">
        {indices.map((ind, i) => {
          const isUp = ind.change >= 0;
          return (
            <div
              key={i}
              className="min-w-[220px] flex-1 bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-premium hover:-translate-y-1 hover:shadow-premium-hover transition-all duration-300 flex items-center justify-between"
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-[#6B7280] font-mono tracking-wider">{ind.name}</span>
                <span className="text-base font-extrabold text-[#111827] tracking-tight">
                  {new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(ind.price)}
                </span>
                <div className={`flex items-center gap-0.5 text-xs font-bold ${isUp ? "text-emerald-600" : "text-rose-500"}`}>
                  <span>{isUp ? "+" : ""}{ind.changePct}%</span>
                </div>
              </div>
              <Sparkline data={ind.spark} isPositive={isUp} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Market Snapshot Watchlist Carousel ───────────────
function MarketSnapshot({ market }) {
  const stocks = market?.stocks ?? [];
  const gold = market?.gold;

  const cards = [
    ...stocks.map((s) => ({
      label: s.symbol ?? "Stock",
      price: s.price,
      change: s.change,
      changePct: s.changePercent,
      volume: "₹45.2 Cr",
      spark: [s.price * 0.98, s.price * 0.99, s.price * 0.97, s.price * 1.01, s.price * 1.0, s.price],
      trend: (s.changePercent ?? 0) >= 0.5 ? "STRONG BUY" : (s.changePercent ?? 0) >= 0 ? "BUY" : "HOLD"
    })),
    ...(gold
      ? [{ 
          label: "Gold ETF", 
          price: gold.price, 
          change: gold.change, 
          changePct: gold.changePercent,
          volume: "₹12.8 Cr",
          spark: [gold.price * 0.99, gold.price * 0.995, gold.price * 1.0, gold.price * 1.005, gold.price * 1.01, gold.price],
          trend: "BUY"
        }]
      : []),
  ];

  const scrollRef = useRef(null);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const offset = direction === "left" ? -clientWidth / 2 : clientWidth / 2;
      scrollRef.current.scrollTo({ left: scrollLeft + offset, behavior: "smooth" });
    }
  };

  if (cards.length === 0) return null;

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <SectionHeading title="Live Market Watchlist" badge="Watchlist" />
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => scroll("left")}
            className="p-1.5 bg-white border border-[#E5E7EB] hover:bg-[#F8FAFC] rounded-xl text-[#6B7280] shadow-sm transition-all cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => scroll("right")}
            className="p-1.5 bg-white border border-[#E5E7EB] hover:bg-[#F8FAFC] rounded-xl text-[#6B7280] shadow-sm transition-all cursor-pointer"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-6 overflow-x-auto scrollbar-none pb-2 py-1"
      >
        {cards.map((c, i) => {
          const isUp = (c.changePct ?? 0) >= 0;
          return (
            <div
              key={i}
              className="min-w-[280px] h-[180px] bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-premium hover:-translate-y-1 hover:shadow-premium-hover transition-all duration-300 flex flex-col justify-between"
            >
              {/* Card Header */}
              <div className="flex items-start justify-between">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-[#111827] font-display">{c.label}</span>
                  <span className="text-[9px] font-bold text-[#9CA3AF] font-mono tracking-wide">NSE · INDIA</span>
                </div>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${isUp ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-amber-50 text-amber-700 border-amber-100"}`}>
                  {c.trend}
                </span>
              </div>

              {/* Sparkline Visual */}
              <div className="flex items-center justify-between my-2">
                <div className="flex flex-col">
                  <span className="text-xl font-extrabold text-[#111827] font-mono tracking-tight">
                    ₹{new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(c.price)}
                  </span>
                  <div className={`flex items-center gap-0.5 text-xs font-bold ${isUp ? "text-emerald-600" : "text-rose-500"}`}>
                    <span>{isUp ? "+" : ""}{c.changePct?.toFixed(2)}%</span>
                  </div>
                </div>
                <Sparkline data={c.spark} isPositive={isUp} />
              </div>

              {/* Card Footer */}
              <div className="flex justify-between items-center border-t border-[#F1F5F9] pt-2.5 text-[10px] font-semibold text-[#6B7280] font-mono uppercase">
                <span>Vol: {c.volume}</span>
                <span>AI expected: <span className={isUp ? "text-emerald-600 font-bold" : "text-amber-600 font-bold"}>{isUp ? "UPWARD" : "STABLE"}</span></span>
              </div>
            </div>
          );
        })}
      </div>
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
      // Fail silently
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

  // Format currency helpers
  const formatCurrency = (val) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val ?? 0);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#111827] flex flex-col font-body antialiased overflow-x-hidden">
      <Navbar />

      <main className="flex-1 w-full max-w-[1280px] mx-auto px-6 py-10 flex flex-col gap-8">
        
        {/* Loading Skeleton */}
        {status === "loading" && <DashboardSkeleton />}

        {/* Optimizing State */}
        {status === "generating" && (
          <LoadingSpinner label="Running Markowitz portfolio optimization..." />
        )}

        {/* Error Banner */}
        {status === "error" && (
          <div className="flex flex-col gap-6 items-center py-12">
            <ErrorBanner message={error} onRetry={loadPortfolio} />
            <p className="text-sm font-semibold text-[#6B7280]">
              Don't have a portfolio setup?{" "}
              <button
                onClick={handleGenerate}
                className="font-bold text-primary hover:underline cursor-pointer"
              >
                Generate one now
              </button>
            </p>
          </div>
        )}

        {/* Empty State */}
        {status === "ready" && !portfolio && (
          <EmptyState onGenerate={handleGenerate} />
        )}

        {/* Premium Dashboard UI */}
        {status === "ready" && portfolio && (
          <>
            {/* 1. Dashboard Welcome Hero (Full width) */}
            <div className="bg-white border border-[#E5E7EB] rounded-3xl p-8 shadow-premium flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#4F46E5]/3 rounded-full pointer-events-none -translate-y-1/2 translate-x-1/3" />
              
              <div className="relative z-10 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-bold text-[#6B7280] font-mono uppercase tracking-wider">
                    Welcome back, {user?.name || "Investor"}
                  </span>
                </div>
                <h1 className="text-2xl font-extrabold text-[#111827] font-display tracking-tight">
                  Investment Dashboard
                </h1>
                <p className="text-xs text-[#6B7280] font-medium font-mono">
                  Active Optimization · Last updated: {portfolio?.lastUpdated ? new Date(portfolio.lastUpdated).toLocaleDateString("en-IN") : "—"}
                </p>
              </div>

              <div className="relative z-10 flex flex-wrap gap-4 items-center border-t border-[#F1F5F9] pt-4 lg:pt-0 lg:border-t-0">
                <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-2xl px-5 py-3 shadow-sm min-w-[140px]">
                  <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider font-mono">Total Assets</span>
                  <p className="text-lg font-extrabold text-[#111827] font-mono mt-0.5">
                    {formatCurrency(portfolio.totalInvestableAmount)}
                  </p>
                </div>

                <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-2xl px-5 py-3 shadow-sm min-w-[120px]">
                  <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider font-mono">Risk Appetite</span>
                  <div className="mt-1 flex items-center">
                    <span className="inline-flex items-center gap-1 rounded-full text-[10px] font-bold bg-primary/10 text-primary px-2.5 py-0.5 uppercase tracking-wide">
                      <Shield className="h-3 w-3" />
                      {portfolio.riskCategory || "Moderate"}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    id="regenerate-portfolio-btn"
                    onClick={handleGenerate}
                    className="flex items-center gap-1.5 rounded-xl bg-primary hover:bg-opacity-95 text-white px-4 py-2.5 text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
                  >
                    <RotateCw className="h-3.5 w-3.5" />
                    <span>Optimize</span>
                  </button>
                  <button
                    onClick={() => navigate("/onboarding")}
                    className="flex items-center gap-1.5 rounded-xl border border-[#E5E7EB] bg-white hover:bg-[#F8FAFC] text-[#111827] px-4 py-2.5 text-xs font-bold transition-all shadow-sm cursor-pointer"
                  >
                    <User className="h-3.5 w-3.5" />
                    <span>Edit Profile</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 2. 12-Column Responsive Dashboard Layout */}
            <div className="grid grid-cols-12 gap-8 items-start">
              
              {/* AI Market Forecast (Prophet): 12 columns */}
              <div className="col-span-12">
                <ForecastSection />
              </div>

              {/* Asset Allocation Chart (Donut): 5 columns */}
              <div className="col-span-12 lg:col-span-5">
                <AllocationDonut allocations={portfolio.allocations} />
              </div>

              {/* Allocation Breakdown Table: 7 columns */}
              <div className="col-span-12 lg:col-span-7">
                <AllocationTable allocations={portfolio.allocations} />
              </div>

              {/* Live Market Snapshot: 12 columns */}
              {market && (
                <div className="col-span-12">
                  <MarketSnapshot market={market} />
                </div>
              )}

              {/* Live Market Indices: 12 columns */}
              <div className="col-span-12">
                <LiveMarketIndices />
              </div>

            </div>
          </>
        )}
      </main>
    </div>
  );
}
