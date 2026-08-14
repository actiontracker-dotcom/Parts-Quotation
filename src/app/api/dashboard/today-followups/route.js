import { NextResponse } from "next/server";
import { readFollowupFormRecords } from "@/lib/services/googleSheetsService";
import { loadQuotations } from "@/lib/services/googleSheetsService";

export const dynamic = "force-dynamic";

function toDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseFollowupDate(value) {
  if (!value) return null;
  
  // If value is already a Date object, return it directly
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  
  const s = String(value).trim();
  if (!s) return null;

  // Handle ISO date with time component (e.g., 2026-08-13T00:00:00.000Z)
  const isoWithTime = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoWithTime) {
    const [, y, m, d] = isoWithTime.map(Number);
    return new Date(y, m - 1, d);
  }

  // Handle simple ISO date (YYYY-MM-DD)
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const [, y, m, d] = iso.map(Number);
    return new Date(y, m - 1, d);
  }

  // Handle DD/MM/YYYY or DD-MM-YYYY
  const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy.map(Number);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      const parsed = new Date(y, m - 1, d);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
    return null;
  }

  // Fallback to Date constructor
  const parsed = new Date(s);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function GET(request) {
  try {
    const now = new Date();
    const todayKey = toDateKey(now);

    const followupRecords = await readFollowupFormRecords();
    const { quotations } = await loadQuotations();

    const quotationMap = new Map();
    quotations.forEach((q) => {
      quotationMap.set(q.quotationNo, q);
    });

    const todayFollowups = followupRecords.filter((record) => {
      const nextFollowupDate = record["Next Followup Date"];
      if (!nextFollowupDate) return false;

      const parsedDate = parseFollowupDate(nextFollowupDate);
      if (!parsedDate) return false;

      const dateKey = toDateKey(parsedDate);
      return dateKey === todayKey;
    });

    const enrichedFollowups = todayFollowups.map((record) => {
      const quotationNo = record["Quotation No"];
      const quotation = quotationMap.get(quotationNo);

      return {
        quotationNo: quotationNo || "",
        customerName: quotation?.customerName || "",
        nextFollowupDate: record["Next Followup Date"] || "",
        followupStatus: record["Followup Status"] || "",
        followupRemark: record["Followup Remark"] || "",
      };
    });

    return NextResponse.json(
      {
        success: true,
        count: enrichedFollowups.length,
        followups: enrichedFollowups,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[dashboard/today-followups/GET] failed:", error);
    return NextResponse.json(
      { success: false, message: "Unable to load today's follow-ups. Please try again." },
      { status: 500 }
    );
  }
}
