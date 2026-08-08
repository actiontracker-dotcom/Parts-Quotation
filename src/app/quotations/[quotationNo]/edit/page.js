"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import QuotationForm from "@/components/quotations/QuotationForm";

export default function EditQuotationPage() {
  const params = useParams();

  // Defensive decode: the route may deliver the quotation number percent-encoded
  // (e.g. "DEEP%2FM-SPR%2F26-27%2FQ000001"). Always decode before use so the
  // display and the fetch match the sheet value.
  let quotationNo = params.quotationNo || "";
  try {
    quotationNo = decodeURIComponent(quotationNo);
  } catch {
    // already decoded (or malformed) — keep the raw value
  }

  return (
    <AppShell breadcrumb={`Quotations / Edit / ${quotationNo}`} title="Edit Quotation">
      <Link
        href="/quotations"
        className="inline-flex items-center gap-1 text-sm font-medium text-ink-500 hover:text-ink-800 transition-colors mb-4"
      >
        <ChevronLeft className="h-4 w-4" />
        Back
      </Link>
      <QuotationForm mode="edit" quotationNo={quotationNo} />
    </AppShell>
  );
}