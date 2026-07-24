import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import QuotationForm from "@/components/quotations/QuotationForm";

export const metadata = {
  title: "New Quotation | Quotation Manager",
};

export default function NewQuotationPage() {
  return (
    <AppShell breadcrumb="Quotations / New" title="New Quotation">
      <Link
        href="/quotations"
        className="inline-flex items-center gap-1 text-sm font-medium text-ink-500 hover:text-ink-800 transition-colors mb-4"
      >
        <ChevronLeft className="h-4 w-4" />
        Back
      </Link>
      <QuotationForm />
    </AppShell>
  );
}
