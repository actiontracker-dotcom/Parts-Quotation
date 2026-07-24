"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { FileText, Plus, Eye, Search } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import QuotationDetailsModal from "@/components/quotations/QuotationDetailsModal";
import { formatCurrency } from "@/lib/utils/formatters";

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewQuotationNo, setViewQuotationNo] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch("/api/quotations")
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        if (json.success) {
          setQuotations(json.data);
        } else {
          setError(json.message || "Failed to load quotations.");
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
  }, []);

  const filteredQuotations = useMemo(() => {
    if (!searchQuery.trim()) return quotations;
    const q = searchQuery.trim().toLowerCase();
    return quotations.filter(
      (item) =>
        item.quotationNo.toLowerCase().includes(q) ||
        (item.customerName && item.customerName.toLowerCase().includes(q)) ||
        (item.division && item.division.toLowerCase().includes(q)) ||
        (item.engineer && item.engineer.toLowerCase().includes(q))
    );
  }, [quotations, searchQuery]);

  const displayQuotations = searchQuery.trim() ? filteredQuotations : quotations;

  return (
    <AppShell breadcrumb="Quotations" title="All Quotations">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search quotations..."
            className="w-full h-10 pl-10 pr-4 rounded-lg border border-ink-100 bg-white text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-colors cursor-text"
          />
        </div>
        <div className="flex items-center gap-3">
          <p className="text-sm text-ink-400 whitespace-nowrap">
            {loading
              ? "Loading..."
              : `${displayQuotations.length} quotation${displayQuotations.length === 1 ? "" : "s"}`}
          </p>
          <Link href="/quotations/new">
            <Button>
              <Plus className="h-4 w-4" />
              New Quotation
            </Button>
          </Link>
        </div>
      </div>

      <div className="mt-6">
        {error && (
          <Card className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-danger-50 text-danger-600">
              <FileText className="h-6 w-6" />
            </div>
            <h2 className="font-display text-lg font-semibold text-ink-900">
              Could not load quotations
            </h2>
            <p className="max-w-sm text-sm text-ink-400">{error}</p>
          </Card>
        )}

        {!error && loading && (
          <Card>
            <div className="overflow-x-auto rounded-lg border border-ink-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-ink-50 border-b border-ink-100">
                    {["Quotation No", "Customer", "Date", "Division", "Engineer", "Items", "Total Amount", "Status", "Actions"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left font-semibold text-ink-600 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 9 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 bg-ink-100 rounded animate-pulse" style={{ width: `${50 + Math.random() * 50}%` }} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {!error && !loading && displayQuotations.length === 0 && (
          <Card className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-50 text-accent-600">
              <FileText className="h-6 w-6" />
            </div>
            <h2 className="font-display text-lg font-semibold text-ink-900">
              {searchQuery.trim() ? "No matching quotations" : "No quotations yet"}
            </h2>
            <p className="max-w-sm text-sm text-ink-400">
              {searchQuery.trim()
                ? "Try a different search term."
                : "Start by creating your first quotation. Submitted quotations are saved straight to your Google Sheet and will appear here."}
            </p>
            {!searchQuery.trim() && (
              <Link href="/quotations/new" className="mt-2">
                <Button>
                  <Plus className="h-4 w-4" />
                  Create Quotation
                </Button>
              </Link>
            )}
          </Card>
        )}

        {!error && !loading && displayQuotations.length > 0 && (
          <Card>
            <div className="overflow-x-auto rounded-lg border border-ink-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-ink-50 border-b border-ink-100">
                    {["Quotation No", "Customer", "Date", "Division", "Engineer", "Items", "Total Amount", "Status", "Actions"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left font-semibold text-ink-600 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayQuotations.map((q, i) => (
                    <tr
                      key={q.quotationNo}
                      className="border-b border-ink-50 transition-colors hover:bg-ink-50/50"
                    >
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-accent-600 whitespace-nowrap">
                        {q.quotationNo}
                      </td>
                      <td className="px-4 py-3 font-medium text-ink-900 max-w-[220px] truncate" title={q.customerName}>
                        {q.customerName}
                      </td>
                      <td className="px-4 py-3 text-ink-600 whitespace-nowrap">
                        {q.quotationDate || "-"}
                      </td>
                      <td className="px-4 py-3 text-ink-600">{q.division || "-"}</td>
                      <td className="px-4 py-3 text-ink-600">{q.engineer || "-"}</td>
                      <td className="px-4 py-3 text-ink-600 font-medium">
                        {q.itemCount} item{q.itemCount === 1 ? "" : "s"}
                      </td>
                      <td className="px-4 py-3 font-mono text-sm font-semibold text-ink-900">
                        {formatCurrency(q.totalAmount)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-accent-50 text-accent-700">
                          {q.status || "Active"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => setViewQuotationNo(q.quotationNo)}
                          className="inline-flex items-center justify-center h-8 w-8 rounded-md text-ink-400 hover:text-accent-600 hover:bg-accent-50 transition-colors cursor-pointer"
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {viewQuotationNo && (
        <QuotationDetailsModal
          quotationNo={viewQuotationNo}
          onClose={() => setViewQuotationNo(null)}
        />
      )}
    </AppShell>
  );
}
