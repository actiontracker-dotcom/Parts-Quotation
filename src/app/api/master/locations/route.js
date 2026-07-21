import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Location from "@/lib/models/Location";

export async function GET() {
  try {
    await connectDB();
    const locations = await Location.find().sort({ label: 1 }).lean();
    const result = locations.map((l) => ({ value: l.value, label: l.label }));
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("[master/locations] Error:", error.message);
    return NextResponse.json(
      { success: false, message: "Failed to fetch locations.", data: [] },
      { status: 500 }
    );
  }
}
