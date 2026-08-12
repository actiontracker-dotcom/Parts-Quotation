import { NextResponse } from "next/server";
import {
  getAllCustomers,
  searchCustomers,
  createCustomer,
} from "@/lib/services/googleSheetsService";
import { getSessionUser, unauthorizedResponse } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "25", 10)));
    const search = (searchParams.get("search") || "").trim();
    const sortBy = searchParams.get("sortBy") || "customerName";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? 1 : -1;
    const stateName = (searchParams.get("stateName") || "").trim();

    let customers = search
      ? await searchCustomers(search)
      : await getAllCustomers();

    if (stateName) {
      const lower = stateName.toLowerCase();
      customers = customers.filter((c) => c.stateName.toLowerCase().includes(lower));
    }

    const sortableFields = ["customerName", "stateName"];
    const sortField = sortableFields.includes(sortBy) ? sortBy : "customerName";

    customers.sort((a, b) => {
      const aVal = (a[sortField] || "").toLowerCase();
      const bVal = (b[sortField] || "").toLowerCase();
      if (aVal < bVal) return -1 * sortOrder;
      if (aVal > bVal) return 1 * sortOrder;
      return 0;
    });

    const total = customers.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const paginated = customers.slice((page - 1) * limit, page * limit);

    return NextResponse.json({
      success: true,
      data: paginated,
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    });
  } catch (error) {
    console.error("[customers/GET] Error:", error.message);
    return NextResponse.json(
      { success: false, message: "Failed to fetch customers.", data: [], total: 0, page: 1, limit: 25, totalPages: 0, hasNext: false, hasPrevious: false },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  const user = await getSessionUser();
  if (!user) return unauthorizedResponse();

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid JSON body." },
      { status: 400 }
    );
  }

  if (!body.customerName || !body.customerName.trim()) {
    return NextResponse.json(
      { success: false, message: "Customer name is required." },
      { status: 422 }
    );
  }

  try {
    const doc = {
      customerName: body.customerName.trim(),
      fullAddressWithGST: (body.fullAddressWithGST || "").trim(),
      fullAddress: (body.fullAddress || "").trim(),
      gstNo: (body.gstNo || "").trim(),
      stateName: (body.stateName || "").trim(),
      stateCode: (body.stateCode || "").trim(),
    };

    const customer = await createCustomer(doc);

    return NextResponse.json(
      {
        success: true,
        message: "Customer created successfully.",
        data: customer,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[customers/POST] Error:", error.message);
    return NextResponse.json(
      { success: false, message: "Failed to create customer." },
      { status: 500 }
    );
  }
}
