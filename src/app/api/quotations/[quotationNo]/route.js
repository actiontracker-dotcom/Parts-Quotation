import { NextResponse } from "next/server";
import { getQuotationByNo, updateQuotationByNo } from "@/lib/services/googleSheetsService";
import { validateQuotation } from "@/lib/validation/quotationSchema";
import { getSessionUser, unauthorizedResponse } from "@/lib/auth/session";
import { getQuotations } from "@/lib/services/googleSheetsService";
import { computeLineTotal, computeQuotationTotals, toNumber } from "@/lib/utils/formatters";
import { normalizeToCanonicalDate } from "@/lib/utils/dateUtils";

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

  // Normalize date fields to DD/MM/YYYY canonical format
  if (body.quotation) {
    if (body.quotation.quotationDate) {
      body.quotation.quotationDate = normalizeToCanonicalDate(body.quotation.quotationDate);
    }
    if (body.quotation.partyReferenceDate) {
      body.quotation.partyReferenceDate = normalizeToCanonicalDate(body.quotation.partyReferenceDate);
    }
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

    // Perform read-after-write verification to ensure the update was persisted correctly
    // With cache: "no-store" in googleSheetsClient, this should read fresh data immediately
    const readBack = await getQuotationByNo(normalizedQuotationNo);
    
    if (!readBack) {
      return NextResponse.json(
        {
          success: false,
          message: "Quotation was updated but could not be read back for verification.",
        },
        { status: 502 }
      );
    }

    // Verify customer fields
    const customerFieldsMatch = 
      readBack.customer.customerName === (body.customer.customerName || "") &&
      readBack.customer.contactPerson === (body.customer.contactPerson || "") &&
      readBack.customer.contactNumber === (body.customer.contactNumber || "") &&
      readBack.customer.emailTo === (body.customer.emailTo || "") &&
      readBack.customer.emailCc === (body.customer.emailCc || "") &&
      readBack.customer.designation === (body.customer.designation || "") &&
      readBack.customer.fullAddressGst === (body.customer.fullAddressGst || "") &&
      readBack.customer.location === (body.customer.location || "") &&
      readBack.customer.userId === (body.customer.userId || "") &&
      readBack.customer.engineerRemark === (body.customer.engineerRemark || "");

    // Verify quotation fields with detailed diagnostics
    console.log("[quotations/[quotationNo]/PUT] DIAGNOSTIC - quotation field comparison:");
    
    const fieldChecks = [
      {
        field: "quotationNo",
        submittedRaw: body.quotation.quotationNo,
        readBackRaw: readBack.quotationNo,
        submittedType: typeof body.quotation.quotationNo,
        readBackType: typeof readBack.quotationNo,
        normalizedSubmitted: normalizedQuotationNo,
        normalizedReadBack: readBack.quotationNo,
        match: readBack.quotationNo === normalizedQuotationNo
      },
      {
        field: "division",
        submittedRaw: body.quotation.division,
        readBackRaw: readBack.quotation.division,
        submittedType: typeof body.quotation.division,
        readBackType: typeof readBack.quotation.division,
        normalizedSubmitted: body.quotation.division || "",
        normalizedReadBack: readBack.quotation.division,
        match: readBack.quotation.division === (body.quotation.division || "")
      },
      {
        field: "sourceOfEnquiry",
        submittedRaw: body.quotation.sourceOfEnquiry,
        readBackRaw: readBack.quotation.sourceOfEnquiry,
        submittedType: typeof body.quotation.sourceOfEnquiry,
        readBackType: typeof readBack.quotation.sourceOfEnquiry,
        normalizedSubmitted: body.quotation.sourceOfEnquiry || "",
        normalizedReadBack: readBack.quotation.sourceOfEnquiry,
        match: readBack.quotation.sourceOfEnquiry === (body.quotation.sourceOfEnquiry || "")
      },
      {
        field: "enquiryGeneratedBy",
        submittedRaw: body.quotation.enquiryGeneratedBy,
        readBackRaw: readBack.quotation.enquiryGeneratedBy,
        submittedType: typeof body.quotation.enquiryGeneratedBy,
        readBackType: typeof readBack.quotation.enquiryGeneratedBy,
        normalizedSubmitted: body.quotation.enquiryGeneratedBy || "",
        normalizedReadBack: readBack.quotation.enquiryGeneratedBy,
        match: readBack.quotation.enquiryGeneratedBy === (body.quotation.enquiryGeneratedBy || "")
      },
      {
        field: "quotationDate",
        submittedRaw: body.quotation.quotationDate,
        readBackRaw: readBack.quotation.quotationDate,
        submittedType: typeof body.quotation.quotationDate,
        readBackType: typeof readBack.quotation.quotationDate,
        normalizedSubmitted: normalizeToCanonicalDate(body.quotation.quotationDate || ""),
        normalizedReadBack: normalizeToCanonicalDate(readBack.quotation.quotationDate || ""),
        match: normalizeToCanonicalDate(readBack.quotation.quotationDate || "") === normalizeToCanonicalDate(body.quotation.quotationDate || "")
      },
      {
        field: "partyReferenceNumber",
        submittedRaw: body.quotation.partyReferenceNumber,
        readBackRaw: readBack.quotation.partyReferenceNumber,
        submittedType: typeof body.quotation.partyReferenceNumber,
        readBackType: typeof readBack.quotation.partyReferenceNumber,
        normalizedSubmitted: body.quotation.partyReferenceNumber || "",
        normalizedReadBack: readBack.quotation.partyReferenceNumber,
        match: readBack.quotation.partyReferenceNumber === (body.quotation.partyReferenceNumber || "")
      },
      {
        field: "partyReferenceDate",
        submittedRaw: body.quotation.partyReferenceDate,
        readBackRaw: readBack.quotation.partyReferenceDate,
        submittedType: typeof body.quotation.partyReferenceDate,
        readBackType: typeof readBack.quotation.partyReferenceDate,
        normalizedSubmitted: normalizeToCanonicalDate(body.quotation.partyReferenceDate || ""),
        normalizedReadBack: normalizeToCanonicalDate(readBack.quotation.partyReferenceDate || ""),
        match: normalizeToCanonicalDate(readBack.quotation.partyReferenceDate || "") === normalizeToCanonicalDate(body.quotation.partyReferenceDate || "")
      },
      {
        field: "paymentTerms",
        submittedRaw: body.quotation.paymentTerms,
        readBackRaw: readBack.quotation.paymentTerms,
        submittedType: typeof body.quotation.paymentTerms,
        readBackType: typeof readBack.quotation.paymentTerms,
        normalizedSubmitted: body.quotation.paymentTerms || "",
        normalizedReadBack: readBack.quotation.paymentTerms,
        match: readBack.quotation.paymentTerms === (body.quotation.paymentTerms || "")
      },
      {
        field: "quotationValidity",
        submittedRaw: body.quotation.quotationValidity,
        readBackRaw: readBack.quotation.quotationValidity,
        submittedType: typeof body.quotation.quotationValidity,
        readBackType: typeof readBack.quotation.quotationValidity,
        normalizedSubmitted: body.quotation.quotationValidity || "",
        normalizedReadBack: readBack.quotation.quotationValidity,
        match: readBack.quotation.quotationValidity === (body.quotation.quotationValidity || "")
      },
      {
        field: "termsOfDelivery",
        submittedRaw: body.quotation.termsOfDelivery,
        readBackRaw: readBack.quotation.termsOfDelivery,
        submittedType: typeof body.quotation.termsOfDelivery,
        readBackType: typeof readBack.quotation.termsOfDelivery,
        normalizedSubmitted: body.quotation.termsOfDelivery || "",
        normalizedReadBack: readBack.quotation.termsOfDelivery,
        match: readBack.quotation.termsOfDelivery === (body.quotation.termsOfDelivery || "")
      },
      {
        field: "quotationFollowUpBy",
        submittedRaw: body.quotation.quotationFollowUpBy,
        readBackRaw: readBack.quotation.quotationFollowUpBy,
        submittedType: typeof body.quotation.quotationFollowUpBy,
        readBackType: typeof readBack.quotation.quotationFollowUpBy,
        normalizedSubmitted: body.quotation.quotationFollowUpBy || "",
        normalizedReadBack: readBack.quotation.quotationFollowUpBy,
        match: readBack.quotation.quotationFollowUpBy === (body.quotation.quotationFollowUpBy || "")
      }
    ];

    fieldChecks.forEach(check => {
      console.log(`FIELD: ${check.field}`);
      console.log(`  SUBMITTED RAW: ${JSON.stringify(check.submittedRaw)}`);
      console.log(`  READBACK RAW: ${JSON.stringify(check.readBackRaw)}`);
      console.log(`  SUBMITTED TYPE: ${check.submittedType}`);
      console.log(`  READBACK TYPE: ${check.readBackType}`);
      console.log(`  NORMALIZED SUBMITTED: ${JSON.stringify(check.normalizedSubmitted)}`);
      console.log(`  NORMALIZED READBACK: ${JSON.stringify(check.normalizedReadBack)}`);
      console.log(`  MATCH: ${check.match}`);
    });

    const failingFields = fieldChecks.filter(check => !check.match);
    if (failingFields.length > 0) {
      console.log("[quotations/[quotationNo]/PUT] FAILING FIELDS:");
      failingFields.forEach(check => {
        console.log(`  - ${check.field}`);
      });
    }

    const quotationFieldsMatch = fieldChecks.every(check => check.match);

    // Verify item count
    const itemCountMatch = readBack.items.length === body.items.length;

    // Verify items
    let itemsMatch = true;
    const itemMismatches = [];
    
    if (itemCountMatch) {
      for (let i = 0; i < body.items.length; i++) {
        const submittedItem = body.items[i];
        const readBackItem = readBack.items[i];
        
        const itemFieldsMatch =
          readBackItem.partNumber === (submittedItem.partNumber || "") &&
          readBackItem.description === (submittedItem.partDescription || "") &&
          readBackItem.availability === (submittedItem.availability || "") &&
          toNumber(readBackItem.quantity) === toNumber(submittedItem.quantity) &&
          toNumber(readBackItem.unitPrice) === toNumber(submittedItem.unitPrice) &&
          toNumber(readBackItem.otherRate) === toNumber(submittedItem.otherRate) &&
          toNumber(readBackItem.discount) === toNumber(submittedItem.discount) &&
          readBackItem.uom === (submittedItem.uom || "") &&
          toNumber(readBackItem.gstRate) === toNumber(submittedItem.gstRate) &&
          readBackItem.hsnCode === (submittedItem.hsnCode || "");
        
        if (!itemFieldsMatch) {
          itemsMatch = false;
          itemMismatches.push({ index: i, submitted: submittedItem, readBack: readBackItem });
        }
      }
    }

    // Verify totals using canonical calculation
    const expectedTotals = computeQuotationTotals(body.items);
    const totalsMatch =
      Math.abs(readBack.totals.subtotal - expectedTotals.subtotal) < 0.01 &&
      Math.abs(readBack.totals.grandTotal - expectedTotals.grandTotal) < 0.01;

    // If verification fails, return error with diagnostic information
    if (!customerFieldsMatch || !quotationFieldsMatch || !itemCountMatch || !itemsMatch || !totalsMatch) {
      console.error("[quotations/[quotationNo]/PUT] Verification failed:", {
        customerFieldsMatch,
        quotationFieldsMatch,
        itemCountMatch,
        itemsMatch,
        totalsMatch,
        itemMismatches,
        submitted: body,
        readBack
      });
      
      return NextResponse.json(
        {
          success: false,
          message: "Quotation was written but verification failed. The read-back data does not match the submitted data.",
          verificationDetails: {
            customerFieldsMatch,
            quotationFieldsMatch,
            itemCountMatch,
            itemsMatch,
            totalsMatch,
            submittedItemCount: body.items.length,
            readBackItemCount: readBack.items.length,
            submittedGrandTotal: expectedTotals.grandTotal,
            readBackGrandTotal: readBack.totals.grandTotal,
          },
        },
        { status: 502 }
      );
    }

    // Verification successful - return success response
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
