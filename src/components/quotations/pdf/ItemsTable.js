import { View, Text } from "@react-pdf/renderer";
import { styles } from "./styles";
import { formatCurrency } from "@/lib/utils/formatters";
import { computeLineTotal } from "@/lib/utils/formatters";

const COL_WIDTHS = [5, 12, 24, 8, 6, 6, 8, 10, 9, 12];

const HEADERS = [
  "SN", "Part No.", "Descriptions", "HSN Code", "UOM",
  "GST (%)", "Quantity", "Rate", "Disc.", "Amount",
];

export default function ItemsTable({ items }) {
  const rows = items.map((item, i) => {
    const hsn = item.hsnCode || item.hsn || "-";
    const uom = item.uom || "-";
    const gstRate = item.gstRate || item.gst || "-";
    const qty = Number(item.quantity) || 0;
    const unitPrice = Number(item.unitPrice) || 0;
    const disc = item.discount ? `${Number(item.discount)}%` : "-";
    const amount = item.total ? Number(item.total) : computeLineTotal(item);

    return { hsn, uom, gstRate, qty, unitPrice, disc, amount, item, i };
  });

  const lastIdx = HEADERS.length - 1;

  const headerCells = HEADERS.map((h, i) => (
    <Text
      key={h}
      style={[
        styles.tableHeaderCell,
        { width: `${COL_WIDTHS[i]}%` },
        i === lastIdx ? styles.tableCellLast : null,
      ]}
    >
      {h}
    </Text>
  ));

  return (
    <View style={styles.tableContainer}>
      <View style={styles.table}>
        <View style={styles.tableHeader} fixed>
          {headerCells}
        </View>
        {rows.map((r, idx) => {
          const item = r.item;
          return (
            <View key={idx} style={styles.tableRow} wrap={false}>
              <Text style={[styles.tableCellCenter, { width: "5%" }]}>{idx + 1}</Text>
              <Text style={[styles.tableCell, { width: "12%" }]}>
                {item.partNumber || "-"}
              </Text>
              <Text style={[styles.tableCell, { width: "24%" }]}>
                {item.description || item.partDescription || "-"}
              </Text>
              <Text style={[styles.tableCellCenter, { width: "8%" }]}>{r.hsn}</Text>
              <Text style={[styles.tableCellCenter, { width: "6%" }]}>{r.uom}</Text>
              <Text style={[styles.tableCellCenter, { width: "6%" }]}>{r.gstRate}</Text>
              <Text style={[styles.tableCellCenter, { width: "8%" }]}>{r.qty}</Text>
              <Text style={[styles.tableCellRight, { width: "10%" }]}>
                {formatCurrency(r.unitPrice)}
              </Text>
              <Text style={[styles.tableCellCenter, { width: "9%" }]}>{r.disc}</Text>
              <Text style={[styles.tableCellRight, styles.tableCellLast, { width: "12%" }]}>
                {formatCurrency(r.amount)}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
