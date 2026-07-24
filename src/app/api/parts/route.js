import { NextResponse } from "next/server";
import { getAllParts, searchParts, createPart } from "@/lib/services/googleSheetsService";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "25", 10)));
    const search = (searchParams.get("search") || "").trim();
    const sortBy = searchParams.get("sortBy") || "partNo";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? 1 : -1;

    let parts = search ? await searchParts(search) : await getAllParts();

    const sortableFields = ["partNo", "description", "group", "subGroup", "stockStatus", "hsnCode", "standardRate", "totalQty", "status"];
    const sortField = sortableFields.includes(sortBy) ? sortBy : "partNo";

    parts.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      if (typeof aVal === "string") {
        aVal = aVal.toLowerCase();
        bVal = (bVal || "").toLowerCase();
        if (aVal < bVal) return -1 * sortOrder;
        if (aVal > bVal) return 1 * sortOrder;
        return 0;
      }
      aVal = Number(aVal) || 0;
      bVal = Number(bVal) || 0;
      return (aVal - bVal) * sortOrder;
    });

    const total = parts.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const paginated = parts.slice((page - 1) * limit, page * limit);

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
    console.error("[parts/GET] Error:", error.message);
    return NextResponse.json(
      { success: false, message: "Failed to fetch parts.", data: [], total: 0, page: 1, limit: 25, totalPages: 0, hasNext: false, hasPrevious: false },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid JSON body." },
      { status: 400 }
    );
  }

  if (!body.partNo || !body.partNo.trim()) {
    return NextResponse.json(
      { success: false, message: "Part number is required." },
      { status: 422 }
    );
  }

  try {
    const existing = await searchParts(body.partNo.trim());
    if (existing.some((p) => p.partNo.toLowerCase() === body.partNo.trim().toLowerCase())) {
      return NextResponse.json(
        { success: false, message: "Part number already exists." },
        { status: 409 }
      );
    }

    const doc = {};
    const fields = [
      "partNo", "description", "group", "subGroup",
      "aRaipur", "bRaigarh", "cAmbikapur", "dSatna",
      "lastPurchaseDate", "applicableDate", "standardRate",
      "locationRaipur", "locationRaigarh", "locationAmbikapur", "locationSatna",
      "raipurStockValue", "raigarhStockValue", "ambikapurStockValue", "satnaStockValue",
      "stockStatus", "lowStock", "outOfStock", "inStock",
      "minimumQty", "pendingOrderInHO", "needToOrder",
      "status", "hsnCode", "totalQty", "totalPrice",
    ];
    for (const f of fields) {
      if (body[f] !== undefined && body[f] !== null && body[f] !== "") {
        if (typeof body[f] === "string") {
          doc[f] = body[f].trim();
        } else {
          doc[f] = body[f];
        }
      }
    }

    const part = await createPart(doc);

    return NextResponse.json(
      {
        success: true,
        message: "Part created successfully.",
        data: part,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[parts/POST] Error:", error.message);
    return NextResponse.json(
      { success: false, message: "Failed to create part." },
      { status: 500 }
    );
  }
}
