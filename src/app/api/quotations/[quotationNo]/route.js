import { NextResponse } from "next/server";
import { getQuotationByNo } from "@/lib/services/googleSheetsService";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  try {
    const { quotationNo } = params;

    if (!quotationNo) {
      return NextResponse.json(
        { success: false, message: "Quotation number is required." },
        { status: 400 }
      );
    }

    const quotation = await getQuotationByNo(quotationNo);

    if (!quotation) {
      return NextResponse.json(
        { success: false, message: "Quotation not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: quotation });
  } catch (error) {
    console.error("[quotations/[quotationNo]] Error:", error.message);
    return NextResponse.json(
      { success: false, message: "Failed to fetch quotation details." },
      { status: 500 }
    );
  }
}
