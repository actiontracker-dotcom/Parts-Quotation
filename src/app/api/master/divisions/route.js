import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Division from "@/lib/models/Division";

export async function GET() {
  try {
    await connectDB();
    const divisions = await Division.find().sort({ label: 1 }).lean();
    const result = divisions.map((d) => ({ value: d.value, label: d.label }));
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("[master/divisions] Error:", error.message);
    return NextResponse.json(
      { success: false, message: "Failed to fetch divisions.", data: [] },
      { status: 500 }
    );
  }
}
