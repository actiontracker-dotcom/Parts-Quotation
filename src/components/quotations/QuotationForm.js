"use client";

import { useCallback, useState } from "react";
import Card from "@/components/ui/Card";
import CustomerInfoSection from "@/components/quotations/CustomerInfoSection";
import QuotationInfoSection from "@/components/quotations/QuotationInfoSection";
import ItemListSection from "@/components/quotations/ItemListSection";
import SummaryRail from "@/components/quotations/SummaryRail";
import CustomerModal from "@/components/quotations/CustomerModal";
import { useQuotationForm } from "@/hooks/useQuotationForm";
import { useMasterData } from "@/hooks/useMasterData";
import { useToast } from "@/hooks/useToast";

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
    lastQuotationId,
  } = useQuotationForm();

  const {
    divisions,
    paymentTerms,
    deliveryTerms,
    enquirySources,
    locations,
    engineers,
    error: masterError,
  } = useMasterData();

  const toast = useToast();
  const [modalOpen, setModalOpen] = useState(false);

  if (masterError) {
    console.warn("Master data failed to load, using defaults where available.", masterError);
  }

  const handleAddCustomer = useCallback(() => {
    setModalOpen(true);
  }, []);

  const handleCustomerSaved = useCallback(
    (customer) => {
      updateCustomerField("customerName", customer.customerName);
      updateCustomerField(
        "fullAddressGst",
        customer.fullAddressWithGST ||
          [customer.fullAddress, customer.gstNo && `GSTIN: ${customer.gstNo}`]
            .filter(Boolean)
            .join("\n")
      );
      updateCustomerField("fullAddress", customer.fullAddress || "");
      updateCustomerField("gstNo", customer.gstNo || "");
      updateCustomerField("stateName", customer.stateName || "");
      updateCustomerField("stateCode", customer.stateCode || "");
      if (customer.contactPerson) updateCustomerField("contactPerson", customer.contactPerson);
      if (customer.contactNumber) updateCustomerField("contactNumber", customer.contactNumber);
      if (customer.designation) updateCustomerField("designation", customer.designation);
      if (customer.email) updateCustomerField("emailTo", customer.email);
      toast.success("Customer saved", `${customer.customerName} added successfully.`);
    },
    [updateCustomerField, toast]
  );

  return (
    <>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <Card>
            <CustomerInfoSection
              values={customer}
              errors={errors}
              onChange={updateCustomerField}
              locations={locations}
              onAddCustomer={handleAddCustomer}
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

        <SummaryRail
          totals={totals}
          submitting={submitting}
          onSubmit={submit}
          customer={customer}
          quotation={quotation}
          items={items}
          quotationId={lastQuotationId}
        />
      </div>

      <CustomerModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleCustomerSaved}
        prefillName={customer.customerName}
      />
    </>
  );
}
