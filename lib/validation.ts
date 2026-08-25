import { z } from "zod";

const referenceLinks = (value: string) => {
  const links = value.split(/[\n,]+/).map((link) => link.trim()).filter(Boolean);
  if (links.length > 5) return false;
  return links.every((link) => {
    try {
      const url = new URL(link);
      return ["http:", "https:"].includes(url.protocol) && link.length <= 500;
    } catch {
      return false;
    }
  });
};

export const JoinQueueSchema = z.object({
  service: z.string().trim().min(1).max(120, "Service is too long"),
  briefScope: z.string().trim().min(1).max(5000, "Brief is too long"),
  briefRefs: z.string().trim().max(2000).refine(referenceLinks, "Masukkan maksimal 5 link URL yang valid (http/https), pisahkan dengan koma atau baris baru.").optional().default(""),
  budgetLabel: z.string().trim().max(160).optional().default(""),
  deadline: z.string().trim().max(40).optional().default(""),
  plan: z.enum(["deposit", "full"]).optional().default("deposit"),
  method: z.enum(["qris", "va", "card"]).optional().default("qris"),
  amount: z.number().finite().nonnegative().nullable().optional().default(null),
  isCustom: z.boolean().optional().default(false),
  packageId: z.string().trim().max(40).optional().default(""),
  customerName: z.string().trim().min(1).max(120, "Customer name is too long"),
  promoCode: z.string().trim().max(40).optional().default(""),
  fileNames: z.array(z.string().trim().min(1).max(255)).max(10).optional().default([]),
  fileUrls: z.array(z.string().url().max(2000)).max(10).optional().default([]),
  customerEmail: z.string().email().nullable().optional().default(null),
  idempotencyKey: z.string().trim().min(8).max(128).optional(),
});

export type JoinQueueInput = z.infer<typeof JoinQueueSchema>;

const PromoCodeFieldsSchema = z.object({
  code: z.string().trim().min(3).max(40).regex(/^[a-zA-Z0-9_-]+$/),
  percent: z.number().int().min(1).max(100),
  packageIds: z.array(z.string().trim().min(1).max(40)).min(1).max(10),
  startsAt: z.coerce.date(),
  expiresAt: z.coerce.date(),
  active: z.boolean().default(true),
});

export const PromoCodeSchema = PromoCodeFieldsSchema.refine((value) => value.expiresAt > value.startsAt, {
  message: "Tanggal berakhir harus setelah tanggal mulai.",
  path: ["expiresAt"],
});

export const PromoCodeUpdateSchema = PromoCodeFieldsSchema.partial().refine((value) => {
  if (!value.startsAt || !value.expiresAt) return true;
  return value.expiresAt > value.startsAt;
}, { message: "Tanggal berakhir harus setelah tanggal mulai.", path: ["expiresAt"] });

export const UpdateOrderStatusSchema = z.object({
  status: z.enum(["pending", "progress", "review", "done"]),
});

export const RevisionRequestSchema = z.object({
  message: z.string().trim().min(1).max(3000),
});

export const DeliverableMessageSchema = z.object({ message: z.string().trim().max(2000).optional().default("") });

export const UpdateQueueSettingsSchema = z.object({
  maxSlots: z.number().int().min(1).max(999),
  note: z.string().optional().default(""),
});

export const SiteSettingsSchema = z.object({
  onlinePaymentEnabled: z.boolean(),
  whatsappCsNumber: z.string().regex(/^\d{8,15}$/, "Invalid WhatsApp number"),
  whatsappFallbackMessage: z.string().trim().min(1).max(500),
});

export type SiteSettingsInput = z.infer<typeof SiteSettingsSchema>;

export const TrackOrderSchema = z.object({
  code: z.string().min(1, "Order code is required"),
});
