import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Company from "@/lib/models/Company";

export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);
    let query = {};

    if (search && search.trim()) {
      query.name = { $regex: search.trim(), $options: "i" };
    }

    const companies = await Company.find(query)
      .sort({ name: 1 })
      .limit(limit)
      .lean();

    const result = companies.map((c) => ({
      _id: c._id,
      name: c.name,
      address: c.address || "",
      gst: c.gst || "",
      location: c.location || "",
    }));

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("[master/companies] Error:", error.message);
    return NextResponse.json(
      { success: false, message: "Failed to fetch companies.", data: [] },
      { status: 500 }
    );
  }
}
