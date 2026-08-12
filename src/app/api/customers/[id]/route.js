import { NextResponse } from "next/server";
import {
  getCustomerByRowIndex,
  updateCustomerByRowIndex,
  deleteCustomerByRowIndex,
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
        { success: false, message: "Invalid customer ID." },
        { status: 400 }
      );
    }

    const customer = await getCustomerByRowIndex(index);

    if (!customer) {
      return NextResponse.json(
        { success: false, message: "Customer not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: customer,
    });
  } catch (error) {
    console.error("[customers/[id]] Error:", error.message);
    return NextResponse.json(
      { success: false, message: "Failed to fetch customer." },
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
        { success: false, message: "Invalid customer ID." },
        { status: 400 }
      );
    }

    const update = {};
    const fields = [
      "customerName", "fullAddressWithGST", "fullAddress", "gstNo",
      "stateName", "stateCode",
    ];
    for (const f of fields) {
      if (body[f] !== undefined) {
        update[f] = String(body[f]).trim();
      }
    }

    if (update.customerName !== undefined && !update.customerName) {
      return NextResponse.json(
        { success: false, message: "Customer name is required." },
        { status: 422 }
      );
    }

    const customer = await updateCustomerByRowIndex(index, update);

    if (!customer) {
      return NextResponse.json(
        { success: false, message: "Customer not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Customer updated successfully.",
      data: customer,
    });
  } catch (error) {
    console.error("[customers/PUT] Error:", error.message);
    return NextResponse.json(
      { success: false, message: "Failed to update customer." },
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
        { success: false, message: "Invalid customer ID." },
        { status: 400 }
      );
    }

    const existing = await getCustomerByRowIndex(index);
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Customer not found." },
        { status: 404 }
      );
    }

    await deleteCustomerByRowIndex(index);

    return NextResponse.json({
      success: true,
      message: "Customer deleted successfully.",
    });
  } catch (error) {
    console.error("[customers/DELETE] Error:", error.message);
    return NextResponse.json(
      { success: false, message: "Failed to delete customer." },
      { status: 500 }
    );
  }
}
