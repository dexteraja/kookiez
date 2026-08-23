import crypto from "node:crypto";
import nodemailer from "nodemailer";
import { connectToDatabase } from "@/lib/mongodb";

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function hash(value: string) {
  return crypto.createHash("sha256").update(`${value}:${process.env.AUTH_SECRET ?? "otp-secret"}`).digest("hex");
}

function mailer() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
  });
}

export async function createAndSendOtp(email: string) {
  const code = crypto.randomInt(100000, 1000000).toString();
  const requestId = crypto.randomBytes(24).toString("hex");
  const { db } = await connectToDatabase();
  const otps = db.collection("login_otps");
  await otps.deleteMany({ email });
  await otps.insertOne({ requestId, email, codeHash: hash(code), attempts: 0, expiresAt: new Date(Date.now() + OTP_TTL_MS), createdAt: new Date() });
  await mailer().sendMail({
    from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
    to: email,
    subject: "Kode OTP login kookiez.",
    text: `Kode OTP kamu adalah ${code}. Kode ini berlaku selama 10 menit dan jangan dibagikan kepada siapa pun.`,
    html: `<p>Kode OTP login kamu:</p><p style="font-size:28px;font-weight:700;letter-spacing:8px">${code}</p><p>Kode berlaku selama 10 menit.</p>`,
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
  await otps.deleteOne({ _id: record._id });
  return true;
}

export function hasSmtpConfig() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD && (process.env.SMTP_FROM || process.env.SMTP_USER));
}
