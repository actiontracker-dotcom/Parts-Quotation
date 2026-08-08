"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Loader2, FileDown } from "lucide-react";
import Button from "@/components/ui/Button";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import QuotationFollowupsPanel from "@/components/quotations/QuotationFollowupsPanel";
import { cn } from "@/lib/utils/cn";

export default function QuotationDetailsModal({ quotationNo, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("quotation"); // "quotation" | "followups"

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/quotations/${encodeURIComponent(quotationNo)}`)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        if (json.success) {
          setData(json.data);
        } else {
          setError(json.message || "Failed to load quotation.");
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || "Network error.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [quotationNo]);

  useEffect(() => {
    function handleEscape(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const handleDownload = useCallback(async (d) => {
    if (!d) return;
    const { generateQuotationPdf } = await import("@/lib/utils/generatePdf");
    generateQuotationPdf({
      customer: d.customer,
      quotation: d.quotation,
      items: d.items,
      quotationId: d.quotationNo,
    });
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 sm:p-8 overflow-y-auto">
      <div className="fixed inset-0 bg-ink-950/40 cursor-pointer" onClick={onClose} />
      <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-50 flex-shrink-0">
          <h2 className="text-lg font-semibold text-ink-900">
            {loading ? "Loading..." : data ? `Quotation ${data.quotationNo}` : "Quotation"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-ink-300 hover:text-ink-600 hover:bg-ink-50 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center gap-1 px-6 border-b border-ink-50 flex-shrink-0">
          {[
            { key: "quotation", label: "Quotation" },
            { key: "followups", label: "Follow-ups" },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={cn(
                "pb-3 pt-1 text-sm font-semibold border-b-2 -mb-px transition-colors cursor-pointer",
                tab === item.key
                  ? "border-accent-500 text-accent-700"
                  : "border-transparent text-ink-400 hover:text-ink-600"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {tab === "quotation" ? (
            <>
              {loading && (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-accent-500" />
                </div>
              )}

              {error && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <p className="text-danger-500 font-medium">{error}</p>
                </div>
              )}

              {data && (
                <>
                  <section>
                    <h3 className="text-sm font-semibold text-ink-500 uppercase tracking-wider mb-3">Customer Information</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      <InfoItem label="Customer Name" value={data.customer.customerName} />
                      <InfoItem label="Contact Person" value={data.customer.contactPerson} />
                      <InfoItem label="Contact Number" value={data.customer.contactNumber} />
                      <InfoItem label="Email (To)" value={data.customer.emailTo} />
                      <InfoItem label="Email (CC)" value={data.customer.emailCc} />
                      <InfoItem label="Designation" value={data.customer.designation} />
                      <div className="sm:col-span-2 lg:col-span-3">
                        <InfoItem label="Address" value={data.customer.fullAddressGst} />
                      </div>
                      <InfoItem label="Location" value={data.customer.location} />
                      <InfoItem label="User ID" value={data.customer.userId} />
                      <InfoItem label="Engineer Remark" value={data.customer.engineerRemark} />
                    </div>
                  </section>

                  <hr className="border-ink-50" />

                  <section>
                    <h3 className="text-sm font-semibold text-ink-500 uppercase tracking-wider mb-3">Quotation Information</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      <InfoItem label="Quotation No" value={data.quotationNo} />
                      <InfoItem label="Quotation Date" value={formatDate(data.quotation.quotationDate)} />
                      <InfoItem label="Division" value={data.quotation.division} />
                      <InfoItem label="Source Of Enquiry" value={data.quotation.sourceOfEnquiry} />
                      <InfoItem label="Engineer" value={data.quotation.enquiryGeneratedBy} />
                      <InfoItem label="Payment Terms" value={data.quotation.paymentTerms} />
                      <InfoItem label="Quotation Validity" value={data.quotation.quotationValidity} />
                      <InfoItem label="Terms Of Delivery" value={data.quotation.termsOfDelivery} />
                      <InfoItem label="Party Ref. No." value={data.quotation.partyReferenceNumber} />
                      <InfoItem label="Party Ref. Date" value={formatDate(data.quotation.partyReferenceDate)} />
                      <InfoItem label="Follow-up By" value={data.quotation.quotationFollowUpBy} />
                      <InfoItem label="Status" value={data.quotation.status} />
                    </div>
                  </section>

                  <hr className="border-ink-50" />

                  <section>
                    <h3 className="text-sm font-semibold text-ink-500 uppercase tracking-wider mb-3">Items</h3>
                    <div className="overflow-x-auto rounded-lg border border-ink-100">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-ink-50 border-b border-ink-100">
                            {["#", "Part Number", "Description", "Availability", "Qty", "Unit Price", "Other Rate", "Disc. %", "Line Total"].map((h) => (
                              <th key={h} className="px-3 py-2.5 text-left font-semibold text-ink-600 whitespace-nowrap text-xs">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {data.items.map((item, i) => (
                            <tr key={i} className="border-b border-ink-50 last:border-b-0 hover:bg-ink-50/30">
                              <td className="px-3 py-2.5 text-ink-400 font-mono text-xs">{i + 1}</td>
                              <td className="px-3 py-2.5 font-mono text-xs font-medium text-accent-600 whitespace-nowrap">{item.partNumber || "-"}</td>
                              <td className="px-3 py-2.5 text-ink-700 max-w-[200px] truncate" title={item.description}>{item.description || "-"}</td>
                              <td className="px-3 py-2.5 text-ink-600">{item.availability || "-"}</td>
                              <td className="px-3 py-2.5 text-ink-900 font-medium">{item.quantity}</td>
                              <td className="px-3 py-2.5 text-ink-600 font-mono text-xs">{formatCurrency(item.unitPrice)}</td>
                              <td className="px-3 py-2.5 text-ink-600 font-mono text-xs">{item.otherRate ? formatCurrency(item.otherRate) : "-"}</td>
                              <td className="px-3 py-2.5 text-ink-600">{item.discount ? `${item.discount}%` : "-"}</td>
                              <td className="px-3 py-2.5 font-mono text-xs font-semibold text-ink-900">{formatCurrency(item.total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>

                  <hr className="border-ink-50" />

                  <section>
                    <h3 className="text-sm font-semibold text-ink-500 uppercase tracking-wider mb-3">Summary</h3>
                    <div className="flex flex-wrap gap-6">
                      <div className="bg-ink-50 rounded-lg px-4 py-3 min-w-[120px]">
                        <p className="text-xs text-ink-400 font-medium">Items</p>
                        <p className="text-lg font-semibold text-ink-900">{data.totals.itemCount}</p>
                      </div>
                      <div className="bg-ink-50 rounded-lg px-4 py-3 min-w-[160px]">
                        <p className="text-xs text-ink-400 font-medium">Subtotal</p>
                        <p className="text-lg font-semibold text-ink-900">{formatCurrency(data.totals.subtotal)}</p>
                      </div>
                      <div className="bg-accent-50 rounded-lg px-4 py-3 min-w-[160px]">
                        <p className="text-xs text-accent-500 font-medium">Grand Total</p>
                        <p className="text-lg font-semibold text-accent-700">{formatCurrency(data.totals.grandTotal)}</p>
                      </div>
                    </div>
                  </section>
                </>
              )}
            </>
          ) : (
            <QuotationFollowupsPanel quotationNo={quotationNo} />
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-ink-50 flex-shrink-0">
          {tab === "followups" && (
            <Button
              variant="secondary"
              onClick={() => setTab("quotation")}
            >
              Back to Quotation
            </Button>
          )}
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="subtle"
            icon={FileDown}
            disabled={!data}
            onClick={() => handleDownload(data)}
          >
            Download PDF
          </Button>
        </div>
      </div>
    </div>
  );
}

function InfoItem({ label, value }) {
  return (
    <div>
      <p className="text-xs font-medium text-ink-400">{label}</p>
      <p className="text-sm text-ink-800 whitespace-pre-wrap">{value || "-"}</p>
    </div>
  );
}