"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { History, Search, RefreshCw } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import { formatDateTime } from "@/lib/utils/formatters";
import {
  FOLLOWUP_STATUS_OPTIONS,
  ORDER_STATUS_OPTIONS,
} from "@/lib/constants/quotationOptions";
import { cn } from "@/lib/utils/cn";

const SUBMISSION_TYPE_OPTIONS = [
  { value: "Next Follow-up", label: "Next Follow-up" },
  { value: "Order Status", label: "Order Status" },
];

const FILTER_ALL = "__all__";

const COLUMNS = [
  { key: "Timestamp", label: "Timestamp", render: (r) => formatDateTime(r.Timestamp) || "-" },
  { key: "Quotation No", label: "Quotation No", render: (r) => r["Quotation No"] || "-" },
  {
    key: "Submission Type",
    label: "Submission Type",
    render: (r) => {
      const type = r["Submission Type"] || "";
      return (
        <span
          className={cn(
            "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
            type === "Next Follow-up"
              ? "bg-accent-50 text-accent-700"
              : type === "Order Status"
                ? "bg-blue-50 text-blue-700"
                : "bg-ink-100 text-ink-600"
          )}
        >
          {type || "-"}
        </span>
      );
    },
  },
  { key: "Next Followup Date", label: "Next Follow-up Date", render: (r) => r["Next Followup Date"] || "-" },
  { key: "Followup Status", label: "Follow-up Status", render: (r) => r["Followup Status"] || "-" },
  { key: "Followup Remark", label: "Follow-up Remark", render: (r) => r["Followup Remark"] || "-" },
  { key: "Order Status", label: "Order Status", render: (r) => r["Order Status"] || "-" },
  { key: "Order Received date", label: "Order Received Date", render: (r) => r["Order Received date"] || "-" },
  { key: "Remark for Order", label: "Remark for Order", render: (r) => r["Remark for Order"] || "-" },
  { key: "Order Number", label: "Order Number", render: (r) => r["Order Number"] || "-" },
  { key: "Order Date", label: "Order Date", render: (r) => r["Order Date"] || "-" },
  { key: "Order Verification Status", label: "Order Verification Status", render: (r) => r["Order Verification Status"] || "-" },
  { key: "Due Days", label: "Due Days", render: (r) => r["Due Days"] || "-" },
];

export default function FollowupsPage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [submissionTypeFilter, setSubmissionTypeFilter] = useState(FILTER_ALL);
  const [followupStatusFilter, setFollowupStatusFilter] = useState(FILTER_ALL);
  const [orderStatusFilter, setOrderStatusFilter] = useState(FILTER_ALL);

  const loadFollowups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/quotations/followup");
      let json;
      try {
        json = await res.json();
      } catch {
        throw new Error(`Unexpected server response (${res.status}).`);
      }
      if (json.success) {
        setRecords(json.records || []);
      } else {
        setError(json.message || "Unable to load follow-up history.");
      }
    } catch (err) {
      setError(err.message || "Unable to load follow-up history.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFollowups();
  }, [loadFollowups]);

  const filteredRecords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return records.filter((r) => {
      if (submissionTypeFilter !== FILTER_ALL && r["Submission Type"] !== submissionTypeFilter) return false;
      if (followupStatusFilter !== FILTER_ALL && r["Followup Status"] !== followupStatusFilter) return false;
      if (orderStatusFilter !== FILTER_ALL && r["Order Status"] !== orderStatusFilter) return false;
      if (!q) return true;
      return (
        (r["Quotation No"] || "").toLowerCase().includes(q) ||
        (r["Followup Remark"] || "").toLowerCase().includes(q) ||
        (r["Remark for Order"] || "").toLowerCase().includes(q) ||
        (r["Order Number"] || "").toLowerCase().includes(q)
      );
    });
  }, [records, searchQuery, submissionTypeFilter, followupStatusFilter, orderStatusFilter]);

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    submissionTypeFilter !== FILTER_ALL ||
    followupStatusFilter !== FILTER_ALL ||
    orderStatusFilter !== FILTER_ALL;

  return (
    <AppShell breadcrumb="Follow-ups" title="Follow-up History">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by quotation no, remark, order no..."
            className="w-full h-10 pl-10 pr-4 rounded-lg border border-ink-100 bg-white text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-colors cursor-text"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Select
            containerClassName="w-44"
            value={submissionTypeFilter}
            onChange={(e) => setSubmissionTypeFilter(e.target.value)}
            options={[
              { value: FILTER_ALL, label: "All Types" },
              ...SUBMISSION_TYPE_OPTIONS,
            ]}
          />
          <Select
            containerClassName="w-44"
            value={followupStatusFilter}
            onChange={(e) => setFollowupStatusFilter(e.target.value)}
            options={[
              { value: FILTER_ALL, label: "All Follow-up Status" },
              ...FOLLOWUP_STATUS_OPTIONS,
            ]}
          />
          <Select
            containerClassName="w-40"
            value={orderStatusFilter}
            onChange={(e) => setOrderStatusFilter(e.target.value)}
            options={[
              { value: FILTER_ALL, label: "All Order Status" },
              ...ORDER_STATUS_OPTIONS,
            ]}
          />
          <Button variant="ghost" icon={RefreshCw} disabled={loading} onClick={loadFollowups}>
            Refresh
          </Button>
        </div>
      </div>

      <div className="mt-6">
        {error && (
          <Card className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-danger-50 text-danger-600">
              <History className="h-6 w-6" />
            </div>
            <h2 className="font-display text-lg font-semibold text-ink-900">
              Could not load follow-ups
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
                    {COLUMNS.map((c) => (
                      <th key={c.key} className="px-4 py-3 text-left font-semibold text-ink-600 whitespace-nowrap">
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {COLUMNS.map((_, j) => (
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

        {!error && !loading && filteredRecords.length === 0 && (
          <Card className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-50 text-accent-600">
              <History className="h-6 w-6" />
            </div>
            <h2 className="font-display text-lg font-semibold text-ink-900">
              {hasActiveFilters ? "No matching follow-ups" : "No follow-ups yet"}
            </h2>
            <p className="max-w-sm text-sm text-ink-400">
              {hasActiveFilters
                ? "Try a different search term or clear the filters."
                : "Submitted follow-ups and order status updates will appear here."}
            </p>
            {hasActiveFilters && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSubmissionTypeFilter(FILTER_ALL);
                  setFollowupStatusFilter(FILTER_ALL);
                  setOrderStatusFilter(FILTER_ALL);
                }}
                className="text-sm font-medium text-accent-600 hover:text-accent-700 cursor-pointer"
              >
                Clear filters
              </button>
            )}
          </Card>
        )}

        {!error && !loading && filteredRecords.length > 0 && (
          <Card>
            <div className="flex items-center justify-between border-b border-ink-50 px-6 py-4">
              <p className="text-sm text-ink-500">
                Showing{" "}
                <span className="font-semibold text-ink-800">{filteredRecords.length}</span> of{" "}
                <span className="font-semibold text-ink-800">{records.length}</span> follow-up
                record{records.length === 1 ? "" : "s"} (newest first)
              </p>
            </div>
            <div className="overflow-x-auto rounded-lg border border-ink-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-ink-50 border-b border-ink-100">
                    {COLUMNS.map((c) => (
                      <th key={c.key} className="px-4 py-3 text-left font-semibold text-ink-600 whitespace-nowrap">
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((record) => (
                    <tr
                      key={`${record.__sheetRow}-${record.Timestamp}`}
                      className="border-b border-ink-50 transition-colors hover:bg-ink-50/50"
                    >
                      {COLUMNS.map((c) => (
                        <td
                          key={c.key}
                          className={cn(
                            "px-4 py-3 align-top whitespace-pre-wrap",
                            c.key === "Quotation No" && "font-mono text-xs font-semibold text-accent-600 whitespace-nowrap",
                            c.key === "Followup Remark" || c.key === "Remark for Order" ? "min-w-[180px]" : ""
                          )}
                        >
                          {c.render(record)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  );
}