import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { connectToDatabase } from "@/lib/mongodb";
import { readFile } from "@/lib/file-storage";
import { emailTemplate, sendMail } from "@/lib/mailer";
import { DeliverableMessageSchema } from "@/lib/validation";

export async function POST(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  const code = (await params).code.toUpperCase();
  const parsedBody = DeliverableMessageSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsedBody.success) return NextResponse.json({ error: "Pesan email tidak valid." }, { status: 400 });
  const message = parsedBody.data.message;
  const { db } = await connectToDatabase();
  const order = await db.collection("orders").findOne({ code });
  if (!order || !order.customerEmail) return NextResponse.json({ error: "Order atau email customer tidak ditemukan." }, { status: 404 });
  const deliverables = Array.isArray(order.deliverables) ? order.deliverables : [];
  if (!deliverables.length) return NextResponse.json({ error: "Belum ada file project untuk dikirim." }, { status: 400 });
  const attachments = [];
  for (const deliverable of deliverables) {
    const file = await readFile(String(deliverable.id));
    if (file) attachments.push({ filename: String(file.filename), content: file.body });
  }
  if (!attachments.length) return NextResponse.json({ error: "File project tidak dapat dibaca." }, { status: 400 });
  try {
    const plainMessage = message || `Halo ${order.customerName || ""}, project untuk order ${code} sudah siap. File terlampir.`;
    const safeMessage = plainMessage.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
    await sendMail({ to: order.customerEmail, subject: `Project order ${code} dari Kookiez`, text: `${plainMessage}\n\nFile project terlampir pada email ini.`, html: emailTemplate({ title: "Project kamu sudah siap", preheader: `Order ${code}`, greeting: `Halo ${order.customerName || ""}, project untuk order ${code} sudah selesai.`, body: `<p style="white-space:pre-wrap">${safeMessage}</p><p>File project sudah terlampir pada email ini.</p>`, details: [["Kode order", code], ["Jumlah file", String(attachments.length)]], closing: "Terima kasih sudah berkarya bersama Kookiez." }), attachments });
    await db.collection("orders").updateOne({ code }, { $set: { projectSentAt: new Date(), projectSendError: null } });
    return NextResponse.json({ ok: true, sentTo: order.customerEmail });
  } catch (error) {
    await db.collection("orders").updateOne({ code }, { $set: { projectSendError: error instanceof Error ? error.message : "Email gagal dikirim", projectSendAttemptedAt: new Date() } });
    return NextResponse.json({ error: "Email project gagal dikirim." }, { status: 502 });
  }
}
