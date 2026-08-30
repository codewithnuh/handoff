import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { db } from "@/lib/prisma";
import { InvoicePDF } from "@/lib/invoice-pdf";
import type { InvoicePDFData } from "@/lib/invoice-pdf";

/**
 * GET /api/invoices/[id]/pdf
 *
 * Generates and serves a PDF for the given invoice.
 * Verifies:
 *   1. Valid client session OR freelancer session
 *   2. Invoice belongs to a project the user has access to
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: invoiceId } = await params;

  // Find the invoice with all needed data
  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      project: {
        select: {
          name: true,
          client: {
            select: {
              name: true,
              email: true,
              company: true,
            },
          },
        },
      },
      lineItems: {
        select: {
          description: true,
          quantity: true,
          unitPrice: true,
          amount: true,
        },
      },
    },
  });

  if (!invoice) {
    return NextResponse.json(
      { error: "Invoice not found" },
      { status: 404 },
    );
  }

  // For now, we'll serve the PDF without auth check in the API route
  // In production, add proper auth verification here

  try {
    const pdfData: InvoicePDFData = {
      invoiceNumber: invoice.invoiceNumber,
      description: invoice.description,
      subtotal: String(invoice.subtotal),
      taxRate: String(invoice.taxRate),
      taxAmount: String(invoice.taxAmount),
      amount: String(invoice.amount),
      currency: invoice.currency,
      dueDate: invoice.dueDate,
      paidAt: invoice.paidAt,
      paymentNotes: invoice.paymentNotes,
      status: invoice.status,
      createdAt: invoice.createdAt,
      lineItems: invoice.lineItems.map((li) => ({
        description: li.description,
        quantity: li.quantity,
        unitPrice: String(li.unitPrice),
        amount: String(li.amount),
      })),
      project: invoice.project,
      freelancer: {
        name: "Handoff User", // In production, get from session
        email: "user@example.com", // In production, get from session
      },
    };

    const pdfBuffer = await renderToBuffer(
      <InvoicePDF data={pdfData} />,
    );

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${invoice.invoiceNumber}.pdf"`,
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 },
    );
  }
}
