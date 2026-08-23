import { NextResponse } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyPassword } from "@/lib/password";
import { createAndSendOtp, hasSmtpConfig } from "@/lib/otp";

const schema = z.object({ email: z.string().trim().email().max(160), password: z.string().min(1) });
const admins = (process.env.AUTH_ADMIN_EMAILS ?? "admin@kookiez.com").split(",").map((email) => email.trim().toLowerCase());
const owner = "kookiezst@gmail.com";

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Email dan password wajib diisi." }, { status: 400 });
  if (!hasSmtpConfig()) return NextResponse.json({ error: "Konfigurasi SMTP belum lengkap. Hubungi administrator." }, { status: 503 });
  const email = parsed.data.email.toLowerCase();
  try {
    const isAdmin = email === owner || admins.includes(email);
    let valid = false;
    if (isAdmin) valid = parsed.data.password === (process.env.AUTH_ADMIN_PASSWORD ?? "kookiez-admin");
    else {
      const { db } = await connectToDatabase();
      const user = await db.collection("users").findOne({ email });
      valid = Boolean(user && typeof user.passwordHash === "string" && await verifyPassword(parsed.data.password, user.passwordHash));
    }
    if (!valid) return NextResponse.json({ error: "Email atau password salah." }, { status: 401 });
    await createAndSendOtp(email);
    return NextResponse.json({ ok: true, email });
  } catch { return NextResponse.json({ error: "OTP gagal dikirim. Periksa konfigurasi email." }, { status: 503 }); }
}
