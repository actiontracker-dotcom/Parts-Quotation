"use client";

import { useCallback, useMemo, useState } from "react";
import { useToast } from "@/hooks/useToast";
import { validateQuotation } from "@/lib/validation/quotationSchema";
import {
  createEmptyItemRow,
  DEFAULT_UOM,
  DEFAULT_GST_RATE,
} from "@/lib/constants/quotationOptions";
import { computeQuotationTotals } from "@/lib/utils/formatters";

const INITIAL_CUSTOMER = {
  customerName: "",
  fullAddressGst: "",
  fullAddress: "",
  gstNo: "",
  stateName: "",
  stateCode: "",
  contactPerson: "",
  contactNumber: "",
  designation: "",
  emailTo: "",
  emailCc: "",
  location: "",
  engineerRemark: "",
  userId: "",
};

const INITIAL_QUOTATION = {
  division: "",
  sourceOfEnquiry: "",
  enquiryGeneratedBy: "",
  quotationDate: "",
  partyReferenceNumber: "",
  partyReferenceDate: "",
  paymentTerms: "",
  quotationValidity: "",
  termsOfDelivery: "",
  quotationFollowUpBy: "",
  reviseNumber: "",
};

export function useQuotationForm({ mode = "create", quotationNo = null } = {}) {
  const toast = useToast();
  const [customer, setCustomer] = useState(INITIAL_CUSTOMER);
  const [quotation, setQuotation] = useState(INITIAL_QUOTATION);
  const [items, setItems] = useState([createEmptyItemRow()]);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [lastQuotationId, setLastQuotationId] = useState(null);
  const [isEditMode, setIsEditMode] = useState(mode === "edit");
  const [editingQuotationNo, setEditingQuotationNo] = useState(
    mode === "edit" ? quotationNo : null
  );

  const totals = useMemo(() => computeQuotationTotals(items), [items]);

  const updateCustomerField = useCallback((field, value) => {
    setCustomer((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [`customer.${field}`]: undefined }));
  }, []);

  const updateQuotationField = useCallback((field, value) => {
    setQuotation((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [`quotation.${field}`]: undefined }));
  }, []);

  const updateItemField = useCallback((rowId, field, value) => {
    setItems((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, [field]: value } : row))
    );
    setErrors((prev) => {
      const index = items.findIndex((row) => row.id === rowId);
      if (index === -1) return prev;
      return { ...prev, [`items.${index}.${field}`]: undefined };
    });
  }, [items]);

  const addItem = useCallback(() => {
    setItems((prev) => [...prev, createEmptyItemRow()]);
  }, []);

  const removeItem = useCallback((rowId) => {
    setItems((prev) => (prev.length > 1 ? prev.filter((row) => row.id !== rowId) : prev));
  }, []);

  const resetForm = useCallback(() => {
    setCustomer(INITIAL_CUSTOMER);
    setQuotation(INITIAL_QUOTATION);
    setItems([createEmptyItemRow()]);
    setErrors({});
  }, []);

  // Populate the form with an existing quotation and switch into EDIT MODE.
  // The quotation number acts as the unique identifier and never changes.
  const loadQuotation = useCallback((data, quotationNumber) => {
    const customerData = data.customer || {};
    const quotationData = data.quotation || {};

    setCustomer({
      customerName: customerData.customerName || "",
      fullAddressGst: customerData.fullAddressGst || "",
      fullAddress: customerData.fullAddress || "",
      gstNo: customerData.gstNo || "",
      stateName: customerData.stateName || "",
      stateCode: customerData.stateCode || "",
      contactPerson: customerData.contactPerson || "",
      contactNumber: customerData.contactNumber || "",
      designation: customerData.designation || "",
      emailTo: customerData.emailTo || "",
      emailCc: customerData.emailCc || "",
      location: customerData.location || "",
      engineerRemark: customerData.engineerRemark || "",
      userId: customerData.userId || "",
    });

    setQuotation({
      division: quotationData.division || "",
      sourceOfEnquiry: quotationData.sourceOfEnquiry || "",
      enquiryGeneratedBy: quotationData.enquiryGeneratedBy || "",
      quotationDate: quotationData.quotationDate || "",
      partyReferenceNumber: quotationData.partyReferenceNumber || "",
      partyReferenceDate: quotationData.partyReferenceDate || "",
      paymentTerms: quotationData.paymentTerms || "",
      quotationValidity: quotationData.quotationValidity || "",
      termsOfDelivery: quotationData.termsOfDelivery || "",
      quotationFollowUpBy: quotationData.quotationFollowUpBy || "",
      reviseNumber: quotationData.reviseNumber || "",
    });

    const mappedItems = (data.items || []).map((item, index) => ({
      id: `row-${index}-${Date.now()}`,
      partNumber: item.partNumber || "",
      partDescription: item.description || item.partDescription || "",
      quantity: item.quantity != null ? String(item.quantity) : "",
      unitPrice: item.unitPrice != null ? String(item.unitPrice) : "",
      otherRate: item.otherRate != null ? String(item.otherRate) : "",
      discount: item.discount != null ? String(item.discount) : "",
      availability: item.availability || "",
      priceWef: item.priceWef || "",
      liveStock: item.liveStock || "",
      hsnCode: item.hsnCode || "",
      uom: item.uom || DEFAULT_UOM,
      gstRate: item.gstRate != null ? String(item.gstRate) : String(DEFAULT_GST_RATE),
      group: item.group || "",
      subGroup: item.subGroup || "",
      lastPurchaseDate: item.lastPurchaseDate || "",
      totalQty: item.totalQty != null ? String(item.totalQty) : "",
      totalPrice: item.totalPrice != null ? String(item.totalPrice) : "",
    }));

    setItems(mappedItems.length > 0 ? mappedItems : [createEmptyItemRow()]);
    setErrors({});
    setIsEditMode(true);
    setEditingQuotationNo(quotationNumber || data.quotationNo || null);
  }, []);

  const submit = useCallback(async () => {
    const payload = { customer, quotation, items };
    const { success, errors: validationErrors } = validateQuotation(payload);

    if (!success) {
      setErrors(validationErrors);
      toast.error(
        "Check the form for errors",
        "Some required fields are missing or invalid."
      );
      return { success: false };
    }

    const isEdit = isEditMode && editingQuotationNo;
    const method = isEdit ? "PUT" : "POST";
    const url = isEdit
      ? `/api/quotations/${encodeURIComponent(editingQuotationNo)}`
      : "/api/quotations";

    setSubmitting(true);
    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        if (result.errors && Object.keys(result.errors).length) {
          setErrors(result.errors);
        }
        toast.error(
          isEdit ? "Couldn't update quotation" : "Couldn't submit quotation",
          result.message || "Something went wrong. Please try again."
        );
        return { success: false };
      }

      if (isEdit) {
        toast.success("Quotation updated", `Reference ${editingQuotationNo} updated successfully.`);
        return { success: true, quotationId: editingQuotationNo };
      }

      setLastQuotationId(result.quotationId);
      toast.success("Quotation submitted", `Reference ${result.quotationId} saved successfully.`);
      resetForm();
      return { success: true, quotationId: result.quotationId };
    } catch (error) {
      toast.error("Network error", "Couldn't reach the server. Check your connection and retry.");
      return { success: false };
    } finally {
      setSubmitting(false);
    }
  }, [customer, quotation, items, isEditMode, editingQuotationNo, toast, resetForm]);

  return {
    customer,
    quotation,
    items,
    errors,
    totals,
    submitting,
    lastQuotationId,
    isEditMode,
    editingQuotationNo,
    loadQuotation,
    updateCustomerField,
    updateQuotationField,
    updateItemField,
    addItem,
    removeItem,
    submit,
  };
}