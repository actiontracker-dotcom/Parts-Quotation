import { NextResponse } from "next/server";
import { TERMS_OF_DELIVERY_OPTIONS } from "@/lib/constants/quotationOptions";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ success: true, data: TERMS_OF_DELIVERY_OPTIONS });
  } catch (error) {
    console.error("[master/delivery-terms] Error:", error.message);
    return NextResponse.json(
      { success: false, message: "Failed to fetch delivery terms.", data: [] },
      { status: 500 }
    );
  }
}
