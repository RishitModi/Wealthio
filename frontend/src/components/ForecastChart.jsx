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

const fmtPrice = (n) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);

const fmtDate = (d) => {
  const date = new Date(d);
  return date.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
};

export default function ForecastChart({ history, forecast, signal }) {
  // Merge history and forecast into one series for the chart
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

  // Join point — last history price appears as start of forecast line
  if (historyData.length > 0 && forecastData.length > 0) {
    const last = historyData[historyData.length - 1];
    forecastData[0] = {
      ...forecastData[0],
      actual: last.actual,
    };
  }

  const combined = [...historyData, ...forecastData];

  // Show every 10th label to avoid crowding
  const tickIndices = new Set(
    combined
      .map((_, i) => i)
      .filter((i) => i % 10 === 0 || i === combined.length - 1)
  );

  const signalColor = {
    BUY:  "#4EDEA3",
    HOLD: "#F5A623",
    WAIT: "#E05C5C",
  }[signal] ?? "#9B8EFF";

  return (
    <div style={{ height: 200 }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={combined} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fontFamily: "var(--font-mono)", fill: "var(--color-on-surface-variant)" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v, i) => (tickIndices.has(i) ? fmtDate(v) : "")}
          />
          <YAxis
            domain={["auto", "auto"]}
            tick={{ fontSize: 10, fontFamily: "var(--font-mono)", fill: "var(--color-on-surface-variant)" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => fmtPrice(v)}
            width={60}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 10,
              border: "1px solid var(--color-outline-variant)",
              fontSize: 12,
              fontFamily: "var(--font-mono)",
              background: "var(--color-surface-container-lowest)",
            }}
            formatter={(value, name) => {
              if (value == null) return null;
              const labels = {
                actual:   "Actual",
                forecast: "Forecast",
                upper:    "Upper band",
                lower:    "Lower band",
              };
              return [`₹${fmtPrice(value)}`, labels[name] ?? name];
            }}
            labelFormatter={(l) => fmtDate(l)}
          />

          {/* Confidence band */}
          <Area
            type="monotone"
            dataKey="upper"
            fill={signalColor}
            stroke="none"
            fillOpacity={0.12}
            connectNulls
          />
          <Area
            type="monotone"
            dataKey="lower"
            fill="var(--color-surface-container-lowest)"
            stroke="none"
            fillOpacity={1}
            connectNulls
          />

          {/* Historical line */}
          <Line
            type="monotone"
            dataKey="actual"
            stroke="var(--color-on-surface-variant)"
            strokeWidth={1.5}
            dot={false}
            connectNulls
          />

          {/* Forecast line */}
          <Line
            type="monotone"
            dataKey="forecast"
            stroke={signalColor}
            strokeWidth={2}
            strokeDasharray="5 3"
            dot={false}
            connectNulls
          />

          {/* Divider between history and forecast */}
          {historyData.length > 0 && (
            <ReferenceLine
              x={historyData[historyData.length - 1].date}
              stroke="var(--color-outline-variant)"
              strokeDasharray="3 3"
              label={{
                value: "Today",
                position: "insideTopRight",
                fontSize: 10,
                fontFamily: "var(--font-mono)",
                fill: "var(--color-on-surface-variant)",
              }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
