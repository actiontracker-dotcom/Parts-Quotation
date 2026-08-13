const readBack = {
  quotationNo: "DEEP/M-SPR/26-27/Q000020",
  quotation: {
    division: "M-SPR"
  }
};
const normalizedQuotationNo = "DEEP/M-SPR/26-27/Q000020";

console.log("Verification Logic Test:");
console.log("------------------------");
console.log("readBack.quotation.quotationNo:", readBack.quotation.quotationNo);
console.log("readBack.quotationNo:", readBack.quotationNo);
console.log("normalizedQuotationNo:", normalizedQuotationNo);
console.log("OLD MATCH (readBack.quotation.quotationNo === normalizedQuotationNo):", readBack.quotation.quotationNo === normalizedQuotationNo);
console.log("NEW MATCH (readBack.quotationNo === normalizedQuotationNo):", readBack.quotationNo === normalizedQuotationNo);
