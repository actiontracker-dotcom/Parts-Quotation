import React from "react";
import { pdf } from "@react-pdf/renderer";
import QuotationPDF from "@/components/quotations/pdf/QuotationPDF";

export async function generateQuotationPdf({ customer, quotation, items, quotationId }) {
  const doc = React.createElement(QuotationPDF, {
    customer,
    quotation,
    items: items.map(normalizeItem),
    quotationNo: quotationId,
  });

  const instance = pdf(doc);
  const blob = await instance.toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${quotationId || "quotation"}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function normalizeItem(item) {
  return {
    ...item,
    description: item.description || item.partDescription || "",
  };
}
