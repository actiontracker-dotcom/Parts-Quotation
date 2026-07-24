"use client";

import { AlertTriangle, X } from "lucide-react";
import Button from "@/components/ui/Button";

export default function DeleteDialog({ customer, onConfirm, onCancel, loading }) {
  if (!customer) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-ink-950/40 cursor-pointer" onClick={onCancel} />
      <div className="relative w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="flex items-start justify-between p-5 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-danger-50">
              <AlertTriangle className="h-5 w-5 text-danger-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-ink-900">Delete Customer</h2>
              <p className="text-sm text-ink-500 mt-0.5">This action cannot be undone.</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="rounded-md p-1 text-ink-300 hover:text-ink-600 hover:bg-ink-50 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 py-3 border-t border-ink-50">
          <p className="text-sm text-ink-700">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-ink-900">{customer.customerName}</span>?
          </p>
        </div>

        <div className="flex justify-end gap-3 px-5 py-4 border-t border-ink-50">
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} loading={loading}>
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
