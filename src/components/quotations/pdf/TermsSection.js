import { View, Text } from "@react-pdf/renderer";
import { styles } from "./styles";

// Single-column "LABEL : value" list matching the original TERMS & CONDITIONS
// block, with the Contact Person row appended at the bottom (as in the
// source PDF), instead of a separate boxed section.
export default function TermsSection({ quotation }) {
  // Format VALIDITY: append "Days" if not already present
  const formatValidity = (value) => {
    if (!value) return value;
    const strValue = String(value).trim();
    return strValue.toLowerCase().includes("days") ? strValue : `${strValue} Days`;
  };

  const terms = [
    { label: "PAYMENT", value: quotation.paymentTerms },
    { label: "VALIDITY", value: formatValidity(quotation.quotationValidity) },
    { label: "DESPATCH", value: "By road on to pay Basis, EX-SHOP" },
    { label: "GST", value: "As Above" },
    { label: "DELIVERY", value: quotation.termsOfDelivery },
  ];

  const visibleTerms = terms.filter((t) => t.value);

  // Contact Person comes from quotationFollowUpBy
  const contactValue = quotation.quotationFollowUpBy || null;

  if (visibleTerms.length === 0 && !contactValue) return null;

  return (
    <View style={styles.termsSection}>
      <Text style={styles.termsTitle}>TERMS &amp; CONDITIONS :</Text>
      {visibleTerms.map((term) => (
        <View key={term.label} style={styles.termsRow}>
          <Text style={styles.termsLabel}>{term.label}</Text>
          <Text style={styles.termsSep}>:</Text>
          <Text style={styles.termsValue}>{String(term.value)}</Text>
        </View>
      ))}
      {contactValue ? (
        <View style={styles.termsRow}>
          <Text style={styles.termsLabel}>Contact Person</Text>
          <Text style={styles.termsSep}>:</Text>
          <Text style={styles.termsValue}>{contactValue}</Text>
        </View>
      ) : null}
    </View>
  );
}
