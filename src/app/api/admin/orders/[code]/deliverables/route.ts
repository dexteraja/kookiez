import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { connectToDatabase } from "@/lib/mongodb";
import { storeFile } from "@/lib/file-storage";
import { isAllowedFile } from "@/lib/file-constraints";
import { appendOrderEvent } from "@/lib/order-events";
import { enforceRateLimit, hasBodyWithinLimit } from "@/lib/security";

export async function POST(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const limited = enforceRateLimit(request, "admin-upload", 30, 10 * 60 * 1000);
  if (limited) return limited;
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  if (!hasBodyWithinLimit(request, 10 * 1024 * 1024 + 256 * 1024)) return NextResponse.json({ error: "Ukuran upload terlalu besar." }, { status: 413 });
  const code = (await params).code.toUpperCase();
  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File) || !isAllowedFile(file)) return NextResponse.json({ error: "File tidak valid atau tipenya tidak didukung." }, { status: 400 });
  const { db } = await connectToDatabase();
  const order = await db.collection("orders").findOne({ code });
  if (!order) return NextResponse.json({ error: "Order tidak ditemukan." }, { status: 404 });
  const stored = await storeFile(file, { kind: "deliverable", orderCode: code, adminId: access.user.id! });
  await db.collection<{ deliverables?: unknown[] }>("orders").updateOne({ code }, { $push: { deliverables: { ...stored, uploadedAt: new Date() } } });
  await appendOrderEvent(db, code, { type: "deliverable_uploaded", label: `Project diunggah: ${stored.name}`, actor: "admin", actorName: access.user.name ?? "Kookiez", metadata: { deliverableId: stored.id } });
  return NextResponse.json({ file: stored }, { status: 201 });
}
