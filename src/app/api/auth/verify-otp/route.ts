import { NextResponse } from "next/server";
import { z } from "zod";
import { consumeOtp } from "@/lib/otp";
import { connectToDatabase } from "@/lib/mongodb";

const schema = z.object({ email: z.string().trim().email().max(160), code: z.string().regex(/^\d{6}$/) });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Kode OTP harus 6 digit." }, { status: 400 });
  const email = parsed.data.email.toLowerCase();
  const valid = await consumeOtp(email, parsed.data.code);
  if (!valid) return NextResponse.json({ error: "Kode OTP salah atau sudah kedaluwarsa." }, { status: 401 });
  const { db } = await connectToDatabase();
  await db.collection("otp_verified").updateOne({ email }, { $set: { email, verifiedAt: new Date() } }, { upsert: true });
  return NextResponse.json({ ok: true });
}
