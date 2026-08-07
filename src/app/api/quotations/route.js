import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { validateQuotation } from "@/lib/validation/quotationSchema";
import { appendQuotation, getQuotations, generateNextQuotationNumber } from "@/lib/services/googleSheetsService";

// This route handles both listing and creating quotations.
// The frontend always calls this endpoint; it never touches the sheet directly.

// Never statically optimize or cache this route. Every GET reads the Google
// Sheet live (see loadQuotations in googleSheetsService), and every response
// is explicitly marked no-store so no serverless instance, CDN, or browser
// ever serves a stale quotation list.
export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = { "Cache-Control": "no-store, max-age=0, must-revalidate" };

export async function GET() {
  try {
    const quotations = await getQuotations();
    return NextResponse.json({ success: true, data: quotations }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error("[quotations/GET] Error:", error.message);
    return NextResponse.json(
      { success: false, message: "Failed to load quotations.", data: [] },
      { status: 500, headers: NO_STORE_HEADERS }
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

  const { success, data, errors } = validateQuotation(body);

  if (!success) {
    return NextResponse.json(
      { success: false, message: "Please fix the highlighted fields and try again.", errors },
      { status: 422 }
    );
  }

  const quotationId = await generateNextQuotationNumber();
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


