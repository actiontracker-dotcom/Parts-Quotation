import { NextResponse } from "next/server";
import {
  getPartByRowIndex,
  updatePartByRowIndex,
  deletePartByRowIndex,
  searchParts,
} from "@/lib/services/googleSheetsService";
import { getSessionUser, unauthorizedResponse } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

function parseRowId(id) {
  if (!id || typeof id !== "string") return null;
  const match = id.match(/^row-(\d+)$/);
  return match ? parseInt(match[1], 10) : null;
}

export async function GET(request, { params }) {
  try {
    const index = parseRowId(params.id);
    if (index === null || index < 0) {
      return NextResponse.json(
        { success: false, message: "Invalid part ID." },
        { status: 400 }
      );
    }

    const part = await getPartByRowIndex(index);

    if (!part) {
      return NextResponse.json(
        { success: false, message: "Part not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: part,
    });
  } catch (error) {
    console.error("[parts/[id]] Error:", error.message);
    return NextResponse.json(
      { success: false, message: "Failed to fetch part." },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
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

  try {
    const index = parseRowId(params.id);
    if (index === null || index < 0) {
      return NextResponse.json(
        { success: false, message: "Invalid part ID." },
        { status: 400 }
      );
    }

    if (body.partNo !== undefined) {
      const existing = await searchParts(body.partNo.trim());
      const duplicate = existing.find(
        (p) => p.partNo.toLowerCase() === body.partNo.trim().toLowerCase() && p._id !== params.id
      );
      if (duplicate) {
        return NextResponse.json(
          { success: false, message: "Part number already exists." },
          { status: 409 }
        );
      }
    }

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

    const update = {};
    for (const f of fields) {
      if (body[f] !== undefined && body[f] !== null && body[f] !== "") {
        if (typeof body[f] === "string") {
          update[f] = body[f].trim();
        } else {
          update[f] = body[f];
        }
      } else if (body[f] !== undefined) {
        update[f] = typeof body[f] === "string" ? "" : 0;
      }
    }

    if (update.partNo !== undefined && !update.partNo) {
      return NextResponse.json(
        { success: false, message: "Part number is required." },
        { status: 422 }
      );
    }

    const part = await updatePartByRowIndex(index, update);

    if (!part) {
      return NextResponse.json(
        { success: false, message: "Part not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Part updated successfully.",
      data: part,
    });
  } catch (error) {
    console.error("[parts/PUT] Error:", error.message);
    return NextResponse.json(
      { success: false, message: "Failed to update part." },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  const user = await getSessionUser();
  if (!user) return unauthorizedResponse();

  try {
    const index = parseRowId(params.id);
    if (index === null || index < 0) {
      return NextResponse.json(
        { success: false, message: "Invalid part ID." },
        { status: 400 }
      );
    }

    const existing = await getPartByRowIndex(index);
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Part not found." },
        { status: 404 }
      );
    }

    await deletePartByRowIndex(index);

    return NextResponse.json({
      success: true,
      message: "Part deleted successfully.",
    });
  } catch (error) {
    console.error("[parts/DELETE] Error:", error.message);
    return NextResponse.json(
      { success: false, message: "Failed to delete part." },
      { status: 500 }
    );
  }
}
