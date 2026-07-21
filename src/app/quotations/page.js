import Link from "next/link";
import { FileText, Plus } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

export const metadata = {
  title: "Quotations | Quotation Manager",
};

export default function QuotationsPage() {
  return (
    <AppShell breadcrumb="Quotations" title="All Quotations">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-ink-400">
          Every quotation your team creates will be listed here.
        </p>
        <Link href="/quotations/new">
          <Button>
            <Plus className="h-4 w-4" />
            New Quotation
          </Button>
        </Link>
      </div>

      <Card className="mt-6 flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-50 text-accent-600">
          <FileText className="h-6 w-6" />
        </div>
        <h2 className="font-display text-lg font-semibold text-ink-900">
          No quotations yet
        </h2>
        <p className="max-w-sm text-sm text-ink-400">
          Start by creating your first quotation. Submitted quotations are saved straight to
          your Google Sheet and will appear here once the list view connects to it.
        </p>
        <Link href="/quotations/new" className="mt-2">
          <Button>
            <Plus className="h-4 w-4" />
            Create Quotation
          </Button>
        </Link>
      </Card>
    </AppShell>
  );
}
