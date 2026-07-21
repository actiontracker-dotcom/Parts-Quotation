import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import EnquirySource from "@/lib/models/EnquirySource";

export async function GET() {
  try {
    await connectDB();
    const sources = await EnquirySource.find().sort({ label: 1 }).lean();
    const result = sources.map((s) => ({ value: s.value, label: s.label }));
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("[master/enquiry-sources] Error:", error.message);
    return NextResponse.json(
      { success: false, message: "Failed to fetch enquiry sources.", data: [] },
      { status: 500 }
    );
  }
}
