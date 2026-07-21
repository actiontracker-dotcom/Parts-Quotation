"use client";

import Card from "@/components/ui/Card";
import CustomerInfoSection from "@/components/quotations/CustomerInfoSection";
import QuotationInfoSection from "@/components/quotations/QuotationInfoSection";
import ItemListSection from "@/components/quotations/ItemListSection";
import SummaryRail from "@/components/quotations/SummaryRail";
import { useQuotationForm } from "@/hooks/useQuotationForm";
import { useMasterData } from "@/hooks/useMasterData";
import { Loader2 } from "lucide-react";

export default function QuotationForm() {
  const {
    customer,
    quotation,
    items,
    errors,
    totals,
    submitting,
    updateCustomerField,
    updateQuotationField,
    updateItemField,
    addItem,
    removeItem,
    submit,
  } = useQuotationForm();

  const {
    divisions,
    paymentTerms,
    deliveryTerms,
    enquirySources,
    locations,
    engineers,
    loading,
    error,
  } = useMasterData();

  if (error) {
    console.warn("Master data failed to load, using defaults where available.", error);
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-6">
        <Card>
          <CustomerInfoSection
            values={customer}
            errors={errors}
            onChange={updateCustomerField}
            locations={locations}
          />
        </Card>
        <Card>
          <QuotationInfoSection
            values={quotation}
            errors={errors}
            onChange={updateQuotationField}
            divisions={divisions}
            paymentTerms={paymentTerms}
            deliveryTerms={deliveryTerms}
            enquirySources={enquirySources}
            engineers={engineers}
          />
        </Card>
        <Card>
          <ItemListSection
            items={items}
            errors={errors}
            onAdd={addItem}
            onRemove={removeItem}
            onChangeItem={updateItemField}
          />
        </Card>
      </div>

      <SummaryRail totals={totals} submitting={submitting} onSubmit={submit} />
    </div>
  );
}
