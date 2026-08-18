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

// Integer-friendly formatter for count axes/labels ("8", "1.5k").
function formatCount(value) {
  const n = Math.round(Number(value) || 0);
  if (n >= 1000) return `${Number((n / 1000).toFixed(1))}k`;
  return String(n);
}

function pickColor(index) {
  return CHART_COLORS[index % CHART_COLORS.length];
}

// ─── Line / area trend ─────────────────────────────────────────────────────────

export function TrendChart({ data, valueKey = "count", color = "#3457D5", onPointClick }) {
  if (!data || data.length === 0) {
    return <ChartEmpty />;
  }

  // Count series plot an integer count axis; amount series plot a currency
  // axis. Mixing the two (the old default) put "₹" on a quotation-count chart.
  const formatValue = valueKey === "count" ? formatCount : formatTick;
  const rawMax = maxValue(data, valueKey) || 1;
  // Clean integer count scale (0,2,4,6,8 style) — never fractional, never ₹.
  const step = Math.max(2, Math.ceil(rawMax / 4));
  const yMax = step * 4;
  const n = data.length;
  const single = n === 1;

  const points = data.map((d, i) => {
    const x = single ? 50 : (i / (n - 1)) * 100;
    const y = 100 - (Number(d[valueKey]) || 0) / yMax * 100;
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
                {i === 4 ? "" : formatValue(step * (4 - i))}
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
          {single ? (
            // A single day renders as a clear column instead of an invisible
            // single dot, so a one-date dataset is never a blank chart.
            <rect
              x="44"
              y={points[0].y}
              width="12"
              height={100 - points[0].y}
              rx="2"
              fill={color}
              opacity="0.9"
            />
          ) : (
            <>
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
            </>
          )}
        </svg>
        {points.map((p, i) => (
          <button
            key={i}
            type="button"
            aria-label={`${data[i].label}: ${data[i][valueKey]}`}
            className="group absolute cursor-pointer bg-transparent p-0 border-0"
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
            title={`${data[i].label}: ${data[i][valueKey]}${valueKey === "count" ? " quotations" : ""}`}
            onClick={() => onPointClick && onPointClick(i)}
          >
            {/* Invisible 32px hit target around the data point */}
            <span className="block h-8 w-8 -translate-x-1/2 -translate-y-1/2" />
            <span
              className={`pointer-events-none absolute left-1/2 top-1/2 block h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-accent-500 shadow transition-opacity ${
                single ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              }`}
            />
          </button>
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

export function BarChart({ data, valueKey = "amount", formatValue = formatTick, showValues = true, onBarClick }) {
  if (!data || data.length === 0) {
    return <ChartEmpty />;
  }

  const max = maxValue(data, valueKey) || 1;

  return (
    <div className="flex items-end gap-3">
      {data.map((d, i) => {
        const h = Math.max(2, (Number(d[valueKey]) || 0) / max * 100);
        return (
          <div
            key={`${d.label}-${i}`}
            className="flex min-w-0 flex-1 cursor-pointer flex-col items-center gap-2"
            title={onBarClick ? `View quotations for ${d.label}` : `${d.label}: ${formatValue(d[valueKey])}`}
            onClick={() => onBarClick && onBarClick(d, i)}
          >
            {showValues && (
              <span className="font-mono text-[11px] font-semibold text-ink-500">
                {formatValue(d[valueKey])}
              </span>
            )}
            <div className="flex h-44 w-full items-end">
              <div
                className="w-full rounded-t-md transition-all duration-500 hover:opacity-80"
                style={{ height: `${h}%`, backgroundColor: pickColor(i) }}
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

export function StackedBarChart({ data, valueKey = "count", onBarClick, onSegmentClick }) {
  if (!data || data.length === 0) {
    return <ChartEmpty />;
  }

  const formatValue = valueKey === "count" ? formatCount : formatTick;

  return (
    <div>
      <div className="space-y-6">
        {data.map((w) => {
          const divs = w.divisions || [];
          const total = Number(w[valueKey]) || 0;
          return (
            <div key={w.dateKey} className="mx-auto w-full max-w-md">
              {/* Total — one clear line, clickable = whole week */}
              <button
                type="button"
                aria-label={`${w.label} · ${w.week}: ${total} quotation${total === 1 ? "" : "s"}`}
                className="font-mono text-base font-bold text-ink-900 transition-colors hover:text-accent-600 cursor-pointer bg-transparent border-0 p-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-300"
                title={`${w.label} · ${w.week}: ${total} quotation${total === 1 ? "" : "s"}`}
                onClick={() => onBarClick && onBarClick(w)}
              >
                {formatValue(total)}
                <span className="ml-1.5 font-body text-xs font-medium text-ink-500">
                  quotation{total === 1 ? "" : "s"}
                </span>
              </button>
              {/* Week label — its own line, clearly separated from the total */}
              <p className="mt-0.5 text-xs font-medium text-ink-600">
                {w.label} · {w.week}
              </p>
              {/* Horizontal stacked bar — one per week, chronological order */}
              <div className="mt-2 flex h-9 w-full items-stretch gap-px overflow-hidden rounded-lg">
                {divs.map((d, i) => (
                  <button
                    key={`${w.dateKey}-${d.name}`}
                    type="button"
                    aria-label={`${w.label} · ${d.name}: ${d[valueKey]} quotation${Number(d[valueKey]) === 1 ? "" : "s"}`}
                    className="flex min-w-0 cursor-pointer items-center justify-center overflow-hidden text-[10px] font-semibold text-white transition-opacity hover:opacity-80 focus:outline-none focus-visible:opacity-80"
                    style={{
                      width: `${(Number(d[valueKey]) || 0) / Math.max(total, 1) * 100}%`,
                      backgroundColor: pickColor(i),
                      textShadow: "0 1px 2px rgba(0,0,0,0.35)",
                    }}
                    title={`${d.name}: ${d[valueKey]} quotation${Number(d[valueKey]) === 1 ? "" : "s"} · ${total ? Math.round((Number(d[valueKey]) / total) * 100) : 0}% of week`}
                    onClick={() => onSegmentClick && onSegmentClick(w, d)}
                  >
                    <span className="truncate px-1">
                      {d.name} {d[valueKey]}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend — color + division name only; counts live inside the bar,
          never duplicated */}
      {data.some((w) => (w.divisions || []).length > 1) && (
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
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

export function HBarChart({ data, valueKey = "amount", formatValue = formatTick, color = "#3457D5", onRowClick }) {
  if (!data || data.length === 0) {
    return <ChartEmpty />;
  }

  const max = maxValue(data, valueKey) || 1;

  return (
    <div className="space-y-3">
      {data.map((d, i) => (
        <div
          key={`${d.label}-${i}`}
          role="button"
          tabIndex={0}
          aria-label={onRowClick ? `View quotations for ${d.label}` : d.label}
          className="flex items-center gap-3 rounded-md px-1 py-0.5 transition-colors hover:bg-ink-50/60 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-300"
          title={onRowClick ? `View quotations for ${d.label}` : `${d.label}: ${formatValue(d[valueKey])}`}
          onClick={() => onRowClick && onRowClick(d, i)}
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === " ") && onRowClick) {
              e.preventDefault();
              onRowClick(d, i);
            }
          }}
        >
<span className="min-w-0 flex-[1.1] text-xs font-medium text-ink-700" title={d.label}>
                {d.label}
              </span>
          <div className="h-3 min-w-0 flex-1 overflow-hidden rounded-full bg-ink-50">
            <div
              className="h-full rounded-full transition-all duration-500 hover:opacity-80"
              style={{ width: `${Math.max(2, (Number(d[valueKey]) || 0) / max * 100)}%`, backgroundColor: pickColor(i) }}
            />
          </div>
          <span className="w-20 shrink-0 text-right font-mono text-xs font-semibold text-ink-600">
            {formatValue(d[valueKey])}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Donut (order status, source of enquiry) ───────────────────────────────────

export function DonutChart({ data, valueKey = "count", secondaryKey, onSegmentClick, legendLabel = "Status" }) {
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

  // Legend columns: swatch, label (flexible, wraps instead of clipping),
  // count, amount, percentage. Grid (not fixed row widths) so nothing ever
  // overlaps or gets squeezed off, even in a narrow card.
  const gridCols = `0.75rem minmax(0, 1fr) auto${secondaryKey ? " auto" : ""} auto`;

  return (
    <div className="flex flex-col items-center gap-6">
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
              role="button"
              tabIndex={0}
              aria-label={onSegmentClick ? `View quotations with ${s.label}` : s.label}
              className="cursor-pointer transition-opacity hover:opacity-75 focus:outline-none focus-visible:opacity-75"
              onClick={() => onSegmentClick && onSegmentClick(s)}
              onKeyDown={(e) => {
                if ((e.key === "Enter" || e.key === " ") && onSegmentClick) {
                  e.preventDefault();
                  onSegmentClick(s);
                }
              }}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-2xl font-bold text-ink-900">{total}</span>
          <span className="text-[11px] font-medium uppercase tracking-wide text-ink-300">total</span>
        </div>
      </div>

      <div className="w-full min-w-0">
        <div
          className="mb-1 hidden items-center gap-x-3 px-2 text-[10px] font-semibold uppercase tracking-wide text-ink-300 sm:grid"
          style={{ gridTemplateColumns: gridCols }}
        >
          <span aria-hidden="true" />
          <span>{legendLabel}</span>
          <span className="whitespace-nowrap">Count</span>
          {secondaryKey && <span className="whitespace-nowrap text-right">Amount</span>}
          <span className="whitespace-nowrap text-right">%</span>
        </div>
        <div className="space-y-1.5">
          {segments.map((s, i) => (
            <div
              key={`${s.label}-${i}`}
              role="button"
              tabIndex={0}
              aria-label={onSegmentClick ? `View quotations with ${s.label}` : s.label}
              className="grid items-center gap-x-3 rounded-lg px-2 py-1.5 cursor-pointer transition-colors hover:bg-ink-50/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-300"
              style={{ gridTemplateColumns: gridCols }}
              title={onSegmentClick ? `View quotations with ${s.label}` : undefined}
              onClick={() => onSegmentClick && onSegmentClick(s)}
              onKeyDown={(e) => {
                if ((e.key === "Enter" || e.key === " ") && onSegmentClick) {
                  e.preventDefault();
                  onSegmentClick(s);
                }
              }}
            >
              <span
                className="inline-block h-2.5 w-2.5 rounded-sm"
                style={{ backgroundColor: s.color }}
              />
              <span className="min-w-0 text-xs font-medium text-ink-700" title={s.label}>
                {s.label}
              </span>
              <span className="whitespace-nowrap font-mono text-xs font-semibold text-ink-600">
                {s[valueKey]} {s[valueKey] === 1 ? "quotation" : "quotations"}
              </span>
              {secondaryKey && (
                <span className="whitespace-nowrap text-right font-mono text-[11px] text-ink-400">
                  {formatCompactCurrency(s[secondaryKey])}
                </span>
              )}
              <span className="whitespace-nowrap text-right font-mono text-[11px] text-ink-300">
                {total ? Math.round((Number(s[valueKey]) / total) * 100) : 0}%
              </span>
            </div>
          ))}
        </div>
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
