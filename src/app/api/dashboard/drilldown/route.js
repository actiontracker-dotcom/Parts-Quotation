import { NextResponse } from "next/server";
import { toDateKey, startOfWeek } from "@/lib/utils/dateUtils";
import {
  loadDashboardQuotations,
  normalizeOrderStatus,
  toDrilldownRecord,
} from "@/lib/server/dashboard";

// Paginated drill-down for every dashboard analytics element. It reuses the
// SAME filtered dataset as /api/dashboard (shared loader) and only ever sends
// one page (max PAGE_SIZE records) to the browser — never the full match set.
//
// Query contract:
//   - Dashboard filters (same names as /api/dashboard):
//       from, to, division, orderStatus, enquiryGeneratedBy
//   - Selection (which chart element was clicked):
//       type = all | trend | status | division | weekly
//       trend:   bucket (day|month|quarter) + bucketKey
//       status:  selStatus (e.g. Pending)
//       division: selDivision
//       weekly:  week (YYYY-MM-DD, Monday start-of-week) + optional segment
//       all:     no extra params
//   - Pagination: page (1-based). Page size is fixed at 20.
export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = { "Cache-Control": "no-store, max-age=0, must-revalidate" };
const PAGE_SIZE = 20;

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "all";
    const requestedPage = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);

    const filters = {
      from: searchParams.get("from") || "",
      to: searchParams.get("to") || "",
      division: searchParams.get("division") || "",
      orderStatus: searchParams.get("orderStatus") || "",
      enquiryGeneratedBy: searchParams.get("enquiryGeneratedBy") || "",
    };

    const { list } = await loadDashboardQuotations(filters);

    // ── Apply the clicked selection on top of the filtered dataset ────────────
    let matched = list;
    if (type === "trend") {
      const bucket = searchParams.get("bucket") || "day";
      const bucketKey = searchParams.get("bucketKey") || "";
      const field = bucket === "month" ? "monthKey" : bucket === "quarter" ? "quarterKey" : "dateKey";
      matched = matched.filter((q) => toDrilldownRecord(q)[field] === bucketKey);
    } else if (type === "status") {
      const status = searchParams.get("selStatus") || "";
      matched = matched.filter((q) => normalizeOrderStatus(q.orderStatus) === status);
    } else if (type === "division") {
      const division = searchParams.get("selDivision") || "";
      matched = matched.filter((q) => (q.division || "").trim() === division);
    } else if (type === "weekly") {
      const week = searchParams.get("week") || "";
      const segment = searchParams.get("segment") || "";
      matched = matched.filter((q) => {
        if (!q.parsedDate) return false;
        if (toDateKey(startOfWeek(q.parsedDate)) !== week) return false;
        if (segment) return (q.division || "").trim() === segment;
        return true;
      });
    }

    // Stable ordering (quotationNo desc) so page boundaries never shift.
    const records = matched.map(toDrilldownRecord);
    records.sort((a, b) => b.quotationNo.localeCompare(a.quotationNo));

    const total = records.length;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const page = Math.min(requestedPage, totalPages);
    const start = (page - 1) * PAGE_SIZE;
    const items = records.slice(start, start + PAGE_SIZE);
    const totalAmount = records.reduce((s, r) => s + (Number(r.totalAmount) || 0), 0);

    return NextResponse.json(
      {
        success: true,
        data: {
          items,
          totalAmount,
          pagination: {
            page,
            limit: PAGE_SIZE,
            total,
            totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
          },
        },
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    console.error("[dashboard/drilldown/GET] Error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to load drill-down quotations.", data: null },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
