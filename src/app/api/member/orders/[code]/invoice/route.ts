import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { requireUser } from "@/lib/auth-helpers";
import { connectToDatabase } from "@/lib/mongodb";
import { orderOwnerFilter } from "@/lib/order-access";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const access = await requireUser();
  if ("response" in access) return access.response;
  const code = (await params).code.toUpperCase();
  const { db } = await connectToDatabase();
  const order = await db.collection("orders").findOne({ code, ...orderOwnerFilter(access.user.id, access.user.email) });
  if (!order) return NextResponse.json({ error: "Invoice tidak ditemukan." }, { status: 404 });

  const document = new PDFDocument({ size: "A4", margin: 52 });
  const chunks: Buffer[] = [];
  document.on("data", (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve, reject) => { document.on("end", () => resolve(Buffer.concat(chunks))); document.on("error", reject); });
  document.fontSize(22).text("kookiez.");
  document.moveDown();
  document.fontSize(16).text("INVOICE");
  document.fontSize(10).text(`Nomor: INV-${code}`);
  document.text(`Tanggal: ${new Date(order.createdAt).toLocaleDateString("id-ID")}`);
  document.moveDown();
  document.fontSize(11).text(`Customer: ${order.customerName ?? "-"}`);
  document.text(`Email: ${order.customerEmail ?? "-"}`);
  document.moveDown();
  document.text(`Order: ${code}`);
  document.text(`Layanan: ${order.service ?? "-"}`);
  document.text(`Paket: ${order.budgetLabel ?? "Custom"}`);
  document.text(`Rencana pembayaran: ${order.plan ?? "-"}`);
  document.moveDown();
  document.fontSize(12).text(`Subtotal: Rp ${Number(order.baseAmount ?? order.amount ?? 0).toLocaleString("id-ID")}`);
  document.text(`Diskon: Rp ${Number(order.discountAmount ?? 0).toLocaleString("id-ID")}`);
  document.fontSize(15).text(`Total: ${order.finalAmount == null ? "Custom" : `Rp ${Number(order.finalAmount).toLocaleString("id-ID")}`}`);
  
  if (order.dpAmount != null) {
    document.fontSize(12).text(`DP (30%): Rp ${Number(order.dpAmount).toLocaleString("id-ID")}`);
  }
  if (order.remainingAmount != null) {
    document.fontSize(12).text(`Sisa Pelunasan: Rp ${Number(order.remainingAmount).toLocaleString("id-ID")}`);
  }
  if (order.paidAmount != null) {
    document.fontSize(12).text(`Telah Dibayar: Rp ${Number(order.paidAmount).toLocaleString("id-ID")}`);
  }

  document.moveDown();
  const statusLabels: Record<string, string> = { pending: "Menunggu Pembayaran", dp_pending: "Menunggu DP", dp_paid: "DP Dibayar", settlement_pending: "Menunggu Pelunasan", paid: "Lunas", rejected: "Ditolak", manual_contact_required: "Hubungi CS" };
  document.fontSize(10).text(`Status pembayaran: ${statusLabels[order.paymentStatus ?? "manual_contact_required"] ?? order.paymentStatus}`);
  document.text("Invoice ini bukan bukti pembayaran lunas sebelum pembayaran terverifikasi.");
  document.end();
  const pdf = await done;
  return new NextResponse(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Content-Length": String(pdf.byteLength), "Content-Disposition": `attachment; filename="INV-${code}.pdf"`, "Cache-Control": "private, no-store" } });
}
