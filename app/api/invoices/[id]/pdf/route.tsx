import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { db } from "@/lib/prisma";
import {
  getRequestSubject,
  requirePortalProjectAccess,
  resolveProjectAccess,
} from "@/lib/access";
import { InvoicePDF } from "@/lib/invoice-pdf";
import type { InvoicePDFData } from "@/lib/invoice-pdf";
import { lineItemMoneyStrings, moneyStrings } from "@/lib/invoice/money";

/**
 * GET /api/invoices/[id]/pdf
 *
 * Generates and serves a PDF for the given invoice.
 * Verifies:
 *   1. A subject: the freelancer's session OR a client-portal session
 *   2. That subject may see the invoice's project
 *
 * Both audiences legitimately need this route (freelancers preview,
 * clients download), so it resolves the subject through the same access
 * interface the rest of the app uses.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: invoiceId } = await params;

  const subject = await getRequestSubject();
  if (!subject) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
          workspace: {
            select: {
              owner: { select: { name: true, email: true } },
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

  const access =
    subject.kind === "client"
      ? await requirePortalProjectAccess(subject.session.email, invoice.projectId)
      : await resolveProjectAccess(invoice.projectId);

  if (!access.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const issuer =
      subject.kind === "user" ? subject.user : invoice.project.workspace.owner;
    const money = moneyStrings(invoice);
    const pdfData: InvoicePDFData = {
      invoiceNumber: invoice.invoiceNumber,
      description: invoice.description,
      subtotal: money.subtotal,
      taxRate: money.taxRate,
      taxAmount: money.taxAmount,
      amount: money.amount,
      currency: invoice.currency,
      dueDate: invoice.dueDate,
      paidAt: invoice.paidAt,
      paymentNotes: invoice.paymentNotes,
      status: invoice.status,
      createdAt: invoice.createdAt,
      lineItems: invoice.lineItems.map((li) => lineItemMoneyStrings(li)),
      project: {
        name: invoice.project.name,
        client: invoice.project.client,
      },
      freelancer: {
        name: issuer.name ?? "Handoff",
        email: issuer.email ?? "",
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
