import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export type InvoicePDFData = {
  invoiceNumber: string;
  description: string | null;
  subtotal: string;
  taxRate: string;
  taxAmount: string;
  amount: string;
  currency: string;
  dueDate: Date | null;
  paidAt: Date | null;
  paymentNotes: string | null;
  status: string;
  createdAt: Date;
  lineItems: {
    description: string;
    quantity: number;
    unitPrice: string;
    amount: string;
  }[];
  project: {
    name: string;
    client: {
      name: string;
      email: string;
      company: string | null;
    } | null;
  };
  freelancer: {
    name: string;
    email: string;
  };
};

// ──────────────────────────────────────────────
// Styles
// ──────────────────────────────────────────────

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#1a1a1a",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2563eb",
    marginBottom: 4,
  },
  invoiceNumber: {
    fontSize: 12,
    color: "#6b7280",
  },
  statusBadge: {
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  statusText: {
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#374151",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  label: {
    color: "#6b7280",
    fontSize: 10,
  },
  value: {
    fontWeight: "bold",
    fontSize: 10,
  },
  table: {
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f9fafb",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  tableHeaderText: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#374151",
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: "#f3f4f6",
  },
  tableCell: {
    fontSize: 10,
  },
  totals: {
    alignItems: "flex-end",
    marginTop: 10,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: 200,
    marginBottom: 4,
  },
  totalLabel: {
    color: "#6b7280",
    fontSize: 10,
  },
  totalValue: {
    fontSize: 10,
    textAlign: "right",
  },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: 200,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    marginTop: 4,
  },
  grandTotalLabel: {
    fontSize: 12,
    fontWeight: "bold",
  },
  grandTotalValue: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#2563eb",
  },
  notes: {
    marginTop: 30,
    padding: 15,
    backgroundColor: "#f9fafb",
    borderRadius: 4,
  },
  notesTitle: {
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 6,
    color: "#374151",
  },
  notesText: {
    fontSize: 9,
    color: "#6b7280",
    lineHeight: 1.5,
  },
  footer: {
    marginTop: 40,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    textAlign: "center",
    color: "#9ca3af",
    fontSize: 8,
  },
});

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function formatCurrency(amount: string, currency: string): string {
  const num = parseFloat(amount);
  if (isNaN(num)) return `${amount} ${currency}`;
  return `$${num.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
}

function formatDate(date: Date | null): string {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "#6b7280",
  SENT: "#2563eb",
  PAID: "#059669",
  OVERDUE: "#dc2626",
  CANCELLED: "#9ca3af",
};

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

export function InvoicePDF({ data }: { data: InvoicePDFData }) {
  const statusColor = STATUS_COLORS[data.status] ?? "#6b7280";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>INVOICE</Text>
            <Text style={styles.invoiceNumber}>{data.invoiceNumber}</Text>
          </View>
          <View style={styles.statusBadge}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {data.status}
            </Text>
          </View>
        </View>

        {/* From / To */}
        <View style={[styles.section, { flexDirection: "row", gap: 40 }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>From</Text>
            <Text style={styles.value}>{data.freelancer.name}</Text>
            <Text style={styles.label}>{data.freelancer.email}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Bill To</Text>
            <Text style={styles.value}>
              {data.project.client?.company || data.project.client?.name || "—"}
            </Text>
            <Text style={styles.label}>
              {data.project.client?.email || "—"}
            </Text>
          </View>
        </View>

        {/* Invoice Details */}
        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.label}>Project</Text>
            <Text style={styles.value}>{data.project.name}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Issue Date</Text>
            <Text style={styles.value}>{formatDate(data.createdAt)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Due Date</Text>
            <Text style={styles.value}>{formatDate(data.dueDate)}</Text>
          </View>
          {data.paidAt && (
            <View style={styles.row}>
              <Text style={styles.label}>Paid On</Text>
              <Text style={[styles.value, { color: "#059669" }]}>
                {formatDate(data.paidAt)}
              </Text>
            </View>
          )}
        </View>

        {/* Description */}
        {data.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.label}>{data.description}</Text>
          </View>
        )}

        {/* Line Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, { flex: 3 }]}>
              Description
            </Text>
            <Text
              style={[styles.tableHeaderText, { flex: 1, textAlign: "center" }]}
            >
              Qty
            </Text>
            <Text
              style={[styles.tableHeaderText, { flex: 1, textAlign: "right" }]}
            >
              Unit Price
            </Text>
            <Text
              style={[styles.tableHeaderText, { flex: 1, textAlign: "right" }]}
            >
              Amount
            </Text>
          </View>
          {data.lineItems.map((item, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 3 }]}>
                {item.description}
              </Text>
              <Text
                style={[styles.tableCell, { flex: 1, textAlign: "center" }]}
              >
                {item.quantity}
              </Text>
              <Text
                style={[styles.tableCell, { flex: 1, textAlign: "right" }]}
              >
                {formatCurrency(item.unitPrice, data.currency)}
              </Text>
              <Text
                style={[styles.tableCell, { flex: 1, textAlign: "right" }]}
              >
                {formatCurrency(item.amount, data.currency)}
              </Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>
              {formatCurrency(data.subtotal, data.currency)}
            </Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tax ({data.taxRate}%)</Text>
            <Text style={styles.totalValue}>
              {formatCurrency(data.taxAmount, data.currency)}
            </Text>
          </View>
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>
              {formatCurrency(data.amount, data.currency)}
            </Text>
          </View>
        </View>

        {/* Payment Notes */}
        {data.paymentNotes && (
          <View style={styles.notes}>
            <Text style={styles.notesTitle}>Payment Notes</Text>
            <Text style={styles.notesText}>{data.paymentNotes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text>
            Generated by Handoff · {new Date().toLocaleDateString("en-US")}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
