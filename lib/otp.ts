import crypto from "node:crypto";
import { connectToDatabase } from "@/lib/mongodb";
import { emailTemplate, sendMail } from "@/lib/mailer";

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function hash(value: string) {
  return crypto.createHash("sha256").update(`${value}:${process.env.AUTH_SECRET ?? "otp-secret"}`).digest("hex");
}

export async function createAndSendOtp(email: string) {
  const code = crypto.randomInt(100000, 1000000).toString();
  const requestId = crypto.randomBytes(24).toString("hex");
  const { db } = await connectToDatabase();
  const otps = db.collection("login_otps");
  await otps.deleteMany({ email });
  await otps.insertOne({ requestId, email, codeHash: hash(code), attempts: 0, expiresAt: new Date(Date.now() + OTP_TTL_MS), createdAt: new Date() });
  await sendMail({
    to: email,
    subject: "Kode login Kookiez",
    text: `Kode OTP kamu adalah ${code}. Kode ini berlaku selama 10 menit dan jangan dibagikan kepada siapa pun.`,
    html: emailTemplate({ title: "Kode login kamu", preheader: "Verifikasi akun Kookiez", greeting: "Gunakan kode berikut untuk melanjutkan proses login:", body: `<div style="margin:24px 0;padding:20px;text-align:center;background:#f4f6fa;border-radius:10px;font-size:32px;font-weight:700;letter-spacing:8px;color:#0038ff">${code}</div><p>Kode ini berlaku selama 10 menit. Jangan bagikan kode ini kepada siapa pun.</p>` }),
  });
  return requestId;
}

export async function consumeOtp(email: string, code: string) {
  const { db } = await connectToDatabase();
  const otps = db.collection("login_otps");
  const record = await otps.findOne({ email });
  if (!record || record.expiresAt < new Date() || Number(record.attempts) >= MAX_ATTEMPTS) return false;
  if (record.codeHash !== hash(code)) {
    await otps.updateOne({ _id: record._id }, { $inc: { attempts: 1 } });
    return false;
  }
  const consumed = await otps.deleteOne({ _id: record._id, codeHash: record.codeHash });
  return consumed.deletedCount === 1;
}

export function hasSmtpConfig() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD && (process.env.SMTP_FROM || process.env.SMTP_USER));
}
