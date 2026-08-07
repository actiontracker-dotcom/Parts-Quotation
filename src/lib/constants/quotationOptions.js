// Centralized dropdown/reference data for the quotation module.
// Keeping these in one place means new modules (e.g. Customers, Reports)
// can import the same lists instead of re-declaring them.

// Business rules: UOM is always "Nos" and GST Rate is always 18% for every
// quotation item. These constants are the single source of truth used by the
// form, the API, the Google Sheets writer/reader and the PDF, so the value can
// never drift from user input or the parts master.
export const DEFAULT_UOM = "Nos";
export const DEFAULT_GST_RATE = 18;


export const AVAILABILITY_OPTIONS = [
  { value: "in-stock", label: "In Stock" },
  { value: "made-to-order", label: "Made to Order" },
  { value: "on-backorder", label: "On Backorder" },
  { value: "discontinued", label: "Discontinued" },
];

export const QUOTATION_VALIDITY_OPTIONS = [
  { value: "7-days", label: "7 Days" },
  { value: "15-days", label: "15 Days" },
  { value: "30-days", label: "30 Days" },
  { value: "60-days", label: "60 Days" },
];

export const TERMS_OF_DELIVERY_OPTIONS = [
  { value: "ex-works", label: "Ex-Works" },
  { value: "fob", label: "FOB" },
  { value: "door-delivery", label: "Door Delivery" },
  { value: "cif", label: "CIF" },
];

export function createEmptyItemRow() {
  return {
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `row-${Date.now()}-${Math.random()}`,
    partNumber: "",
    partDescription: "",
    quantity: "",
    unitPrice: "",
    otherRate: "",
    discount: "",
    availability: "",
    priceWef: "",
    liveStock: "",
    hsnCode: "",
    uom: DEFAULT_UOM,
    gstRate: String(DEFAULT_GST_RATE),
    group: "",
    subGroup: "",
    lastPurchaseDate: "",
    totalQty: "",
    totalPrice: "",
  };
}
