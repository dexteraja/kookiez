"use client";

import { useState, useEffect, Suspense, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Search, CheckCircle2, Clock, Loader2, Eye, MessageCircle } from "lucide-react";
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
    pending: { label: t("status_pending"), icon: Clock, tone: "badge-pending" },
    progress: { label: t("status_progress"), icon: Loader2, tone: "badge-accent" },
    review: { label: t("status_review"), icon: Eye, tone: "badge-review" },
    done: { label: t("status_done"), icon: CheckCircle2, tone: "badge-success" },
  } as const;
  return map[status];
}

const paymentStatusLabels: Record<string, { label: string; tone: string }> = {
  dp_pending: { label: "Menunggu DP", tone: "badge-pending" },
  dp_paid: { label: "DP Diterima", tone: "badge-accent" },
  settlement_pending: { label: "Menunggu Pelunasan", tone: "badge-pending" },
  pending: { label: "Menunggu Bayar", tone: "badge-pending" },
  paid: { label: "Lunas", tone: "badge-success" },
  rejected: { label: "Ditolak", tone: "badge-danger" },
  manual_contact_required: { label: "Menunggu Bayar", tone: "badge-pending" },
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
      const normalizedCode = orderCode.trim().toUpperCase();
      window.localStorage.setItem("kookiez:last-order-code", normalizedCode);
      const res = await fetch(`/api/orders/${encodeURIComponent(normalizedCode)}`, { cache: "no-store" });
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
    const codeParam = params.get("code") ?? window.localStorage.getItem("kookiez:last-order-code");
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
            setOrder((prev) => (prev ? { ...prev, status: data.status } : prev));
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
        es?.close();
        eventSourceRef.current = null;
      };
    } catch {
      // SSE not available for non-admin users; manual refresh still works.
    }

    return () => {
      if (es) es.close();
      eventSourceRef.current = null;
    };
  }, [order?.code]);

  return (
    <div className="ui-shell min-h-screen text-ink">
      <div className="mx-auto max-w-3xl px-5 py-8 sm:px-7 sm:py-12">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="inline-flex min-h-[44px] items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink">
            <ArrowLeft className="h-4 w-4" /> kookiez.
          </Link>
          <span className="stamp">Tracking desk / 2026</span>
        </div>

        <div className="mt-10">
          <p className="kicker mb-2">{t("track_kicker")}</p>
          <h1 className="display text-[clamp(2.4rem,5vw,4rem)]">{t("track_title")}</h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">{t("track_desc")}</p>
        </div>

        <form
          className="mt-8 flex flex-col gap-2 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            fetchOrder(code);
          }}
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              placeholder={t("track_placeholder")}
              aria-label={t("track_placeholder")}
              className="ui-input !pl-10 font-mono uppercase tracking-[0.04em]"
              autoComplete="off"
            />
          </div>
          <button type="submit" disabled={loading || !code.trim()} className="btn btn-primary shrink-0">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {t("track_button")}
          </button>
        </form>

        <div className="mt-8" aria-live="polite">
          {loading && (
            <div className="docket space-y-4 p-6">
              <div className="h-4 w-28 animate-pulse rounded bg-ink/10" />
              <div className="h-10 w-40 animate-pulse rounded bg-ink/10" />
              <div className="h-3 w-full animate-pulse rounded bg-ink/10" />
              <div className="h-3 w-2/3 animate-pulse rounded bg-ink/10" />
            </div>
          )}

          {!loading && order === null && (
            <div className="docket p-6 text-center sm:p-8">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-pending/10">
                <Search className="h-5 w-5 text-pending" />
              </div>
              <h2 className="font-display text-xl font-semibold text-ink">Order tidak ditemukan</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">{t("track_notfound")}</p>
              <Link href="/" className="btn btn-secondary mt-5">
                Kembali ke beranda
              </Link>
            </div>
          )}

          {!loading && order && (
            <div className="docket overflow-hidden">
              <div className="flex flex-wrap items-start justify-between gap-4 p-5 sm:p-6">
                <div>
                  <p className="mono-label mb-2">{t("track_status_label")}</p>
                  {(() => {
                    const meta = statusMeta(order.status, t);
                    const Icon = meta.icon;
                    return (
                      <span className={`badge ${meta.tone}`}>
                        <Icon className={`h-3.5 w-3.5 ${order.status === "progress" ? "animate-spin" : ""}`} />
                        {meta.label}
                      </span>
                    );
                  })()}
                </div>
                <div className="text-right">
                  <p className="mono-label mb-1">Kode order</p>
                  <p className="font-mono text-lg font-medium tracking-[0.06em] text-ink">{order.code}</p>
                </div>
              </div>

              {order.paymentStatus && (
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-5 py-3 sm:px-6">
                  <span className="mono-label">Pembayaran</span>
                  {(() => {
                    const payment = paymentStatusLabels[order.paymentStatus] ?? paymentStatusLabels.pending;
                    return <span className={`badge ${payment.tone}`}>{payment.label}</span>;
                  })()}
                </div>
              )}

              {order.queuePosition !== null && order.status !== "done" && (
                <div className="border-t border-line bg-accent/[0.04] p-5 sm:p-6">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <p className="mono-label mb-2 text-accent">Posisi antrean</p>
                      <p className="font-mono text-5xl font-medium leading-none tracking-[-0.06em] text-accent">
                        {String(order.queuePosition).padStart(2, "0")}
                      </p>
                    </div>
                    <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
                      dari {order.maxSlots} slot
                    </span>
                  </div>

                  <div className="mt-5 flex gap-1" aria-hidden="true">
                    {Array.from({ length: order.maxSlots }).map((_, index) => (
                      <div
                        key={index}
                        className={`h-1.5 flex-1 rounded-full ${index < order.activeSlots ? "bg-accent" : "bg-ink/10"}`}
                      />
                    ))}
                  </div>

                  <p className="mt-3 text-xs leading-relaxed text-muted">
                    Kamu nomor antrean ke-{order.queuePosition} dari {order.maxSlots} slot.{" "}
                    {order.availableSlots > 0
                      ? `Masih ada ${order.availableSlots} slot kosong.`
                      : "Slot penuh, menunggu yang lain selesai."}
                  </p>
                </div>
              )}

              <div className="border-t border-line p-5 sm:p-6">
                <p className="mono-label mb-3">{t("track_order_detail")}</p>
                <div className="space-y-2.5 text-sm">
                  <Row label={t("step4_service")} value={order.service} />
                  <Row label={t("step4_budget")} value={order.budgetLabel} />
                  <Row label={t("step4_deadline")} value={order.deadline || t("step4_flexible")} />
                  {!order.isCustom && order.amount != null && <Row label={t("step4_total")} value={formatIDR(order.amount)} />}
                  {order.dpAmount != null && <Row label="DP (30%)" value={formatIDR(order.dpAmount)} />}
                  {order.remainingAmount != null && order.remainingAmount > 0 && <Row label="Sisa" value={formatIDR(order.remainingAmount)} />}
                  {(order.paidAmount ?? 0) > 0 && <Row label="Terbayar" value={formatIDR(order.paidAmount ?? 0)} />}
                </div>
              </div>

              <div className="flex flex-col gap-2 border-t border-line p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <p className="text-xs leading-relaxed text-muted">Status diperbarui otomatis saat produksi berjalan.</p>
                <a
                  href={`https://wa.me/6285792006860?text=${encodeURIComponent(`Halo Kookiez, aku mau tanya soal order ${order.code}.`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary shrink-0"
                >
                  <MessageCircle className="h-4 w-4" style={{ color: "#25D366" }} /> Tanya CS
                </a>
              </div>
            </div>
          )}

          {!loading && order === undefined && (
            <div className="docket p-6 sm:p-8">
              <p className="mono-label mb-2">Cara pakai</p>
              <p className="text-sm leading-relaxed text-muted">
                Masukkan kode order yang kamu terima setelah checkout. Kode juga tersimpan di perangkat ini kalau kamu memesan dari browser yang sama.
              </p>
              <Link href="/estimasi-harga" className="mt-4 inline-flex min-h-[44px] items-center gap-1.5 text-sm font-medium text-accent">
                Belum punya order? Hitung estimasi <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4">
      <span className="shrink-0 text-muted">{label}</span>
      <span className="text-right font-medium text-ink">{value}</span>
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
