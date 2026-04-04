import React from "react";
import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { InvoiceSnapshot } from "@/lib/backend/invoices/types";

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#14213d",
    backgroundColor: "#ffffff",
  },
  hero: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 18,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#d7dee7",
    marginBottom: 18,
  },
  brandKicker: {
    color: "#0f766e",
    fontSize: 10,
    marginBottom: 6,
  },
  title: {
    fontSize: 22,
    fontFamily: "Times-Bold",
    marginBottom: 8,
  },
  subtle: {
    color: "#5a6980",
    lineHeight: 1.5,
  },
  card: {
    borderWidth: 1,
    borderColor: "#d7dee7",
    borderRadius: 8,
    padding: 12,
    minWidth: 190,
  },
  label: {
    color: "#5a6980",
    fontSize: 8,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  value: {
    fontSize: 12,
    marginBottom: 10,
  },
  grid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 18,
  },
  gridCard: {
    flex: 1,
    backgroundColor: "#f7f9fc",
    borderWidth: 1,
    borderColor: "#d7dee7",
    borderRadius: 8,
    padding: 12,
  },
  sectionTitle: {
    fontSize: 9,
    color: "#5a6980",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#d7dee7",
    backgroundColor: "#f7f9fc",
    paddingVertical: 8,
    paddingHorizontal: 8,
    fontSize: 8,
    color: "#5a6980",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#ebeff4",
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  colSmall: {
    width: "10%",
  },
  colWide: {
    width: "42%",
  },
  colMid: {
    width: "16%",
    textAlign: "right",
  },
  rowLabel: {
    flex: 1,
  },
  rowValue: {
    width: 90,
    textAlign: "right",
  },
  totalsCard: {
    marginLeft: "auto",
    marginTop: 14,
    width: 240,
    borderWidth: 1,
    borderColor: "#d7dee7",
    borderRadius: 8,
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ebeff4",
  },
  totalsEmphasis: {
    backgroundColor: "#eaf7f5",
    fontFamily: "Helvetica-Bold",
  },
  footer: {
    marginTop: 18,
    flexDirection: "row",
    gap: 12,
  },
  footerCard: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: "#d7dee7",
    borderRadius: 8,
  },
  footerDark: {
    backgroundColor: "#14213d",
    color: "#ffffff",
    borderColor: "#14213d",
  },
  term: {
    marginBottom: 6,
    lineHeight: 1.5,
  },
});

export async function renderInvoicePdf(snapshot: InvoiceSnapshot) {
  const buffer = await renderToBuffer(<InvoiceDocument snapshot={snapshot} />);
  return Buffer.from(buffer);
}

function InvoiceDocument({ snapshot }: { snapshot: InvoiceSnapshot }) {
  return (
    <Document title={snapshot.invoiceNumber}>
      <Page size="A4" style={styles.page}>
        <View style={styles.hero}>
          <View style={{ flex: 1 }}>
            <Text style={styles.brandKicker}>ClinicOS Invoice</Text>
            <Text style={styles.title}>{snapshot.facility.name}</Text>
            <Text style={styles.subtle}>
              {snapshot.facility.address ?? "Address not configured"}
            </Text>
            <Text style={styles.subtle}>Facility Type: {snapshot.facility.type}</Text>
            <Text style={styles.subtle}>
              GSTIN: {snapshot.facility.gstNumber ?? "Not configured"}
            </Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.label}>Invoice Number</Text>
            <Text style={styles.value}>{snapshot.invoiceNumber}</Text>
            <Text style={styles.label}>Generated On</Text>
            <Text style={styles.value}>{formatDate(snapshot.generatedAt)}</Text>
            <Text style={styles.label}>Billing Reference</Text>
            <Text style={styles.value}>{snapshot.billing.id}</Text>
          </View>
        </View>

        <View style={styles.grid}>
          <InfoCard
            title="Patient"
            lines={[
              snapshot.patient.name,
              snapshot.patient.phone ?? "-",
              snapshot.patient.email ?? "-",
              snapshot.patient.address ?? "-",
            ]}
          />
          <InfoCard
            title="Doctor"
            lines={[
              snapshot.doctor?.fullName ?? "Not assigned",
              snapshot.doctor?.specialization ?? "-",
              snapshot.doctor?.phone ?? "-",
              snapshot.doctor?.email ?? "-",
            ]}
          />
          <InfoCard
            title="Payment Status"
            lines={[
              `Snapshot Status: ${snapshot.billing.status}`,
              `Paid: INR ${snapshot.totals.paid}`,
              `Due: INR ${snapshot.totals.due}`,
              `Refund: INR ${snapshot.totals.refund}`,
            ]}
          />
        </View>

        <Text style={styles.sectionTitle}>Items</Text>
        <View style={styles.tableHeader}>
          <Text style={styles.colSmall}>#</Text>
          <Text style={styles.colWide}>Description</Text>
          <Text style={styles.colMid}>Qty</Text>
          <Text style={styles.colMid}>Unit Price</Text>
          <Text style={styles.colMid}>Amount</Text>
        </View>
        {snapshot.items.map((item, index) => (
          <View key={item.id} style={styles.tableRow}>
            <Text style={styles.colSmall}>{index + 1}</Text>
            <Text style={styles.colWide}>{item.name}</Text>
            <Text style={styles.colMid}>{item.quantity}</Text>
            <Text style={styles.colMid}>INR {item.unitPrice}</Text>
            <Text style={styles.colMid}>INR {item.lineTotal}</Text>
          </View>
        ))}

        <View style={styles.totalsCard}>
          <TotalRow label="Subtotal" amount={snapshot.totals.subtotal} />
          <TotalRow label="Discount" amount={snapshot.totals.discount} />
          <TotalRow label="Tax" amount={snapshot.totals.tax} />
          <TotalRow label="Total" amount={snapshot.totals.total} emphasis />
          <TotalRow label="Paid" amount={snapshot.totals.paid} />
          <TotalRow label="Refund" amount={snapshot.totals.refund} />
          <TotalRow label="Write-off" amount={snapshot.totals.writeOff} />
          <TotalRow label="Amount Due" amount={snapshot.totals.due} emphasis />
        </View>

        <View style={[styles.grid, { marginTop: 18 }]}>
          <View style={styles.gridCard}>
            <Text style={styles.sectionTitle}>GST Summary</Text>
            {snapshot.taxSummary.length > 0 ? (
              snapshot.taxSummary.map((taxLine) => (
                <View
                  key={`${taxLine.label}-${taxLine.amount}`}
                  style={{ marginBottom: 8 }}
                >
                  <Text>{taxLine.label}: INR {taxLine.amount}</Text>
                  <Text style={styles.subtle}>
                    Rate: {taxLine.rate ?? "-"} | CGST: {taxLine.cgstAmount ?? "-"} | SGST: {taxLine.sgstAmount ?? "-"}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.subtle}>No GST lines recorded.</Text>
            )}
          </View>
          <View style={styles.gridCard}>
            <Text style={styles.sectionTitle}>Payment Snapshot</Text>
            {snapshot.payments.length > 0 ? (
              snapshot.payments.map((payment) => (
                <View
                  key={payment.id}
                  style={{ marginBottom: 8 }}
                >
                  <Text>
                    {payment.method} • {payment.status} • INR {payment.amount}
                  </Text>
                  <Text style={styles.subtle}>
                    Reference: {payment.referenceId ?? "-"} | {formatDate(payment.createdAt)}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.subtle}>
                No payments recorded at invoice generation time.
              </Text>
            )}
          </View>
        </View>

        <View style={styles.footer}>
          <View style={[styles.footerCard, styles.footerDark]}>
            <Text style={{ marginBottom: 10, fontSize: 9, textTransform: "uppercase" }}>
              Terms
            </Text>
            {snapshot.metadata.terms.map((term) => (
              <Text key={term} style={styles.term}>
                • {term}
              </Text>
            ))}
          </View>
          <View style={styles.footerCard}>
            <Text style={styles.sectionTitle}>GST Note</Text>
            <Text style={styles.subtle}>{snapshot.metadata.gstNote}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

function InfoCard({ title, lines }: { title: string; lines: string[] }) {
  return (
    <View style={styles.gridCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {lines.map((line) => (
        <Text key={`${title}-${line}`} style={{ marginBottom: 4 }}>
          {line}
        </Text>
      ))}
    </View>
  );
}

function TotalRow(
  { label, amount, emphasis = false }: { label: string; amount: string; emphasis?: boolean },
) {
  const rowStyles = emphasis
    ? [styles.totalsRow, styles.totalsEmphasis]
    : [styles.totalsRow];

  return (
    <View style={rowStyles}>
      <Text>{label}</Text>
      <Text>INR {amount}</Text>
    </View>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value));
}
