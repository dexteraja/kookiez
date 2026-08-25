import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { connectToDatabase } from "@/lib/mongodb";
import { appendOrderEvent } from "@/lib/order-events";
import { z } from "zod";

const MessageSchema = z.object({ message: z.string().trim().min(1).max(2000) });

export async function GET(_request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  const code = (await params).code.toUpperCase();
  const { db } = await connectToDatabase();
  const order = await db.collection("orders").findOne({ code }, { projection: { messages: 1 } });
  if (!order) return NextResponse.json({ error: "Order tidak ditemukan." }, { status: 404 });
  return NextResponse.json({ messages: order.messages ?? [] });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  const parsed = MessageSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Pesan tidak valid." }, { status: 400 });
  const code = (await params).code.toUpperCase();
  const { db } = await connectToDatabase();
  const order = await db.collection("orders").findOne({ code });
  if (!order) return NextResponse.json({ error: "Order tidak ditemukan." }, { status: 404 });
  const message = { id: crypto.randomUUID(), message: parsed.data.message, sender: "admin", senderName: access.user.name ?? "Kookiez", createdAt: new Date() };
  await db.collection("orders").updateOne({ _id: order._id }, { $push: { messages: message }, $set: { updatedAt: new Date() } } as never);
  await appendOrderEvent(db, code, { type: "message_sent", label: "Kookiez mengirim pesan", actor: "admin", actorName: access.user.name ?? "Kookiez" });
  return NextResponse.json({ message }, { status: 201 });
}
