import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Contact from "@/lib/models/Contact";

export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId");

    if (!companyId) {
      return NextResponse.json(
        { success: false, message: "companyId query parameter is required.", data: [] },
        { status: 400 }
      );
    }

    const contacts = await Contact.find({ companyId })
      .sort({ name: 1 })
      .lean();

    const result = contacts.map((c) => ({
      _id: c._id,
      name: c.name,
      email: c.email || "",
      mobile: c.mobile || "",
      designation: c.designation || "",
      companyId: c.companyId,
    }));

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("[master/contacts] Error:", error.message);
    return NextResponse.json(
      { success: false, message: "Failed to fetch contacts.", data: [] },
      { status: 500 }
    );
  }
}
