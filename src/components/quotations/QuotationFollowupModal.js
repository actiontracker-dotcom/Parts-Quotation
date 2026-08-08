"use client";

import { useState, useEffect } from "react";
import { X, CalendarPlus, PackageCheck } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Select from "@/components/ui/Select";
import { useToast } from "@/hooks/useToast";
import {
  FOLLOWUP_STATUS_OPTIONS,
  ORDER_STATUS_OPTIONS,
} from "@/lib/constants/quotationOptions";

const EMPTY_NEXT_FORM = { nextFollowupDate: "", followupRemark: "", followupStatus: "" };
const EMPTY_ORDER_FORM = {
  orderStatus: "",
  orderNumber: "",
  orderReceivedDate: "",
  remarkForOrder: "",
};

export default function QuotationFollowupModal({ quotationNo, onClose, onDataChanged }) {
  const { toast } = useToast();
  const [view, setView] = useState("menu"); // "menu" | "next" | "order"
  const [nextForm, setNextForm] = useState(EMPTY_NEXT_FORM);
  const [orderForm, setOrderForm] = useState(EMPTY_ORDER_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    function handleEscape(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  function updateNext(field, value) {
    setNextForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function updateOrder(field, value) {
    setOrderForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function backToMenu() {
    setView("menu");
    setFieldErrors({});
    setSubmitError(null);
  }

  // POSTs a follow-up action and returns the parsed result. Throws on any
  // non-JSON response, non-2xx status, or `success:false` body so callers can
  // surface the real server message instead of a generic catch-all error.
  async function postFollowup(payload) {
    const res = await fetch(
      `/api/quotations/${encodeURIComponent(quotationNo)}/followup`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    const contentType = res.headers.get("content-type") || "";
    let result;
    if (contentType.includes("application/json")) {
      result = await res.json();
    } else {
      const text = await res.text();
      throw new Error(
        `Unexpected server response (${res.status}): ${text.slice(0, 200)}`
      );
    }

    if (!res.ok || !result.success) {
      const error = new Error(
        result?.message || `Request failed with status ${res.status}`
      );
      error.fieldErrors = (result && result.errors) || {};
      throw error;
    }

    return result;
  }

  // "Network error" is reserved for a real fetch/network exception. HTTP
  // errors and JSON parse errors carry a concrete server message instead.
  function errorMessage(err, fallback) {
    if (err instanceof TypeError || typeof err?.message === "string") {
      if (/Failed to fetch|NetworkError|load failed/i.test(err.message)) {
        return "Network error. Please try again.";
      }
      return err.message || fallback;
    }
    return fallback;
  }

  // Refreshes the quotation list. Never throws — a failed refresh after a
  // successful save must never be reported as a failed save.
  async function refreshQuotationList() {
    if (!onDataChanged) return;
    try {
      await onDataChanged();
    } catch (refreshError) {
      console.error("Quotation list refresh failed:", refreshError);
    }
  }

  async function submitNext(e) {
    e.preventDefault();
    if (saving) return; // ignore duplicate submits while one is in flight

    setSubmitError(null);
    setFieldErrors({});

    const errors = {};
    if (!nextForm.nextFollowupDate.trim()) {
      errors.nextFollowupDate = "Next follow-up date is required.";
    }
    if (!nextForm.followupRemark.trim()) {
      errors.followupRemark = "Remark is required.";
    }
    if (!nextForm.followupStatus.trim()) {
      errors.followupStatus = "Follow-up status is required.";
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    let saved = false;
    setSaving(true);
    try {
      await postFollowup({
        submissionType: "Next Follow-up",
        nextFollowupDate: nextForm.nextFollowupDate.trim(),
        followupRemark: nextForm.followupRemark.trim(),
        followupStatus: nextForm.followupStatus.trim(),
      });
      saved = true;

      toast.success("Next follow-up saved", `Follow-up for ${quotationNo} saved.`);
      setNextForm(EMPTY_NEXT_FORM);
      setFieldErrors({});
      backToMenu();
    } catch (err) {
      if (err.fieldErrors && Object.keys(err.fieldErrors).length > 0) {
        setFieldErrors(err.fieldErrors);
      }
      setSubmitError(errorMessage(err, "Failed to save next follow-up."));
    } finally {
      setSaving(false);
    }

    // The save succeeded; refresh separately so a refresh problem can never
    // be mistaken for a failed save.
    if (saved) {
      await refreshQuotationList();
    }
  }

  async function submitOrder(e) {
    e.preventDefault();
    if (saving) return; // ignore duplicate submits while one is in flight

    setSubmitError(null);
    setFieldErrors({});
    if (!orderForm.orderStatus.trim()) {
      setFieldErrors({ orderStatus: "Order status is required." });
      return;
    }

    let saved = false;
    setSaving(true);
    try {
      await postFollowup({
        submissionType: "Order Status",
        orderStatus: orderForm.orderStatus.trim(),
        orderNumber: orderForm.orderNumber.trim(),
        orderReceivedDate: orderForm.orderReceivedDate.trim(),
        remarkForOrder: orderForm.remarkForOrder.trim(),
      });
      saved = true;

      toast.success("Order status saved", `Order status for ${quotationNo} saved.`);
    } catch (err) {
      if (err.fieldErrors && Object.keys(err.fieldErrors).length > 0) {
        setFieldErrors(err.fieldErrors);
      }
      setSubmitError(errorMessage(err, "Failed to save order status."));
    } finally {
      setSaving(false);
    }

    if (saved) {
      await refreshQuotationList();
      onClose();
    }
  }

  const heading =
    view === "next" ? "Next Follow-up" : view === "order" ? "Order Status" : "Quotation Follow-up";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 sm:p-8 overflow-y-auto">
      <div className="fixed inset-0 bg-ink-950/40 cursor-pointer" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-xl shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-50 flex-shrink-0">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-accent-500">
              Follow-up
            </p>
            <h2 className="mt-0.5 text-lg font-semibold text-ink-900">{heading}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-ink-300 hover:text-ink-600 hover:bg-ink-50 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <p className="text-sm text-ink-600 mb-5">Quotation: {quotationNo}</p>

          {view === "menu" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button variant="primary" icon={CalendarPlus} onClick={() => setView("next")}>
                Next Follow-up
              </Button>
              <Button variant="secondary" icon={PackageCheck} onClick={() => setView("order")}>
                Order Status
              </Button>
            </div>
          )}

          {view === "next" && (
            <form onSubmit={submitNext} className="space-y-4">
              <Input
                label="Next Follow-up Date"
                required
                type="date"
                value={nextForm.nextFollowupDate}
                onChange={(e) => updateNext("nextFollowupDate", e.target.value)}
                error={fieldErrors.nextFollowupDate}
              />
              <Textarea
                label="Remark"
                required
                rows={3}
                placeholder="What was discussed with the customer and what needs to be done next."
                value={nextForm.followupRemark}
                onChange={(e) => updateNext("followupRemark", e.target.value)}
                error={fieldErrors.followupRemark}
              />
              <Select
                label="Follow-up Status"
                required
                options={FOLLOWUP_STATUS_OPTIONS}
                placeholder="Select follow-up status"
                value={nextForm.followupStatus}
                onChange={(e) => updateNext("followupStatus", e.target.value)}
                error={fieldErrors.followupStatus}
              />

              {submitError && (
                <p className="text-sm font-medium text-danger-500">{submitError}</p>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button variant="secondary" type="button" onClick={backToMenu}>
                  Cancel
                </Button>
                <Button type="submit" loading={saving} disabled={saving}>
                  Submit Next Follow-up
                </Button>
              </div>
            </form>
          )}

          {view === "order" && (
            <form onSubmit={submitOrder} className="space-y-4">
              <Select
                label="Order Status"
                required
                options={ORDER_STATUS_OPTIONS}
                placeholder="Select order status"
                value={orderForm.orderStatus}
                onChange={(e) => updateOrder("orderStatus", e.target.value)}
                error={fieldErrors.orderStatus}
              />
              <Input
                label="Order Number"
                placeholder="e.g. PO-2026-0001"
                value={orderForm.orderNumber}
                onChange={(e) => updateOrder("orderNumber", e.target.value)}
                error={fieldErrors.orderNumber}
              />
              <Input
                label="Order Received Date"
                type="date"
                value={orderForm.orderReceivedDate}
                onChange={(e) => updateOrder("orderReceivedDate", e.target.value)}
                error={fieldErrors.orderReceivedDate}
              />
              <Textarea
                label="Remark"
                rows={3}
                placeholder="Remark for order received..."
                value={orderForm.remarkForOrder}
                onChange={(e) => updateOrder("remarkForOrder", e.target.value)}
              />

              {submitError && (
                <p className="text-sm font-medium text-danger-500">{submitError}</p>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button variant="secondary" type="button" onClick={backToMenu}>
                  Cancel
                </Button>
                <Button type="submit" loading={saving} disabled={saving}>
                  Submit Order Status
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}