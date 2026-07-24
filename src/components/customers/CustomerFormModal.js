"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import Button from "@/components/ui/Button";

const INITIAL = {
  customerName: "",
  fullAddressWithGST: "",
  fullAddress: "",
  gstNo: "",
  stateName: "",
  stateCode: "",
  contactPerson: "",
  contactNumber: "",
  designation: "",
  email: "",
};

export default function CustomerFormModal({ customer, onSave, onCancel, loading }) {
  const [form, setForm] = useState(INITIAL);
  const [errors, setErrors] = useState({});
  const isEdit = !!customer;

  useEffect(() => {
    if (customer) {
      setForm({
        customerName: customer.customerName || "",
        fullAddressWithGST: customer.fullAddressWithGST || "",
        fullAddress: customer.fullAddress || "",
        gstNo: customer.gstNo || "",
        stateName: customer.stateName || "",
        stateCode: customer.stateCode || "",
        contactPerson: customer.contactPerson || "",
        contactNumber: customer.contactNumber || "",
        designation: customer.designation || "",
        email: customer.email || "",
      });
    } else {
      setForm(INITIAL);
    }
    setErrors({});
  }, [customer]);

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    const newErrors = {};
    if (!form.customerName.trim()) {
      newErrors.customerName = "Customer name is required.";
    }
    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }
    onSave({ ...form });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-ink-950/40 cursor-pointer" onClick={onCancel} />
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-50">
          <h2 className="text-lg font-semibold text-ink-900">
            {isEdit ? "Edit Customer" : "Add Customer"}
          </h2>
          <button
            onClick={onCancel}
            className="rounded-md p-1 text-ink-300 hover:text-ink-600 hover:bg-ink-50 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1">
              Customer Name <span className="text-danger-500">*</span>
            </label>
            <input
              type="text"
              value={form.customerName}
              onChange={(e) => set("customerName", e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-ink-100 text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 cursor-text"
              placeholder="Acme Engineering Pvt. Ltd."
            />
            {errors.customerName && (
              <p className="text-xs text-danger-500 mt-1">{errors.customerName}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1">Contact Person</label>
              <input
                type="text"
                value={form.contactPerson}
                onChange={(e) => set("contactPerson", e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-ink-100 text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 cursor-text"
                placeholder="Rohit Sharma"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1">Contact Number</label>
              <input
                type="text"
                value={form.contactNumber}
                onChange={(e) => set("contactNumber", e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-ink-100 text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 cursor-text"
                placeholder="+91 98765 43210"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1">Designation</label>
              <input
                type="text"
                value={form.designation}
                onChange={(e) => set("designation", e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-ink-100 text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 cursor-text"
                placeholder="Procurement Manager"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-ink-100 text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 cursor-text"
                placeholder="buyer@company.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1">Full Address with GST</label>
            <textarea
              rows={2}
              value={form.fullAddressWithGST}
              onChange={(e) => set("fullAddressWithGST", e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-ink-100 text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 resize-none cursor-text"
              placeholder="Plot 14, Industrial Estate, Pune, MH — GSTIN: 27AAAAA0000A1Z5"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1">Full Address (without GST)</label>
              <input
                type="text"
                value={form.fullAddress}
                onChange={(e) => set("fullAddress", e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-ink-100 text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 cursor-text"
                placeholder="Plot 14, Industrial Estate, Pune"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1">GST No</label>
              <input
                type="text"
                value={form.gstNo}
                onChange={(e) => set("gstNo", e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-ink-100 text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 cursor-text"
                placeholder="27AAAAA0000A1Z5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1">State Name</label>
              <input
                type="text"
                value={form.stateName}
                onChange={(e) => set("stateName", e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-ink-100 text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 cursor-text"
                placeholder="Maharashtra"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1">State Code</label>
              <input
                type="text"
                value={form.stateCode}
                onChange={(e) => set("stateCode", e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-ink-100 text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 cursor-text"
                placeholder="27"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-ink-50">
            <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              {isEdit ? "Update Customer" : "Create Customer"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
