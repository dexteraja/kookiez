import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { connectToDatabase } from "@/lib/mongodb";
import { PromoCodeSchema } from "@/lib/validation";
import { listPromoCodes } from "@/lib/promo-codes";

function serializePromo(promo: Record<string, unknown>) {
  return { ...promo, _id: String(promo._id), startsAt: new Date(String(promo.startsAt)).toISOString(), expiresAt: new Date(String(promo.expiresAt)).toISOString() };
}

export async function GET() {
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  try {
    const promos = await listPromoCodes();
    return NextResponse.json({ promos: promos.map((promo) => serializePromo(promo as unknown as Record<string, unknown>)) });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const access = await requireAdmin();
  if ("response" in access) return access.response;
  const parsed = PromoCodeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Data kode promo tidak valid.", details: parsed.error.flatten() }, { status: 400 });
  try {
    const { db } = await connectToDatabase();
    const now = new Date();
    const promo = { ...parsed.data, code: parsed.data.code.toUpperCase(), createdAt: now, updatedAt: now };
    const result = await db.collection("promo_codes").insertOne(promo);
    return NextResponse.json({ promo: serializePromo({ ...promo, _id: result.insertedId }) }, { status: 201 });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === 11000) return NextResponse.json({ error: "Kode promo sudah digunakan." }, { status: 409 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
