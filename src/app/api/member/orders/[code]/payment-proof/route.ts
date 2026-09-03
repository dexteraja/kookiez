import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireUser } from "@/lib/auth-helpers";
import { connectToDatabase } from "@/lib/mongodb";
import { storeFile } from "@/lib/file-storage";
import { isAllowedFile } from "@/lib/file-constraints";
import { enforceRateLimit, hasBodyWithinLimit } from "@/lib/security";
import { orderOwnerFilter } from "@/lib/order-access";

export async function POST(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const limited = enforceRateLimit(request, "payment-proof", 5, 15 * 60 * 1000);
  if (limited) return limited;
  if (!hasBodyWithinLimit(request, 10 * 1024 * 1024 + 256 * 1024)) return NextResponse.json({ error: "Ukuran upload terlalu besar." }, { status: 413 });
  const access = await requireUser();
  if ("response" in access) return access.response;

  const code = (await params).code.toUpperCase();
  const { db } = await connectToDatabase();
  const order = await db.collection("orders").findOne({ code, ...orderOwnerFilter(access.user.id, access.user.email) }, { projection: { paymentStatus: 1 } });
  if (!order) return NextResponse.json({ error: "Order tidak ditemukan." }, { status: 404 });
  if (!["dp_pending", "pending", "settlement_pending"].includes(String(order.paymentStatus ?? "pending"))) {
    return NextResponse.json({ error: "Order tidak sedang menunggu pembayaran." }, { status: 409 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const proofTypes = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
  if (!(file instanceof File) || !file.name || !isAllowedFile(file) || !proofTypes.has(file.type)) return NextResponse.json({ error: "Bukti pembayaran harus berupa JPG, PNG, WEBP, atau PDF." }, { status: 400 });
  const stored = await storeFile(file, { kind: "payment_proof", userId: access.user.id!, orderCode: code });
  if (!ObjectId.isValid(stored.id)) return NextResponse.json({ error: "Bukti pembayaran tidak valid." }, { status: 500 });
  return NextResponse.json({ id: stored.id, name: stored.name, url: `/api/files/${stored.id}` }, { status: 201 });
}
