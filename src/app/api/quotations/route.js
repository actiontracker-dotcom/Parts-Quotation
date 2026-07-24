import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { validateQuotation } from "@/lib/validation/quotationSchema";
import { appendQuotation } from "@/lib/services/googleSheetsService";

// This route is the ONLY thing allowed to talk to Google Sheets.
// The frontend always calls this endpoint; it never touches the sheet directly.

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

  const { success, data, errors } = validateQuotation(body);

  if (!success) {
    return NextResponse.json(
      { success: false, message: "Please fix the highlighted fields and try again.", errors },
      { status: 422 }
    );
  }

  const quotationId = `QTN-${Date.now().toString(36).toUpperCase()}`;
  const createdAt = new Date().toISOString();

  try {
    const { rowsWritten } = await appendQuotation(data, { quotationId, createdAt });
    return NextResponse.json(
      {
        success: true,
        message: "Quotation submitted successfully.",
        quotationId,
        rowsWritten,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[quotations/POST] Failed to write to Google Sheets:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          "We couldn't save this quotation right now. Please try again in a moment.",
        errors: {},
      },
      { status: 502 }
    );
  }
}


