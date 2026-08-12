import { NextResponse } from "next/server";
import { loadQuotations } from "@/lib/services/googleSheetsService";

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = { "Cache-Control": "no-store, max-age=0, must-revalidate" };

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const quotationNo = searchParams.get("quotationNo");

  if (!quotationNo) {
    return NextResponse.json(
      { success: false, message: "quotationNo query parameter is required." },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const timestamp = new Date().toISOString();
  const startTime = Date.now();

  // Normalize the quotation number exactly as the detail endpoint does
  let normalizedQuotationNo = quotationNo;
  try {
    normalizedQuotationNo = decodeURIComponent(quotationNo);
  } catch {
    normalizedQuotationNo = quotationNo;
  }
  normalizedQuotationNo = normalizedQuotationNo.trim();

  try {
    // Load quotations fresh from Google Sheets
    const { quotations, detailMap } = await loadQuotations();
    const loadTime = Date.now() - startTime;

    // Check if quotation exists in LIST (quotations array)
    const listContains = quotations.some(q => q.quotationNo === normalizedQuotationNo);
    const listMatch = quotations.find(q => q.quotationNo === normalizedQuotationNo);

    // Check if quotation exists in DETAIL (detailMap)
    const detailContains = detailMap.has(normalizedQuotationNo);
    const detailItems = detailMap.get(normalizedQuotationNo);

    // Count matching rows in the raw data
    let matchingRowCount = 0;
    if (detailItems) {
      matchingRowCount = detailItems.length;
    }

    // Get all quotation numbers for debugging
    const allQuotationNumbers = quotations.map(q => q.quotationNo).slice(0, 20); // First 20 for brevity

    return NextResponse.json(
      {
        success: true,
        timestamp,
        debug: {
          received: quotationNo,
          normalized: normalizedQuotationNo,
          normalizedType: typeof normalizedQuotationNo,
          listContains,
          listMatch: listMatch ? {
            quotationNo: listMatch.quotationNo,
            customerName: listMatch.customerName,
            itemCount: listMatch.itemCount
          } : null,
          detailContains,
          detailMapSize: detailMap.size,
          matchingRowCount,
          detailItemsSample: detailItems ? detailItems.length : 0,
          loadTimeMs: loadTime,
          allQuotationNumbers,
          environment: {
            nodeEnv: process.env.NODE_ENV,
            vercelEnv: process.env.VERCEL_ENV || process.env.NEXT_PUBLIC_VERCEL_ENV || "unknown",
          }
        }
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    const loadTime = Date.now() - startTime;
    console.error("[debug-quotation] Error:", error.message);
    return NextResponse.json(
      {
        success: false,
        message: error.message,
        timestamp,
        debug: {
          received: quotationNo,
          normalized: normalizedQuotationNo,
          error: error.message,
          loadTimeMs: loadTime,
        }
      },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
