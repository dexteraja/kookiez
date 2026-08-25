import { NextResponse } from "next/server";
import { z } from "zod";
import { consumeOtp } from "@/lib/otp";
import { connectToDatabase } from "@/lib/mongodb";
import { enforceRateLimit, hasBodyWithinLimit } from "@/lib/security";

const schema = z.object({ email: z.string().trim().email().max(160), code: z.string().regex(/^\d{6}$/) });

export async function POST(request: Request) {
  const limited = enforceRateLimit(request, "verify-otp", 5, 10 * 60 * 1000);
  if (limited) return limited;
  if (!hasBodyWithinLimit(request, 8 * 1024)) return NextResponse.json({ error: "Request terlalu besar." }, { status: 413 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Kode OTP harus 6 digit." }, { status: 400 });
  const email = parsed.data.email.toLowerCase();
  const valid = await consumeOtp(email, parsed.data.code);
  if (!valid) return NextResponse.json({ error: "Kode OTP salah atau sudah kedaluwarsa." }, { status: 401 });
  const { db } = await connectToDatabase();
  await db.collection("otp_verified").updateOne({ email }, { $set: { email, verifiedAt: new Date() } }, { upsert: true });
  return NextResponse.json({ ok: true });
}
