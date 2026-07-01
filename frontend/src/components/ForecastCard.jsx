import ForecastChart from "./ForecastChart";

const fmtPrice = (n, currency = "INR") =>
  new Intl.NumberFormat(currency === "USD" ? "en-US" : "en-IN", {
    style: "currency",
    currency: currency,
    maximumFractionDigits: 0,
  }).format(n ?? 0);

const SIGNAL_STYLES = {
  BUY:  { badge: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: "trending_up",   dot: "bg-emerald-500" },
  HOLD: { badge: "bg-amber-100  text-amber-700  border-amber-200",    icon: "trending_flat", dot: "bg-amber-500"   },
  WAIT: { badge: "bg-red-100    text-red-700    border-red-200",      icon: "trending_down",  dot: "bg-red-500"     },
};

const CHANGE_COLOR = (pct) =>
  pct >= 0 ? "text-emerald-600" : "text-red-500";

export default function ForecastCard({ data }) {
  if (!data || data.signal === "UNAVAILABLE") {
    return (
      <div className="flex-1 min-w-[280px] rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm">
        <p className="text-sm text-on-surface-variant">Forecast unavailable.</p>
      </div>
    );
  }

  const s = SIGNAL_STYLES[data.signal] ?? SIGNAL_STYLES.HOLD;
  const currency = data.currency || "INR";

  return (
    <div className="flex-1 min-w-[280px] rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm flex flex-col gap-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${s.dot}`} />
          <span
            className="text-[13px] font-bold uppercase tracking-widest text-on-surface"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            {data.asset}
          </span>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold ${s.badge}`}
        >
          <span className="material-symbols-outlined text-[13px]">{s.icon}</span>
          {data.signal}
        </span>
      </div>

      {/* Chart */}
      {data.history && data.forecast && (
        <ForecastChart
          history={data.history}
          forecast={data.forecast}
          signal={data.signal}
          currency={currency}
        />
      )}

      {/* Price stats */}
      <div className="flex flex-wrap gap-4">
        <div>
          <p
            className="text-[11px] uppercase tracking-wider text-on-surface-variant mb-0.5"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            Current
          </p>
          <p
            className="text-xl font-extrabold text-on-surface"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {fmtPrice(data.currentPrice, currency)}
          </p>
        </div>
        <div>
          <p
            className="text-[11px] uppercase tracking-wider text-on-surface-variant mb-0.5"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            30-Day Forecast
          </p>
          <p
            className="text-xl font-extrabold text-on-surface"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {fmtPrice(data.predictedPrice, currency)}
          </p>
        </div>
        <div>
          <p
            className="text-[11px] uppercase tracking-wider text-on-surface-variant mb-0.5"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            Expected Change
          </p>
          <p className={`text-xl font-extrabold ${CHANGE_COLOR(data.changePercent)}`}
            style={{ fontFamily: "var(--font-display)" }}
          >
            {data.changePercent >= 0 ? "+" : ""}
            {data.changePercent?.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Confidence range */}
      <div
        className="rounded-xl bg-surface-container px-3 py-2 text-[12px] text-on-surface-variant"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        30-day range: {fmtPrice(data.predictedLow, currency)} — {fmtPrice(data.predictedHigh, currency)}
      </div>

      {/* Message */}
      <p className="text-[13px] italic text-on-surface-variant leading-relaxed">
        {data.message}
      </p>

      {/* Footer */}
      <p
        className="text-[10px] text-on-surface-variant/60 mt-auto"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        Powered by Facebook Prophet · {data.dataSource}
      </p>
    </div>
  );
}
