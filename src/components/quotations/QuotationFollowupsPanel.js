"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Inbox, RefreshCw } from "lucide-react";
import Button from "@/components/ui/Button";
import { formatDateTime } from "@/lib/utils/formatters";

// Display metadata for known history columns. Values not listed here (future /
// unknown columns) are still rendered generically by their sheet header name.
const COLUMN_ORDER = [
  "Timestamp",
  "Submission Type",
  "Next Followup Date",
  "Followup Status",
  "Followup Remark",
  "Order Status",
  "Order Number",
  "Order Received date",
  "Order Date",
  "Remark for Order",
  "Attach Order PDF",
  "Order Verification Status",
  "Attached Payment Receipt",
  "Due Days",
  "Prefilled Form",
  "Prefilled Form URL",
];

const COLUMN_LABELS = {
  Timestamp: "When",
  "Submission Type": "Type",
  "Next Followup Date": "Next Follow-up Date",
  "Followup Status": "Follow-up Status",
  "Followup Remark": "Follow-up Remark",
  "Order Status": "Order Status",
  "Order Number": "Order Number",
  "Order Received date": "Order Received Date",
  "Order Date": "Order Date",
  "Remark for Order": "Remark for Order",
  "Attach Order PDF": "Attach Order PDF",
  "Order Verification Status": "Order Verification Status",
  "Attached Payment Receipt": "Attached Payment Receipt",
  "Due Days": "Due Days",
  "Prefilled Form": "Prefilled Form",
  "Prefilled Form URL": "Prefilled Form URL",
};

const INTERNAL_KEYS = new Set(["__sheetRow"]);

function visibleColumns(record) {
  const entries = COLUMN_ORDER
    .filter((key) => !INTERNAL_KEYS.has(key) && hasValue(record[key]))
    .map((key) => ({ key, label: COLUMN_LABELS[key] || key, value: record[key] }));

  const extraKeys = Object.keys(record)
    .filter(
      (key) =>
        !INTERNAL_KEYS.has(key) &&
        !COLUMN_ORDER.includes(key) &&
        hasValue(record[key])
    )
    .sort();

  for (const key of extraKeys) {
    entries.push({ key, label: key, value: record[key] });
  }

  return entries;
}

function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function isDateLike(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value).trim());
}

function displayValue(key, value) {
  if (key === "Timestamp") return formatDateTime(value);
  if (isDateLike(value)) return formatDateTime(value);
  return String(value);
}

function TypeBadge({ type }) {
  const t = String(type || "").trim();
  if (t === "Next Follow-up") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-accent-50 text-accent-700">
        Next Follow-up
      </span>
    );
  }
  if (t === "Order Status") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
        Order Status
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-ink-100 text-ink-600">
      {t || "Record"}
    </span>
  );
}

export default function QuotationFollowupsPanel({ quotationNo, onDataChanged }) {
  const [records, setRecords] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/quotations/${encodeURIComponent(quotationNo)}/followup`
      );
      const json = await res.json();
      if (json.success) {
        setRecords(json.records || []);
      } else {
        setError(json.message || "Unable to load follow-up history. Please try again.");
      }
    } catch (err) {
      setError(err.message || "Unable to load follow-up history. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [quotationNo]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Refresh the parent-provided list if provided, but never treat a failed
  // refresh as a failed history load.
  async function refreshParent() {
    if (!onDataChanged) return;
    try {
      await onDataChanged();
    } catch (refreshError) {
      console.error("Quotation data refresh failed:", refreshError);
    }
  }

  async function handleRefresh() {
    await Promise.all([loadHistory(), refreshParent()]);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-ink-500 uppercase tracking-wider">
            Follow-ups
          </h3>
          {records && (
            <p className="mt-0.5 text-xs text-ink-400">
              {records.length === 0
                ? "No follow-up history yet"
                : `${records.length} record${records.length === 1 ? "" : "s"}`}
            </p>
          )}
        </div>
        <Button
          variant="subtle"
          size="sm"
          icon={RefreshCw}
          disabled={loading}
          onClick={handleRefresh}
        >
          Refresh
        </Button>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-accent-500" />
          <p className="mt-3 text-sm text-ink-400">Loading follow-up history...</p>
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-danger-500 font-medium">{error}</p>
          <button
            onClick={handleRefresh}
            className="mt-3 text-sm font-medium text-accent-600 hover:text-accent-700 cursor-pointer"
          >
            Try again
          </button>
        </div>
      )}

      {!loading && !error && records.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-50 text-ink-400">
            <Inbox className="h-6 w-6" />
          </div>
          <p className="mt-3 text-sm text-ink-500">
            No follow-up history found for this quotation.
          </p>
        </div>
      )}

      {!loading && !error && records.length > 0 && (
        <div className="space-y-3">
          {records.map((record, idx) => (
            <div
              key={idx}
              className="rounded-lg border border-ink-100 bg-ink-50/40 p-4 space-y-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-medium text-ink-400">
                  {record.Timestamp ? formatDateTime(record.Timestamp) : `#${idx + 1}`}
                </p>
                <TypeBadge type={record["Submission Type"]} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {visibleColumns(record)
                  .filter((col) => col.key !== "Timestamp" && col.key !== "Submission Type")
                  .map((col) => (
                    <div
                      key={col.key}
                      className={col.value && String(col.value).length > 60 ? "sm:col-span-2" : ""}
                    >
                      <p className="text-xs font-medium text-ink-400">{col.label}</p>
                      <p className="text-sm text-ink-800 whitespace-pre-wrap break-words">
                        {displayValue(col.key, col.value)}
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}