import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Engineer from "@/lib/models/Engineer";

export async function GET() {
  try {
    await connectDB();
    const engineers = await Engineer.find().sort({ name: 1 }).lean();
    const result = engineers.map((e) => ({
      _id: e._id,
      name: e.name,
      email: e.email || "",
      employeeId: e.employeeId || "",
    }));
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("[master/engineers] Error:", error.message);
    return NextResponse.json(
      { success: false, message: "Failed to fetch engineers.", data: [] },
      { status: 500 }
    );
  }
}
