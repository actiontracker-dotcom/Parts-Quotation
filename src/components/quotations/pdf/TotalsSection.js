import { View, Text } from "@react-pdf/renderer";
import { styles } from "./styles";
import { formatCurrency, computeLineTotal, toNumber } from "@/lib/utils/formatters";
import { amountInWords } from "@/lib/utils/amountInWords";
import { DEFAULT_GST_RATE } from "@/lib/constants/quotationOptions";

// GST is charged at the business rule rate (18%) on the taxable value
// (material value after discount). Intra-state supplies (Chhattisgarh,
// state code 22) split the tax into SGST + CGST; all other states use IGST.
export default function TotalsSection({ items, customer }) {
  const materialValue = items.reduce((sum, item) => sum + computeLineTotal(item), 0);
  const taxableValue = materialValue;

  const effectiveGstRate = items.length
    ? toNumber(items[0].gstRate || items[0].gst) || DEFAULT_GST_RATE
    : DEFAULT_GST_RATE;

  const totalGstRate = taxableValue * (effectiveGstRate / 100);

  const isIntraState =
    String(customer?.stateCode || "").trim() === "22" ||
    String(customer?.stateName || "").trim().toLowerCase() === "chhattisgarh";

  const halfRate = effectiveGstRate / 2;
  const cgst = totalGstRate / 2;
  const sgst = totalGstRate / 2;
  const totalWithTax = taxableValue + totalGstRate;

  return (
    <>
      <View style={styles.belowTableRow}>
        <View style={styles.declarationBox}>
          <Text style={styles.declarationTitle}>Declaration</Text>
          <Text style={styles.declarationText}>
            Certified that the particulars given are true &amp; correct &amp; the
            amount Indicated represents the price actually charged &amp; that
            there is no flow of Additional consideration directly or indirectly
            from the buyer.
          </Text>
        </View>

        <View style={styles.totalsBox}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Material Value</Text>
            <Text style={styles.totalValue}>{formatCurrency(materialValue)}</Text>
          </View>
          {isIntraState ? (
            <>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>SGST @ {halfRate}%</Text>
                <Text style={styles.totalValue}>{formatCurrency(sgst)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>CGST @ {halfRate}%</Text>
                <Text style={styles.totalValue}>{formatCurrency(cgst)}</Text>
              </View>
            </>
          ) : (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>IGST @ {effectiveGstRate}%</Text>
              <Text style={styles.totalValue}>{formatCurrency(totalGstRate)}</Text>
            </View>
          )}
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>TOTAL VALUE</Text>
            <Text style={styles.grandTotalValue}>{formatCurrency(Math.round(totalWithTax))}</Text>
          </View>
        </View>
      </View>

      <View style={styles.amountWordsRow}>
        <Text style={styles.amountWordsLabel}>Amount Chargeable (in words) </Text>
        <Text style={styles.amountWordsValue}>{amountInWords(totalWithTax)}</Text>
        <Text style={styles.eoe}>(E. &amp; O.E.)</Text>
      </View>

      <Text style={styles.priceNote}>
        Price Quoted are as per current list of our principal any changes in
        price will be applicable at the time of delivery.
      </Text>
    </>
  );
}
