"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useLang, useServices, useBudgetTiers, type ServiceId, type BudgetId } from "@/lib/i18n";
import { SkeletonText } from "@/components/Skeleton";

const formatIDR = (n: number): string =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

function EstimasiContent() {
  const { t } = useLang();
  const services = useServices();
  const budgetTiers = useBudgetTiers();
  const [service, setService] = useState<ServiceId>(services[0].id);
  const [budget, setBudget] = useState<BudgetId>(budgetTiers[0].id);
  const [speed, setSpeed] = useState<"normal" | "fast" | "rush">("normal");

  const tier = budgetTiers.find((b) => b.id === budget)!;
  const isCustom = tier.base == null;
  const rushMultiplier = speed === "rush" ? 1.5 : speed === "fast" ? 1.2 : 1;
  const estimate = isCustom ? null : Math.round((tier.base ?? 0) * rushMultiplier);

  return (
    <div className="ui-shell min-h-screen text-[#1A1A1E]">
      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-16">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-[#1A1A1E]/50 hover:text-[#1A1A1E] mb-10">
          <ArrowLeft className="w-4 h-4" /> kookiez.
        </Link>

        <p className="font-mono text-xs tracking-widest text-[#0038FF] mb-2">{t("calc_kicker")}</p>
        <h1 className="max-w-xl font-heading text-4xl font-semibold leading-[.98] tracking-[-.04em] text-[#1A1A1E] sm:text-5xl">{t("calc_title")}</h1>

        <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-8">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-[#1A1A1E] mb-2">{t("calc_service")}</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {services.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setService(s.id)}
                    className={`text-xs font-medium px-3 py-2.5 rounded-lg border transition-colors text-left ${
                      service === s.id
                        ? "border-[#0038FF] bg-[#0038FF]/5 text-[#0038FF]"
                        : "border-[#1A1A1E]/10 text-[#1A1A1E]/70 hover:border-[#1A1A1E]/30"
                    }`}
                  >
                    {s.title}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1A1A1E] mb-2">{t("calc_budget")}</label>
              <div className="grid grid-cols-2 gap-2">
                {budgetTiers.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setBudget(b.id)}
                    className={`text-left text-xs font-medium px-3 py-2.5 rounded-lg border transition-colors ${
                      budget === b.id
                        ? "border-[#0038FF] bg-[#0038FF]/5 text-[#0038FF]"
                        : "border-[#1A1A1E]/10 text-[#1A1A1E]/70 hover:border-[#1A1A1E]/30"
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1A1A1E] mb-2">{t("calc_deadline")}</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {(
                  [
                    { id: "normal", label: t("calc_deadline_normal") },
                    { id: "fast", label: t("calc_deadline_fast") },
                    { id: "rush", label: t("calc_deadline_rush") },
                  ] as { id: "normal" | "fast" | "rush"; label: string }[]
                ).map((sOpt) => (
                  <button
                    key={sOpt.id}
                    onClick={() => setSpeed(sOpt.id)}
                    className={`text-left text-xs font-medium px-3 py-2.5 rounded-lg border transition-colors ${
                      speed === sOpt.id
                        ? "border-[#0038FF] bg-[#0038FF]/5 text-[#0038FF]"
                        : "border-[#1A1A1E]/10 text-[#1A1A1E]/70 hover:border-[#1A1A1E]/30"
                    }`}
                  >
                    {sOpt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="ui-panel h-fit border-[#0038FF]/15 p-6 sm:p-7 lg:sticky lg:top-24">
            <div className="text-xs font-mono tracking-widest text-[#1A1A1E]/40 mb-2">{t("calc_result")}</div>
            <div className="font-heading text-4xl font-semibold leading-none tracking-[-.04em] text-[#1A1A1E] mb-1">
              {isCustom ? "Custom" : formatIDR(estimate ?? 0)}
            </div>
            {speed !== "normal" && !isCustom && <p className="text-xs text-[#1A1A1E]/40 mb-4">{t("calc_rush_note")}</p>}
            <Link
              href="/?order=1"
              className="ui-action mt-5 flex w-full items-center justify-center gap-2 bg-[#0038FF] py-3.5 text-sm font-medium text-white shadow-[0_8px_18px_rgba(0,56,255,.16)] hover:bg-[#0030DB]"
            >
              {t("calc_cta")} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function EstimasiSkeleton() {
  return (
    <div className="min-h-screen bg-[#F9F9FB]">
      <div className="max-w-6xl mx-auto px-6 py-16">
        <SkeletonText lines={1} className="w-24 mb-10" />
        <SkeletonText lines={2} className="max-w-md mb-10" />
        <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-8">
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonText key={i} lines={1} className="h-10" />
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-[#1A1A1E]/10 p-6 h-40" />
        </div>
      </div>
    </div>
  );
}

export default function EstimasiHargaPage() {
  return (
    <Suspense fallback={<EstimasiSkeleton />}>
      <EstimasiContent />
    </Suspense>
  );
}