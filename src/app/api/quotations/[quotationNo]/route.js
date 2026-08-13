import { NextResponse } from "next/server";
import { getQuotationByNo, updateQuotationByNo } from "@/lib/services/googleSheetsService";
import { validateQuotation } from "@/lib/validation/quotationSchema";
import { getSessionUser, unauthorizedResponse } from "@/lib/auth/session";
import { getQuotations } from "@/lib/services/googleSheetsService";

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

    // DIAGNOSTIC LOGGING - GET DEBUG
    console.log("[GET DEBUG] quotationNo:", quotationNo);
    console.log("[GET DEBUG] normalized quotationNo:", normalizedQuotationNo);

    const quotation = await getQuotationByNo(normalizedQuotationNo);

    // DIAGNOSTIC LOGGING - GET DEBUG RESULT
    console.log("[GET DEBUG] quotation found:", !!quotation);
    console.log("[GET DEBUG] item count:", quotation?.items?.length);
    console.log("[GET DEBUG] items:", quotation?.items?.map(item => ({
      partNo: item.partNo,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })));

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

  // DIAGNOSTIC LOGGING - PUT DEBUG
  console.log("[PUT DEBUG] raw quotationNo:", quotationNo);
  console.log("[PUT DEBUG] decoded quotationNo:", normalizedQuotationNo);
  console.log("[PUT DEBUG] payload quotationNo:", body.quotation?.quotationNo);
  console.log("[PUT DEBUG] payload items count:", body.items?.length);
  console.log("[PUT DEBUG] payload items:", body.items?.map(item => ({
    partNo: item.partNo,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
  })));

  const { success, errors } = validateQuotation(body);

  if (!success) {
    return NextResponse.json(
      { success: false, message: "Please fix the highlighted fields and try again.", errors },
      { status: 422 }
    );
  }

  try {
    const result = await updateQuotationByNo(normalizedQuotationNo, body);

    // DIAGNOSTIC LOGGING - PUT DEBUG RESULT
    console.log("[PUT DEBUG] update result:", {
      success: result.success,
      reason: result.reason,
      rowsWritten: result.rowsWritten,
      rowsAppended: result.rowsAppended,
      rowsCleared: result.rowsCleared,
    });

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

    // DIAGNOSTIC: Immediate read-back verification
    const readBack = await getQuotationByNo(normalizedQuotationNo);
    console.log("[VERIFY DEBUG] expected item count:", body.items?.length);
    console.log("[VERIFY DEBUG] actual item count:", readBack?.items?.length);
    console.log("[VERIFY DEBUG] expected items:", body.items?.map(item => ({
      partNo: item.partNo,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })));
    console.log("[VERIFY DEBUG] actual items:", readBack?.items?.map(item => ({
      partNo: item.partNo,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })));

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
