import { NextResponse } from "next/server";
import { loadQuotations, getCurrentPendingFollowupRecords } from "@/lib/services/googleSheetsService";
import {
  parseQuotationDate,
  toDateKey,
  startOfWeek,
  isoWeekInfo,
} from "@/lib/utils/dateUtils";

// The dashboard aggregation runs server-side on every request. It reuses the
// exact same Google Sheets read as the quotations list (one full range read via
// loadQuotations) and never performs a per-chart sheet call. Responses are
// explicitly marked no-store so neither the CDN nor serverless instances ever
// serve stale figures.
export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = { "Cache-Control": "no-store, max-age=0, must-revalidate" };

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Pending is the canonical in-funnel status stored in the sheet. New quotations
// are written with "Order Status = Pending", and blank Order Status rows
// (legacy) also represent quotations still in the funnel.
const PENDING_STATUS = "Pending";

function normalizeOrderStatus(raw) {
  const v = String(raw || "").trim();
  return v ? v : PENDING_STATUS;
}

function shortDate(date) {
  return `${DAY_SHORT[date.getDay()]} ${date.getDate()} ${MONTH_SHORT[date.getMonth()]}`;
}

function monthLabel(date) {
  return `${MONTH_SHORT[date.getMonth()]} ${String(date.getFullYear()).slice(-2)}`;
}

function quarterLabel(date) {
  return `Q${Math.floor(date.getMonth() / 3) + 1} ${String(date.getFullYear()).slice(-2)}`;
}

function hourLabel(date) {
  const h = date.getHours();
  if (h === 0) return "12 AM";
  if (h === 12) return "12 PM";
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

function pct(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 1000) / 10;
}

// Choose a sensible time-bucket for the trend chart based on the width of the
// range being plotted, so "Today" never renders 30+ day bars and "All Time"
// never renders hundreds of bars.
function chooseBucket(days) {
  if (days <= 1) return "hour";
  if (days <= 62) return "day";
  if (days <= 550) return "month";
  return "quarter";
}

function bucketLabel(bucket, date) {
  if (bucket === "hour") return hourLabel(date);
  if (bucket === "day") return shortDate(date);
  if (bucket === "month") return monthLabel(date);
  return quarterLabel(date);
}

function bucketKey(bucket, date) {
  if (bucket === "hour") {
    return `${toDateKey(date)}|${date.getHours()}`;
  }
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

    const { quotations, detailMap } = await loadQuotations();

    const quotationMap = new Map();
    for (const q of quotations) quotationMap.set(q.quotationNo, q);

    // Source Of Enquiry lives on the detail map (first row of each quotation).
    const enriched = quotations.map((q) => {
      const items = detailMap.get(q.quotationNo);
      const source = items && items.length > 0 ? (items[0]._quotation || {}).sourceOfEnquiry : "";
      return {
        ...q,
        sourceOfEnquiry: String(source || "").trim(),
        parsedDate: parseQuotationDate(q.quotationDate),
      };
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

    let list = enriched;

    if (divisionFilter) {
      list = list.filter((q) => (q.division || "").trim() === divisionFilter);
    }

    if (orderStatusFilter) {
      list = list.filter((q) => normalizeOrderStatus(q.orderStatus) === orderStatusFilter);
    }

    if (enquiryGeneratedByFilter) {
      list = list.filter((q) => (q.engineer || "").trim() === enquiryGeneratedByFilter);
    }

    // Date range filtering uses inclusive day bounds exactly like the quotations
    // list page, so "This Month" and custom ranges behave identically.
    let dateRange = { from: null, to: null };
    if (fromParam) dateRange.from = parseQuotationDate(fromParam);
    if (toParam) dateRange.to = parseQuotationDate(toParam);

    if (dateRange.from || dateRange.to) {
      list = list.filter((q) => {
        if (!q.parsedDate) return false;
        if (dateRange.from && q.parsedDate < dateRange.from) return false;
        if (dateRange.to && q.parsedDate > dateRange.to) return false;
        return true;
      });
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
    let trendStart = dateRange.from;
    let trendEnd = dateRange.to;
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
        if (!buckets.has(key)) buckets.set(key, { label: bucketLabel(bucket, q.parsedDate), count: 0, amount: 0 });
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

    // ── Source Of Enquiry ─────────────────────────────────────────────────────
    const sourceMap = new Map();
    for (const q of list) {
      const s = q.sourceOfEnquiry || "Unspecified";
      if (!sourceMap.has(s)) sourceMap.set(s, { source: s, count: 0, amount: 0 });
      const entry = sourceMap.get(s);
      entry.count += 1;
      entry.amount += Number(q.totalAmount) || 0;
    }
    const bySourceOfEnquiry = Array.from(sourceMap.values())
      .map((e) => ({ ...e, percentage: pct(e.count, list.length) }))
      .sort((a, b) => b.amount - a.amount);

    // ── Engineer (Top 10 + Others) ────────────────────────────────────────────
    const engineerMap = new Map();
    for (const q of list) {
      const eng = (q.engineer || "").trim() || "Unspecified";
      if (!engineerMap.has(eng)) engineerMap.set(eng, { engineer: eng, count: 0, amount: 0 });
      const entry = engineerMap.get(eng);
      entry.count += 1;
      entry.amount += Number(q.totalAmount) || 0;
    }
    const engineers = Array.from(engineerMap.values()).sort((a, b) => b.amount - a.amount);
    const byEngineer = [];
    let othersCount = 0;
    let othersAmount = 0;
    engineers.forEach((e, i) => {
      if (i < 10) {
        byEngineer.push({ ...e, percentage: pct(e.count, list.length) });
      } else {
        othersCount += e.count;
        othersAmount += e.amount;
      }
    });
    if (othersCount > 0) {
      byEngineer.push({
        engineer: "Others",
        count: othersCount,
        amount: othersAmount,
        percentage: pct(othersCount, list.length),
      });
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

    // ── Top customers ─────────────────────────────────────────────────────────
    const customerMap = new Map();
    for (const q of list) {
      const name = (q.customerName || "").trim();
      if (!name) continue;
      if (!customerMap.has(name)) customerMap.set(name, { customerName: name, count: 0, amount: 0 });
      const entry = customerMap.get(name);
      entry.count += 1;
      entry.amount += Number(q.totalAmount) || 0;
    }
    const topCustomers = Array.from(customerMap.values())
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    // ── Pending Follow-ups KPI ────────────────────────────────────────────────
    // TOTAL current Pending follow-ups across ALL dates (past, today and future)
    // — one per quotation via the shared current-Pending business rule.
    // Deliberately independent of every dashboard filter. The Follow-up Details
    // modal (a separate feature) loads its own detail data via
    // /api/dashboard/followups.
    const pendingFollowups = await getCurrentPendingFollowupRecords();
    const pendingFollowupCount = pendingFollowups.length;

    return NextResponse.json(
      {
        success: true,
        data: {
          summary,
          byDivision,
          byOrderStatus,
          byDate,
          bySourceOfEnquiry,
          byEngineer,
          weeklyTrend,
          recentQuotations,
          topCustomers,
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