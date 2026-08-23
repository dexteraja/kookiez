import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { DEFAULT_PRICING, mergePricing, PRICING_META } from "@/lib/pricing";

const schema = z.object({ pricing: z.record(z.string(), z.number().int().min(0).max(100000000)) });

async function isAdmin() {
  const session = await auth();
  return session?.user && (session.user as { role?: string }).role === "admin";
}

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { db } = await connectToDatabase();
  const setting = await db.collection("site_settings").findOne({ key: "pricing" });
  return NextResponse.json({ pricing: mergePricing(setting?.value ?? DEFAULT_PRICING) });
}

export async function PUT(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Nilai harga tidak valid." }, { status: 400 });
  const pricing = mergePricing(parsed.data.pricing);
  for (const id of Object.keys(PRICING_META) as Array<keyof typeof PRICING_META>) {
    if (pricing[id] !== null && pricing[id] < PRICING_META[id].min) return NextResponse.json({ error: `Harga ${id} minimal Rp ${PRICING_META[id].min.toLocaleString("id-ID")}.` }, { status: 400 });
  }
  const { db } = await connectToDatabase();
  await db.collection("site_settings").updateOne({ key: "pricing" }, { $set: { key: "pricing", value: pricing, updatedAt: new Date() } }, { upsert: true });
  return NextResponse.json({ pricing });
}
