"use client";

import { useCallback, useMemo, useState } from "react";
import { useToast } from "@/hooks/useToast";
import { validateQuotation } from "@/lib/validation/quotationSchema";
import { createEmptyItemRow } from "@/lib/constants/quotationOptions";
import { computeQuotationTotals } from "@/lib/utils/formatters";

const INITIAL_CUSTOMER = {
  customerName: "",
  fullAddressGst: "",
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

export function useQuotationForm() {
  const toast = useToast();
  const [customer, setCustomer] = useState(INITIAL_CUSTOMER);
  const [quotation, setQuotation] = useState(INITIAL_QUOTATION);
  const [items, setItems] = useState([createEmptyItemRow()]);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [lastQuotationId, setLastQuotationId] = useState(null);

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

    setSubmitting(true);
    try {
      const response = await fetch("/api/quotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        if (result.errors && Object.keys(result.errors).length) {
          setErrors(result.errors);
        }
        toast.error(
          "Couldn't submit quotation",
          result.message || "Something went wrong. Please try again."
        );
        return { success: false };
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
  }, [customer, quotation, items, toast, resetForm]);

  return {
    customer,
    quotation,
    items,
    errors,
    totals,
    submitting,
    lastQuotationId,
    updateCustomerField,
    updateQuotationField,
    updateItemField,
    addItem,
    removeItem,
    submit,
  };
}
