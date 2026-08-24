import { ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { connectToDatabase } from "@/lib/mongodb";
import { PromoCodeUpdateSchema } from "@/lib/validation";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  const parsed = PromoCodeUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Data kode promo tidak valid.", details: parsed.error.flatten() }, { status: 400 });
  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Kode promo tidak ditemukan." }, { status: 404 });
  try {
    const { db } = await connectToDatabase();
    const update = { ...parsed.data, ...(parsed.data.code ? { code: parsed.data.code.toUpperCase() } : {}), updatedAt: new Date() };
    const result = await db.collection("promo_codes").updateOne({ _id: new ObjectId(id) }, { $set: update });
    if (!result.matchedCount) return NextResponse.json({ error: "Kode promo tidak ditemukan." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === 11000) return NextResponse.json({ error: "Kode promo sudah digunakan." }, { status: 409 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Kode promo tidak ditemukan." }, { status: 404 });
  const { db } = await connectToDatabase();
  const result = await db.collection("promo_codes").deleteOne({ _id: new ObjectId(id) });
  return result.deletedCount ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Kode promo tidak ditemukan." }, { status: 404 });
}
