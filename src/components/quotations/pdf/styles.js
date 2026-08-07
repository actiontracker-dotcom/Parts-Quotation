import { StyleSheet } from "@react-pdf/renderer";

/**
 * Drop-in replacement for your original `styles.js`.
 * Same style keys / same component code — only the visual values changed to
 * match the tuned reference-accurate quotation layout (tight A4 margins,
 * 0.8pt black grid, Times letterhead, mint totals band).
 */

export const BORDER = "#000000";
export const TOTALS_BG = "#dff2f4";

const COLORS = {
  navy: "#0000cc",
  text: "#000000",
  muted: "#000000",
  border: BORDER,
  borderLight: BORDER,
  white: "#ffffff",
  headerBg: "#ffffff",
};

const hair = { borderWidth: 0.8, borderColor: BORDER };

export const styles = StyleSheet.create({
  page: {
    paddingTop: 22,
    paddingBottom: 18,
    paddingHorizontal: 24,
    fontFamily: "Helvetica",
    fontSize: 8,
    color: COLORS.text,
  },

  /* ---------- Header (letterhead) ---------- */
  headerContainer: { marginBottom: 0 },
  headerRow: { flexDirection: "row", alignItems: "center" },
  headerLogo: { width: 78, height: 78,objectFit: "contain",marginLeft: 120, marginRight:0 },
  headerInfo: { flexGrow: 1, alignItems: "center", paddingRight: 40, marginLeft: -120 },
  companyName: {
    fontFamily: "Times-Bold",
    fontSize: 15,
    color: "#0404fe",
    letterSpacing: 0.4,
    marginBottom: 1,
  },
  companyAddress: {
    fontFamily: "Times-Bold",
    fontSize: 8,
    textAlign: "center",
    marginTop: 2,
  },
  companyContact: {
    fontFamily: "Times-Bold",
    fontSize: 8,
    textAlign: "center",
    marginTop: 2,
  },

  /* ---------- Title ---------- */
  titleBlock: { marginTop: 10, marginBottom: 0, alignItems: "center" },
  titleText: {
    fontFamily: "Times-Bold",
    fontSize: 11,
    letterSpacing: 2.6,
    color: COLORS.text,
  },
  originalTag: {
    fontFamily: "Times-BoldItalic",
    fontSize: 9,
    textAlign: "right",
    marginTop: 4,
    marginBottom: 1,
  },

  /* ---------- Info grid (Customer + Quotation info) ---------- */
  infoBox: { ...hair, marginBottom: 0 },
  infoRow: { flexDirection: "row" },
  infoRowLast: { flexDirection: "row" },
  infoCellLeft: {
    width: "62%",
    flexDirection: "row",
    paddingHorizontal: 5,
    paddingTop: 4,
    paddingBottom: 5,
  },
  infoCellRight: {
    width: "38%",
    flexDirection: "row",
    paddingLeft: 4,
    paddingRight: 5,
    paddingTop: 4,
    paddingBottom: 5,
  },
  infoLabel: { fontFamily: "Helvetica-Bold", fontSize: 9.5 },
  infoSep: { fontSize: 9.5, marginHorizontal: 2 },
  infoValue: { fontSize: 8, flexShrink: 1 },

  infoFullRow: {
    borderTopWidth: 0.8,
    borderTopColor: BORDER,
    paddingHorizontal: 5,
    paddingTop: 3,
  },
  infoFullRowLast: {
    borderBottomWidth: 0.8,
    borderBottomColor: BORDER,
    paddingHorizontal: 5,
    paddingBottom: 2,
  },
  infoFullText: { fontSize: 9 },
  introText: { fontSize: 9, marginBottom: 1.5 },

  /* ---------- Items table ---------- */
  tableContainer: { marginBottom: 0 },
  table: {},
  // tableHeader: {
  //   flexDirection: "row",
  //   backgroundColor: COLORS.headerBg,
  //   borderBottomWidth: 0.8,
  //   borderBottomColor: BORDER,
  // },
  tableHeader: {
  flexDirection: "row",
  backgroundColor: COLORS.headerBg,
  borderBottomWidth: 0.8,
  borderBottomColor: BORDER,
  borderLeftWidth: 0.8,
  borderLeftColor: BORDER,
  borderRightWidth: 0.8,
  borderRightColor: BORDER,
},
  tableHeaderCell: {
    borderRightWidth: 0.8,
    borderRightColor: BORDER,
    paddingVertical: 4,
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    textAlign: "center",
  },
  // tableRow: {
  //   flexDirection: "row",
  //   borderBottomWidth: 0.8,
  //   borderBottomColor: BORDER,
  // },
  tableRow: {
  flexDirection: "row",
  borderBottomWidth: 0.8,
  borderBottomColor: BORDER,
  borderLeftWidth: 0.8,
  borderLeftColor: BORDER,
  borderRightWidth: 0.8,
  borderRightColor: BORDER,
},
  // tableRowAlt: {
  //   flexDirection: "row",
  //   borderBottomWidth: 0.8,
  //   borderBottomColor: BORDER,
  // },
  tableRowAlt: {
  flexDirection: "row",
  borderBottomWidth: 0.8,
  borderBottomColor: BORDER,
  borderLeftWidth: 0.8,
  borderLeftColor: BORDER,
  borderRightWidth: 0.8,
  borderRightColor: BORDER,
},
  tableCell: {
    borderRightWidth: 0.8,
    borderRightColor: BORDER,
    paddingVertical: 3.5,
    paddingHorizontal: 2,
    fontSize: 8,
  },
  tableCellRight: {
    borderRightWidth: 0.8,
    borderRightColor: BORDER,
    paddingVertical: 3.5,
    paddingHorizontal: 2,
    fontSize: 8,
    textAlign: "right",
  },
  tableCellCenter: {
    borderRightWidth: 0.8,
    borderRightColor: BORDER,
    paddingVertical: 3.5,
    paddingHorizontal: 2,
    fontSize: 8,
    textAlign: "center",
  },
  tableCellLast: { borderRightWidth: 0 },

  /* ---------- Declaration + totals ---------- */
belowTableRow: {
  flexDirection: "row",
  backgroundColor: TOTALS_BG,
  borderTopWidth: 0.8,
  borderTopColor: BORDER,
  borderLeftWidth: 0.8,
  borderLeftColor: BORDER,
  borderRightWidth: 0.8,
  borderRightColor: BORDER,
},
  declarationBox: {
    width: "66%",
    paddingHorizontal: 5,
    paddingTop: 4,
    paddingBottom: 4,
    borderRightWidth: 0.8,
    borderRightColor: BORDER,
  },
  declarationTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    textDecoration: "underline",
    marginBottom: 1,
  },
  declarationText: { fontSize: 7.6, lineHeight: 1.4 },

  totalsBox: { width: "34%", paddingTop: 4, paddingLeft: 4, paddingRight: 6 },
  totalRow: { flexDirection: "row", marginBottom: 7 },
  totalLabel: { width: "58%", fontSize: 9 },
  totalValue: { width: "42%", fontSize: 9, textAlign: "right" },
  grandTotalRow: { flexDirection: "row", marginBottom: 7 },
  grandTotalLabel: { width: "58%", fontSize: 9, fontFamily: "Helvetica-Bold" },
  grandTotalValue: {
    width: "42%",
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    textAlign: "right",
  },

  amountWordsRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    flexWrap: "wrap",
    backgroundColor: TOTALS_BG,
    borderTopWidth: 0.8,
    borderTopColor: BORDER,
    borderLeftWidth: 0.8,
    borderLeftColor: BORDER,
    borderRightWidth: 0.8,
    borderRightColor: BORDER,
    borderBottomWidth: 0.8,
    borderBottomColor: BORDER,
    paddingHorizontal: 5,
    paddingTop: 3,
    paddingBottom: 4,
  },
  amountWordsLabel: { fontFamily: "Helvetica-Bold", fontSize: 9 },
  amountWordsValue: { fontFamily: "Helvetica-Bold", fontSize: 9 },
  eoe: { fontFamily: "Helvetica-Bold", fontSize: 9, marginLeft: "auto" },

  priceNote: {
    borderLeftWidth: 0.8,
    borderLeftColor: BORDER,
    borderRightWidth: 0.8,
    borderRightColor: BORDER,
    paddingHorizontal: 5,
    paddingVertical: 4.5,
    fontSize: 9.5,
  },

  /* ---------- Terms ---------- */
  termsSection: {
    borderLeftWidth: 0.8,
    borderLeftColor: BORDER,
    borderRightWidth: 0.8,
    borderRightColor: BORDER,
    borderBottomWidth: 0.8,
    borderBottomColor: BORDER,
    paddingBottom: 2,
  },
  termsTitle: {
    paddingHorizontal: 5,
    paddingBottom: 4,
    fontFamily: "Helvetica-Bold",
    fontSize: 9.5,
  },
  termsRow: { flexDirection: "row", paddingHorizontal: 5, marginBottom: 5.5 },
  termsLabel: { width: 100, fontSize: 9 },
  termsSep: { width: 60, fontSize: 9 },
  termsValue: { fontSize: 8.5, flexShrink: 1 },

  /* ---------- Bank + signature ---------- */
  bankBox: {
    flexDirection: "row",
    borderLeftWidth: 0.8,
    borderLeftColor: BORDER,
    borderRightWidth: 0.8,
    borderRightColor: BORDER,
    borderBottomWidth: 0.8,
    borderBottomColor: BORDER,
  },
  bankLeft: {
    width: "62%",
    paddingHorizontal: 5,
    paddingVertical: 5,
    borderRightWidth: 0.8,
    borderRightColor: BORDER,
  },
  bankRight: {
    width: "38%",
    paddingHorizontal: 6,
    paddingVertical: 5,
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  bankText: { fontFamily: "Times-Bold", fontSize: 9.5, lineHeight: 1.45 },
  signatoryFor: { fontFamily: "Times-Bold", fontSize: 9.5 },
  signatoryText: { fontFamily: "Times-Bold", fontSize: 9.5, marginTop: 18 },

  /* ---------- Footer ---------- */
  footer: {
    position: "absolute",
    bottom: 18,
    left: 24,
    right: 24,
    borderWidth: 0.8,
    borderColor: BORDER,
    paddingVertical: 4,
    paddingHorizontal: 5,
  },
  footerImage: { width: "100%", objectFit: "contain" },
  footerLeft: { flexGrow: 1 },
  footerRight: { alignItems: "flex-end" },
});
