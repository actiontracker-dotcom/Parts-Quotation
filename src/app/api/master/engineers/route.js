import { NextResponse } from "next/server";
import { ENQUIRY_GENERATED_BY } from "@/constants/masterData";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ success: true, data: ENQUIRY_GENERATED_BY });
  } catch (error) {
    console.error("[master/engineers] Error:", error.message);
    return NextResponse.json(
      { success: false, message: "Failed to fetch engineers.", data: [] },
      { status: 500 }
    );
  }
}
