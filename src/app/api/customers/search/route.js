import { NextResponse } from "next/server";
import { searchCustomers } from "@/lib/services/googleSheetsService";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q");

    if (!q || !q.trim()) {
      return NextResponse.json({ success: true, data: [] });
    }

    const result = await searchCustomers(q.trim());
    const sliced = result.slice(0, 10);

    return NextResponse.json({ success: true, data: sliced });
  } catch (error) {
    console.error("[customers/search] Error:", error.message);
    return NextResponse.json(
      { success: false, message: "Search failed.", data: [] },
      { status: 500 }
    );
  }
}
