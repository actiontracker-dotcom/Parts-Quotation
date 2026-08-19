import { NextResponse } from "next/server";
import { parseQuotationDate, toDateKey, startOfWeek, isoWeekInfo } from "@/lib/utils/dateUtils";
import { loadDashboardQuotations, PENDING_STATUS, normalizeOrderStatus } from "@/lib/server/dashboard";

// The dashboard aggregation runs server-side on every request. It reuses the
// exact same Google Sheets read as the quotations list (one full range read via
// loadQuotations) and never performs a per-chart sheet call. Responses are
// explicitly marked no-store so neither the CDN nor serverless instances ever
// serve stale figures.
export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = { "Cache-Control": "no-store, max-age=0, must-revalidate" };

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function shortDate(date) {
  return `${DAY_SHORT[date.getDay()]} ${date.getDate()} ${MONTH_SHORT[date.getMonth()]}`;
}

function monthLabel(date) {
  return `${MONTH_SHORT[date.getMonth()]} ${String(date.getFullYear()).slice(-2)}`;
}

function quarterLabel(date) {
  return `Q${Math.floor(date.getMonth() / 3) + 1} ${String(date.getFullYear()).slice(-2)}`;
}

function pct(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 1000) / 10;
}

// Choose a sensible time-bucket for the trend chart based on the width of the
// range being plotted. The smallest bucket is a DAY: the sheet stores
// date-only values, so an hourly bucket would collapse every quotation of a
// day onto a single "12 AM" point. This keeps "All Time" to a few dozen bars
// while "This Month" stays day-granular.
function chooseBucket(days) {
  if (days <= 62) return "day";
  if (days <= 550) return "month";
  return "quarter";
}

function bucketLabel(bucket, date) {
  if (bucket === "day") return shortDate(date);
  if (bucket === "month") return monthLabel(date);
  return quarterLabel(date);
}

function bucketKey(bucket, date) {
  if (bucket === "day") return toDateKey(date);
  if (bucket === "month") {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }
  return `${date.getFullYear()}-Q${Math.floor(date.getMonth() / 3) + 1}`;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const fromParam = searchParams.get("from") || "";
    const toParam = searchParams.get("to") || "";
    const divisionFilter = searchParams.get("division") || "";
    const orderStatusFilter = searchParams.get("orderStatus") || "";
    const enquiryGeneratedByFilter = searchParams.get("enquiryGeneratedBy") || "";

    // Same filtered dataset that every drill-down page uses (shared loader in
    // src/lib/server/dashboard.js) — dashboard figures and click details can
    // never diverge.
    const { list, enriched } = await loadDashboardQuotations({
      division: divisionFilter,
      orderStatus: orderStatusFilter,
      enquiryGeneratedBy: enquiryGeneratedByFilter,
      from: fromParam,
      to: toParam,
    });

    // Filter metadata (dropdowns) comes from the full dataset so options never
    // disappear while a filter is active.
    const allDivisions = [];
    const allSources = [];
    const allEngineers = [];
    {
      const divSet = new Set();
      const srcSet = new Set();
      const engSet = new Set();
      for (const q of enriched) {
        if (q.division) divSet.add(q.division);
        if (q.sourceOfEnquiry) srcSet.add(q.sourceOfEnquiry);
        if (q.engineer) engSet.add(q.engineer);
      }
      allDivisions.push(...divSet);
      allSources.push(...srcSet);
      allEngineers.push(...engSet);
    }

    // ── Summary ───────────────────────────────────────────────────────────────
    const totals = list.reduce(
      (acc, q) => {
        acc.totalAmount += Number(q.totalAmount) || 0;
        acc.totalItems += Number(q.itemCount) || 0;
        return acc;
      },
      { totalAmount: 0, totalItems: 0 }
    );

    const byStatus = { Won: 0, Loss: 0, Dead: 0, Partial: 0, [PENDING_STATUS]: 0 };
    const byStatusAmount = { Won: 0, Loss: 0, Dead: 0, Partial: 0, [PENDING_STATUS]: 0 };
    for (const q of list) {
      const s = normalizeOrderStatus(q.orderStatus);
      byStatus[s] = (byStatus[s] || 0) + 1;
      byStatusAmount[s] = (byStatusAmount[s] || 0) + (Number(q.totalAmount) || 0);
    }

    const wonCount = byStatus.Won;
    const wonAmount = byStatusAmount.Won;
    const openCount = byStatus[PENDING_STATUS];
    const openAmount = byStatusAmount[PENDING_STATUS];
    const closedCount = byStatus.Loss + byStatus.Dead;
    const closedAmount = byStatusAmount.Loss + byStatusAmount.Dead;

    const summary = {
      totalQuotations: list.length,
      totalAmount: totals.totalAmount,
      totalItems: totals.totalItems,
      wonCount,
      wonAmount,
      openCount,
      openAmount,
      closedCount,
      closedAmount,
      conversionRate: pct(wonCount, list.length),
      averageQuotationValue: list.length ? totals.totalAmount / list.length : 0,
    };

    // ── Division ──────────────────────────────────────────────────────────────
    const divisionMap = new Map();
    for (const q of list) {
      const d = (q.division || "").trim() || "Unspecified";
      if (!divisionMap.has(d)) divisionMap.set(d, { division: d, count: 0, amount: 0 });
      const entry = divisionMap.get(d);
      entry.count += 1;
      entry.amount += Number(q.totalAmount) || 0;
    }
    const byDivision = Array.from(divisionMap.values()).sort((a, b) => b.amount - a.amount);

    // ── Order Status ──────────────────────────────────────────────────────────
    const byOrderStatus = ["Won", "Loss", "Dead", "Partial", PENDING_STATUS]
      .filter((s) => byStatus[s] > 0)
      .map((s) => ({ status: s, count: byStatus[s], amount: byStatusAmount[s] }));

    // ── Date / trend (adaptive buckets) ───────────────────────────────────────
    const fromDate = fromParam ? parseQuotationDate(fromParam) : null;
    const toDate = toParam ? parseQuotationDate(toParam) : null;
    let trendStart = fromDate;
    let trendEnd = toDate;
    if (!trendStart || !trendEnd) {
      for (const q of list) {
        if (!q.parsedDate) continue;
        if (!trendStart || q.parsedDate < trendStart) trendStart = q.parsedDate;
        if (!trendEnd || q.parsedDate > trendEnd) trendEnd = q.parsedDate;
      }
    }

    const byDate = [];
    if (list.length > 0 && trendStart && trendEnd) {
      const bucket = chooseBucket(Math.max(1, Math.round((trendEnd - trendStart) / 86400000) + 1));
      const buckets = new Map();
      for (const q of list) {
        if (!q.parsedDate) continue;
        const key = bucketKey(bucket, q.parsedDate);
        if (!buckets.has(key))
          buckets.set(key, {
            label: bucketLabel(bucket, q.parsedDate),
            bucket,
            key,
            count: 0,
            amount: 0,
          });
        const entry = buckets.get(key);
        entry.count += 1;
        entry.amount += Number(q.totalAmount) || 0;
      }
      // Stable chronological order for the chart x-axis.
      const orderedKeys = Array.from(buckets.keys()).sort();
      for (const key of orderedKeys) {
        byDate.push(buckets.get(key));
      }
    }

    // ── Weekly performance (Monday-start weeks, aligned with the app) ─────────
    const weekMap = new Map();
    for (const q of list) {
      if (!q.parsedDate) continue;
      const weekStart = startOfWeek(q.parsedDate);
      const key = toDateKey(weekStart);
      if (!weekMap.has(key)) {
        const iso = isoWeekInfo(q.parsedDate);
        weekMap.set(key, {
          label: shortDate(weekStart),
          week: `W${iso.week}`,
          dateKey: key,
          count: 0,
          amount: 0,
          divisions: new Map(),
        });
      }
      const entry = weekMap.get(key);
      entry.count += 1;
      entry.amount += Number(q.totalAmount) || 0;
      const div = (q.division || "").trim() || "Unspecified";
      if (!entry.divisions.has(div)) entry.divisions.set(div, { name: div, count: 0, amount: 0 });
      const divEntry = entry.divisions.get(div);
      divEntry.count += 1;
      divEntry.amount += Number(q.totalAmount) || 0;
    }
    const weeklyTrend = Array.from(weekMap.keys())
      .sort()
      .slice(-12)
      .map((key) => {
        const entry = weekMap.get(key);
        return {
          label: entry.label,
          week: entry.week,
          // Canonical Monday start-of-week key. The drill-down filter matches
          // `weekKey === dateKey`, so this field MUST be present on the payload.
          dateKey: key,
          count: entry.count,
          amount: entry.amount,
          divisions: Array.from(entry.divisions.values()).sort((a, b) => b.count - a.count),
        };
      });

    // ── Recent quotations (most recent sheet rows first) ──────────────────────
    const recentQuotations = list
      .slice()
      .sort((a, b) => b.quotationNo.localeCompare(a.quotationNo))
      .slice(0, 8)
      .map((q) => ({
        quotationNo: q.quotationNo,
        customerName: q.customerName,
        contactNumber: q.contactNumber,
        quotationDate: q.quotationDate,
        division: q.division,
        orderStatus: normalizeOrderStatus(q.orderStatus),
        totalAmount: Number(q.totalAmount) || 0,
      }));

    // ── Pending Follow-ups KPI ────────────────────────────────────────────────
    // TOTAL distinct quotations whose CURRENT Order Status is "Pending" across
    // ALL dates (past, today and future) — with or without a Follow-up Form
    // record, so a quotation enters the set the moment it is created as
    // Pending. Deliberately independent of every dashboard filter. The
    // Follow-up Details modal (a separate feature) loads its own detail data
    // via /api/dashboard/followups.
    const pendingFollowupCount = enriched.filter(
      (q) => normalizeOrderStatus(q.orderStatus) === PENDING_STATUS
    ).length;

    return NextResponse.json(
      {
        success: true,
        data: {
          summary,
          byDivision,
          byOrderStatus,
          byDate,
          weeklyTrend,
          recentQuotations,
          pendingFollowupCount,
          filters: {
            divisions: allDivisions.sort(),
            sources: allSources.sort(),
            engineers: allEngineers.sort(),
          },
        },
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    console.error("[dashboard/GET] Error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to load dashboard data.", data: null },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}