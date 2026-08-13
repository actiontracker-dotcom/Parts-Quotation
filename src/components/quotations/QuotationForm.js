"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Loader2 } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import CustomerInfoSection from "@/components/quotations/CustomerInfoSection";
import QuotationInfoSection from "@/components/quotations/QuotationInfoSection";
import ItemListSection from "@/components/quotations/ItemListSection";
import SummaryRail from "@/components/quotations/SummaryRail";
import CustomerModal from "@/components/quotations/CustomerModal";
import { useQuotationForm } from "@/hooks/useQuotationForm";
import { useMasterData } from "@/hooks/useMasterData";
import { useToast } from "@/hooks/useToast";

export default function QuotationForm({ mode = "create", quotationNo = null }) {
  const isEdit = mode === "edit" && !!quotationNo;

  const {
    customer,
    quotation,
    items,
    errors,
    totals,
    submitting,
    isEditMode,
    editingQuotationNo,
    updateCustomerField,
    updateQuotationField,
    updateItemField,
    addItem,
    removeItem,
    submit,
    loadQuotation,
    lastQuotationId,
  } = useQuotationForm({ mode, quotationNo });

  const [loadingEdit, setLoadingEdit] = useState(isEdit);
  const [editLoadError, setEditLoadError] = useState(null);

  useEffect(() => {
    if (!isEdit) return;
    let cancelled = false;
    setLoadingEdit(true);
    setEditLoadError(null);

    // Check sessionStorage first for newly created quotations to avoid
    // Google Sheets read-after-write propagation delay issues.
    // Only use cached data if it was created within the last 5 minutes.
    const sessionKey = `new-quotation-${quotationNo}`;
    const cachedQuotation = sessionStorage.getItem(sessionKey);
    
    if (cachedQuotation) {
      try {
        const parsed = JSON.parse(cachedQuotation);
        const cachedAt = parsed._cachedAt;
        const now = Date.now();
        const CACHE_MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes
        
        if (cachedAt && (now - cachedAt) < CACHE_MAX_AGE_MS) {
          // Cache is fresh, use it
          loadQuotation(parsed, quotationNo);
          setLoadingEdit(false);
          return;
        } else {
          // Cache is stale, remove it and fall through to API
          sessionStorage.removeItem(sessionKey);
        }
      } catch (err) {
        // If parsing fails, fall through to API call
        console.error("Failed to parse cached quotation:", err);
        sessionStorage.removeItem(sessionKey);
      }
    }

    fetch(`/api/quotations/${encodeURIComponent(quotationNo)}`)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        if (json.success) {
          loadQuotation(json.data, quotationNo);
        } else {
          setEditLoadError(json.message || "Failed to load quotation.");
        }
      })
      .catch(() => {
        if (!cancelled) setEditLoadError("Network error while loading quotation.");
      })
      .finally(() => {
        if (!cancelled) setLoadingEdit(false);
      });

    return () => { cancelled = true; };
  }, [isEdit, quotationNo, loadQuotation]);

  const {
    divisions,
    paymentTerms,
    deliveryTerms,
    enquirySources,
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

  if (loadingEdit) {
    return (
      <Card className="flex items-center justify-center gap-3 px-6 py-16">
        <Loader2 className="h-5 w-5 animate-spin text-accent-500" />
        <p className="text-sm text-ink-500">Loading quotation...</p>
      </Card>
    );
  }

  if (editLoadError) {
    return (
      <Card className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
        <p className="text-sm font-medium text-danger-500">{editLoadError}</p>
      </Card>
    );
  }

  return (
    <>
      {isEditMode && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl2 border border-accent-100 bg-accent-50/50 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-accent-500 text-white">
              <Pencil className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink-900">Edit Quotation</p>
              <p className="font-mono text-xs text-ink-500">
                Editing {editingQuotationNo || "this quotation"} — save to update.
              </p>
            </div>
          </div>
          <Button
            variant="subtle"
            size="sm"
            icon={Pencil}
            disabled={submitting}
            onClick={submit}
          >
            Edit Quotation
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <Card>
            <CustomerInfoSection
              values={customer}
              errors={errors}
              onChange={updateCustomerField}
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
          quotationId={isEditMode ? editingQuotationNo : lastQuotationId}
          isEdit={isEditMode}
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
