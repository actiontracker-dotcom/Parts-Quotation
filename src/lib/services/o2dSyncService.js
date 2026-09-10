/**
 * O2D Sync Service
 *
 * Server-side only. Sends a Won quotation payload to the O2D API
 * so it can create/match Customers, Orders and Order_Items.
 *
 * Environment variables required:
 *   O2D_SYNC_API_URL  — full URL including /api/sync/quotations
 *   O2D_SYNC_SECRET   — Bearer token for server-to-server auth
 *
 * This service is independent of the quotation business logic.
 * It receives quotation data, builds the O2D payload, POSTs it,
 * and returns the result. It never modifies quotation data.
 */

const TIMEOUT_MS = 12000;

/**
 * Builds the O2D payload from a full quotation object (as returned by
 * getQuotationByNo).
 *
 * @param {object} quotation — full quotation from getQuotationByNo
 * @returns {object} O2D-compatible payload
 */
export function buildO2dPayload(quotation) {
  const { quotationNo, customer, quotation: q, followup, items } = quotation;

  return {
    quotationNo,
    customer: {
      customerName: customer.customerName || "",
      gstNo: customer.gstNo || "",
      address: customer.fullAddressGst || customer.fullAddress || "",
      stateName: customer.stateName || "",
      stateCode: customer.stateCode || "",
      contactPerson: customer.contactPerson || "",
      contactNumber: customer.contactNumber || "",
      email: customer.emailTo || "",
      division: q.division || "",
    },
    items: items.map((item, index) => ({
      partNo: item.partNumber || "",
      description: item.description || "",
      hsnCode: item.hsnCode || "",
      uom: item.uom || "Nos",
      qty: item.quantity || 0,
      unitPrice: item.unitPrice || 0,
      discount: item.discount || 0,
      otherRate: item.otherRate || 0,
      gstRate: parseFloat(item.gstRate) || 0,
      itemIndex: index,
    })),
    paymentTerms: q.paymentTerms || "",
    termsOfDelivery: q.termsOfDelivery || "",
    orderDate: q.quotationDate || "",
    orderReceivedDate: followup.orderReceivedDate || "",
  };
}

/**
 * Validates the payload before sending to O2D.
 * Returns { valid, error }.
 */
function validatePayload(payload) {
  if (!payload || typeof payload !== "object") {
    return { valid: false, error: "Payload is not an object" };
  }
  if (!payload.quotationNo || typeof payload.quotationNo !== "string" || !payload.quotationNo.trim()) {
    return { valid: false, error: "quotationNo is required" };
  }
  if (!payload.items || !Array.isArray(payload.items) || payload.items.length === 0) {
    return { valid: false, error: "items must be a non-empty array" };
  }
  for (let i = 0; i < payload.items.length; i++) {
    if (!payload.items[i].partNo || !payload.items[i].partNo.trim()) {
      return { valid: false, error: `items[${i}].partNo is required` };
    }
  }
  return { valid: true, error: null };
}

/**
 * Sends a Won quotation payload to the O2D API.
 *
 * @param {object} quotation — full quotation from getQuotationByNo
 * @returns {object} { success, orderId?, customerId?, itemsCreated?, error? }
 */
export async function syncToO2d(quotation) {
  const quotationNo = quotation.quotationNo;

  try {
    const url = process.env.O2D_SYNC_API_URL;
    const secret = process.env.O2D_SYNC_SECRET;

    if (!url || !secret) {
      console.error("[o2dSync] O2D_SYNC_API_URL or O2D_SYNC_SECRET not configured", { quotationNo });
      return { success: false, error: "O2D sync not configured" };
    }

    const payload = buildO2dPayload(quotation);

    const validation = validatePayload(payload);
    if (!validation.valid) {
      console.error("[o2dSync] Payload validation failed", { quotationNo, error: validation.error });
      return { success: false, error: validation.error };
    }

    console.log("[o2dSync] Sending quotation to O2D", {
      quotationNo,
      itemCount: payload.items.length,
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const body = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMsg = body?.error || body?.message || `HTTP ${response.status}`;
      console.error("[o2dSync] O2D returned error", {
        quotationNo,
        status: response.status,
        error: errorMsg,
      });
      return { success: false, error: errorMsg };
    }

    console.log("[o2dSync] O2D sync succeeded", {
      quotationNo,
      orderId: body.orderId,
      customerId: body.customerId,
      itemsCreated: body.itemsCreated,
    });

    return {
      success: true,
      orderId: body.orderId,
      customerId: body.customerId,
      customerIsNew: body.customerIsNew,
      orderCreated: body.orderCreated,
      itemsCreated: body.itemsCreated,
      itemsUpdated: body.itemsUpdated,
    };
  } catch (error) {
    const category = error.name === "AbortError" ? "timeout" : "network";
    console.error("[o2dSync] O2D sync failed", {
      quotationNo,
      category,
      message: error.message,
    });
    return { success: false, error: `O2D sync ${category}: ${error.message}` };
  }
}
