import { NextResponse } from "next/server";
import {
  appendQuotationFollowupRecord,
  getAllFollowupRecords,
} from "@/lib/services/googleSheetsService";

// POST /api/quotations/followup
//
// Appends ONE history/log row to the "Followup Form for Quotation" sheet.
// The sheet is append-only: every submission creates a new row below the
// previous ones. Old history rows are never rewritten, cleared or deleted,
// and none of the shared working sheets (Data / Mastersheet / Products)
// are touched by this endpoint.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // READ-ONLY: returns ALL follow-up history (newest first) straight from
    // "Followup Form for Quotation". Only the history sheet is read — the
    // large Data sheet is never loaded here.
    const records = await getAllFollowupRecords();
    return NextResponse.json(
      { success: true, total: records.length, records },
      { status: 200 }
    );
  } catch (error) {
    console.error("[quotations/followup/GET] Failed to read follow-up history:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Unable to load follow-up history. Please try again.",
        records: [],
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Request body must be valid JSON.", errors: {} },
      { status: 400 }
    );
  }

  const quotationNo = (body?.quotationNo || "").trim();
  const submissionType = (body?.submissionType || "").trim();

  if (!quotationNo) {
    return NextResponse.json(
      { success: false, message: "Quotation number is required.", errors: { quotationNo: "Quotation number is required." } },
      { status: 422 }
    );
  }

  if (!submissionType) {
    return NextResponse.json(
      { success: false, message: "Submission type is required.", errors: { submissionType: "Submission type is required." } },
      { status: 422 }
    );
  }

  try {
    const result = await appendQuotationFollowupRecord({ ...body, quotationNo, submissionType });
    return NextResponse.json(
      {
        success: true,
        message: "Follow-up record submitted successfully.",
        quotationNo,
        submissionType,
        rowsWritten: result.rowsWritten,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[quotations/followup/POST] Failed to write to Google Sheets:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          "We couldn't save this follow-up record right now. Please try again in a moment.",
        errors: {},
      },
      { status: 502 }
    );
  }
}