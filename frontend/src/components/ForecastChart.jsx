import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

const fmtPrice = (n, currency = "INR") =>
  new Intl.NumberFormat(currency === "USD" ? "en-US" : "en-IN", {
    style: "currency",
    currency: currency,
    maximumFractionDigits: 0,
  }).format(n);

const fmtDate = (d) => {
  const date = new Date(d);
  return date.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
};

export default function ForecastChart({ history, forecast, signal, currency = "INR" }) {
  // Merge history and forecast into one series
  const historyData = (history ?? []).map((h) => ({
    date:     h.date,
    actual:   h.price,
    forecast: null,
    lower:    null,
    upper:    null,
  }));

  const forecastData = (forecast ?? []).map((f) => ({
    date:     f.date,
    actual:   null,
    forecast: f.price,
    lower:    f.lower,
    upper:    f.upper,
  }));

  if (historyData.length > 0 && forecastData.length > 0) {
    const last = historyData[historyData.length - 1];
    forecastData[0] = {
      ...forecastData[0],
      actual: last.actual,
    };
  }

  const combined = [...historyData, ...forecastData];

  const tickIndices = new Set(
    combined
      .map((_, i) => i)
      .filter((i) => i % 10 === 0 || i === combined.length - 1)
  );

  const signalColor = {
    BUY:  "#10B981",  // Emerald
    HOLD: "#F59E0B",  // Amber
    WAIT: "#EF4444",  // Red
  }[signal] ?? "#4F46E5";

  return (
    <div className="w-full h-full min-h-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={combined} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fontFamily: "var(--font-mono)", fill: "#6B7280" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v, i) => (tickIndices.has(i) ? fmtDate(v) : "")}
          />
          <YAxis
            domain={["auto", "auto"]}
            tick={{ fontSize: 10, fontFamily: "var(--font-mono)", fill: "#6B7280" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => fmtPrice(v, currency)}
            width={70}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 16,
              border: "1px solid #E5E7EB",
              fontSize: 12,
              fontFamily: "var(--font-mono)",
              background: "#FFFFFF",
              boxShadow: "0 8px 30px rgba(15, 23, 42, 0.04)"
            }}
            formatter={(value, name) => {
              if (value == null) return null;
              const labels = {
                actual:   "Actual Price",
                forecast: "Prophet Forecast",
                upper:    "Upper Confidence",
                lower:    "Lower Confidence",
              };
              return [fmtPrice(value, currency), labels[name] ?? name];
            }}
            labelFormatter={(l) => fmtDate(l)}
          />

          {/* Confidence band */}
          <Area
            type="monotone"
            dataKey="upper"
            fill={signalColor}
            stroke="none"
            fillOpacity={0.08}
            connectNulls
          />
          <Area
            type="monotone"
            dataKey="lower"
            fill="#FFFFFF"
            stroke="none"
            fillOpacity={1}
            connectNulls
          />

          {/* Historical line */}
          <Line
            type="monotone"
            dataKey="actual"
            stroke="#9CA3AF"
            strokeWidth={2}
            dot={false}
            connectNulls
          />

          {/* Forecast line */}
          <Line
            type="monotone"
            dataKey="forecast"
            stroke={signalColor}
            strokeWidth={2.5}
            strokeDasharray="5 3"
            dot={false}
            connectNulls
          />

          {/* Divider between history and forecast */}
          {historyData.length > 0 && (
            <ReferenceLine
              x={historyData[historyData.length - 1].date}
              stroke="#E5E7EB"
              strokeDasharray="3 3"
              label={{
                value: "Today",
                position: "insideTopRight",
                fontSize: 9,
                fontFamily: "var(--font-mono)",
                fill: "#6B7280",
                fontWeight: "bold"
              }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
