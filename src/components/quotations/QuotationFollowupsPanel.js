"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Loader2,
  Inbox,
  RefreshCw,
  Clock,
  CalendarClock,
  PackageCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  CircleDot,
  ClipboardList,
  StickyNote,
  History,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
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

// Columns that are never shown in the quotation detail Follow-up cards. They
// are still stored/returned by the API — they are only hidden here because the
// quotation number is already shown at the top of the details modal.
const HIDDEN_KEYS = new Set(["Quotation No"]);

// Presentation metadata per submission type (icon + soft badge/avatar colors).
const TYPE_META = {
  "Next Follow-up": {
    icon: CalendarClock,
    badgeClass: "bg-accent-50 text-accent-700",
    avatarClass: "bg-accent-50 text-accent-600",
  },
  "Order Status": {
    icon: PackageCheck,
    badgeClass: "bg-amber-50 text-amber-700",
    avatarClass: "bg-amber-50 text-amber-600",
  },
};

const FALLBACK_TYPE = {
  icon: ClipboardList,
  badgeClass: "bg-ink-100 text-ink-600",
  avatarClass: "bg-ink-100 text-ink-600",
};

// Soft enterprise pills for known order/follow-up status values.
const STATUS_STYLES = {
  Won: { className: "bg-teal-50 text-teal-700", icon: CheckCircle2 },
  Loss: { className: "bg-danger-50 text-danger-600", icon: XCircle },
  Dead: { className: "bg-danger-50 text-danger-600", icon: XCircle },
  Partial: { className: "bg-amber-50 text-amber-700", icon: AlertCircle },
  Pending: { className: "bg-amber-50 text-amber-700", icon: Clock },
  Completed: { className: "bg-teal-50 text-teal-700", icon: CheckCircle2 },
};

function visibleColumns(record) {
  const entries = COLUMN_ORDER
    .filter((key) => !INTERNAL_KEYS.has(key) && !HIDDEN_KEYS.has(key) && hasValue(record[key]))
    .map((key) => ({ key, label: COLUMN_LABELS[key] || key, value: record[key] }));

  const extraKeys = Object.keys(record)
    .filter(
      (key) =>
        !INTERNAL_KEYS.has(key) &&
        !HIDDEN_KEYS.has(key) &&
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

function isRemarkField(key) {
  return key === "Remark for Order" || key === "Followup Remark";
}

function TypePill({ type }) {
  const t = String(type || "").trim();
  const meta = TYPE_META[t] || FALLBACK_TYPE;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
        meta.badgeClass
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {t || "Record"}
    </span>
  );
}

function StatusBadge({ value }) {
  const v = String(value || "").trim();
  const meta = STATUS_STYLES[v] || {
    className: "bg-ink-100 text-ink-600",
    icon: CircleDot,
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
        meta.className
      )}
    >
      <meta.icon className="h-3.5 w-3.5" />
      {v || "-"}
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
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-600">
            <History className="h-[18px] w-[18px]" />
          </span>
          <div>
            <h3 className="text-sm font-semibold tracking-wide text-ink-900">
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
        <div className="relative">
          {/* subtle vertical timeline rail */}
          <div aria-hidden className="absolute inset-y-0 left-[6px] w-px bg-ink-100" />

          <div className="space-y-5">
            {records.map((record, idx) => {
              const isOrderRecord =
                String(record["Submission Type"] || "").trim() === "Order Status";
              const typeMeta = TYPE_META[String(record["Submission Type"] || "").trim()] || FALLBACK_TYPE;
              const TypeIcon = typeMeta.icon;
              const cols = visibleColumns(record).filter(
                (col) => col.key !== "Timestamp" && col.key !== "Submission Type"
              );

              return (
                <div key={idx} className="relative pl-7 sm:pl-10">
                  {/* timeline node */}
                  <span
                    aria-hidden
                    className="absolute left-0 top-[35px] h-[13px] w-[13px] rounded-full border-2 border-white bg-accent-500 shadow-sm sm:top-[39px]"
                  />

                  <article className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card transition-all duration-150 hover:border-ink-200 hover:shadow-card-hover sm:p-6">
                    <header className="flex flex-wrap items-start justify-between gap-3 pb-5">
                      <div className="flex items-start gap-3.5">
                        <span
                          className={cn(
                            "flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
                            typeMeta.avatarClass
                          )}
                        >
                          <TypeIcon className="h-5 w-5" />
                        </span>
                        <div>
                          <h4 className="text-lg font-semibold tracking-tight text-ink-900">
                            Follow-up #{records.length - idx}
                          </h4>
                          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-ink-400">
                            <Clock className="h-3.5 w-3.5" />
                            {record.Timestamp ? formatDateTime(record.Timestamp) : "—"}
                          </p>
                        </div>
                      </div>
                      <TypePill type={record["Submission Type"]} />
                    </header>

                    <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
                      {cols.map((col) => {
                        const isRemark = isRemarkField(col.key);
                        const isLong = col.value && String(col.value).length > 60;
                        const isFullWidthRemark = isOrderRecord && isRemark;
                        const spanFull =
                          isFullWidthRemark ||
                          (isLong && !isRemark) ||
                          (isOrderRecord &&
                            (col.key === "Order Received date" || col.key === "Order Date"));
                        const showNoteBox = isFullWidthRemark || (isRemark && isLong);

                        return (
                          <div key={col.key} className={spanFull ? "sm:col-span-2" : ""}>
                            <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-500">
                              {isRemark && <StickyNote className="h-3 w-3" />}
                              {col.label}
                            </p>
                            {col.key === "Order Status" || col.key === "Followup Status" ? (
                              <div className="mt-2">
                                <StatusBadge value={col.value} />
                              </div>
                            ) : showNoteBox ? (
                              <div className="mt-2 rounded-xl border border-ink-100 bg-ink-50/60 px-3.5 py-2.5 text-sm leading-relaxed text-ink-800 whitespace-pre-wrap break-words">
                                {displayValue(col.key, col.value)}
                              </div>
                            ) : (
                              <p className="mt-2 text-[15px] font-medium text-ink-900 whitespace-pre-wrap break-words">
                                {displayValue(col.key, col.value)}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </article>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
