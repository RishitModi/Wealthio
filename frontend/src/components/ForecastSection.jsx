import { useEffect, useState } from "react";
import { RefreshCw, TrendingUp, AlertTriangle } from "lucide-react";
import ForecastCard from "./ForecastCard";
import { getForecast } from "../api/forecastApi";

function SectionHeading({ title }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <div className="bg-primary/10 p-2 rounded-xl text-primary flex items-center justify-center">
        <TrendingUp className="h-4.5 w-4.5" />
      </div>
      <h2 className="text-xs font-bold uppercase tracking-wider text-[#111827] font-mono">
        {title}
      </h2>
    </div>
  );
}

function LoadingSpinner({ label }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-[#6B7280]">
      <div className="h-8 w-8 rounded-full border-2 border-[#F1F5F9] border-t-primary animate-spin" />
      <p className="text-xs font-semibold text-[#111827]">{label}</p>
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
    try {
      const [gold, nifty] = await Promise.all([
        getForecast("gold", p, currency),
        getForecast("nifty", p),
      ]);
      setForecasts({ gold, nifty });
      setLastFetched(new Date());
    } catch {
      // Fail silently or fallback
    } finally {
      setLoading(false);
      setCooldown(30);
    }
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
    try {
      const gold = await getForecast("gold", periods, currency);
      setForecasts((prev) => ({ ...prev, gold }));
      setLastFetched(new Date());
    } catch {
      // Fail silently
    }
  };

  const relativeTime = (date) => {
    if (!date) return null;
    const diff = Math.floor((new Date() - date) / 1000);
    if (diff < 60)  return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return date.toLocaleTimeString("en-IN");
  };

  const bothSame =
    forecasts.gold?.signal &&
    forecasts.nifty?.signal &&
    forecasts.gold.signal === forecasts.nifty.signal;

  const calloutText = {
    BUY:  "Both tracked assets show bullish momentum — portfolio entry conditions are highly favorable.",
    WAIT: "Caution is advised across asset classes — consider maintaining cash positions temporarily.",
    HOLD: "Markets show stable indicators across both tracked assets.",
  };

  const calloutBorder = {
    BUY:  "border-emerald-500 bg-emerald-50 text-emerald-800",
    WAIT: "border-rose-500 bg-rose-50 text-rose-800",
    HOLD: "border-amber-500 bg-amber-50 text-amber-800",
  };

  return (
    <div className="rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-premium flex flex-col gap-6 hover:shadow-premium-hover transition-all duration-300">
      
      {/* Header Row */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-[#F1F5F9] pb-4">
        <div>
          <SectionHeading title="AI Market Forecast (Prophet)" />
          <p className="text-xs font-medium text-[#6B7280]">Algorithmic 30-day time-series forecasting</p>
        </div>
        
        <div className="flex flex-col items-end gap-1">
          <button
            onClick={() => fetchForecasts(periods, goldCurrency)}
            disabled={cooldown > 0 || loading}
            className="flex items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-xs font-bold text-[#111827] hover:bg-[#F8FAFC] disabled:opacity-40 transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>{cooldown > 0 ? `Retry in ${cooldown}s` : "Recalculate"}</span>
          </button>
          {lastFetched && (
            <p className="text-[10px] text-[#9CA3AF] font-bold font-mono">
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
              className={`rounded-xl px-4 py-2 text-xs font-bold border transition-all cursor-pointer ${
                periods === p
                  ? "bg-primary text-white border-primary shadow-sm"
                  : "border-[#E5E7EB] text-[#6B7280] hover:bg-[#F8FAFC]"
              }`}
            >
              {p}d Forecast
            </button>
          ))}
        </div>

        {/* Currency Selector */}
        <div className="flex items-center gap-1 rounded-xl bg-[#F1F5F9] p-1 border border-[#E5E7EB]">
          {["INR", "USD"].map((curr) => (
            <button
              key={curr}
              onClick={() => handleCurrencyChange(curr)}
              className={`rounded-lg px-3 py-1 text-xs font-bold transition-all cursor-pointer ${
                goldCurrency === curr
                  ? "bg-white text-primary shadow-sm font-extrabold"
                  : "text-[#6B7280] hover:text-[#111827]"
              }`}
            >
              {curr}
            </button>
          ))}
        </div>
      </div>

      {/* Cards Grid */}
      {loading ? (
        <LoadingSpinner label="Running Prophet forecast on historical price indices..." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ForecastCard data={forecasts.gold} />
          <ForecastCard data={forecasts.nifty} />
        </div>
      )}

      {/* Callout */}
      {!loading && bothSame && (
        <div
          className={`rounded-2xl border-l-4 px-5 py-4 text-xs font-semibold flex items-center gap-3 ${calloutBorder[forecasts.gold.signal]}`}
        >
          <AlertTriangle className="h-4.5 w-4.5 shrink-0" />
          <span>{calloutText[forecasts.gold.signal]}</span>
        </div>
      )}

    </div>
  );
}
