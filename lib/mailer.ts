import nodemailer from "nodemailer";

export function hasMailConfig() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD);
}

export async function sendMail(input: { to: string; subject: string; text: string; html?: string; attachments?: Array<{ filename: string; content: Buffer }> }) {
  if (!hasMailConfig()) throw new Error("SMTP is not configured");
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
  });
  return transporter.sendMail({ from: process.env.SMTP_FROM ?? process.env.SMTP_USER, ...input });
}
