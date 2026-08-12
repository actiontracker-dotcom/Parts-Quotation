import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { validateQuotation } from "@/lib/validation/quotationSchema";
import { appendQuotation, getQuotations, generateNextQuotationNumber } from "@/lib/services/googleSheetsService";
import { getSessionUser, unauthorizedResponse } from "@/lib/auth/session";
import { computeQuotationTotals } from "@/lib/utils/formatters";

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
  const user = await getSessionUser();
  if (!user) return unauthorizedResponse();

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
    
    // Return the complete quotation data in the response so the client can
    // immediately display it without needing a second Google Sheets read.
    // This avoids the cross-instance propagation delay issue where a newly
    // created quotation might not be immediately visible to DETAIL requests
    // hitting different Vercel serverless instances.
    const totals = computeQuotationTotals(data.items);
    
    return NextResponse.json(
      {
        success: true,
        message: "Quotation submitted successfully.",
        quotationId,
        rowsWritten,
        quotation: {
          quotationNo: quotationId,
          customer: data.customer,
          quotation: data.quotation,
          items: data.items,
          totals,
        },
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


