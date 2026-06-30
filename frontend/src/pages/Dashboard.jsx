import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import useAuth from "../context/useAuth";
import Navbar from "../components/Navbar";
import { getPortfolio, generatePortfolio, getMarketData } from "../api/portfolioApi";
import ForecastCard from "../components/ForecastCard";
import { getForecast } from "../api/forecastApi";
// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const SLICE_COLORS = [
  "#316BF3", // blue  — Stocks / Equities
  "#4EDEA3", // mint  — Mutual Fund
  "#F5A623", // gold  — Gold
  "#E05C5C", // red   — Crypto
  "#9B8EFF", // violet — ETF
  "#5AB4D6", // sky   — FD / Bonds
  "#F2C94C", // yellow — Cash
];

const RISK_META = {
  LOW:       { label: "Conservative", color: "bg-emerald-100 text-emerald-700 border-emerald-300" },
  MEDIUM:    { label: "Moderate",     color: "bg-amber-100  text-amber-700  border-amber-300"  },
  HIGH:      { label: "Aggressive",   color: "bg-red-100    text-red-700    border-red-300"    },
  VERY_HIGH: { label: "Very Aggressive", color: "bg-red-200 text-red-800    border-red-400"    },
};

// Expected-return ranges per asset class shown in the breakdown table
const RETURN_RANGES = {
  STOCKS:      "12–18 % p.a.",
  MUTUAL_FUND: "10–14 % p.a.",
  GOLD:        "7–10 % p.a.",
  FD:          "6–8 % p.a.",
  ETF:         "10–15 % p.a.",
  CRYPTO:      "20–60 % p.a.",
  BONDS:       "6–8 % p.a.",
};

const fmt = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n ?? 0);

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

function SectionHeading({ icon, title }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="material-symbols-outlined text-[20px] text-secondary">{icon}</span>
      <h2
        className="text-[15px] font-bold uppercase tracking-widest text-on-surface-variant"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        {title}
      </h2>
    </div>
  );
}

function LoadingSpinner({ label }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-on-surface-variant">
      <div className="h-8 w-8 rounded-full border-2 border-outline-variant border-t-secondary animate-spin" />
      <p className="text-sm font-medium">{label}</p>
    </div>
  );
}

function ErrorBanner({ message, onRetry }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-[18px]">error</span>
        <span>{message}</span>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="shrink-0 rounded-lg border border-red-300 bg-white px-3 py-1 text-xs font-semibold hover:bg-red-50 transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  );
}

// ── Section 1 — User Summary Bar ─────────────

function UserSummaryBar({ portfolio, userEmail, userName }) {
  const risk = RISK_META[portfolio?.riskCategory] ?? RISK_META.MEDIUM;
  return (
    <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 flex flex-wrap items-center justify-between gap-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-container text-on-primary-fixed font-bold text-lg select-none">
          {(userName || userEmail || "U")[0].toUpperCase()}
        </div>
        <div>
          <p className="text-[13px] text-on-surface-variant" style={{ fontFamily: "var(--font-mono)" }}>
            {userEmail}
          </p>
          <p className="text-base font-bold text-on-surface">{userName || "Investor"}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* Risk badge */}
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${risk.color}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {risk.label}
        </span>

        {/* Investable amount */}
        <div className="rounded-xl bg-surface-container px-4 py-2 text-center">
          <p className="text-[11px] uppercase tracking-wider text-on-surface-variant font-semibold">
            Annual Investable Amount
          </p>
          <p className="text-xl font-extrabold text-on-surface" style={{ fontFamily: "var(--font-display)" }}>
            {fmt(portfolio?.totalInvestableAmount)}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Section 2 — Donut Chart ──────────────────

const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, name, percent }) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 1.38;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  if (percent < 0.05) return null; // skip tiny slices
  return (
    <text
      x={x}
      y={y}
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      className="text-[11px] font-semibold fill-on-surface-variant"
      style={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
    >
      {`${name} ${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

function AllocationChart({ allocations }) {
  const data = allocations.map((a) => ({
    name: a.assetClass?.replace("_", " ") ?? "Other",
    value: parseFloat((a.allocationPercentage ?? 0).toFixed(1)),
  }));

  return (
    <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm">
      <SectionHeading icon="donut_large" title="Portfolio Allocation" />
      <div style={{ height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={75}
              outerRadius={115}
              paddingAngle={3}
              dataKey="value"
              labelLine={false}
              label={CustomLabel}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={SLICE_COLORS[i % SLICE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v) => [`${v}%`, "Allocation"]}
              contentStyle={{
                borderRadius: 10,
                border: "1px solid var(--color-outline-variant)",
                fontSize: 12,
                fontFamily: "var(--font-mono)",
              }}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 12, fontFamily: "var(--font-mono)", paddingTop: 12 }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Section 3 — Breakdown Table ──────────────

function AllocationTable({ allocations, totalAmount }) {
  return (
    <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-sm overflow-hidden">
      <div className="p-5 pb-3">
        <SectionHeading icon="table_chart" title="Allocation Breakdown" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-y border-outline-variant bg-surface-container">
              {["Asset Class", "Allocation %", "Amount (₹)", "Expected Return", "Reasoning"].map((h) => (
                <th
                  key={h}
                  className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-on-surface-variant"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allocations.map((a, i) => (
              <tr
                key={a.id ?? i}
                className="border-b border-outline-variant/50 hover:bg-surface-container/60 transition-colors"
              >
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ background: SLICE_COLORS[i % SLICE_COLORS.length] }}
                    />
                    <span className="font-semibold text-on-surface">
                      {a.assetClass?.replace("_", " ")}
                    </span>
                  </div>
                </td>
                <td className="px-5 py-3.5 font-bold text-on-surface" style={{ fontFamily: "var(--font-mono)" }}>
                  {(a.allocationPercentage ?? 0).toFixed(1)}%
                </td>
                <td className="px-5 py-3.5 font-semibold text-on-surface">
                  {fmt(a.allocationAmount)}
                </td>
                <td className="px-5 py-3.5 text-on-surface-variant">
                  {RETURN_RANGES[a.assetClass] ?? "—"}
                </td>
                <td className="px-5 py-3.5 text-on-surface-variant max-w-xs">
                  {a.reasoning
                    ? a.reasoning.length > 80
                      ? a.reasoning.slice(0, 80) + "…"
                      : a.reasoning
                    : "Generated by ML risk model"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Section 4 — Market Snapshot ──────────────

function MarketCard({ label, price, change, changePct }) {
  const isUp = (change ?? 0) >= 0;
  return (
    <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm flex flex-col gap-1 min-w-[140px]">
      <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant" style={{ fontFamily: "var(--font-mono)" }}>
        {label}
      </p>
      <p className="text-xl font-extrabold text-on-surface" style={{ fontFamily: "var(--font-display)" }}>
        {price != null
          ? new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(price)
          : "—"}
      </p>
      <div className={`flex items-center gap-1 text-xs font-bold ${isUp ? "text-emerald-600" : "text-red-500"}`}>
        <span className="material-symbols-outlined text-[14px]">
          {isUp ? "arrow_upward" : "arrow_downward"}
        </span>
        {changePct != null ? `${Math.abs(changePct).toFixed(2)}%` : "—"}
      </div>
    </div>
  );
}

function MarketSnapshot({ market }) {
  // Normalize the backend response — stocks is an array, gold is a nested object
  const stocks = market?.stocks ?? [];
  const gold = market?.gold;

  // Collect cards to render
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

  if (cards.length === 0) {
    return (
      <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm">
        <SectionHeading icon="monitoring" title="Market Snapshot" />
        <p className="text-sm text-on-surface-variant">No market data available right now.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm">
      <SectionHeading icon="monitoring" title="Market Snapshot" />
      <div className="flex flex-wrap gap-3">
        {cards.map((c, i) => (
          <MarketCard key={i} {...c} />
        ))}
      </div>
      {market?.timestamp && (
        <p className="mt-3 text-[11px] text-on-surface-variant" style={{ fontFamily: "var(--font-mono)" }}>
          Last updated: {new Date(market.timestamp).toLocaleString("en-IN")}
        </p>
      )}
    </div>
  );
}
// ── Section 5 — Prophet Forecast ─────────────

function ForecastSection() {
  const [forecasts, setForecasts] = useState({ gold: null, nifty: null });
  const [loading, setLoading]     = useState(true);
  const [lastFetched, setLastFetched] = useState(null);
  const [cooldown, setCooldown]   = useState(0);
  const [periods, setPeriods]     = useState(30);

  const fetchForecasts = async (p = periods) => {
    setLoading(true);
    const [gold, nifty] = await Promise.all([
      getForecast("gold", p),
      getForecast("nifty", p),
    ]);
    setForecasts({ gold, nifty });
    setLastFetched(new Date());
    setLoading(false);
    setCooldown(30);
  };

  useEffect(() => { fetchForecasts(); }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const handlePeriodChange = (p) => {
    setPeriods(p);
    fetchForecasts(p);
  };

  const relativeTime = (date) => {
    if (!date) return null;
    const diff = Math.floor((new Date() - date) / 1000);
    if (diff < 60)  return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return date.toLocaleTimeString("en-IN");
  };

  // Signal consistency callout
  const bothSame =
    forecasts.gold?.signal &&
    forecasts.nifty?.signal &&
    forecasts.gold.signal === forecasts.nifty.signal;

  const calloutText = {
    BUY:  "Both tracked assets show bullish momentum — portfolio entry conditions are favorable.",
    WAIT: "Caution across asset classes — consider holding cash positions temporarily.",
    HOLD: "Markets are relatively stable across both tracked assets.",
  };

  const calloutBorder = {
    BUY:  "border-emerald-400 bg-emerald-50 text-emerald-800",
    WAIT: "border-red-400 bg-red-50 text-red-800",
    HOLD: "border-amber-400 bg-amber-50 text-amber-800",
  };

  return (
    <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm flex flex-col gap-5">

      {/* Header row */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <SectionHeading icon="query_stats" title="AI Market Forecast · Prophet" />
        <div className="flex flex-col items-end gap-1">
          <button
            onClick={() => fetchForecasts()}
            disabled={cooldown > 0 || loading}
            className="flex items-center gap-1.5 rounded-xl border border-outline-variant px-3 py-1.5 text-xs font-semibold text-on-surface hover:bg-surface-container disabled:opacity-40 transition-all"
          >
            <span className="material-symbols-outlined text-[15px]">sync</span>
            {cooldown > 0 ? `Refresh in ${cooldown}s` : "Refresh"}
          </button>
          {lastFetched && (
            <p className="text-[10px] text-on-surface-variant" style={{ fontFamily: "var(--font-mono)" }}>
              Last analysed: {relativeTime(lastFetched)}
            </p>
          )}
        </div>
      </div>

      {/* Horizon selector */}
      <div className="flex gap-2">
        {[7, 30, 60].map((p) => (
          <button
            key={p}
            onClick={() => handlePeriodChange(p)}
            className={`rounded-full px-3 py-1 text-xs font-bold border transition-all ${
              periods === p
                ? "bg-secondary text-on-secondary border-secondary"
                : "border-outline-variant text-on-surface-variant hover:bg-surface-container"
            }`}
          >
            {p} days
          </button>
        ))}
      </div>

      {/* Cards */}
      {loading ? (
        <LoadingSpinner label="Running Prophet forecast on real market data…" />
      ) : (
        <div className="flex flex-wrap gap-4">
          <ForecastCard data={forecasts.gold} />
          <ForecastCard data={forecasts.nifty} />
        </div>
      )}

      {/* Signal consistency callout */}
      {!loading && bothSame && (
        <div
          className={`rounded-xl border-l-4 px-4 py-3 text-sm font-medium ${calloutBorder[forecasts.gold.signal]}`}
        >
          {calloutText[forecasts.gold.signal]}
        </div>
      )}

    </div>
  );
}
// ─────────────────────────────────────────────
// Main Dashboard page
// ─────────────────────────────────────────────

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [portfolio, setPortfolio] = useState(null);
  const [market, setMarket]       = useState(null);
  const [status, setStatus]       = useState("loading"); // loading | ready | error | generating
  const [error, setError]         = useState("");

  // ── Fetch helpers ───────────────────────────

  const loadPortfolio = useCallback(async () => {
    if (!user?.token) return;
    try {
      const data = await getPortfolio(user.token);
      setPortfolio(data);
      setStatus("ready");
    } catch (err) {
      // 404 means no profile yet — nudge user to onboarding
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
      // market data is non-critical — fail silently
    }
  }, [user?.token]);

  useEffect(() => {
    loadPortfolio();
    loadMarket();
  }, [loadPortfolio, loadMarket]);

  // ── Generate / Regenerate ───────────────────

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

  // ── Render ──────────────────────────────────

  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col font-body">
      <Navbar />

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-6">

        {/* ── Loading state ── */}
        {status === "loading" && <LoadingSpinner label="Loading your portfolio…" />}

        {/* ── Generating state ── */}
        {status === "generating" && <LoadingSpinner label="Generating your personalised portfolio via ML…" />}

        {/* ── Error state ── */}
        {status === "error" && (
          <div className="flex flex-col gap-4 items-center justify-center py-20">
            <ErrorBanner message={error} onRetry={loadPortfolio} />
            <p className="text-sm text-on-surface-variant">
              Don't have a portfolio yet?{" "}
              <button
                onClick={handleGenerate}
                className="font-bold text-secondary underline underline-offset-2 hover:opacity-80"
              >
                Generate one now
              </button>
            </p>
          </div>
        )}

        {/* ── Ready state ── */}
        {status === "ready" && portfolio && (
          <>
            {/* Section 1 — User Summary Bar */}
            <UserSummaryBar
              portfolio={portfolio}
              userEmail={user?.email}
              userName={user?.name}
            />

            {/* Section 2 — Chart + Regenerate side-by-side on wide screens */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <AllocationChart allocations={portfolio.allocations ?? []} />
              </div>

              {/* Sidebar actions */}
              <div className="flex flex-col gap-4">
                <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm flex flex-col gap-3">
                  <SectionHeading icon="smart_toy" title="ML Actions" />
                  <p className="text-sm text-on-surface-variant">
                    Re-run the ML pipeline to get a fresh allocation based on your latest financial profile.
                  </p>
                  <button
                    id="regenerate-portfolio-btn"
                    onClick={handleGenerate}
                    className="mt-auto flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-on-primary hover:opacity-90 transition-all active:scale-95"
                  >
                    <span className="material-symbols-outlined text-[18px]">autorenew</span>
                    Regenerate Portfolio
                  </button>
                  <button
                    onClick={() => navigate("/onboarding")}
                    className="flex items-center justify-center gap-2 rounded-xl border border-outline-variant px-4 py-2.5 text-sm font-semibold text-on-surface hover:bg-surface-variant transition-all"
                  >
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                    Update Profile
                  </button>
                </div>

                {/* Compact portfolio stats */}
                <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant mb-3" style={{ fontFamily: "var(--font-mono)" }}>
                    Portfolio Stats
                  </p>
                  <ul className="flex flex-col gap-2 text-sm">
                    <li className="flex justify-between">
                      <span className="text-on-surface-variant">Assets</span>
                      <span className="font-bold">{portfolio.allocations?.length ?? 0}</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-on-surface-variant">Generated</span>
                      <span className="font-bold">
                        {portfolio.createdAt
                          ? new Date(portfolio.createdAt).toLocaleDateString("en-IN")
                          : "—"}
                      </span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-on-surface-variant">Last Updated</span>
                      <span className="font-bold">
                        {portfolio.lastUpdated
                          ? new Date(portfolio.lastUpdated).toLocaleDateString("en-IN")
                          : "—"}
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Section 3 — Breakdown Table */}
{(portfolio.allocations ?? []).length > 0 && (
  <AllocationTable
    allocations={portfolio.allocations}
    totalAmount={portfolio.totalInvestableAmount}
  />
)}

{/* Section 5 — Prophet Forecast */}
<ForecastSection />

{/* Section 4 — Market Snapshot */}
{market && <MarketSnapshot market={market} />}
          </>
        )}
      </main>
    </div>
  );
}
