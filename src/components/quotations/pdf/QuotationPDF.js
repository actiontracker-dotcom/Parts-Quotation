import React from "react";
import { Document, Page, Text, View } from "@react-pdf/renderer";
import { styles } from "./styles";
import PDFHeader from "./PDFHeader";
import CustomerSection from "./CustomerSection";
import ItemsTable from "./ItemsTable";
import TotalsSection from "./TotalsSection";
import TermsSection from "./TermsSection";
import BankSection from "./BankSection";
import Footer from "./Footer";

export default function QuotationPDF({ customer, quotation, items, quotationNo }) {
  return (
    <Document
      title={`Quotation ${quotationNo || ""}`}
      author="DeepSikha Enterprises"
      subject="Quotation"
    >
      <Page size="A4" style={styles.page} wrap>
        <PDFHeader />

        <View style={styles.titleBlock}>
          <Text style={styles.titleText}>QUOTATION</Text>
        </View>
        <Text style={styles.originalTag}>(Original)</Text>

        <CustomerSection
          customer={customer}
          quotationNo={quotationNo}
          quotationDate={quotation.quotationDate}
          partyRefNo={quotation.partyReferenceNumber}
          partyRefDate={quotation.partyReferenceDate}
        />

        <ItemsTable items={items} />

        <TotalsSection items={items} customer={customer} />

        <TermsSection quotation={quotation} />

        <BankSection />

        <Footer />
      </Page>
    </Document>
  );
}
