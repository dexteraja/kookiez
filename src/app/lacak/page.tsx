"use client";

import { useState, useEffect, Suspense, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Search, CheckCircle2, Clock, Loader2, Eye,
} from "lucide-react";
import { useLang } from "@/lib/i18n";

type OrderStatus = "pending" | "progress" | "review" | "done";

interface OrderDetail {
  code: string;
  status: OrderStatus;
  service: string;
  budgetLabel: string;
  deadline: string;
  plan: string;
  method: string;
  amount: number | null;
  isCustom: boolean;
  briefScope: string;
  briefRefs: string;
  fileNames: string[];
  paymentStatus?: string;
  dpAmount?: number | null;
  remainingAmount?: number | null;
  paidAmount?: number;
  createdAt: string;
  queuePosition: number | null;
  maxSlots: number;
  activeSlots: number;
  availableSlots: number;
}

function statusMeta(status: OrderStatus, t: (k: any) => string) {
  const map = {
    pending: { label: t("status_pending"), icon: Clock, color: "#B58900", bg: "#B5890015" },
    progress: { label: t("status_progress"), icon: Loader2, color: "#0038FF", bg: "#0038FF15" },
    review: { label: t("status_review"), icon: Eye, color: "#9333EA", bg: "#9333EA15" },
    done: { label: t("status_done"), icon: CheckCircle2, color: "#16A34A", bg: "#16A34A15" },
  } as const;
  return map[status];
}

const paymentStatusLabels: Record<string, { label: string; color: string; bg: string }> = {
  dp_pending: { label: "Menunggu DP", color: "#B58900", bg: "#B5890015" },
  dp_paid: { label: "DP Diterima", color: "#0038FF", bg: "#0038FF15" },
  settlement_pending: { label: "Menunggu Pelunasan", color: "#D97706", bg: "#D9770615" },
  pending: { label: "Menunggu Bayar", color: "#B58900", bg: "#B5890015" },
  paid: { label: "Lunas", color: "#16A34A", bg: "#16A34A15" },
  rejected: { label: "Ditolak", color: "#DC2626", bg: "#DC262615" },
  manual_contact_required: { label: "Menunggu Bayar", color: "#B58900", bg: "#B5890015" },
};

function formatIDR(n: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

function TrackContent() {
  const { t } = useLang();
  const params = useSearchParams();
  const [code, setCode] = useState(params.get("code") ?? "");
  const [order, setOrder] = useState<OrderDetail | null | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  const fetchOrder = useCallback(async (orderCode: string) => {
    if (!orderCode.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderCode.trim().toUpperCase())}`);
      if (res.ok) {
        const data = await res.json();
        setOrder(data);
      } else {
        setOrder(null);
      }
    } catch {
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const codeParam = params.get("code");
    if (codeParam) {
      setCode(codeParam);
      fetchOrder(codeParam);
    }
  }, [params, fetchOrder]);

  useEffect(() => {
    if (!order?.code) return;

    let es: EventSource | undefined;
    try {
      es = new EventSource("/api/queue/stream");
      eventSourceRef.current = es;

      es.addEventListener("order_status", (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.code === order.code) {
            setOrder((prev) =>
              prev ? { ...prev, status: data.status } : prev
            );
          }
        } catch {}
      });

      es.addEventListener("queue_update", (e) => {
        try {
          const data = JSON.parse(e.data);
          setOrder((prev) =>
            prev
              ? {
                  ...prev,
                  maxSlots: data.maxSlots,
                  activeSlots: data.activeSlots,
                  availableSlots: data.availableSlots,
                }
              : prev
          );
        } catch {}
      });

      es.onerror = () => {
        // Silently close - SSE may not be available for non-admin users
        es?.close();
        eventSourceRef.current = null;
      };
    } catch {
      // SSE not available, skip live updates
    }

    return () => {
      if (es) es.close();
      eventSourceRef.current = null;
    };
  }, [order?.code]);

  return (
    <div className="ui-shell min-h-screen text-[#1A1A1E]">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-[#1A1A1E]/50 hover:text-[#1A1A1E] mb-8"
        >
          <ArrowLeft className="w-4 h-4" /> kookiez.
        </Link>

        <p className="font-mono text-xs tracking-widest text-[#0038FF] mb-2">
          {t("track_kicker")}
        </p>
        <h1 className="font-heading text-3xl font-semibold mb-2">
          {t("track_title")}
        </h1>
        <p className="text-sm text-[#1A1A1E]/50 mb-8">{t("track_desc")}</p>

        <div className="flex gap-2 mb-8">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchOrder(code)}
            placeholder={t("track_placeholder")}
            className="flex-1 rounded-lg border border-[#1A1A1E]/15 bg-white px-4 py-3 text-sm font-mono placeholder:text-[#1A1A1E]/30 focus:outline-none focus:ring-1 focus:ring-[#0038FF] focus:border-[#0038FF]"
          />
          <button
            onClick={() => fetchOrder(code)}
            disabled={loading}
            className="flex items-center gap-2 bg-[#0038FF] text-white px-5 py-3 rounded-lg text-sm font-medium hover:bg-[#0030DB] transition-colors shrink-0 disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            {t("track_button")}
          </button>
        </div>

        {order === null && (
          <p className="text-sm text-[#1A1A1E]/50 border border-[#1A1A1E]/10 rounded-lg p-4">
            {t("track_notfound")}
          </p>
        )}

        {order && (
          <div className="rounded-xl border border-[#1A1A1E]/10 overflow-hidden bg-white">
            {/* Header */}
            <div className="p-6 flex items-center justify-between border-b border-[#1A1A1E]/10">
              <div>
                <div className="text-[10px] font-mono tracking-widest text-[#1A1A1E]/40 mb-1">
                  {t("track_status_label")}
                </div>
                {(() => {
                  const meta = statusMeta(order.status, t);
                  const Icon = meta.icon;
                  return (
                    <div
                      className="inline-flex items-center gap-2 font-medium text-sm px-3 py-1.5 rounded-full"
                      style={{ color: meta.color, backgroundColor: meta.bg }}
                    >
                      <Icon
                        className={`w-4 h-4 ${
                          order.status === "progress" ? "animate-spin" : ""
                        }`}
                      />
                      {meta.label}
                    </div>
                  );
                })()}
              </div>
              <span className="font-mono text-sm font-semibold text-[#0038FF]">
                {order.code}
              </span>
            </div>

            {/* Payment Status */}
            {order.paymentStatus && (
              <div className="px-6 py-3 border-b border-[#1A1A1E]/10 flex items-center justify-between">
                <span className="text-[10px] font-mono tracking-widest text-[#1A1A1E]/40">PEMBAYARAN</span>
                {(() => {
                  const pm = paymentStatusLabels[order.paymentStatus] ?? paymentStatusLabels.pending;
                  return (
                    <span className="inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full" style={{ color: pm.color, backgroundColor: pm.bg }}>
                      {pm.label}
                    </span>
                  );
                })()}
              </div>
            )}

            {/* Queue Position Card */}
            {order.queuePosition !== null && order.status !== "done" && (
              <div className="p-6 border-b border-[#1A1A1E]/10 bg-[#0038FF]/[0.02]">
                <div className="text-[10px] font-mono tracking-widest text-[#0038FF] mb-3">
                  POSISI ANTREAN
                </div>
                <div className="flex items-end gap-2 mb-3">
                  <span className="text-4xl font-mono font-bold text-[#0038FF]">
                    {order.queuePosition}
                  </span>
                  <span className="text-sm text-[#1A1A1E]/40 mb-1">
                    dari {order.maxSlots} slot
                  </span>
                </div>

                {/* Progress bar */}
                <div className="flex gap-1 mb-2">
                  {Array.from({ length: order.maxSlots }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-2 flex-1 rounded-full transition-colors ${
                        i < order.activeSlots
                          ? "bg-[#0038FF]"
                          : "bg-[#1A1A1E]/10"
                      }`}
                    />
                  ))}
                </div>

                <p className="text-xs text-[#1A1A1E]/50">
                  Anda nomor antrean ke-{order.queuePosition} dari {order.maxSlots} slot
                  tersedia. {order.availableSlots > 0
                    ? `Masih ada ${order.availableSlots} slot kosong.`
                    : "Slot penuh, menunggu yang lain selesai."}
                </p>
              </div>
            )}

            {/* Order Details */}
            <div className="p-6 space-y-2.5 text-sm">
              <div className="text-[10px] font-mono tracking-widest text-[#1A1A1E]/40 mb-1">
                {t("track_order_detail")}
              </div>
              <Row label={t("step4_service")} value={order.service} />
              <Row label={t("step4_budget")} value={order.budgetLabel} />
              <Row
                label={t("step4_deadline")}
                value={order.deadline || t("step4_flexible")}
              />
              {!order.isCustom && order.amount != null && (
                <Row label={t("step4_total")} value={formatIDR(order.amount)} />
              )}
              {order.dpAmount != null && (
                <Row label="DP (30%)" value={formatIDR(order.dpAmount)} />
              )}
              {order.remainingAmount != null && order.remainingAmount > 0 && (
                <Row label="Sisa" value={formatIDR(order.remainingAmount)} />
              )}
              {(order.paidAmount ?? 0) > 0 && (
                <Row label="Terbayar" value={formatIDR(order.paidAmount ?? 0)} />
              )}
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
