import { z } from "zod";

export const JoinQueueSchema = z.object({
  service: z.string().trim().min(1).max(120, "Service is too long"),
  briefScope: z.string().trim().min(1).max(5000, "Brief is too long"),
  briefRefs: z.string().trim().max(2000).optional().default(""),
  budgetLabel: z.string().trim().max(160).optional().default(""),
  deadline: z.string().trim().max(40).optional().default(""),
  plan: z.enum(["deposit", "full"]).optional().default("deposit"),
  method: z.enum(["qris", "va", "card"]).optional().default("qris"),
  amount: z.number().finite().nonnegative().nullable().optional().default(null),
  isCustom: z.boolean().optional().default(false),
  fileNames: z.array(z.string().trim().min(1).max(255)).max(10).optional().default([]),
  customerEmail: z.string().email().nullable().optional().default(null),
  idempotencyKey: z.string().trim().min(8).max(128).optional(),
});

export type JoinQueueInput = z.infer<typeof JoinQueueSchema>;

export const UpdateOrderStatusSchema = z.object({
  status: z.enum(["pending", "progress", "review", "done"]),
});

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
