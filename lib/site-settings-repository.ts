import { connectToDatabase, ensureIndexes } from "@/lib/mongodb";

export type SiteSettings = {
  key: "global";
  onlinePaymentEnabled: boolean;
  whatsappCsNumber: string;
  whatsappFallbackMessage: string;
  createdAt: Date;
  updatedAt: Date;
};

export const DEFAULT_SITE_SETTINGS = {
  key: "global" as const,
  onlinePaymentEnabled: false,
  whatsappCsNumber: process.env.WHATSAPP_CS_NUMBER ?? "6285792006860",
  whatsappFallbackMessage: "Payment gateway sedang tidak bisa dipakai. Silakan konfirmasi order ini melalui WhatsApp.",
};

export async function getSiteSettings(): Promise<SiteSettings> {
  const { db } = await connectToDatabase();
  await ensureIndexes();
  const collection = db.collection<SiteSettings>("site_settings");
  const existing = await collection.findOne({ key: "global" });
  if (existing) return existing;
  const now = new Date();
  const settings = { ...DEFAULT_SITE_SETTINGS, createdAt: now, updatedAt: now };
  await collection.updateOne({ key: "global" }, { $setOnInsert: settings }, { upsert: true });
  return (await collection.findOne({ key: "global" })) ?? settings;
}

export async function updateSiteSettings(input: Pick<SiteSettings, "onlinePaymentEnabled" | "whatsappCsNumber" | "whatsappFallbackMessage">) {
  const { db } = await connectToDatabase();
  await ensureIndexes();
  const now = new Date();
  await db.collection<SiteSettings>("site_settings").updateOne(
    { key: "global" },
    { $set: { ...input, updatedAt: now }, $setOnInsert: { key: "global", createdAt: now } },
    { upsert: true },
  );
  return getSiteSettings();
}
