// Centralized dropdown/reference data for the quotation module.
// Keeping these in one place means new modules (e.g. Customers, Reports)
// can import the same lists instead of re-declaring them.

export const DIVISION_OPTIONS = [
  { value: "industrial-automation", label: "Industrial Automation" },
  { value: "power-transmission", label: "Power Transmission" },
  { value: "process-instrumentation", label: "Process Instrumentation" },
  { value: "electricals", label: "Electricals" },
  { value: "spares-service", label: "Spares & Service" },
];

export const SOURCE_OF_ENQUIRY_OPTIONS = [
  { value: "website", label: "Website" },
  { value: "referral", label: "Referral" },
  { value: "cold-call", label: "Cold Call" },
  { value: "exhibition", label: "Exhibition" },
  { value: "existing-customer", label: "Existing Customer" },
  { value: "tender", label: "Tender" },
];

export const AVAILABILITY_OPTIONS = [
  { value: "in-stock", label: "In Stock" },
  { value: "made-to-order", label: "Made to Order" },
  { value: "on-backorder", label: "On Backorder" },
  { value: "discontinued", label: "Discontinued" },
];

export const PAYMENT_TERMS_OPTIONS = [
  { value: "100-advance", label: "100% Advance" },
  { value: "50-50", label: "50% Advance / 50% Before Dispatch" },
  { value: "net-15", label: "Net 15 Days" },
  { value: "net-30", label: "Net 30 Days" },
  { value: "against-delivery", label: "Against Delivery" },
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
  };
}
