import { View, Text } from "@react-pdf/renderer";
import { styles } from "./styles";
import { formatDate } from "@/lib/utils/formatters";

// Two-column bordered grid replicating the original quotation's
// Customer / Quotation-info box, followed by the "Dear Sir," opening
// lines inside the same bordered box.
export default function CustomerSection({
  customer,
  quotationNo,
  quotationDate,
  partyRefNo,
  partyRefDate,
}) {
  const rows = [
    {
      left: { label: "Customer Name", sep: " :-", value: customer.customerName },
      right: { label: "Quotation No.", sep: " :", value: quotationNo },
    },
    {
      left: { label: "Address", sep: " :-", value: customer.fullAddress },
      right: { label: "Quotation Dt.", sep: " :", value: formatDate(quotationDate) },
    },
    {
      left: null,
      right: { label: "Partyref No.", sep: " :", value: partyRefNo },
    },
    {
      left: null,
      right: { label: "Partyref Dt.", sep: " :", value: formatDate(partyRefDate) },
    },
    {
      left: { label: "GSTIN/UIN", sep: " :-", value: customer.gstNo },
      right: null,
    },
    {
      left: {
        label: "State Name",
        sep: " :-",
        value: customer.stateName,
        extraLabel: "Code",
        extraValue: customer.stateCode,
      },
      right: null,
    },
    {
      left: { label: "Kind Attn", sep: " :-", value: customer.contactPerson },
      right: null,
    },
    {
      left: { label: "Contact Number", sep: " :-", value: customer.contactNumber },
      right: null,
      last: true,
    },
  ];

  return (
    <View style={styles.infoBox}>
      {rows.map((row, idx) => (
        <View key={idx} style={row.last ? styles.infoRowLast : styles.infoRow}>
          <View style={styles.infoCellLeft}>
            {row.left ? (
              row.left.extraLabel ? (
                <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      flex: 1,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        flex: 0.50, // is value ko change karke gap control kar sakte ho
                      }}
                    >
                      <Text style={styles.infoLabel}>{row.left.label}</Text>
                      <Text style={styles.infoSep}>{row.left.sep}</Text>
                      <Text style={styles.infoValue}>{row.left.value || ""}</Text>
                    </View>

                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center", // Code : 22 ko vertically center karega
                        flex: 0.18,
                      }}
                    >
                      <Text style={styles.infoLabel}>{row.left.extraLabel}</Text>
                      <Text style={styles.infoSep}>:</Text>
                      <Text style={styles.infoValue}>{row.left.extraValue || ""}</Text>
                    </View>
                  </View>
              ) : (
                row.left.label === "Address" ? (
                  <View style={{ flexDirection: "row", flex: 1, alignItems: "flex-start" }}>
                    <Text style={styles.infoLabel}>{row.left.label}</Text>
                    <Text style={styles.infoSep}>{row.left.sep}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.infoValue}>{row.left.value || ""}</Text>
                    </View>
                  </View>
                ) : (
                  <>
                    <Text style={styles.infoLabel}>{row.left.label}</Text>
                    <Text style={styles.infoSep}>{row.left.sep}</Text>
                    <Text style={styles.infoValue}>{row.left.value || ""}</Text>
                  </>
                )
              )
            ) : (
              <Text style={styles.infoValue}> </Text>
            )}
          </View>
          <View style={styles.infoCellRight}>
            {row.right ? (
              <>
                <Text style={styles.infoLabel}>{row.right.label}</Text>
                <Text style={styles.infoSep}>{row.right.sep}</Text>
                <Text style={styles.infoValue}>{row.right.value || ""}</Text>
              </>
            ) : (
              <Text style={styles.infoValue}> </Text>
            )}
          </View>
        </View>
      ))}

      <View style={styles.infoFullRow}>
        <Text style={styles.introText}>Dear Sir,</Text>
      </View>
      <View style={styles.infoFullRowLast}>
        <Text style={styles.introText}>
          We are Please to Quote our Best Price as Below
        </Text>
      </View>
    </View>
  );
}
