"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, Plus, Search, Pencil, Calendar, Filter } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import { formatCurrency } from "@/lib/utils/formatters";
import { useToast } from "@/hooks/useToast";
import { exportQuotationsExcel } from "@/lib/utils/generateQuotationExcel";
import QuotationDetailsModal from "@/components/quotations/QuotationDetailsModal";
import QuotationFollowupModal from "@/components/quotations/QuotationFollowupModal";
import QuotationFilterBar from "@/components/quotations/QuotationFilterBar";

// Robust local-calendar parser for the "Quotation Date" field. Handles the
// YYYY-MM-DD value written by the date input plus common legacy formats that
// may already exist in the sheet (DD/MM/YYYY, DD-MM-YYYY). Returns null when
// the value cannot be interpreted so filters degrade gracefully instead of
// throwing.
function parseQuotationDate(value) {
  if (!value) return null;
  const s = String(value).trim();
  if (!s) return null;

  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const [, y, m, d] = iso.map(Number);
    return new Date(y, m - 1, d);
  }

  const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy.map(Number);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      const parsed = new Date(y, m - 1, d);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
    return null;
  }

  const parsed = new Date(s);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("All");
  const [divisionFilter, setDivisionFilter] = useState("All");
  const [dateWiseFilter, setDateWiseFilter] = useState("All");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [viewQuotationNo, setViewQuotationNo] = useState(null);
  const [followUpQuotationNo, setFollowUpQuotationNo] = useState(null);

  const router = useRouter();
  const toast = useToast();

  const loadQuotations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/quotations");
      const json = await res.json();
      if (json.success) {
        setQuotations(json.data);
      } else {
        setError(json.message || "Failed to load quotations.");
      }
    } catch (err) {
      setError(err.message || "Network error.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQuotations();
  }, [loadQuotations]);

  const openQuotationForEdit = useCallback(
    (quotationNo) => {
      router.push(`/quotations/${encodeURIComponent(quotationNo)}/edit`);
    },
    [router]
  );

  // Dropdown options are derived from the loaded quotation data so every value
  // is real — nothing is invented or hardcoded.
  const orderStatusOptions = useMemo(() => {
    const values = new Set();
    quotations.forEach((q) => {
      const v = (q.orderStatus || "").trim();
      if (v) values.add(v);
    });
    return [
      { value: "All", label: "All" },
      ...Array.from(values)
        .sort((a, b) => a.localeCompare(b))
        .map((v) => ({ value: v, label: v })),
    ];
  }, [quotations]);

  const divisionOptions = useMemo(() => {
    const values = new Set();
    quotations.forEach((q) => {
      const v = (q.division || "").trim();
      if (v) values.add(v);
    });
    return [
      { value: "All", label: "All" },
      ...Array.from(values)
        .sort((a, b) => a.localeCompare(b))
        .map((v) => ({ value: v, label: v })),
    ];
  }, [quotations]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (orderStatusFilter !== "All") count += 1;
    if (divisionFilter !== "All") count += 1;
    if (dateWiseFilter !== "All") count += 1;
    if (dateWiseFilter === "Custom Date Range" && (fromDate || toDate)) count += 1;
    return count;
  }, [orderStatusFilter, divisionFilter, dateWiseFilter, fromDate, toDate]);

  const handleClearFilters = useCallback(() => {
    setOrderStatusFilter("All");
    setDivisionFilter("All");
    setDateWiseFilter("All");
    setFromDate("");
    setToDate("");
  }, []);

  const handleFilterChange = useCallback((changes) => {
    if (changes.orderStatus !== undefined) setOrderStatusFilter(changes.orderStatus);
    if (changes.division !== undefined) setDivisionFilter(changes.division);
    if (changes.dateWise !== undefined) setDateWiseFilter(changes.dateWise);
    if (changes.fromDate !== undefined) setFromDate(changes.fromDate);
    if (changes.toDate !== undefined) setToDate(changes.toDate);
  }, []);

  const filteredQuotations = useMemo(() => {
    let list = quotations;

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (item) =>
          item.quotationNo.toLowerCase().includes(q) ||
          (item.customerName && item.customerName.toLowerCase().includes(q)) ||
          (item.division && item.division.toLowerCase().includes(q))
      );
    }

    if (orderStatusFilter !== "All") {
      list = list.filter((item) => (item.orderStatus || "") === orderStatusFilter);
    }

    if (divisionFilter !== "All") {
      list = list.filter((item) => (item.division || "") === divisionFilter);
    }

    const now = new Date();

    if (dateWiseFilter === "Today") {
      const todayKey = toDateKey(now);
      list = list.filter((item) => {
        const d = parseQuotationDate(item.quotationDate);
        return d && toDateKey(d) === todayKey;
      });
    } else if (dateWiseFilter === "This Week") {
      // Calendar week starting Monday, always includes the current day.
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      start.setDate(start.getDate() - ((now.getDay() + 6) % 7));
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      const startKey = toDateKey(start);
      const endKey = toDateKey(end);
      list = list.filter((item) => {
        const d = parseQuotationDate(item.quotationDate);
        if (!d) return false;
        const key = toDateKey(d);
        return key >= startKey && key <= endKey;
      });
    } else if (dateWiseFilter === "This Month") {
      list = list.filter((item) => {
        const d = parseQuotationDate(item.quotationDate);
        return d && d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      });
    } else if (dateWiseFilter === "This Year") {
      const year = now.getFullYear();
      list = list.filter((item) => {
        const d = parseQuotationDate(item.quotationDate);
        return d && d.getFullYear() === year;
      });
    } else if (dateWiseFilter === "Custom Date Range") {
      const fromKey = (fromDate || "").trim();
      const toKey = (toDate || "").trim();
      const rangeValid = !(fromKey && toKey && fromKey > toKey);
      // An invalid range is ignored so the list is never broken by bad input.
      if (rangeValid && (fromKey || toKey)) {
        list = list.filter((item) => {
          const d = parseQuotationDate(item.quotationDate);
          if (!d) return false;
          const key = toDateKey(d);
          if (fromKey && key < fromKey) return false;
          if (toKey && key > toKey) return false;
          return true;
        });
      }
    }

    return list;
  }, [
    quotations,
    searchQuery,
    orderStatusFilter,
    divisionFilter,
    dateWiseFilter,
    fromDate,
    toDate,
  ]);

  const displayQuotations = filteredQuotations;
  const hasActiveFilters = Boolean(searchQuery.trim()) || activeFilterCount > 0;

  const handleDownloadExcel = useCallback(async () => {
    if (downloading) return;
    if (displayQuotations.length === 0) {
      toast.info(
        "No quotations found",
        "No quotations found for the selected filters."
      );
      return;
    }
    setDownloading(true);
    try {
      await exportQuotationsExcel({
        quotations: displayQuotations,
        filters: {
          orderStatus: orderStatusFilter,
          division: divisionFilter,
          dateWise: dateWiseFilter,
          fromDate,
          toDate,
        },
      });
    } catch (err) {
      console.error("Excel export failed:", err);
      toast.error(
        "Export failed",
        "Failed to generate Excel report. Please try again."
      );
    } finally {
      setDownloading(false);
    }
  }, [
    downloading,
    displayQuotations,
    orderStatusFilter,
    divisionFilter,
    dateWiseFilter,
    fromDate,
    toDate,
    toast,
  ]);

  return (
    <AppShell breadcrumb="Quotations" title="All Quotations">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <div className="relative min-w-[200px] max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search quotations..."
              className="w-full h-10 pl-10 pr-4 rounded-lg border border-ink-100 bg-white text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-colors cursor-text"
            />
          </div>
          <button
            type="button"
            onClick={() => setIsFilterOpen((v) => !v)}
            aria-expanded={isFilterOpen}
            className={cn(
              "inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border px-3.5 text-sm font-medium transition-colors duration-150 cursor-pointer",
              isFilterOpen || activeFilterCount > 0
                ? "bg-accent-50 border-accent-200 text-accent-700"
                : "bg-white border-ink-100 text-ink-600 hover:border-ink-200 hover:bg-ink-50"
            )}
          >
            <Filter className="h-4 w-4" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-500 px-1.5 text-xs font-semibold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-sm text-ink-400 whitespace-nowrap">
            {loading
              ? "Loading..."
              : `Showing ${displayQuotations.length} quotation${displayQuotations.length === 1 ? "" : "s"}`}
          </p>
          <Link href="/quotations/new">
            <Button>
              <Plus className="h-4 w-4" />
              New Quotation
            </Button>
          </Link>
        </div>
      </div>

      {isFilterOpen && !error && !loading && quotations.length > 0 && (
        <div className="mt-4 animate-fade-slide-in">
          <QuotationFilterBar
            orderStatusOptions={orderStatusOptions}
            divisionOptions={divisionOptions}
            filters={{
              orderStatus: orderStatusFilter,
              division: divisionFilter,
              dateWise: dateWiseFilter,
              fromDate,
              toDate,
            }}
            onFilterChange={handleFilterChange}
            onClearFilters={handleClearFilters}
            activeFilterCount={activeFilterCount}
            filteredCount={displayQuotations.length}
            onDownloadExcel={handleDownloadExcel}
            downloading={downloading}
          />
        </div>
      )}

      <div className="mt-6 space-y-4">
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
                    {["Quotation No", "Customer", "Contact Number", "Division", "NOF", "Order Status", "Total Amount", "Actions"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left font-semibold text-ink-600 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 bg-ink-100 rounded animate-pulse" style={{ width: `${65 + ((i * 7 + j * 13) % 30)}%` }} />
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
              {hasActiveFilters ? "No matching quotations" : "No quotations yet"}
            </h2>
            <p className="max-w-sm text-sm text-ink-400">
              {hasActiveFilters
                ? "Try a different search term or adjust the filters."
                : "Start by creating your first quotation. Submitted quotations are saved straight to your Google Sheet and will appear here."}
            </p>
            {!hasActiveFilters && (
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
                    {["Quotation No", "Customer", "Contact Number", "Division", "NOF", "Order Status", "Total Amount", "Actions"].map((h) => (
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
                        <button
                          onClick={() => setViewQuotationNo(q.quotationNo)}
                          className="hover:underline hover:text-accent-700 transition-colors cursor-pointer"
                          title="View quotation"
                        >
                          {q.quotationNo}
                        </button>
                      </td>
                      <td className="px-4 py-3 max-w-[220px] truncate font-medium text-ink-900" title={q.customerName}>
                        {q.customerName}
                      </td>
                      <td className="px-4 py-3 text-ink-600 whitespace-nowrap">
                        {q.contactNumber || "-"}
                      </td>
                      <td className="px-4 py-3 text-ink-600">{q.division || "-"}</td>
                      <td className="px-4 py-3 text-ink-600 font-medium">
                        {q.numberOfFollowup || "-"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-accent-50 text-accent-700">
                          {q.orderStatus || "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-sm font-semibold text-ink-900">
                        {formatCurrency(q.totalAmount)}
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openQuotationForEdit(q.quotationNo);
                            }}
                            className="p-1.5 rounded-md text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setFollowUpQuotationNo(q.quotationNo);
                            }}
                            className="p-1.5 rounded-md text-green-600 hover:text-green-700 hover:bg-green-50 transition-colors cursor-pointer"
                            title="Next Follow-up"
                          >
                            <Calendar className="h-4 w-4" />
                          </button>
                        </div>
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

      {followUpQuotationNo && (
        <QuotationFollowupModal
          quotationNo={followUpQuotationNo}
          onClose={() => setFollowUpQuotationNo(null)}
          onDataChanged={loadQuotations}
        />
      )}

      </AppShell>
  );
}
