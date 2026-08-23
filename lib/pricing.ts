import type { BudgetId, BudgetTier, Lang } from "@/lib/i18n";

export type PricingOverride = Record<BudgetId, number | null>;

export const DEFAULT_PRICING: PricingOverride = {
  hemat: 50000,
  standar: 150000,
  lengkap: 350000,
  borongan: null,
};

export const PRICING_META: Record<BudgetId, { id: BudgetId; label: Record<Lang, string>; min: number; max: number | null }> = {
  hemat: { id: "hemat", label: { id: "Hemat", en: "Basic" }, min: 25000, max: 75000 },
  standar: { id: "standar", label: { id: "Standar", en: "Standard" }, min: 75000, max: 200000 },
  lengkap: { id: "lengkap", label: { id: "Paket Lengkap", en: "Full Package" }, min: 200000, max: 500000 },
  borongan: { id: "borongan", label: { id: "Borongan / Custom", en: "Bulk / Custom" }, min: 500000, max: null },
};

export function mergePricing(value: unknown): PricingOverride {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return Object.fromEntries(Object.keys(DEFAULT_PRICING).map((key) => [key, typeof source[key] === "number" ? source[key] : DEFAULT_PRICING[key as BudgetId]])) as PricingOverride;
}

export function buildBudgetTiers(lang: Lang, pricing: PricingOverride): BudgetTier[] {
  return (Object.keys(PRICING_META) as BudgetId[]).map((id) => {
    const meta = PRICING_META[id];
    const base = pricing[id];
    const range = meta.max == null ? `${lang === "id" ? "500rb+ · custom" : "500k+ · custom"}` : lang === "id" ? `Rp ${Math.round(meta.min / 1000)}rb – ${Math.round(meta.max / 1000)}rb` : `IDR ${Math.round(meta.min / 1000)}k – ${Math.round(meta.max / 1000)}k`;
    return { id, label: meta.label[lang], range, base };
  });
}

export function formatPricingForAdmin(pricing: PricingOverride) {
  return (Object.keys(PRICING_META) as BudgetId[]).map((id) => ({ id, label: PRICING_META[id].label, value: pricing[id] }));
}
