"use client";

import { useState, useEffect } from "react";
import { X, FileSearch, Loader2, RefreshCw } from "lucide-react";
import Button from "@/components/ui/Button";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import QuotationDetailsModal from "@/components/quotations/QuotationDetailsModal";

const ORDER_STATUS_BADGE_COLORS = {
  Pending: "bg-[#FEF3C7] text-[#92400E]",
  Won: "bg-[#DCFCE7] text-[#166534]",
  Loss: "bg-[#FEE2E2] text-[#991B1B]",
  Dead: "bg-[#F3F4F6] text-[#4B5563]",
  Partial: "bg-[#FFEDD5] text-[#9A3412]",
};

// Paginated drill-down modal for every dashboard chart. Props:
//   baseQuery  — the API query string built from the active dashboard filters
//                plus the clicked selection (type + selection params). The
//                modal pages over /api/dashboard/drilldown one page at a time
//                (page size fixed at 20 server-side) — the browser never
//                receives the full match set.
export default function QuotationDrilldownModal({ isOpen, onClose, title, baseQuery }) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [detailNo, setDetailNo] = useState(null);

  // Reset to the first page whenever the drill-down selection changes.
  useEffect(() => {
    setPage(1);
    setData(null);
    setDetailNo(null);
  }, [baseQuery]);

  useEffect(() => {
    if (!isOpen) return;
    function handleEscape(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/dashboard/drilldown?${baseQuery}&page=${page}`)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        if (json.success) {
          setData(json.data);
        } else {
          setError(json.message || "Failed to load quotations.");
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Network error.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [baseQuery, page, reloadKey]);

  if (!isOpen) return null;

  const pagination = data ? data.pagination : null;
  const items = data ? data.items : [];
  const start = pagination && pagination.total > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0;
  const end = pagination ? Math.min(pagination.page * pagination.limit, pagination.total) : 0;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 sm:p-8 overflow-y-auto">
        <div className="fixed inset-0 bg-ink-950/40 cursor-pointer" onClick={onClose} />
        <div className="relative flex max-h-[85vh] w-full max-w-4xl flex-col rounded-xl bg-white shadow-xl">
          <div className="flex flex-shrink-0 items-start justify-between gap-4 border-b border-ink-50 px-6 py-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-accent-500">
                Quotation Records
              </p>
              <h2 className="mt-0.5 truncate text-lg font-semibold text-ink-900" title={title}>
                {title}
              </h2>
              {pagination && (
                <p className="mt-0.5 text-xs text-ink-400">
                  {pagination.total} quotation{pagination.total === 1 ? "" : "s"} ·{" "}
                  <span className="font-mono font-semibold text-ink-600">
                    ₹ {formatCurrency(data.totalAmount)}
                  </span>
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="rounded-md p-1.5 text-ink-300 transition-colors hover:bg-ink-50 hover:text-ink-600 cursor-pointer"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading && (
              <div className="flex h-44 flex-col items-center justify-center gap-3 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-accent-500" />
                <p className="text-sm text-ink-400">Loading quotations…</p>
              </div>
            )}

            {!loading && error && (
              <div className="flex h-44 flex-col items-center justify-center gap-3 text-center">
                <p className="max-w-sm text-sm text-danger-600">{error}</p>
                <Button variant="secondary" icon={RefreshCw} onClick={() => setReloadKey((k) => k + 1)}>
                  Retry
                </Button>
              </div>
            )}

            {!loading && !error && items.length === 0 && (
              <div className="flex h-44 flex-col items-center justify-center text-center">
                <FileSearch className="h-8 w-8 text-ink-200" />
                <p className="mt-2 text-sm text-ink-400">No quotation records match this selection.</p>
              </div>
            )}

            {!loading && !error && items.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-ink-100 bg-ink-50">
                      {["Quotation No", "Customer", "Date", "Division", "Engineer", "Source", "Status", "Amount"].map((h) => (
                        <th
                          key={h}
                          className="whitespace-nowrap px-4 py-2.5 text-left text-xs font-semibold text-ink-500"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((q) => (
                      <tr
                        key={q.quotationNo}
                        className="border-b border-ink-50 transition-colors last:border-b-0 hover:bg-ink-50/40"
                      >
                        <td className="whitespace-nowrap px-4 py-3">
                          <button
                            onClick={() => setDetailNo(q.quotationNo)}
                            className="cursor-pointer font-mono text-xs font-semibold text-accent-600 transition-colors hover:text-accent-700 hover:underline"
                            title="View quotation details"
                          >
                            {q.quotationNo}
                          </button>
                        </td>
                        <td
                          className="max-w-[200px] truncate px-4 py-3 font-medium text-ink-900"
                          title={q.customerName || ""}
                        >
                          {q.customerName || "-"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-ink-600">
                          {formatDate(q.quotationDate) || "-"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-ink-600">{q.division || "-"}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-ink-600">{q.engineer || "-"}</td>
                        <td
                          className="max-w-[140px] truncate whitespace-nowrap px-4 py-3 text-ink-600"
                          title={q.sourceOfEnquiry || ""}
                        >
                          {q.sourceOfEnquiry || "-"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              ORDER_STATUS_BADGE_COLORS[q.orderStatus] || "bg-accent-50 text-accent-700"
                            }`}
                          >
                            {q.orderStatus || "-"}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-sm font-semibold text-ink-900">
                          {formatCurrency(q.totalAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="flex flex-shrink-0 flex-wrap items-center justify-between gap-3 border-t border-ink-50 px-6 py-4">
            <div className="text-xs text-ink-400">
              {pagination && pagination.total > 0 ? (
                <>
                  Showing{" "}
                  <span className="font-semibold text-ink-600">
                    {start}–{end}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-ink-600">{pagination.total}</span>
                </>
              ) : (
                "No records"
              )}
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                size="sm"
                disabled={!pagination || !pagination.hasPreviousPage || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className="text-xs text-ink-400">
                Page <span className="font-semibold text-ink-600">{pagination ? pagination.page : 1}</span>{" "}
                of <span className="font-semibold text-ink-600">{pagination ? pagination.totalPages : 1}</span>
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={!pagination || !pagination.hasNextPage || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
              <Button variant="secondary" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </div>
      </div>

      {detailNo && (
        <QuotationDetailsModal quotationNo={detailNo} onClose={() => setDetailNo(null)} />
      )}
    </>
  );
}
