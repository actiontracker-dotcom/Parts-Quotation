// Shared server-side dashboard data loader. Both the dashboard aggregation
// route and the drill-down route consume the SAME filtered dataset, so a
// drill-down opened from a filtered dashboard always pages over exactly the
// records the visible KPIs/charts were computed from. Never mix the two
// sources.
//
// LIMITATION (documented honestly): Google Sheets has no server-side query or
// pagination — loadQuotations reads the full DATA range and every filter/slice
// happens in memory. Pagination here prevents sending unnecessary records to
// the browser, but it does NOT reduce the Google Sheets read volume.

import { loadQuotations } from "@/lib/services/googleSheetsService";
import { parseQuotationDate, toDateKey, startOfWeek } from "@/lib/utils/dateUtils";

export const PENDING_STATUS = "Pending";

export function normalizeOrderStatus(raw) {
  const v = String(raw || "").trim();
  return v ? v : PENDING_STATUS;
}

// Enrich + filter exactly like /api/dashboard so drill-downs always operate on
// the same records as the visible dashboard figures.
export async function loadDashboardQuotations(filters = {}) {
  const { quotations, detailMap } = await loadQuotations();

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

  let list = enriched;

  if (filters.division) {
    list = list.filter((q) => (q.division || "").trim() === filters.division);
  }

  if (filters.orderStatus) {
    list = list.filter((q) => normalizeOrderStatus(q.orderStatus) === filters.orderStatus);
  }

  if (filters.enquiryGeneratedBy) {
    list = list.filter((q) => (q.engineer || "").trim() === filters.enquiryGeneratedBy);
  }

  // Date range filtering uses inclusive day bounds, matching /api/dashboard and
  // the quotations list page.
  let dateRange = { from: null, to: null };
  if (filters.from) dateRange.from = parseQuotationDate(filters.from);
  if (filters.to) dateRange.to = parseQuotationDate(filters.to);

  if (dateRange.from || dateRange.to) {
    list = list.filter((q) => {
      if (!q.parsedDate) return false;
      if (dateRange.from && q.parsedDate < dateRange.from) return false;
      if (dateRange.to && q.parsedDate > dateRange.to) return false;
      return true;
    });
  }

  return { list, enriched, detailMap };
}

// Lightweight record shape shared by every drill-down page response.
export function toDrilldownRecord(q) {
  const parsed = q.parsedDate;
  return {
    quotationNo: q.quotationNo,
    customerName: q.customerName,
    contactNumber: q.contactNumber,
    quotationDate: q.quotationDate,
    dateKey: parsed ? toDateKey(parsed) : "",
    weekKey: parsed ? toDateKey(startOfWeek(parsed)) : "",
    monthKey: parsed ? `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}` : "",
    quarterKey: parsed ? `${parsed.getFullYear()}-Q${Math.floor(parsed.getMonth() / 3) + 1}` : "",
    division: (q.division || "").trim() || "Unspecified",
    engineer: (q.engineer || "").trim() || "Unspecified",
    sourceOfEnquiry: q.sourceOfEnquiry || "Unspecified",
    orderStatus: normalizeOrderStatus(q.orderStatus),
    itemCount: Number(q.itemCount) || 0,
    totalAmount: Number(q.totalAmount) || 0,
  };
}
