"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Search, CheckCircle2, Clock, Loader2, Eye } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { getOrder, type StoredOrder, type OrderStatus } from "@/lib/orders";

function statusMeta(status: OrderStatus, t: (k: any) => string) {
  const map = {
    pending: { label: t("status_pending"), icon: Clock, color: "#B58900" },
    progress: { label: t("status_progress"), icon: Loader2, color: "#0038FF" },
    review: { label: t("status_review"), icon: Eye, color: "#9333EA" },
    done: { label: t("status_done"), icon: CheckCircle2, color: "#16A34A" },
  } as const;
  return map[status];
}

function formatIDR(n: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

function TrackContent() {
  const { t } = useLang();
  const params = useSearchParams();
  const [code, setCode] = useState(params.get("code") ?? "");
  const [order, setOrder] = useState<StoredOrder | null | undefined>(undefined);

  const search = (c: string) => {
    const found = getOrder(c);
    setOrder(found);
  };

  useEffect(() => {
    if (params.get("code")) search(params.get("code")!);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-[#F9F9FB] text-[#1A1A1E]">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-[#1A1A1E]/50 hover:text-[#1A1A1E] mb-8">
          <ArrowLeft className="w-4 h-4" /> kookiez.
        </Link>

        <p className="font-mono text-xs tracking-widest text-[#0038FF] mb-2">{t("track_kicker")}</p>
        <h1 className="font-heading text-3xl font-semibold mb-2">{t("track_title")}</h1>
        <p className="text-sm text-[#1A1A1E]/50 mb-8">{t("track_desc")}</p>

        <div className="flex gap-2 mb-8">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search(code)}
            placeholder={t("track_placeholder")}
            className="flex-1 rounded-lg border border-[#1A1A1E]/15 bg-white px-4 py-3 text-sm font-mono placeholder:text-[#1A1A1E]/30 focus:outline-none focus:ring-1 focus:ring-[#0038FF] focus:border-[#0038FF]"
          />
          <button
            onClick={() => search(code)}
            className="flex items-center gap-2 bg-[#0038FF] text-white px-5 py-3 rounded-lg text-sm font-medium hover:bg-[#0030DB] transition-colors shrink-0"
          >
            <Search className="w-4 h-4" /> {t("track_button")}
          </button>
        </div>

        {order === null && (
          <p className="text-sm text-[#1A1A1E]/50 border border-[#1A1A1E]/10 rounded-lg p-4">{t("track_notfound")}</p>
        )}

        {order && (
          <div className="rounded-xl border border-[#1A1A1E]/10 overflow-hidden">
            <div className="p-6 flex items-center justify-between border-b border-[#1A1A1E]/10">
              <div>
                <div className="text-[10px] font-mono tracking-widest text-[#1A1A1E]/40 mb-1">
                  {t("track_status_label")}
                </div>
                {(() => {
                  const meta = statusMeta(order.status, t);
                  const Icon = meta.icon;
                  return (
                    <div className="flex items-center gap-2 font-medium" style={{ color: meta.color }}>
                      <Icon className="w-4 h-4" /> {meta.label}
                    </div>
                  );
                })()}
              </div>
              <span className="font-mono text-sm font-semibold text-[#0038FF]">{order.code}</span>
            </div>
            <div className="p-6 space-y-2.5 text-sm">
              <div className="text-[10px] font-mono tracking-widest text-[#1A1A1E]/40 mb-1">
                {t("track_order_detail")}
              </div>
              <Row label={t("step4_service")} value={order.service} />
              <Row label={t("step4_budget")} value={order.budgetLabel} />
              <Row label={t("step4_deadline")} value={order.deadline || t("step4_flexible")} />
              {!order.isCustom && order.amount != null && <Row label={t("step4_total")} value={formatIDR(order.amount)} />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex justify-between">
      <span className="text-[#1A1A1E]/45">{label}</span>
      <span className="font-medium text-[#1A1A1E]">{value}</span>
    </div>
  );
}

export default function TrackPage() {
  return (
    <Suspense fallback={null}>
      <TrackContent />
    </Suspense>
  );
}