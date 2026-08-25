import nodemailer from "nodemailer";

export function hasMailConfig() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD);
}

export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
}

export function emailTemplate(input: { preheader?: string; title: string; greeting?: string; body: string; details?: Array<[string, string]>; closing?: string }) {
  const details = input.details?.map(([label, value]) => `<tr><td style="padding:10px 0;color:#667085;font-size:13px;width:38%">${escapeHtml(label)}</td><td style="padding:10px 0;color:#17191f;font-weight:600">${escapeHtml(value)}</td></tr>`).join("") ?? "";
  return `<div style="background:#f4f6fa;padding:32px 16px;font-family:Arial,sans-serif;color:#17191f"><div style="max-width:600px;margin:0 auto;background:#fff;border:1px solid #e4e7ec;border-radius:14px;overflow:hidden"><div style="background:#0038ff;padding:22px 28px;color:#fff;font-size:18px;font-weight:700">KOOKIEZ</div><div style="padding:30px 28px"><div style="color:#667085;font-size:12px;margin-bottom:10px">${escapeHtml(input.preheader ?? "Kookiez Studio")}</div><h1 style="font-size:24px;line-height:1.25;margin:0 0 20px">${escapeHtml(input.title)}</h1>${input.greeting ? `<p style="font-size:15px;line-height:1.7">${escapeHtml(input.greeting)}</p>` : ""}<div style="font-size:15px;line-height:1.7">${input.body}</div>${details ? `<table style="width:100%;border-collapse:collapse;margin-top:22px;border-top:1px solid #e4e7ec;border-bottom:1px solid #e4e7ec">${details}</table>` : ""}${input.closing ? `<p style="font-size:15px;line-height:1.7;margin-bottom:0">${escapeHtml(input.closing)}</p>` : ""}</div><div style="padding:18px 28px;background:#f8fafc;color:#667085;font-size:12px">Kookiez Studio · Pesan ini dikirim otomatis, mohon tidak membalas langsung.</div></div></div>`;
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
