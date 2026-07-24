import { NextResponse } from "next/server";
import { ENQUIRY_SOURCES } from "@/constants/masterData";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ success: true, data: ENQUIRY_SOURCES });
  } catch (error) {
    console.error("[master/enquiry-sources] Error:", error.message);
    return NextResponse.json(
      { success: false, message: "Failed to fetch enquiry sources.", data: [] },
      { status: 500 }
    );
  }
}
