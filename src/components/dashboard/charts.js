// Dependency-free chart primitives for the dashboard. Pure SVG/HTML — no chart
// library is installed and none was added, per the project constraints.

import { formatCompactCurrency } from "@/lib/utils/formatters";

export const CHART_COLORS = [
  "#3457D5",
  "#1F9D7C",
  "#E2A33D",
  "#D8465F",
  "#5F79E5",
  "#8B9FEF",
  "#187E64",
  "#B87F27",
  "#6971A0",
  "#2E3460",
];

function maxValue(data, valueKey) {
  return data.reduce((m, d) => Math.max(m, Number(d[valueKey]) || 0), 0);
}

function formatTick(value) {
  return formatCompactCurrency(value);
}

function pickColor(index) {
  return CHART_COLORS[index % CHART_COLORS.length];
}

// ─── Line / area trend ─────────────────────────────────────────────────────────

export function TrendChart({ data, valueKey = "count", color = "#3457D5" }) {
  if (!data || data.length === 0) {
    return <ChartEmpty />;
  }

  const max = maxValue(data, valueKey) * 1.15 || 1;
  const n = data.length;
  const points = data.map((d, i) => {
    const x = n === 1 ? 50 : (i / (n - 1)) * 100;
    const y = 100 - (Number(d[valueKey]) || 0) / max * 100;
    return { x, y };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x} 100 L ${points[0].x} 100 Z`;

  // At most ~8 evenly spaced x labels so narrow mobile screens stay readable.
  const labelStep = Math.max(1, Math.ceil(n / 8));

  return (
    <div>
      <div className="relative h-56">
        <div className="absolute inset-0 flex flex-col justify-between">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-14 shrink-0 text-right font-mono text-[11px] text-ink-300">
                {i === 4 ? "" : formatTick((max / 4) * (4 - i))}
              </span>
              <div className="h-px flex-1 bg-ink-50" />
            </div>
          ))}
        </div>
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="trendAreaFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.25" />
              <stop offset="100%" stopColor={color} stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#trendAreaFill)" />
          <path
            d={linePath}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        {points.map((p, i) => (
          <div
            key={i}
            className="group absolute"
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
            title={`${data[i].label}: ${data[i][valueKey]}`}
          >
            <div className="h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-accent-500 opacity-0 shadow transition-opacity group-hover:opacity-100" />
          </div>
        ))}
      </div>
      <div className="mt-3 flex justify-between gap-1 border-t border-ink-50 pt-2">
        {data.map((d, i) => (
          <span
            key={`${d.label}-${i}`}
            className={`shrink-0 text-[11px] text-ink-400 ${i % labelStep === 0 ? "" : "opacity-0"}`}
          >
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Vertical bars (amount by division) ────────────────────────────────────────

export function BarChart({ data, valueKey = "amount", formatValue = formatTick, showValues = true }) {
  if (!data || data.length === 0) {
    return <ChartEmpty />;
  }

  const max = maxValue(data, valueKey) || 1;

  return (
    <div className="flex items-end gap-3">
      {data.map((d, i) => {
        const h = Math.max(2, (Number(d[valueKey]) || 0) / max * 100);
        return (
          <div key={`${d.label}-${i}`} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            {showValues && (
              <span className="font-mono text-[11px] font-semibold text-ink-500">
                {formatValue(d[valueKey])}
              </span>
            )}
            <div className="flex h-44 w-full items-end">
              <div
                className="w-full rounded-t-md transition-all duration-500"
                style={{ height: `${h}%`, backgroundColor: pickColor(i) }}
                title={`${d.label}: ${formatValue(d[valueKey])}`}
              />
            </div>
            <span className="max-w-full truncate text-[11px] font-medium text-ink-500">
              {d.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Stacked bars (weekly performance, division breakdown) ────────────────────

export function StackedBarChart({ data, valueKey = "count" }) {
  if (!data || data.length === 0) {
    return <ChartEmpty />;
  }

  const max = maxValue(data, valueKey) || 1;

  return (
    <div>
      <div className="flex items-end gap-2">
        {data.map((w) => {
          const divs = w.divisions || [];
          const total = Math.max(Number(w[valueKey]) || 0, 1);
          return (
            <div key={w.dateKey} className="flex min-w-0 flex-1 flex-col items-center gap-2">
              <span className="font-mono text-[11px] font-semibold text-ink-500">{w[valueKey]}</span>
              <div className="flex h-44 w-full items-end">
                <div className="flex h-full w-full flex-col justify-end overflow-hidden rounded-t-md">
                  {divs.map((d, i) => (
                    <div
                      key={`${w.dateKey}-${d.name}`}
                      className="w-full"
                      style={{
                        height: `${(Number(d[valueKey]) || 0) / total * 100}%`,
                        backgroundColor: pickColor(i),
                      }}
                      title={`${d.name}: ${d[valueKey]}`}
                    />
                  ))}
                </div>
              </div>
              <span className="text-[11px] font-medium text-ink-500">
                {w.label}
                <span className="ml-1 text-ink-300">{w.week}</span>
              </span>
            </div>
          );
        })}
      </div>
      {data.some((w) => (w.divisions || []).length > 1) && (
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5">
          {Array.from(
            new Map(
              data.flatMap((w) => w.divisions || []).map((d) => [d.name, d.name])
            ).values()
          ).map((name, i) => (
            <span key={name} className="flex items-center gap-1.5 text-xs text-ink-500">
              <span
                className="inline-block h-2.5 w-2.5 rounded-sm"
                style={{ backgroundColor: pickColor(i) }}
              />
              {name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Horizontal bars (engineers, top customers) ────────────────────────────────

export function HBarChart({ data, valueKey = "amount", formatValue = formatTick, color = "#3457D5" }) {
  if (!data || data.length === 0) {
    return <ChartEmpty />;
  }

  const max = maxValue(data, valueKey) || 1;

  return (
    <div className="space-y-3">
      {data.map((d, i) => (
        <div key={`${d.label}-${i}`} className="flex items-center gap-3">
          <span className="w-32 shrink-0 truncate text-xs font-medium text-ink-700" title={d.label}>
            {d.label}
          </span>
          <div className="h-3 min-w-0 flex-1 overflow-hidden rounded-full bg-ink-50">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.max(2, (Number(d[valueKey]) || 0) / max * 100)}%`, backgroundColor: pickColor(i) }}
            />
          </div>
          <span className="w-16 shrink-0 text-right font-mono text-xs font-semibold text-ink-600">
            {formatValue(d[valueKey])}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Donut (order status, source of enquiry) ───────────────────────────────────

export function DonutChart({ data, valueKey = "count", secondaryKey }) {
  const total = data.reduce((s, d) => s + (Number(d[valueKey]) || 0), 0);

  if (data.length === 0 || total === 0) {
    return <ChartEmpty />;
  }

  const R = 45;
  const C = 2 * Math.PI * R;
  let offset = 0;
  const segments = data.map((d, i) => {
    const len = (Number(d[valueKey]) || 0) / total * C;
    const seg = { ...d, len, offset, color: pickColor(i) };
    offset += len;
    return seg;
  });

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:justify-center">
      <div className="relative h-40 w-40 shrink-0">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          <circle cx="60" cy="60" r={R} fill="none" stroke="#F4F5F9" strokeWidth="13" />
          {segments.map((s, i) => (
            <circle
              key={`${s.label}-${i}`}
              cx="60"
              cy="60"
              r={R}
              fill="none"
              stroke={s.color}
              strokeWidth="13"
              strokeDasharray={`${Math.max(s.len - 1.5, 0.5)} ${C - Math.max(s.len - 1.5, 0.5)}`}
              strokeDashoffset={-s.offset}
              strokeLinecap="round"
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-2xl font-bold text-ink-900">{total}</span>
          <span className="text-[11px] font-medium uppercase tracking-wide text-ink-300">total</span>
        </div>
      </div>
      <div className="w-full min-w-0 flex-1 space-y-2">
        {segments.map((s, i) => (
          <div key={`${s.label}-${i}`} className="flex items-center gap-2 text-xs">
            <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: s.color }} />
            <span className="min-w-0 flex-1 truncate font-medium text-ink-700">{s.label}</span>
            <span className="font-mono font-semibold text-ink-600">{s[valueKey]}</span>
            {secondaryKey && (
              <span className="w-14 shrink-0 text-right font-mono text-[11px] text-ink-400">
                {formatCompactCurrency(s[secondaryKey])}
              </span>
            )}
            <span className="w-10 shrink-0 text-right font-mono text-ink-300">
              {total ? Math.round((Number(s[valueKey]) / total) * 100) : 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChartEmpty() {
  return (
    <div className="flex h-44 items-center justify-center text-sm text-ink-300">
      No data available
    </div>
  );
}
