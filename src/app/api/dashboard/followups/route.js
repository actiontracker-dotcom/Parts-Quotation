import { NextResponse } from "next/server";
import {
  loadQuotations,
  getCurrentPendingFollowupRecords,
  readFollowupFormRecords,
} from "@/lib/services/googleSheetsService";
import { parseQuotationDate, toDateKey } from "@/lib/utils/dateUtils";

// Detail endpoint for the "Pending Follow-ups" dashboard card.
//
// Query params:
//   status - "Pending" (default) or "Completed"
//   dates  - comma-separated YYYY-MM-DD list of individual dates. When empty the
//            filter is "All Dates" (no date restriction). Multiple dates are
//            OR-ed together on the "Next Followup Date" field.
//   page   - 1-based page number (default 1)
//   limit  - records per page (default 20, capped at 100)
//
// Data model:
//   - Pending    -> the CURRENT Pending follow-up per quotation
//                   (getCurrentPendingFollowupRecords: newest "Next Follow-up"
//                   history row per quotation whose Followup Status is
//                   "Pending"), so a quotation can never appear more than once.
//   - Completed  -> ALL historical "Next Follow-up" rows in "Followup Form for
//                   Quotation" whose Followup Status is "Completed". This comes
//                   from the full history, never from the current-only Pending
//                   dataset, so a quotation with multiple historical follow-ups
//                   shows each one.
//
// Both datasets are strictly limited to Submission Type = "Next Follow-up" —
// Order Status rows never appear as follow-up records.
//
// Quotation header info (customer name) is joined from the aggregated DATA-sheet
// quotations by "Quotation No" — never from raw line-item rows.
//
// Filtering (status + dates) always runs BEFORE pagination, and only the current
// page of records is returned to the client.
export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = { "Cache-Control": "no-store, max-age=0, must-revalidate" };

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const DEFAULT_PAGE = 1;

function toDateKeyFromValue(value) {
  const parsed = parseQuotationDate(value);
  return parsed ? toDateKey(parsed) : "";
}

function recordDateKey(record) {
  return toDateKeyFromValue(record["Next Followup Date"]);
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const rawStatus = (searchParams.get("status") || "").trim();
    const status = rawStatus === "Completed" ? "Completed" : "Pending";

    const rawDates = searchParams.get("dates") || "";
    const selectedDates = new Set();
    for (const part of rawDates.split(",")) {
      const key = toDateKeyFromValue(part);
      if (key) selectedDates.add(key);
    }

    const rawPage = Number.parseInt(searchParams.get("page") || String(DEFAULT_PAGE), 10);
    const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : DEFAULT_PAGE;

    const rawLimit = Number.parseInt(searchParams.get("limit") || String(DEFAULT_LIMIT), 10);
    const limit =
      Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, MAX_LIMIT) : DEFAULT_LIMIT;

    // Load the aggregated quotations once and join follow-up rows by Quotation No.
    const { quotations } = await loadQuotations();
    const quotationMap = new Map();
    for (const q of quotations) quotationMap.set(q.quotationNo, q);

    // Current Pending (one per quotation) + full history. Both come from the
    // same "Followup Form for Quotation" sheet via the existing service helpers.
    const [pendingRecords, allHistory] = await Promise.all([
      getCurrentPendingFollowupRecords(),
      readFollowupFormRecords(),
    ]);

    // Available date checkboxes: the distinct "Next Followup Date" values across
    // every history row (all statuses) so the checkbox list stays stable when the
    // user switches Pending <-> Completed and their selections are preserved
    // (requirement: a status change must keep the selected dates).
    const availableDateSet = new Set();
    for (const record of allHistory) {
      const key = recordDateKey(record);
      if (key) availableDateSet.add(key);
    }
    for (const record of pendingRecords) {
      const key = recordDateKey(record);
      if (key) availableDateSet.add(key);
    }
    const availableDates = Array.from(availableDateSet).sort();

    // Build the status-filtered dataset BEFORE date filtering and pagination.
    let records;
    if (status === "Completed") {
      records = allHistory.filter(
        (record) =>
          String(record["Submission Type"] || "").trim() === "Next Follow-up" &&
          String(record["Followup Status"] || "").trim() === "Completed"
      );
    } else {
      records = pendingRecords;
    }

    // Date filter: the record's "Next Followup Date" must be one of the selected
    // dates. An empty selection means All Dates.
    if (selectedDates.size > 0) {
      records = records.filter((record) => selectedDates.has(recordDateKey(record)));
    }

    const enriched = records.map((record) => {
      const quotationNo = (record["Quotation No"] || "").trim();
      const quotation = quotationMap.get(quotationNo);
      return {
        quotationNo,
        customerName: quotation?.customerName || "",
        nextFollowupDate: record["Next Followup Date"] || "",
        followupStatus: record["Followup Status"] || "",
        followupRemark: record["Followup Remark"] || "",
      };
    });

    const total = enriched.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);
    const offset = (safePage - 1) * limit;
    const pageRecords = enriched.slice(offset, offset + limit);

    return NextResponse.json(
      {
        success: true,
        status,
        records: pageRecords,
        availableDates,
        pagination: {
          page: safePage,
          limit,
          total,
          totalPages,
          offset,
          hasNext: safePage < totalPages,
          hasPrev: safePage > 1,
        },
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    console.error("[dashboard/followups/GET] Error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to load follow-ups. Please try again." },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}