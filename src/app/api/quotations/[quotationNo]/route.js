import { NextResponse } from "next/server";
import { getQuotationByNo, updateQuotationByNo } from "@/lib/services/googleSheetsService";
import { validateQuotation } from "@/lib/validation/quotationSchema";
import { getSessionUser, unauthorizedResponse } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = { "Cache-Control": "no-store, max-age=0, must-revalidate" };

export async function GET(request, { params }) {
  try {
    const { quotationNo } = params;

    if (!quotationNo) {
      return NextResponse.json(
        { success: false, message: "Quotation number is required." },
        { status: 400 }
      );
    }

    // The dynamic route may deliver the quotation number percent-encoded (e.g.
    // "DEEP%2FM-SPR%2F26-27%2FQ000001" on Vercel). Decode defensively so the
    // lookup matches the sheet value; fall back to the original value on error.
    let normalizedQuotationNo = quotationNo;
    try {
      normalizedQuotationNo = decodeURIComponent(quotationNo);
    } catch {
      normalizedQuotationNo = quotationNo;
    }

    const quotation = await getQuotationByNo(normalizedQuotationNo);

    if (!quotation) {
      return NextResponse.json(
        { success: false, message: "Quotation not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: quotation }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error("[quotations/[quotationNo]] Error:", error.message);
    return NextResponse.json(
      { success: false, message: "Failed to fetch quotation details." },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}

// Update an existing quotation. The quotation number from the URL is the unique
// identifier — it is never changed and no new quotation number is generated.
export async function PUT(request, { params }) {
  const user = await getSessionUser();
  if (!user) return unauthorizedResponse();

  const { quotationNo } = params;

  if (!quotationNo) {
    return NextResponse.json(
      { success: false, message: "Quotation number is required." },
      { status: 400 }
    );
  }

  // The dynamic route may deliver the quotation number percent-encoded (e.g.
  // "DEEP%2FM-SPR%2F26-27%2FQ000001"). Decode defensively so the
  // lookup matches the sheet value; fall back to the original value on error.
  let normalizedQuotationNo = quotationNo;
  try {
    normalizedQuotationNo = decodeURIComponent(quotationNo);
  } catch {
    normalizedQuotationNo = quotationNo;
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Request body must be valid JSON.", errors: {} },
      { status: 400 }
    );
  }

  const { success, errors } = validateQuotation(body);

  if (!success) {
    return NextResponse.json(
      { success: false, message: "Please fix the highlighted fields and try again.", errors },
      { status: 422 }
    );
  }

  try {
    const result = await updateQuotationByNo(normalizedQuotationNo, body);

    if (!result.success) {
      const status = result.reason === "not-found" ? 404 : 400;
      return NextResponse.json(
        {
          success: false,
          message:
            result.reason === "not-found"
              ? "Quotation not found."
              : "Quotation has no rows to update.",
        },
        { status }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Quotation updated successfully.",
        quotationId: normalizedQuotationNo,
        rowsWritten: result.rowsWritten,
        rowsAppended: result.rowsAppended,
        rowsCleared: result.rowsCleared,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[quotations/[quotationNo]/PUT] Failed to update Google Sheets:", error);
    return NextResponse.json(
      {
        success: false,
        message: "We couldn't update this quotation right now. Please try again in a moment.",
        errors: {},
      },
      { status: 502 }
    );
  }
}
