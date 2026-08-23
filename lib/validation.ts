import { z } from "zod";

export const JoinQueueSchema = z.object({
  service: z.string().min(1, "Service is required"),
  briefScope: z.string().min(1, "Brief description is required"),
  briefRefs: z.string().optional().default(""),
  budgetLabel: z.string().optional().default(""),
  deadline: z.string().optional().default(""),
  plan: z.enum(["deposit", "full"]).optional().default("deposit"),
  method: z.enum(["qris", "va", "card"]).optional().default("qris"),
  amount: z.number().nullable().optional().default(null),
  isCustom: z.boolean().optional().default(false),
  fileNames: z.array(z.string()).optional().default([]),
  customerEmail: z.string().email().nullable().optional().default(null),
});

export type JoinQueueInput = z.infer<typeof JoinQueueSchema>;

export const UpdateOrderStatusSchema = z.object({
  status: z.enum(["pending", "progress", "review", "done"]),
});

export const UpdateQueueSettingsSchema = z.object({
  maxSlots: z.number().int().min(1).max(999),
  note: z.string().optional().default(""),
});

export const TrackOrderSchema = z.object({
  code: z.string().min(1, "Order code is required"),
});
