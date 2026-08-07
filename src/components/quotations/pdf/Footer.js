import { View, Image } from "@react-pdf/renderer";
import { styles } from "./styles";
import footerImage from "./Quotation footer.png";

export default function Footer() {
  return (
    <View style={styles.footer} fixed>
      <Image src={footerImage.src} style={styles.footerImage} />
    </View>
  );
}
