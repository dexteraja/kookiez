import { connectToDatabase } from "@/lib/mongodb";
import { hashPassword, validPassword } from "@/lib/password";
import { ObjectId } from "mongodb";

export function getClientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export function adminEmails() {
  return (process.env.AUTH_ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
}

export async function bootstrapAdmin(email: string, password: string) {
  if (!email || !validPassword(password)) return;
  const { db } = await connectToDatabase();
  const normalized = email.trim().toLowerCase();
  if (!(await db.collection("users").findOne({ email: normalized }))) {
    await db.collection("users").insertOne({ email: normalized, name: "Admin", passwordHash: await hashPassword(password), role: "admin", status: "active", createdAt: new Date(), updatedAt: new Date(), failedLoginCount: 0, lockoutUntil: null });
  }
}

export async function bootstrapConfiguredAdmins() {
  for (const email of adminEmails()) await bootstrapAdmin(email, process.env.AUTH_ADMIN_PASSWORD ?? "");
}

export async function userByEmail(email: string) {
  const { db } = await connectToDatabase();
  return db.collection("users").findOne({ email: email.trim().toLowerCase() });
}

export async function isLocked(email: string) {
  const user = await userByEmail(email);
  return Boolean(user?.lockoutUntil && new Date(user.lockoutUntil).getTime() > Date.now());
}

export async function failedLogin(email: string) {
  const { db } = await connectToDatabase();
  const result = await db.collection("users").findOneAndUpdate({ email }, { $inc: { failedLoginCount: 1 } }, { returnDocument: "after" });
  if (result && (result.failedLoginCount ?? 0) >= 5) await db.collection("users").updateOne({ email }, { $set: { failedLoginCount: 0, lockoutUntil: new Date(Date.now() + 15 * 60 * 1000) } });
}

export async function successfulLogin(email: string) {
  const { db } = await connectToDatabase();
  await db.collection("users").updateOne({ email }, { $set: { failedLoginCount: 0, lockoutUntil: null, lastLoginAt: new Date() } });
}

export async function auditLogin(email: string, success: boolean, ip: string) {
  const { db } = await connectToDatabase();
  await db.collection("auth_events").insertOne({ email, success, ip, createdAt: new Date() });
}

export async function getPaymentSettings() {
  const { db } = await connectToDatabase();
  const row = await db.collection("site_settings").findOne({ key: "global" });
  return { onlinePaymentEnabled: row?.onlinePaymentEnabled === true, whatsappCsNumber: row?.whatsappCsNumber ?? (process.env.WHATSAPP_CS_NUMBER ?? "6285792006860") };
}

export async function savePaymentSettings(input: { onlinePaymentEnabled: boolean; whatsappCsNumber: string }) {
  const { db } = await connectToDatabase();
  await db.collection("site_settings").updateOne({ key: "global" }, { $set: { key: "global", ...input, updatedAt: new Date() } }, { upsert: true });
  return getPaymentSettings();
}

export async function listAdmins() {
  const { db } = await connectToDatabase();
  return db.collection("users").find({ role: "admin" }, { projection: { passwordHash: 0 } }).sort({ createdAt: 1 }).toArray();
}

export async function createAdmin(input: { email: string; name: string; password: string }) {
  if (!validPassword(input.password)) throw new Error("Password minimal 8 karakter.");
  const { db } = await connectToDatabase();
  await db.collection("users").insertOne({ email: input.email.trim().toLowerCase(), name: input.name.trim() || "Admin", passwordHash: await hashPassword(input.password), role: "admin", status: "active", createdAt: new Date(), updatedAt: new Date(), failedLoginCount: 0, lockoutUntil: null });
}

export async function toggleAdmin(id: string, active: boolean, currentEmail: string) {
  const { db } = await connectToDatabase();
  const target = await db.collection("users").findOne({ _id: new ObjectId(id), role: "admin" });
  if (!target || target.email === currentEmail) throw new Error("Akun admin ini tidak dapat diubah.");
  if (!active && await db.collection("users").countDocuments({ role: "admin", status: "active" }) <= 1) throw new Error("Minimal satu admin aktif harus dipertahankan.");
  await db.collection("users").updateOne({ _id: target._id }, { $set: { status: active ? "active" : "inactive", updatedAt: new Date() } });
}

export function whatsappMessage(order: Record<string, unknown>, customer?: { name?: string | null; email?: string | null }) {
  const line = (label: string, value: unknown) => `${label}: ${value || "-"}`;
  return ["Halo Kookiez, saya ingin melanjutkan pesanan.", "", "Payment gateway sedang tidak bisa dipakai, jadi saya diarahkan ke CS.", line("Kode order", order.code), line("Nama", customer?.name), line("Email", customer?.email ?? order.customerEmail), line("Layanan", order.service), line("Paket", order.budgetLabel), line("Deadline", order.deadline), line("Rencana bayar", order.plan), line("Metode", order.method), line("Nominal", order.amount ? `Rp${Number(order.amount).toLocaleString("id-ID")}` : "Custom / dibicarakan"), line("Brief", order.briefScope), line("Referensi", order.briefRefs), line("File", Array.isArray(order.fileNames) ? order.fileNames.join(", ") : order.fileNames)].join("\n");
}

export function whatsappUrl(order: Record<string, unknown>, customer: { name?: string | null; email?: string | null }, number: string) {
  return `https://wa.me/${number.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(whatsappMessage(order, customer))}`;
}

export async function ensureIndexes() {
  const { db } = await connectToDatabase();
  await db.collection("users").createIndex({ email: 1 }, { unique: true });
  await db.collection("orders").createIndex({ code: 1 }, { unique: true });
  await db.collection("auth_events").createIndex({ email: 1, createdAt: -1 });
}

export function jsonSafe<T>(value: T): T { return JSON.parse(JSON.stringify(value)); }
