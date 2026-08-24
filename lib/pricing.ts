import type { BudgetId, BudgetTier, Lang } from "@/lib/i18n";

export type PackagePricing = {
  base: number | null;
  promoPercent: number;
};

export type PricingOverride = Record<BudgetId, PackagePricing>;

export const DEFAULT_PRICING: PricingOverride = {
  hemat: { base: 70000, promoPercent: 0 },
  standar: { base: 250000, promoPercent: 0 },
  lengkap: { base: 500000, promoPercent: 0 },
  borongan: { base: null, promoPercent: 0 },
};

export const PRICING_META: Record<BudgetId, { id: BudgetId; label: Record<Lang, string>; min: number; max: number | null }> = {
  hemat: { id: "hemat", label: { id: "Hemat", en: "Basic" }, min: 25000, max: 75000 },
  standar: { id: "standar", label: { id: "Standar", en: "Standard" }, min: 75000, max: 200000 },
  lengkap: { id: "lengkap", label: { id: "Paket Lengkap", en: "Full Package" }, min: 200000, max: 500000 },
  borongan: { id: "borongan", label: { id: "Borongan / Custom", en: "Bulk / Custom" }, min: 500000, max: null },
};

export function mergePricing(value: unknown): PricingOverride {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return Object.fromEntries(Object.keys(DEFAULT_PRICING).map((key) => {
    const fallback = DEFAULT_PRICING[key as BudgetId];
    const raw = source[key];
    if (typeof raw === "number") return [key, { base: raw, promoPercent: 0 }];
    const packageValue = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
    return [key, {
      base: typeof packageValue.base === "number" ? packageValue.base : fallback.base,
      promoPercent: typeof packageValue.promoPercent === "number" ? packageValue.promoPercent : fallback.promoPercent,
    }];
  })) as PricingOverride;
}

export function buildBudgetTiers(lang: Lang, pricing: PricingOverride): BudgetTier[] {
  return (Object.keys(PRICING_META) as BudgetId[]).map((id) => {
    const meta = PRICING_META[id];
    const base = pricing[id].base;
    const range = meta.max == null ? `${lang === "id" ? "500rb+ · custom" : "500k+ · custom"}` : lang === "id" ? `Rp ${Math.round(meta.min / 1000)}rb – ${Math.round(meta.max / 1000)}rb` : `IDR ${Math.round(meta.min / 1000)}k – ${Math.round(meta.max / 1000)}k`;
    return { id, label: meta.label[lang], range, base, promoPercent: pricing[id].promoPercent };
  });
}

export function formatPricingForAdmin(pricing: PricingOverride) {
  return (Object.keys(PRICING_META) as BudgetId[]).map((id) => ({ id, label: PRICING_META[id].label, value: pricing[id].base, promoPercent: pricing[id].promoPercent }));
}

export function calculateDiscountedAmount(base: number, packagePromoPercent: number, promoCodePercent: number, plan: "deposit" | "full") {
  const packageDiscounted = Math.round(base * (1 - packagePromoPercent / 100));
  const discounted = Math.round(packageDiscounted * (1 - promoCodePercent / 100));
  const finalAmount = plan === "deposit" ? Math.round(discounted * 0.3) : discounted;
  return {
    subtotal: base,
    discountAmount: base - discounted,
    finalAmount,
  };
}
