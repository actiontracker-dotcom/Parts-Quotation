import { NextResponse } from "next/server";
import { DIVISIONS } from "@/constants/masterData";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ success: true, data: DIVISIONS });
  } catch (error) {
    console.error("[master/divisions] Error:", error.message);
    return NextResponse.json(
      { success: false, message: "Failed to fetch divisions.", data: [] },
      { status: 500 }
    );
  }
}
