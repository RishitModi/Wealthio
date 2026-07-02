import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Coins, 
  ShieldCheck, 
  Activity, 
  Calendar 
} from "lucide-react";
import ForecastChart from "./ForecastChart";

const fmtPrice = (n, currency = "INR") =>
  new Intl.NumberFormat(currency === "USD" ? "en-US" : "en-IN", {
    style: "currency",
    currency: currency,
    maximumFractionDigits: 0,
  }).format(n ?? 0);

const SIGNAL_STYLES = {
  BUY: { badge: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: <TrendingUp className="h-3..5 w-3.5" />, dot: "bg-emerald-500" },
  HOLD: { badge: "bg-amber-50 text-amber-700 border-amber-200", icon: <Minus className="h-3.5 w-3.5" />, dot: "bg-amber-500" },
  WAIT: { badge: "bg-red-50 text-red-700 border-red-200", icon: <TrendingDown className="h-3.5 w-3.5" />, dot: "bg-red-500" },
};

const getAssetIcon = (assetName) => {
  const name = assetName?.toUpperCase() ?? "";
  if (name.includes("GOLD")) return <Coins className="h-4.5 w-4.5" />;
  if (name.includes("FD") || name.includes("PPF") || name.includes("DEPOSIT")) return <ShieldCheck className="h-4.5 w-4.5" />;
  return <Activity className="h-4.5 w-4.5" />;
};

const getExchangeName = (assetName) => {
  const name = assetName?.toUpperCase() ?? "";
  if (name.includes("GOLD")) return "MCX · INDIA";
  if (name.includes("FD") || name.includes("PPF")) return "GUARANTEED · RBI";
  return "NSE · INDIA";
};

export default function ForecastCard({ data }) {
  if (!data || data.signal === "UNAVAILABLE") {
    return (
      <div className="h-[520px] min-w-[280px] rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-premium flex flex-col items-center justify-center text-[#9CA3AF]">
        <Activity className="h-8 w-8 mb-2 animate-pulse" />
        <p className="text-sm font-medium">Forecast data unavailable</p>
      </div>
    );
  }

  const s = SIGNAL_STYLES[data.signal] ?? SIGNAL_STYLES.HOLD;
  const currency = data.currency || "INR";
  const isUp = (data.changePercent ?? 0) >= 0;

  return (
    <div className="h-[520px] min-w-[280px] rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-premium hover:shadow-premium-hover transition-all duration-300 flex flex-col justify-between overflow-hidden">
      
      {/* 1. Header (15% height) */}
      <div className="h-[15%] flex items-center justify-between border-b border-[#F1F5F9] pb-3">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2.5 rounded-xl text-primary flex items-center justify-center">
            {getAssetIcon(data.asset)}
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-[#111827] font-mono tracking-tight uppercase">
              {data.asset}
            </span>
            <span className="text-[9px] font-bold text-[#9CA3AF] font-mono tracking-wider">
              {getExchangeName(data.asset)}
            </span>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${s.badge}`}>
          {s.icon}
          {data.signal}
        </span>
      </div>

      {/* 2. Metrics (20% height) */}
      <div className="h-[20%] flex flex-col justify-center bg-[#F8FAFC] border border-[#E5E7EB] rounded-2xl p-4 gap-2">
        <div className="flex justify-between items-center text-center">
          <div className="flex flex-col items-start">
            <span className="text-[9px] font-bold text-[#9CA3AF] uppercase tracking-wider font-mono">Current</span>
            <span className="text-sm font-extrabold text-[#111827] font-mono mt-0.5">
              {fmtPrice(data.currentPrice, currency)}
            </span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[9px] font-bold text-[#9CA3AF] uppercase tracking-wider font-mono">30d Forecast</span>
            <span className="text-sm font-extrabold text-[#111827] font-mono mt-0.5">
              {fmtPrice(data.predictedPrice, currency)}
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[9px] font-bold text-[#9CA3AF] uppercase tracking-wider font-mono">Exp. Return</span>
            <span className={`text-sm font-extrabold font-mono mt-0.5 ${isUp ? "text-emerald-600" : "text-rose-500"}`}>
              {isUp ? "+" : ""}{data.changePercent?.toFixed(1)}%
            </span>
          </div>
        </div>
        <div className="text-[10px] font-bold text-[#6B7280] font-mono text-center border-t border-[#E5E7EB] pt-2 mt-1">
          30d Range: {fmtPrice(data.predictedLow, currency)} – {fmtPrice(data.predictedHigh, currency)}
        </div>
      </div>

      {/* 3. Chart (55% height) */}
      <div className="h-[55%] py-4 relative flex items-center justify-center">
        {data.history && data.forecast && (
          <ForecastChart
            history={data.history}
            forecast={data.forecast}
            signal={data.signal}
            currency={currency}
          />
        )}
      </div>

      {/* 4. Footer (10% height) */}
      <div className="h-[10%] border-t border-[#F1F5F9] pt-3 flex items-center justify-between text-[9px] font-bold text-[#9CA3AF] font-mono uppercase tracking-wider">
        <span className="truncate max-w-[65%] italic text-[#6B7280]">
          {data.message || "Target price forecast generated successfully."}
        </span>
        <span className="flex items-center gap-1 shrink-0">
          <Calendar className="h-3 w-3" />
          Prophet ML
        </span>
      </div>

    </div>
  );
}
