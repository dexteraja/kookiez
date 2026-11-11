"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileDown,
  Loader2,
  MessageCircle,
  ReceiptText,
  UploadCloud,
} from "lucide-react";

type MemberOrder = {
  code: string;
  status: string;
  service: string;
  budgetLabel: string;
  deadline: string;
  amount: number | null;
  paymentRoute?: string;
  paymentStatus?: string;
  dpAmount?: number | null;
  remainingAmount?: number | null;
  paidAmount?: number;
  paymentHistory?: Array<{ id: string; action: string; amount: number | null; note: string; actor: string; createdAt: string; proofId?: string }>;
  createdAt: string;
  updatedAt?: string;
  fileUrls?: string[];
  deliverables?: Array<{ id: string; name?: string; filename?: string; uploadedAt?: string; approvalStatus?: string }>;
  revisionRequests?: Array<{ id: string; message: string; status: string; createdAt: string }>;
  events?: Array<{ id: string; label: string; actor: string; createdAt: string }>;
};

const statusLabels: Record<string, string> = {
  pending: "Menunggu",
  progress: "Dikerjakan",
  review: "Review",
  done: "Selesai",
};

const statusTones: Record<string, string> = {
  pending: "badge-pending",
  progress: "badge-accent",
  review: "badge-review",
  done: "badge-success",
};

const paymentStatusLabels: Record<string, { label: string; tone: string }> = {
  dp_pending: { label: "Menunggu DP", tone: "badge-pending" },
  dp_paid: { label: "DP Diterima", tone: "badge-accent" },
  settlement_pending: { label: "Menunggu Pelunasan", tone: "badge-pending" },
  pending: { label: "Menunggu Bayar", tone: "badge-pending" },
  paid: { label: "Lunas", tone: "badge-success" },
  rejected: { label: "Ditolak", tone: "badge-danger" },
  manual_contact_required: { label: "Menunggu Bayar", tone: "badge-pending" },
};

const paymentActionLabels: Record<string, string> = {
  confirm_dp: "DP dikonfirmasi",
  confirm_full: "Pembayaran dikonfirmasi",
  confirm_settlement: "Pelunasan dikonfirmasi",
  reject: "Dibatalkan",
};

function formatIDR(n: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function MemberPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [orders, setOrders] = useState<MemberOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [revisionFor, setRevisionFor] = useState<string | null>(null);
  const [revisionMessage, setRevisionMessage] = useState("");
  const [revisionStatus, setRevisionStatus] = useState("");
  const [approvalStatus, setApprovalStatus] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [paymentProofId, setPaymentProofId] = useState("");
  const [paymentProofName, setPaymentProofName] = useState("");
  const [paymentProofUploading, setPaymentProofUploading] = useState(false);

  const submitRevision = async (code: string) => {
    setRevisionStatus("Mengirim...");
    try {
      const response = await fetch(`/api/member/orders/${encodeURIComponent(code)}/revisions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: revisionMessage }),
      });
      const data = await response.json();
      setRevisionStatus(response.ok ? "Permintaan revisi terkirim." : data.error || "Revisi gagal dikirim.");
      if (response.ok) {
        setRevisionMessage("");
        setRevisionFor(null);
      }
    } catch {
      setRevisionStatus("Revisi gagal dikirim. Coba lagi.");
    }
  };

  const approveDeliverable = async (code: string, deliverableId: string, action: "approved" | "revision_requested") => {
    setApprovalStatus("Menyimpan...");
    try {
      const response = await fetch(`/api/member/orders/${encodeURIComponent(code)}/approval`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, deliverableId }),
      });
      const data = await response.json();
      setApprovalStatus(response.ok ? "Status project diperbarui." : data.error || "Status gagal diperbarui.");
      if (response.ok) {
        setOrders((current) =>
          current.map((item) =>
            item.code === code ? { ...item, status: action === "approved" ? "done" : "review" } : item
          )
        );
      }
    } catch {
      setApprovalStatus("Status gagal diperbarui. Coba lagi.");
    }
  };

  const submitPayment = async (code: string, action: "submit_dp" | "submit_full" | "submit_settlement") => {
    if (!paymentNote.trim() || !paymentProofId) {
      setPaymentStatus("Isi keterangan dan unggah bukti pembayaran terlebih dahulu.");
      return;
    }
    setPaymentStatus("Mengirim konfirmasi...");
    try {
      const response = await fetch(`/api/member/orders/${encodeURIComponent(code)}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note: paymentNote, proofId: paymentProofId }),
      });
      const data = await response.json().catch(() => ({}));
      setPaymentStatus(response.ok ? "Konfirmasi terkirim. Menunggu verifikasi admin." : data.error || "Konfirmasi gagal dikirim.");
      if (response.ok) {
        setPaymentNote("");
        setPaymentProofId("");
        setPaymentProofName("");
        setOrders((current) =>
          current.map((item) =>
            item.code === code ? { ...item, paymentHistory: [...(item.paymentHistory ?? []), data.submission] } : item
          )
        );
      }
    } catch {
      setPaymentStatus("Konfirmasi gagal dikirim. Coba lagi.");
    }
  };

  const uploadPaymentProof = async (code: string, file: File) => {
    setPaymentProofUploading(true);
    setPaymentStatus("Mengunggah bukti pembayaran...");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(`/api/member/orders/${encodeURIComponent(code)}/payment-proof`, {
        method: "POST",
        body: formData,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setPaymentStatus(data.error || "Bukti pembayaran gagal diunggah.");
        return;
      }
      setPaymentProofId(data.id);
      setPaymentProofName(data.name);
      setPaymentStatus("Bukti pembayaran siap dikirim untuk verifikasi admin.");
    } catch {
      setPaymentStatus("Bukti pembayaran gagal diunggah. Coba lagi.");
    } finally {
      setPaymentProofUploading(false);
    }
  };

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }
    if (status !== "authenticated") return;
    fetch("/api/member/orders", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => setOrders(data.orders ?? []))
      .finally(() => setLoading(false));
  }, [router, status]);

  useEffect(() => {
    if (status !== "authenticated") return;
    const eventSource = new EventSource("/api/queue/stream");
    const refreshForOrder = (event: MessageEvent<string>) => {
      try {
        const data = JSON.parse(event.data) as { code?: string };
        if (!data.code || !orders.some((order) => order.code === data.code)) return;
        fetch("/api/member/orders", { cache: "no-store" })
          .then((response) => response.json())
          .then((payload) => setOrders(payload.orders ?? []))
          .catch(() => {});
      } catch {}
    };
    eventSource.addEventListener("order_status", refreshForOrder);
    eventSource.addEventListener("payment_update", refreshForOrder);
    eventSource.onerror = () => eventSource.close();
    return () => eventSource.close();
  }, [orders, status]);

  if (status === "loading" || !session) {
    return (
      <main className="ui-shell flex min-h-screen items-center justify-center text-ink">
        <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.12em] text-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Memuat workspace
        </div>
      </main>
    );
  }

  const activeCount = orders.filter((order) => order.status !== "done").length;
  const waitingPayment = orders.filter((order) =>
    ["dp_pending", "pending", "settlement_pending"].includes(order.paymentStatus ?? "pending")
  ).length;
  const doneCount = orders.filter((order) => order.status === "done").length;

  return (
    <main className="ui-shell min-h-screen text-ink">
      <div className="mx-auto max-w-page px-5 py-8 sm:px-7 sm:py-12">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="inline-flex min-h-[44px] items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink">
            <ArrowLeft className="h-4 w-4" /> kookiez.
          </Link>
          <div className="flex items-center gap-2">
            <span className="stamp">Member desk / 2026</span>
            {session.user.role === "admin" && (
              <Link href="/admin" className="btn btn-secondary !min-h-9 !px-3 !py-1.5 !text-xs">
                Admin
              </Link>
            )}
          </div>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="kicker mb-2">Member workspace</p>
            <h1 className="display text-[clamp(2.6rem,5.6vw,4.6rem)]">Pesanan kamu.</h1>
            <p className="mt-3 text-sm text-muted">
              Masuk sebagai <span className="font-medium text-ink">{session.user.email}</span>
            </p>
          </div>
          <Link href="/?order=1" className="btn btn-primary w-fit">
            Order baru <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { label: "Total order", value: orders.length },
            { label: "Aktif", value: activeCount },
            { label: "Menunggu bayar", value: waitingPayment },
            { label: "Selesai", value: doneCount },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-line bg-card p-4">
              <p className="font-mono text-2xl font-medium tracking-tight text-ink">{String(stat.value).padStart(2, "0")}</p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.1em] text-muted">{stat.label}</p>
            </div>
          ))}
        </div>

        {(paymentStatus || approvalStatus || revisionStatus) && (
          <div className="mt-6 rounded-lg border border-accent/25 bg-accent/5 p-3 text-sm text-ink" role="status" aria-live="polite">
            {paymentStatus || approvalStatus || revisionStatus}
          </div>
        )}

        <div className="mt-8 space-y-4">
          {loading ? (
            <div className="docket space-y-4 p-6">
              <div className="h-4 w-32 animate-pulse rounded bg-ink/10" />
              <div className="h-8 w-64 animate-pulse rounded bg-ink/10" />
              <div className="h-20 w-full animate-pulse rounded bg-ink/10" />
            </div>
          ) : orders.length === 0 ? (
            <div className="docket flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
                <ReceiptText className="h-5 w-5 text-accent" />
              </div>
              <h2 className="font-display text-2xl font-semibold">Belum ada pesanan.</h2>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">
                Mulai dari brief singkat. Setelah order masuk, status dan invoice muncul di sini.
              </p>
              <Link href="/?order=1" className="btn btn-primary mt-5">
                Buat order pertama <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            orders.map((order) => {
              const payment = paymentStatusLabels[order.paymentStatus ?? "pending"] ?? paymentStatusLabels.pending;
              const needsPayment = ["dp_pending", "pending", "settlement_pending"].includes(order.paymentStatus ?? "pending");
              const paymentAction =
                order.paymentStatus === "dp_pending"
                  ? "submit_dp"
                  : order.paymentStatus === "settlement_pending"
                  ? "submit_settlement"
                  : "submit_full";
              const paymentActionLabel =
                order.paymentStatus === "dp_pending"
                  ? "Ajukan DP"
                  : order.paymentStatus === "settlement_pending"
                  ? "Ajukan pelunasan"
                  : "Ajukan pembayaran";

              return (
                <article key={order.code} className="docket overflow-hidden">
                  <header className="flex flex-wrap items-start justify-between gap-4 p-5 sm:p-6">
                    <div>
                      <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-accent">{order.code}</p>
                      <h2 className="mt-1 font-display text-xl font-semibold tracking-[-0.03em]">{order.service}</h2>
                    </div>
                    <div className="flex flex-col items-start gap-1.5 sm:items-end">
                      <span className={`badge ${statusTones[order.status] ?? "badge-neutral"}`}>
                        {statusLabels[order.status] ?? order.status}
                      </span>
                      <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
                        {formatDate(order.createdAt)}
                      </span>
                    </div>
                  </header>

                  <div className="grid gap-4 border-y border-line bg-paper/50 px-5 py-4 text-sm sm:grid-cols-3 sm:px-6">
                    <div>
                      <p className="mono-label mb-1">Paket</p>
                      <p className="font-medium text-ink">{order.budgetLabel || "Custom"}</p>
                    </div>
                    <div>
                      <p className="mono-label mb-1">Deadline</p>
                      <p className="font-medium text-ink">{order.deadline || "Fleksibel"}</p>
                    </div>
                    <div>
                      <p className="mono-label mb-1">Pembayaran</p>
                      <span className={`badge ${payment.tone}`}>{payment.label}</span>
                    </div>
                  </div>

                  {needsPayment && (
                    <div className="border-b border-line p-5 sm:p-6">
                      <div className="rounded-xl border border-accent/25 bg-accent/[0.04] p-4">
                        <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                          <UploadCloud className="h-4 w-4 text-accent" /> Konfirmasi pembayaran manual
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-muted">
                          Unggah bukti transfer atau QRIS. Admin akan memeriksa sebelum pembayaran diterima.
                        </p>

                        <div className="mt-4 space-y-3">
                          <div>
                            <label htmlFor={`proof-${order.code}`} className="ui-label">
                              Bukti pembayaran
                            </label>
                            <input
                              id={`proof-${order.code}`}
                              type="file"
                              accept=".jpg,.jpeg,.png,.webp,.pdf,.zip"
                              disabled={paymentProofUploading}
                              onChange={(event) => {
                                const file = event.target.files?.[0];
                                if (file) uploadPaymentProof(order.code, file);
                              }}
                              className="ui-input px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-ink file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-card"
                            />
                            {paymentProofName && <p className="ui-hint text-success">Bukti siap: {paymentProofName}</p>}
                          </div>
                          <div>
                            <label htmlFor={`note-${order.code}`} className="ui-label">
                              Keterangan pembayaran
                            </label>
                            <input
                              id={`note-${order.code}`}
                              value={paymentNote}
                              onChange={(event) => setPaymentNote(event.target.value)}
                              maxLength={500}
                              className="ui-input"
                              placeholder="Contoh: transfer BCA pada 03/09 pukul 14:20"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => submitPayment(order.code, paymentAction)}
                            disabled={!paymentProofId || paymentProofUploading}
                            className="btn btn-primary"
                          >
                            {paymentProofUploading && <Loader2 className="h-4 w-4 animate-spin" />}
                            {paymentActionLabel}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {(order.dpAmount != null || (order.paidAmount ?? 0) > 0 || order.paymentStatus === "settlement_pending") && (
                    <div className="border-b border-line p-5 sm:p-6">
                      <p className="mono-label mb-3">Info pembayaran</p>
                      <div className="grid gap-4 text-sm sm:grid-cols-4">
                        {order.amount != null && (
                          <div>
                            <span className="text-xs text-muted">Total</span>
                            <p className="font-mono font-medium text-ink">{formatIDR(order.amount)}</p>
                          </div>
                        )}
                        {order.dpAmount != null && (
                          <div>
                            <span className="text-xs text-muted">DP (30%)</span>
                            <p className="font-mono font-medium text-ink">{formatIDR(order.dpAmount)}</p>
                          </div>
                        )}
                        {order.remainingAmount != null && order.remainingAmount > 0 && (
                          <div>
                            <span className="text-xs text-muted">Sisa</span>
                            <p className="font-mono font-medium text-pending">{formatIDR(order.remainingAmount)}</p>
                          </div>
                        )}
                        {(order.paidAmount ?? 0) > 0 && (
                          <div>
                            <span className="text-xs text-muted">Terbayar</span>
                            <p className="font-mono font-medium text-success">{formatIDR(order.paidAmount ?? 0)}</p>
                          </div>
                        )}
                      </div>

                      {order.paymentStatus === "settlement_pending" && (
                        <div className="mt-3 rounded-lg border border-pending/30 bg-pending/10 p-3">
                          <p className="text-xs font-medium text-pending">Sisa pembayaran perlu dilunasi</p>
                          <p className="mt-1 text-xs leading-relaxed text-muted">
                            Hubungi Kookiez via WhatsApp untuk melunasi sisa{" "}
                            {order.remainingAmount ? formatIDR(order.remainingAmount) : "-"}.
                          </p>
                        </div>
                      )}

                      {order.paymentHistory && order.paymentHistory.length > 0 && (
                        <div className="mt-4 border-t border-line pt-3">
                          <p className="mono-label mb-2">Riwayat pembayaran</p>
                          <ul className="space-y-2">
                            {order.paymentHistory.map((history) => (
                              <li key={history.id} className="text-xs leading-relaxed text-muted">
                                <span className="font-medium text-ink">
                                  {paymentActionLabels[history.action] ?? history.action}
                                  {history.amount != null ? ` · ${formatIDR(history.amount)}` : ""}
                                </span>
                                <span className="block">
                                  {formatDate(history.createdAt)}
                                  {history.note ? ` · ${history.note}` : ""}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="p-5 sm:p-6">
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-line pb-4">
                      <Link href={`/lacak?code=${encodeURIComponent(order.code)}`} className="inline-flex min-h-[44px] items-center text-sm font-semibold text-accent">
                        Lacak pesanan
                      </Link>
                      <a href={`/api/member/orders/${encodeURIComponent(order.code)}/invoice`} className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-medium text-muted hover:text-accent">
                        <FileDown className="h-3.5 w-3.5" /> Invoice
                      </a>
                      <a
                        href={`https://wa.me/6285792006860?text=${encodeURIComponent(`Halo Kookiez, saya ingin membahas order ${order.code}.`)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-medium text-muted hover:text-accent"
                      >
                        <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                      </a>
                      {["progress", "review"].includes(order.status) && (
                        <button
                          type="button"
                          onClick={() => {
                            setRevisionFor(revisionFor === order.code ? null : order.code);
                            setRevisionStatus("");
                          }}
                          className="inline-flex min-h-[44px] items-center text-sm font-medium text-muted hover:text-accent"
                        >
                          Ajukan revisi
                        </button>
                      )}
                    </div>

                    {order.deliverables && order.deliverables.length > 0 && (
                      <div className="mt-5">
                        <p className="mono-label mb-3">File project</p>
                        <div className="space-y-2">
                          {order.deliverables.map((file) => (
                            <div key={file.id} className="rounded-lg border border-line p-3 text-sm">
                              <div className="flex items-center justify-between gap-3">
                                <a
                                  href={`/api/files/${file.id}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex min-w-0 items-center gap-2 hover:text-accent"
                                >
                                  <FileDown className="h-4 w-4 shrink-0 text-accent" />
                                  <span className="truncate">{file.name ?? file.filename ?? "File project"}</span>
                                </a>
                                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted" />
                              </div>

                              {file.approvalStatus === "approved" ? (
                                <span className="badge badge-success mt-3">
                                  <CheckCircle2 className="h-3 w-3" /> Disetujui
                                </span>
                              ) : (
                                <>
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    <button
                                      type="button"
                                      onClick={() => approveDeliverable(order.code, file.id, "approved")}
                                      className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white"
                                    >
                                      Setujui hasil
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => approveDeliverable(order.code, file.id, "revision_requested")}
                                      className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-muted hover:text-accent"
                                    >
                                      Minta revisi
                                    </button>
                                  </div>
                                  <span className="mt-2 block text-xs text-muted">
                                    {file.approvalStatus === "revision_requested" ? "Menunggu revisi" : "Menunggu persetujuan"}
                                  </span>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {order.events && order.events.length > 0 && (
                      <div className="mt-5 border-t border-line pt-5">
                        <p className="mono-label mb-3 flex items-center gap-2">
                          <Clock3 className="h-3.5 w-3.5" /> Aktivitas order
                        </p>
                        <ol className="space-y-3">
                          {order.events
                            .slice()
                            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                            .map((event) => (
                              <li key={event.id} className="flex gap-3 text-sm">
                                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" />
                                <span>
                                  <span className="font-medium text-ink">{event.label}</span>
                                  <span className="mt-0.5 block text-xs text-muted">
                                    {formatDate(event.createdAt)} ·{" "}
                                    {event.actor === "customer" ? "Kamu" : event.actor === "admin" ? "Kookiez" : "Sistem"}
                                  </span>
                                </span>
                              </li>
                            ))}
                        </ol>
                      </div>
                    )}

                    {revisionFor === order.code && (
                      <div className="mt-5 rounded-xl border border-line bg-paper-2/60 p-4">
                        <label htmlFor={`revision-${order.code}`} className="ui-label">
                          Catatan revisi
                        </label>
                        <textarea
                          id={`revision-${order.code}`}
                          value={revisionMessage}
                          onChange={(event) => setRevisionMessage(event.target.value)}
                          rows={3}
                          className="ui-input resize-none"
                          placeholder="Jelaskan bagian yang ingin direvisi"
                        />
                        <button
                          type="button"
                          onClick={() => submitRevision(order.code)}
                          disabled={!revisionMessage.trim()}
                          className="btn btn-primary mt-3"
                        >
                          Kirim revisi
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>
    </main>
  );
}
