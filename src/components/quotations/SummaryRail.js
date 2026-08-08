"use client";

import { useEffect, useRef, useState } from "react";
import { ReceiptText, Send, FileDown } from "lucide-react";
import Button from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils/formatters";
import { cn } from "@/lib/utils/cn";

function LedgerLine({ label, value, muted }) {
  return (
    <div className="flex items-center justify-between py-2 text-sm">
      <span className={cn("text-ink-400", muted && "text-ink-300")}>{label}</span>
      <span className="tabular-nums-mono text-ink-700">{value}</span>
    </div>
  );
}

export default function SummaryRail({ totals, submitting, onSubmit, customer, quotation, items, quotationId, isEdit = false }) {
  const [downloading, setDownloading] = useState(false);
  const [pulse, setPulse] = useState(false);
  const prevTotal = useRef(totals.grandTotal);

  useEffect(() => {
    if (prevTotal.current !== totals.grandTotal) {
      setPulse(true);
      prevTotal.current = totals.grandTotal;
      const t = setTimeout(() => setPulse(false), 400);
      return () => clearTimeout(t);
    }
  }, [totals.grandTotal]);

  return (
    <div className="lg:sticky lg:top-24 lg:self-start">
      <div className="overflow-hidden rounded-xl2 border border-ink-100 bg-white shadow-rail">
        <div className="relative bg-ink-900 px-6 py-5">
          <div
            className="absolute inset-x-0 top-0 h-6 opacity-[0.15]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(90deg, transparent, transparent 11px, rgba(255,255,255,0.6) 11px, rgba(255,255,255,0.6) 12px)",
            }}
          />
          <div className="flex items-center gap-2 text-ink-200">
            <ReceiptText className="h-4 w-4" />
            <p className="text-xs font-semibold uppercase tracking-wider">Quotation Ledger</p>
          </div>
          <p className="mt-3 font-mono text-xs text-ink-400">Live running total</p>
          <p
            className={cn(
              "mt-1 font-mono text-3xl font-semibold text-white transition-transform",
              pulse && "animate-pulse-once"
            )}
          >
            {formatCurrency(totals.grandTotal)}
          </p>
        </div>

        <div className="divide-y divide-dashed divide-ink-100 px-6 py-2">
          <LedgerLine label="Items" value={totals.itemCount} />
          <LedgerLine label="Subtotal" value={formatCurrency(totals.subtotal)} />
          <LedgerLine label="Other charges" value={formatCurrency(totals.otherCharges)} muted />
          <LedgerLine label="Discount" value={`- ${formatCurrency(totals.discountTotal)}`} muted />
        </div>

        <div className="border-t border-ink-100 px-6 py-5 space-y-3">
          <Button
            variant="secondary"
            size="md"
            icon={FileDown}
            loading={downloading}
            onClick={async () => {
              setDownloading(true);
              const { generateQuotationPdf } = await import(
                "@/lib/utils/generatePdf"
              );
              generateQuotationPdf({ customer, quotation, items, quotationId });
              setDownloading(false);
            }}
            className="w-full"
          >
            {downloading ? "Generating..." : "Download PDF"}
          </Button>
          <Button
            variant="primary"
            size="lg"
            icon={Send}
            loading={submitting}
            onClick={onSubmit}
            className="w-full"
          >
            {submitting ? (isEdit ? "Saving" : "Submitting") : isEdit ? "Save Changes" : "Submit Quotation"}
          </Button>
          <p className="text-center text-xs text-ink-300">
            {isEdit
              ? "Saves changes to this quotation in your Google Sheet."
              : "Saved directly to your Google Sheet on submit."}
          </p>
        </div>
      </div>
    </div>
  );
}
