import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import DeliveryTerm from "@/lib/models/DeliveryTerm";

export async function GET() {
  try {
    await connectDB();
    const terms = await DeliveryTerm.find().sort({ label: 1 }).lean();
    const result = terms.map((t) => ({ value: t.value, label: t.label }));
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("[master/delivery-terms] Error:", error.message);
    return NextResponse.json(
      { success: false, message: "Failed to fetch delivery terms.", data: [] },
      { status: 500 }
    );
  }
}
