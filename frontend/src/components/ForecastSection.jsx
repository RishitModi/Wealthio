import { useEffect, useState } from "react";
import ForecastCard from "./ForecastCard";
import { getForecast } from "../api/forecastApi";

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

export default function ForecastSection() {
  const [forecasts, setForecasts] = useState({ gold: null, nifty: null });
  const [loading, setLoading]     = useState(true);
  const [lastFetched, setLastFetched] = useState(null);
  const [cooldown, setCooldown]   = useState(0);
  const [periods, setPeriods]     = useState(30);
  const [goldCurrency, setGoldCurrency] = useState("INR");

  const fetchForecasts = async (p = periods, currency = goldCurrency) => {
    setLoading(true);
    const [gold, nifty] = await Promise.all([
      getForecast("gold", p, currency),
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
    fetchForecasts(p, goldCurrency);
  };

  const handleCurrencyChange = async (currency) => {
    setGoldCurrency(currency);
    const gold = await getForecast("gold", periods, currency);
    setForecasts((prev) => ({ ...prev, gold }));
    setLastFetched(new Date());
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
            onClick={() => fetchForecasts(periods, goldCurrency)}
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

      {/* Horizon & Currency selectors */}
      <div className="flex items-center justify-between flex-wrap gap-4">
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

        {/* Currency Selector */}
        <div className="flex items-center gap-2 rounded-xl bg-surface-container p-0.5 border border-outline-variant">
          {["INR", "USD"].map((curr) => (
            <button
              key={curr}
              onClick={() => handleCurrencyChange(curr)}
              className={`rounded-lg px-3 py-1 text-xs font-bold transition-all ${
                goldCurrency === curr
                  ? "bg-surface-container-lowest text-secondary shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {curr}
            </button>
          ))}
        </div>
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
