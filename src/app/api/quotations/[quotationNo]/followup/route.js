import { NextResponse } from "next/server";
import {
  getQuotationFollowupHistory,
  updateQuotationNextFollowup,
  updateQuotationOrderStatus,
} from "@/lib/services/googleSheetsService";
import { getSessionUser, unauthorizedResponse } from "@/lib/auth/session";

// POST /api/quotations/[quotationNo]/followup
//
// Records a follow-up action for a single quotation. `submissionType` decides
// the branch:
//   - "Next Follow-up" -> updates the Data-sheet follow-up fields and appends a
//     "Next Follow-up" history row to "Followup Form for Quotation".
//   - "Order Status"   -> updates the Data-sheet order fields and appends an
//     "Order Status" history row.
//
// Success is returned only when BOTH the Data update and the history row have
// been written. Neither the PDF, email, quotation create/edit flow, nor any
// unrelated column is touched.
export const dynamic = "force-dynamic";

function normalizeQuotationNo(quotationNo) {
  try {
    return decodeURIComponent(quotationNo);
  } catch {
    return quotationNo;
  }
}

export async function GET(request, { params }) {
  const { quotationNo } = params;
  const normalizedQuotationNo = normalizeQuotationNo(quotationNo);

  if (!normalizedQuotationNo) {
    return NextResponse.json(
      { success: false, message: "Quotation number is required." },
      { status: 400 }
    );
  }

  try {
    // READ-ONLY: returns the full history for this quotation, newest first.
    const records = await getQuotationFollowupHistory(normalizedQuotationNo);
    return NextResponse.json(
      {
        success: true,
        quotationNo: normalizedQuotationNo,
        total: records.length,
        records,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[quotations/[quotationNo]/followup/GET] failed:", error);
    return NextResponse.json(
      { success: false, message: "Unable to load follow-up history. Please try again." },
      { status: 500 }
    );
  }
}

function stringValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

function validateNextFollowup(body) {
  const errors = {};
  if (!stringValue(body.nextFollowupDate)) {
    errors.nextFollowupDate = "Next follow-up date is required.";
  }
  if (!stringValue(body.followupRemark)) {
    errors.followupRemark = "Remark is required.";
  }
  return errors;
}

function validateOrderStatus(body) {
  const errors = {};
  if (!stringValue(body.orderStatus)) {
    errors.orderStatus = "Order status is required.";
  }
  return errors;
}

export async function POST(request, { params }) {
  const user = await getSessionUser();
  if (!user) return unauthorizedResponse();

  const { quotationNo } = params;
  const normalizedQuotationNo = normalizeQuotationNo(quotationNo);

  if (!normalizedQuotationNo) {
    return NextResponse.json(
      { success: false, message: "Quotation number is required.", errors: {} },
      { status: 400 }
    );
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

  const submissionType = stringValue(body.submissionType);

  if (submissionType === "Next Follow-up") {
    const errors = validateNextFollowup(body);
    if (Object.keys(errors).length > 0) {
      return NextResponse.json(
        { success: false, message: "Please fix the highlighted fields and try again.", errors },
        { status: 422 }
      );
    }

    try {
      const result = await updateQuotationNextFollowup(normalizedQuotationNo, {
        nextFollowupDate: stringValue(body.nextFollowupDate),
        followupRemark: stringValue(body.followupRemark),
      });

      if (!result.success) {
        if (result.reason === "closed") {
          return NextResponse.json(
            {
              success: false,
              message: `Follow-up is closed for this quotation because the order status is ${result.orderStatus}.`,
              errors: { lifecycle: "closed" },
            },
            { status: 409 }
          );
        }

        const status = result.reason === "not-found" ? 404 : result.reason === "history-failed" ? 502 : 400;
        return NextResponse.json(
          {
            success: false,
            message:
              result.reason === "not-found"
                ? "Quotation not found."
                : "We couldn't save this follow-up right now. Please try again in a moment.",
            errors: {},
          },
          { status }
        );
      }

      return NextResponse.json(
        {
          success: true,
          message: "Next follow-up saved successfully",
        },
        { status: 200 }
      );
    } catch (error) {
      console.error("[quotations/[quotationNo]/followup/POST] Next Follow-up failed:", error);
      return NextResponse.json(
        {
          success: false,
          message: "We couldn't save this follow-up right now. Please try again in a moment.",
          errors: {},
        },
        { status: 502 }
      );
    }
  }

  if (submissionType === "Order Status") {
    const errors = validateOrderStatus(body);
    if (Object.keys(errors).length > 0) {
      return NextResponse.json(
        { success: false, message: "Please fix the highlighted fields and try again.", errors },
        { status: 422 }
      );
    }

    try {
      const result = await updateQuotationOrderStatus(normalizedQuotationNo, {
        orderStatus: stringValue(body.orderStatus),
        orderNumber: stringValue(body.orderNumber),
        orderReceivedDate: stringValue(body.orderReceivedDate),
        remarkForOrder: stringValue(body.remarkForOrder),
      });

      if (!result.success) {
        const status = result.reason === "not-found" ? 404 : result.reason === "history-failed" ? 502 : 400;
        return NextResponse.json(
          {
            success: false,
            message:
              result.reason === "not-found"
                ? "Quotation not found."
                : "We couldn't save the order status right now. Please try again in a moment.",
            errors: {},
          },
          { status }
        );
      }

      return NextResponse.json(
        {
          success: true,
          message: "Order status submitted successfully.",
          quotationNo: normalizedQuotationNo,
          rowsUpdated: result.data.rowsUpdated,
        },
        { status: 200 }
      );
    } catch (error) {
      console.error("[quotations/[quotationNo]/followup/POST] Order Status failed:", error);
      return NextResponse.json(
        {
          success: false,
          message: "We couldn't save the order status right now. Please try again in a moment.",
          errors: {},
        },
        { status: 502 }
      );
    }
  }

  return NextResponse.json(
    {
      success: false,
      message: "Submission type must be either 'Next Follow-up' or 'Order Status'.",
      errors: { submissionType: "Invalid submission type." },
    },
    { status: 422 }
  );
}