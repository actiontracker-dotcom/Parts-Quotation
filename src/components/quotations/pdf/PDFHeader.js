import { View, Text, Image } from "@react-pdf/renderer";
import { styles } from "./styles";
import logo from "./Logo.jpeg";

const COMPANY = {
  name: "DEEPSIKHA ENTERPRISES",
  address1: "29-B, KEDIA BUSINESS PARK, DURG ROAD,",
  address2: "TATIBANDH, RAIPUR (C.G)PIN-492099",
  phones: "Mob: 89590-00021,89590-00061,8959860000",
  emailWebsite: "Email: deepsikha.ent@gmail.com website:www.deepsikha.in",
};

export default function PDFHeader() {
  return (
    <View style={styles.headerContainer}>
      <View style={styles.headerRow}>
        <Image src={logo.src} style={styles.headerLogo} />
        <View style={styles.headerInfo}>
          <Text style={styles.companyName}>{COMPANY.name}</Text>
          <Text style={styles.companyAddress}>{COMPANY.address1}</Text>
          <Text style={styles.companyAddress}>{COMPANY.address2}</Text>
          <Text style={styles.companyContact}>{COMPANY.phones}</Text>
          <Text style={styles.companyContact}>{COMPANY.emailWebsite}</Text>
        </View>
      </View>
    </View>
  );
}
