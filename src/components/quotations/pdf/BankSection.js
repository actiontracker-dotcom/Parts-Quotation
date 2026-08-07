import { View, Text } from "@react-pdf/renderer";
import { styles } from "./styles";

const BANK_DETAILS = {
  bank: "ICICI Bank",
  branch: "CIVIL LINE BRANCH, RAIPUR",
  ifsc: "ICIC0000161",
  accountNo: "016105000160",
};

const COMPANY_NAME = "DEEPSIKHA ENTERPRISES";

// Two-column bordered box matching the original: bank details as a single
// wrapped paragraph on the left, "For {Company}" / "Authorised Signatory"
// right-aligned on the right (with space reserved above the signature line,
// as in the source PDF).
export default function BankSection() {
  return (
    <View style={styles.bankBox}>
      <View style={styles.bankLeft}>
        <Text style={styles.bankText}>
          BANK DETAILS :- {BANK_DETAILS.bank}, {BANK_DETAILS.branch},{"\n"}
          IFSC CODE - {BANK_DETAILS.ifsc}, A/C NO - {BANK_DETAILS.accountNo}
        </Text>
      </View>
      <View style={styles.bankRight}>
        <Text style={styles.signatoryFor}>For {COMPANY_NAME}</Text>
        <Text style={styles.signatoryText}>Authorised Signatory</Text>
      </View>
    </View>
  );
}
