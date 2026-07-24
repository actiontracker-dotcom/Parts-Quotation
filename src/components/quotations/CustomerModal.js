"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";
import { normalizeCustomer } from "@/lib/utils/normalizeCustomer";

const INITIAL_FORM = {
  customerName: "",
  fullAddress: "",
  gstNo: "",
  contactPerson: "",
  contactNumber: "",
  designation: "",
  email: "",
  stateName: "",
  stateCode: "",
};

export default function CustomerModal({ open, onClose, onSave, prefillName }) {
  const [form, setForm] = useState({
    ...INITIAL_FORM,
    customerName: prefillName || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      setForm({
        ...INITIAL_FORM,
        customerName: prefillName || "",
      });
      setSaving(false);
      setError(null);
    }
  }, [open]);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function buildPayload() {
    const addrParts = [form.fullAddress].filter(Boolean);
    if (form.gstNo) addrParts.push(`GSTIN: ${form.gstNo}`);
    return {
      customerName: form.customerName.trim(),
      fullAddressWithGST: addrParts.join("\n"),
      fullAddress: form.fullAddress.trim(),
      gstNo: form.gstNo.trim(),
      contactPerson: form.contactPerson.trim(),
      contactNumber: form.contactNumber.trim(),
      designation: form.designation.trim(),
      email: form.email.trim(),
      stateName: form.stateName.trim(),
      stateCode: form.stateCode.trim(),
    };
  }

  async function handleSave() {
    if (!form.customerName.trim()) return;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.message || "Failed to save customer.");
        return;
      }

      onSave(normalizeCustomer(json.data));
      handleClose();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    setForm({ ...INITIAL_FORM });
    setError(null);
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/40 p-4">
      <div className="w-full max-w-lg rounded-xl2 border border-ink-100 bg-white shadow-card-hover">
        <div className="flex items-center justify-between border-b border-ink-50 px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-accent-500">
              New Customer
            </p>
            <h2 className="mt-0.5 text-lg font-semibold text-ink-900">
              Add Customer
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-md p-1.5 text-ink-300 hover:bg-ink-50 hover:text-ink-600 cursor-pointer"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <Input
            label="Customer Name"
            required
            placeholder="Acme Engineering Pvt. Ltd."
            value={form.customerName}
            onChange={(e) => update("customerName", e.target.value)}
          />
          <Textarea
            label="Full Address"
            rows={2}
            placeholder="Plot 14, Industrial Estate, Pune, Maharashtra"
            value={form.fullAddress}
            onChange={(e) => update("fullAddress", e.target.value)}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="GST No"
              placeholder="27AAAAA0000A1Z5"
              value={form.gstNo}
              onChange={(e) => update("gstNo", e.target.value)}
            />
            <Input
              label="Contact Person"
              placeholder="Rohit Sharma"
              value={form.contactPerson}
              onChange={(e) => update("contactPerson", e.target.value)}
            />
            <Input
              label="Contact Number"
              placeholder="+91 98765 43210"
              value={form.contactNumber}
              onChange={(e) => update("contactNumber", e.target.value)}
            />
            <Input
              label="Designation"
              placeholder="Procurement Manager"
              value={form.designation}
              onChange={(e) => update("designation", e.target.value)}
            />
            <Input
              label="Email"
              type="email"
              placeholder="buyer@company.com"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
            />
            <Input
              label="State Name"
              placeholder="Maharashtra"
              value={form.stateName}
              onChange={(e) => update("stateName", e.target.value)}
            />
            <Input
              label="State Code"
              placeholder="27"
              value={form.stateCode}
              onChange={(e) => update("stateCode", e.target.value)}
            />
          </div>

          {error && (
            <p className="text-sm font-medium text-danger-500">{error}</p>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-ink-50 px-6 py-4">
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={saving}
            disabled={!form.customerName.trim()}
            onClick={handleSave}
          >
            {saving ? "Saving" : "Save Customer"}
          </Button>
        </div>
      </div>
    </div>
  );
}
