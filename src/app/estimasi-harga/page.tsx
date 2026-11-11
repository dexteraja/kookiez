"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Clock3 } from "lucide-react";
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

  const tier = budgetTiers.find((item) => item.id === budget)!;
  const selectedService = services.find((item) => item.id === service);
  const isCustom = tier.base == null;
  const rushMultiplier = speed === "rush" ? 1.5 : speed === "fast" ? 1.2 : 1;
  const estimate = isCustom ? null : Math.round((tier.base ?? 0) * rushMultiplier);
  const speedLabel =
    speed === "rush" ? t("calc_deadline_rush") : speed === "fast" ? t("calc_deadline_fast") : t("calc_deadline_normal");

  return (
    <div className="ui-shell min-h-screen text-ink">
      <div className="mx-auto max-w-page px-5 py-8 sm:px-7 sm:py-12">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" /> kookiez.
          </Link>
          <span className="stamp">Estimate sheet / 2026</span>
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1.2fr_.8fr] lg:gap-14">
          <div>
            <p className="kicker mb-2">{t("calc_kicker")}</p>
            <h1 className="display max-w-xl text-[clamp(2.4rem,5vw,4rem)]">{t("calc_title")}</h1>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-muted">
              Pilih layanan, paket, dan tenggat. Angka di samping adalah estimasi awal, bukan invoice final.
            </p>

            <div className="mt-8 space-y-8">
              <fieldset>
                <legend className="mb-3 flex w-full items-baseline gap-3">
                  <span className="font-mono text-[11px] text-muted">01</span>
                  <span className="text-sm font-semibold text-ink">{t("calc_service")}</span>
                </legend>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {services.map((item) => {
                    const Icon = item.icon;
                    const active = service === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setService(item.id)}
                        aria-pressed={active}
                        className={`flex min-h-[56px] items-center gap-3 rounded-xl border p-3.5 text-left transition-colors ${
                          active ? "border-accent bg-accent/5" : "border-line bg-card hover:border-ink/30"
                        }`}
                      >
                        <Icon className={`h-4 w-4 shrink-0 ${active ? "text-accent" : "text-muted"}`} />
                        <span className={`flex-1 text-sm font-medium ${active ? "text-accent" : "text-ink"}`}>
                          {item.title}
                        </span>
                        {active && <Check className="h-4 w-4 shrink-0 text-accent" />}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <fieldset>
                <legend className="mb-3 flex w-full items-baseline gap-3">
                  <span className="font-mono text-[11px] text-muted">02</span>
                  <span className="text-sm font-semibold text-ink">{t("calc_budget")}</span>
                </legend>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {budgetTiers.map((item) => {
                    const active = budget === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setBudget(item.id)}
                        aria-pressed={active}
                        className={`flex min-h-[56px] items-center justify-between gap-3 rounded-xl border p-3.5 text-left transition-colors ${
                          active ? "border-accent bg-accent/5" : "border-line bg-card hover:border-ink/30"
                        }`}
                      >
                        <span>
                          <span className={`block text-sm font-medium ${active ? "text-accent" : "text-ink"}`}>
                            {item.label}
                          </span>
                          <span className="mt-0.5 block font-mono text-[11px] text-muted">{item.range}</span>
                        </span>
                        {active && <Check className="h-4 w-4 shrink-0 text-accent" />}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <fieldset>
                <legend className="mb-3 flex w-full items-baseline gap-3">
                  <span className="font-mono text-[11px] text-muted">03</span>
                  <span className="text-sm font-semibold text-ink">{t("calc_deadline")}</span>
                </legend>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {(
                    [
                      { id: "normal", label: t("calc_deadline_normal") },
                      { id: "fast", label: t("calc_deadline_fast") },
                      { id: "rush", label: t("calc_deadline_rush") },
                    ] as { id: "normal" | "fast" | "rush"; label: string }[]
                  ).map((option) => {
                    const active = speed === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setSpeed(option.id)}
                        aria-pressed={active}
                        className={`flex min-h-[48px] items-center justify-center rounded-xl border px-3 text-center text-sm font-medium transition-colors ${
                          active ? "border-accent bg-accent/5 text-accent" : "border-line bg-card text-muted hover:border-ink/30"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            </div>
          </div>

          <div className="h-fit lg:sticky lg:top-8">
            <div className="docket overflow-hidden">
              <div className="flex items-start justify-between gap-4 border-b border-line p-5">
                <div>
                  <p className="mono-label">KZ / ESTIMATE</p>
                  <p className="mt-1 font-mono text-sm text-ink">Sheet {String(budgetTiers.findIndex((item) => item.id === budget) + 1).padStart(2, "0")}</p>
                </div>
                <span className="stamp stamp-accent">Draft</span>
              </div>

              <div className="space-y-3 p-5 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-muted">{t("calc_service")}</span>
                  <span className="text-right font-medium text-ink">{selectedService?.title}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted">{t("calc_budget")}</span>
                  <span className="text-right font-medium text-ink">{tier.label}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted">{t("calc_deadline")}</span>
                  <span className="text-right font-medium text-ink">{speedLabel}</span>
                </div>
              </div>

              <div className="docket-rule mx-5" />

              <div className="p-5">
                <p className="mono-label mb-2">{t("calc_result")}</p>
                <p className="font-mono text-[2.4rem] font-medium leading-none tracking-[-0.05em] text-ink">
                  {isCustom ? "Custom" : formatIDR(estimate ?? 0)}
                </p>
                {speed !== "normal" && !isCustom && (
                  <p className="mt-2 flex items-start gap-1.5 text-xs leading-relaxed text-muted">
                    <Clock3 className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {t("calc_rush_note")}
                  </p>
                )}
                <p className="mt-3 text-xs leading-relaxed text-muted">
                  {isCustom
                    ? "Paket custom dihitung setelah brief masuk. Belum ada pembayaran di tahap ini."
                    : "Estimasi belum termasuk revisi di luar lingkup dan biaya tambahan yang disepakati."}
                </p>
                <Link
                  href={`/?order=1&service=${encodeURIComponent(service)}&budget=${encodeURIComponent(budget)}`}
                  className="btn btn-primary mt-5 w-full"
                >
                  {t("calc_cta")} <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/lacak" className="btn btn-ghost mt-1 w-full">
                  Sudah punya order? Lacak di sini
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EstimasiSkeleton() {
  return (
    <div className="ui-shell min-h-screen">
      <div className="mx-auto max-w-page px-5 py-10 sm:px-7 sm:py-14">
        <SkeletonText lines={1} className="mb-10 w-24" />
        <SkeletonText lines={2} className="mb-10 max-w-md" />
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.2fr_.8fr]">
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <SkeletonText key={index} lines={1} className="h-12" />
              ))}
            </div>
          </div>
          <div className="h-64 rounded-xl border border-line bg-card" />
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
