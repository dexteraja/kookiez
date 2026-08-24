import { NextRequest, NextResponse } from "next/server";
import { findPromoCode } from "@/lib/promo-codes";
import { z } from "zod";

const schema = z.object({ code: z.string().trim().min(1).max(40), packageId: z.string().trim().min(1).max(40) });

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ valid: false, error: "Kode promo tidak valid." }, { status: 400 });
  const promo = await findPromoCode(parsed.data.code, parsed.data.packageId);
  if (!promo) return NextResponse.json({ valid: false, error: "Kode promo tidak berlaku." }, { status: 404 });
  return NextResponse.json({ valid: true, code: promo.code, percent: promo.percent });
}
