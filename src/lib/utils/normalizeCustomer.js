/**
 * Normalizes a customer object into the standard shape
 * used throughout the application.
 */
export function normalizeCustomer(c) {
  if (!c) return null;
  return {
    _id: c._id,
    customerName: c.customerName || c.name || "",
    fullAddressWithGST:
      c.fullAddressWithGST ||
      (c.fullAddress || c.address
        ? [c.fullAddress || c.address || "", c.gstNo || c.gst ? `GSTIN: ${c.gstNo || c.gst}` : ""]
            .filter(Boolean)
            .join("\n")
        : ""),
    fullAddress: c.fullAddress || c.address || "",
    gstNo: c.gstNo || c.gst || "",
    stateName: c.stateName || "",
    stateCode: c.stateCode || "",
    contactPerson: c.contactPerson || "",
    contactNumber: c.contactNumber || "",
    designation: c.designation || "",
    email: c.email || "",
  };
}
