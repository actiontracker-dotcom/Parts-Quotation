import { NextResponse } from "next/server";
import { PAYMENT_TERMS } from "@/constants/masterData";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ success: true, data: PAYMENT_TERMS });
  } catch (error) {
    console.error("[master/payment-terms] Error:", error.message);
    return NextResponse.json(
      { success: false, message: "Failed to fetch payment terms.", data: [] },
      { status: 500 }
    );
  }
}
