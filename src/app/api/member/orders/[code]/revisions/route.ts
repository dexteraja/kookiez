import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-helpers";
import { connectToDatabase } from "@/lib/mongodb";
import { RevisionRequestSchema } from "@/lib/validation";
import { sendMail } from "@/lib/mailer";

export async function POST(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const access = await requireUser();
  if ("response" in access) return access.response;
  const parsed = RevisionRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Pesan revisi tidak valid." }, { status: 400 });
  const code = (await params).code.toUpperCase();
  const { db } = await connectToDatabase();
  const order = await db.collection("orders").findOne({ code, userId: access.user.id });
  if (!order) return NextResponse.json({ error: "Order tidak ditemukan." }, { status: 404 });
  if (!["review", "progress"].includes(String(order.status))) return NextResponse.json({ error: "Revisi belum dapat diajukan pada status ini." }, { status: 409 });
  const revision = { id: crypto.randomUUID(), message: parsed.data.message, status: "requested", createdAt: new Date(), userId: access.user.id };
  await db.collection<{ revisionRequests?: unknown[] }>("orders").updateOne({ _id: order._id }, { $push: { revisionRequests: revision }, $set: { status: "review", updatedAt: new Date() } });
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD && process.env.SMTP_FROM) {
    sendMail({ to: process.env.SMTP_FROM, subject: `Revisi baru untuk order ${code}`, text: `Customer ${order.customerEmail} mengajukan revisi untuk ${code}: ${parsed.data.message}` }).catch(() => {});
  }
  return NextResponse.json({ revision }, { status: 201 });
}