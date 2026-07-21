import AppShell from "@/components/layout/AppShell";
import QuotationForm from "@/components/quotations/QuotationForm";

export const metadata = {
  title: "New Quotation | Quotation Manager",
};

export default function NewQuotationPage() {
  return (
    <AppShell breadcrumb="Quotations / New" title="New Quotation">
      <QuotationForm />
    </AppShell>
  );
}
