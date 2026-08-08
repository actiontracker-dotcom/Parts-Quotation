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
  link.download = buildPdfFileName(quotationId);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Build a unique, filesystem-safe PDF filename so a reprinted/downloaded
// quotation can never be confused with an earlier file with the same name.
// The quotation number is preserved, sanitized for invalid filename characters,
// and a local timestamp (YYYYMMDD_HHMMSS_mmm) keeps every download unique.
export function buildPdfFileName(quotationId) {
  const raw = quotationId || "quotation";
  const sanitized = raw
    .replace(/[\\/:*?"<>|]+/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_");
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  const p3 = (n) => String(n).padStart(3, "0");
  const stamp = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}_${p3(d.getMilliseconds())}`;
  return `${sanitized}_${stamp}.pdf`;
}

function normalizeItem(item) {
  return {
    ...item,
    description: item.description || item.partDescription || "",
  };
}
