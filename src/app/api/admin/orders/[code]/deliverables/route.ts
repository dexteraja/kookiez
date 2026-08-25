import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { connectToDatabase } from "@/lib/mongodb";
import { isAllowedFile, storeFile } from "@/lib/file-storage";

export async function POST(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  const code = (await params).code.toUpperCase();
  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File) || !isAllowedFile(file)) return NextResponse.json({ error: "File tidak valid atau tipenya tidak didukung." }, { status: 400 });
  const { db } = await connectToDatabase();
  const order = await db.collection("orders").findOne({ code });
  if (!order) return NextResponse.json({ error: "Order tidak ditemukan." }, { status: 404 });
  const stored = await storeFile(file, { kind: "deliverable", orderCode: code, adminId: access.user.id! });
  await db.collection<{ deliverables?: unknown[] }>("orders").updateOne({ code }, { $push: { deliverables: { ...stored, uploadedAt: new Date() } } });
  return NextResponse.json({ file: stored }, { status: 201 });
}
