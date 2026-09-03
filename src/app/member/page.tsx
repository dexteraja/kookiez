"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Clock3, FileDown, ExternalLink, MessageCircle } from "lucide-react";

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

const statusLabels: Record<string, string> = { pending: "Menunggu", progress: "Dikerjakan", review: "Review", done: "Selesai" };

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
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
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
    const response = await fetch(`/api/member/orders/${encodeURIComponent(code)}/revisions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: revisionMessage }) });
    const data = await response.json();
    setRevisionStatus(response.ok ? "Permintaan revisi terkirim." : data.error || "Revisi gagal dikirim.");
    if (response.ok) { setRevisionMessage(""); setRevisionFor(null); }
  };

  const formatDate = (value: string) => new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

  const approveDeliverable = async (code: string, deliverableId: string, action: "approved" | "revision_requested") => {
    setApprovalStatus("Menyimpan...");
    const response = await fetch(`/api/member/orders/${encodeURIComponent(code)}/approval`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, deliverableId }) });
    const data = await response.json();
    setApprovalStatus(response.ok ? "Status project diperbarui." : data.error || "Status gagal diperbarui.");
    if (response.ok) setOrders((current) => current.map((item) => item.code === code ? { ...item, status: action === "approved" ? "done" : "review" } : item));
  };

  const submitPayment = async (code: string, action: "submit_dp" | "submit_full" | "submit_settlement") => {
    if (!paymentNote.trim() || !paymentProofId) {
      setPaymentStatus("Isi keterangan dan unggah bukti pembayaran terlebih dahulu.");
      return;
    }
    setPaymentStatus("Mengirim konfirmasi...");
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
      setOrders((current) => current.map((item) => item.code === code ? { ...item, paymentHistory: [...(item.paymentHistory ?? []), data.submission] } : item));
    }
  };

  const uploadPaymentProof = async (code: string, file: File) => {
    setPaymentProofUploading(true);
    setPaymentStatus("Mengunggah bukti pembayaran...");
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch(`/api/member/orders/${encodeURIComponent(code)}/payment-proof`, { method: "POST", body: formData });
    const data = await response.json().catch(() => ({}));
    setPaymentProofUploading(false);
    if (!response.ok) {
      setPaymentStatus(data.error || "Bukti pembayaran gagal diunggah.");
      return;
    }
    setPaymentProofId(data.id);
    setPaymentProofName(data.name);
    setPaymentStatus("Bukti pembayaran siap dikirim untuk verifikasi admin.");
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

  if (status === "loading" || !session) return null;

  return (
    <main className="ui-shell min-h-screen px-4 py-8 text-[#17191f] sm:px-6 sm:py-12">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-[#667085] transition-colors hover:text-[#17191f]"><ArrowLeft className="h-4 w-4" /> kookiez.</Link>
          
        </div>
        <div className="mb-8 border-b border-black/[.08] pb-8">
          <p className="mb-2 font-mono text-[10px] tracking-[.18em] text-[#0038FF]">MEMBER WORKSPACE</p>
          <h1 className="font-heading text-4xl font-semibold tracking-[-.04em] sm:text-5xl">Pesanan kamu</h1>
          <p className="mt-2 text-sm text-[#667085]">{session.user.email}</p>
        </div>
        <section className="ui-panel overflow-hidden shadow-[0_18px_44px_rgba(36,55,86,.07)]">
          {loading ? <div className="p-12 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div> : orders.length === 0 ? <p className="p-12 text-center text-sm text-[#1A1A1E]/50">Belum ada pesanan.</p> : orders.map((order) => (
            <article key={order.code} className="border-b border-black/[.08] p-5 last:border-0 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-mono text-xs font-semibold tracking-[.08em] text-[#0038FF]">{order.code}</p><h2 className="mt-1 font-heading text-lg font-semibold">{order.service}</h2></div><span className="rounded-full bg-[#0038FF]/[.07] px-2.5 py-1 font-mono text-[11px] text-[#0038FF]">{statusLabels[order.status] ?? order.status}</span></div>
              <div className="mt-5 grid gap-3 border-y border-black/[.07] py-3 text-sm text-[#667085] sm:grid-cols-3"><span><small className="block text-[10px] uppercase tracking-[.12em] text-[#98a2b3]">Paket</small>{order.budgetLabel || "Custom"}</span><span><small className="block text-[10px] uppercase tracking-[.12em] text-[#98a2b3]">Deadline</small>{order.deadline || "Fleksibel"}</span><span><small className="block text-[10px] uppercase tracking-[.12em] text-[#98a2b3]">Pembayaran</small>{(() => { const pm = paymentStatusLabels[order.paymentStatus ?? "pending"] ?? paymentStatusLabels.pending; return (<span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full mt-1" style={{ color: pm.color, backgroundColor: pm.bg }}>{pm.label}</span>); })()}</span></div>
              {(["dp_pending", "pending", "settlement_pending"].includes(order.paymentStatus ?? "pending")) && <div className="mt-4 rounded-lg border border-[#0038FF]/15 bg-[#0038FF]/[.03] p-4"><div className="text-[10px] font-semibold uppercase tracking-[.12em] text-[#667085]">Konfirmasi pembayaran manual</div><p className="mt-1 text-xs text-[#667085]">Unggah bukti transfer atau QRIS. Admin akan memeriksa sebelum pembayaran diterima.</p><label className="mt-3 block text-xs font-medium text-[#17191f]">Bukti pembayaran<input type="file" accept=".jpg,.jpeg,.png,.webp,.pdf,.zip" disabled={paymentProofUploading} onChange={(event) => { const file = event.target.files?.[0]; if (file) uploadPaymentProof(order.code, file); }} className="ui-input mt-2 block w-full px-3 py-2 text-sm" /></label>{paymentProofName && <p className="mt-2 text-xs text-[#16A34A]">Bukti siap: {paymentProofName}</p>}<label className="mt-3 block text-xs font-medium text-[#17191f]">Keterangan pembayaran<input value={paymentNote} onChange={(event) => setPaymentNote(event.target.value)} maxLength={500} className="ui-input mt-2 w-full px-3 py-2 text-sm" placeholder="Contoh: transfer BCA pada 03/09 pukul 14:20" /></label><div className="mt-3 flex flex-wrap gap-2">{order.paymentStatus === "dp_pending" && <button onClick={() => submitPayment(order.code, "submit_dp")} disabled={!paymentProofId || paymentProofUploading} className="ui-action rounded-lg bg-[#0038FF] px-3 py-2 text-xs font-medium text-white disabled:opacity-40">Ajukan DP</button>}{order.paymentStatus === "pending" && <button onClick={() => submitPayment(order.code, "submit_full")} disabled={!paymentProofId || paymentProofUploading} className="ui-action rounded-lg bg-[#0038FF] px-3 py-2 text-xs font-medium text-white disabled:opacity-40">Ajukan pembayaran</button>}{order.paymentStatus === "settlement_pending" && <button onClick={() => submitPayment(order.code, "submit_settlement")} disabled={!paymentProofId || paymentProofUploading} className="ui-action rounded-lg bg-[#0038FF] px-3 py-2 text-xs font-medium text-white disabled:opacity-40">Ajukan pelunasan</button>}</div>{paymentStatus && <p className="mt-2 text-xs text-[#667085]" role="status">{paymentStatus}</p>}</div>}
              {/* Payment Info */}
              {(order.dpAmount != null || (order.paidAmount ?? 0) > 0 || order.paymentStatus === "settlement_pending") && <div className="mt-4 rounded-lg border border-black/[.07] bg-[#f8fafc] p-4"><div className="text-[10px] font-semibold uppercase tracking-[.12em] text-[#667085] mb-2">Info Pembayaran</div><div className="grid gap-2 text-sm sm:grid-cols-3">{order.amount != null && <div><span className="text-xs text-[#98a2b3]">Total</span><p className="font-medium">{formatIDR(order.amount)}</p></div>}{order.dpAmount != null && <div><span className="text-xs text-[#98a2b3]">DP (30%)</span><p className="font-medium">{formatIDR(order.dpAmount)}</p></div>}{order.remainingAmount != null && order.remainingAmount > 0 && <div><span className="text-xs text-[#98a2b3]">Sisa</span><p className="font-medium">{formatIDR(order.remainingAmount)}</p></div>}{(order.paidAmount ?? 0) > 0 && <div><span className="text-xs text-[#98a2b3]">Terbayar</span><p className="font-medium text-[#16A34A]">{formatIDR(order.paidAmount ?? 0)}</p></div>}</div>{order.paymentStatus === "settlement_pending" && <div className="mt-3 rounded-lg border border-[#D97706]/20 bg-[#D97706]/5 p-3"><p className="text-xs font-medium text-[#D97706]">Sisa pembayaran perlu dilunasi</p><p className="mt-1 text-xs text-[#667085]">Silakan hubungi Kookiez via WhatsApp untuk melunasi sisa pembayaran sebesar {order.remainingAmount ? formatIDR(order.remainingAmount) : "-"}.</p></div>}{order.paymentHistory && order.paymentHistory.length > 0 && <div className="mt-3 border-t border-black/[.07] pt-3"><div className="text-[10px] font-semibold uppercase tracking-[.12em] text-[#667085] mb-1">Riwayat Pembayaran</div><ul className="space-y-1">{order.paymentHistory.map((ph) => { const actionLabels: Record<string, string> = { confirm_dp: "DP Dikonfirmasi", confirm_full: "Pembayaran Dikonfirmasi", confirm_settlement: "Pelunasan Dikonfirmasi", reject: "Dibatalkan" }; return <li key={ph.id} className="text-xs text-[#667085]"><span className="font-medium text-[#17191f]">{actionLabels[ph.action] ?? ph.action}</span>{ph.amount != null && <> - {formatIDR(ph.amount)}</>}{ph.note && <> ({ph.note})</>}{ph.proofId && <a href={`/api/files/${ph.proofId}`} target="_blank" rel="noreferrer" className="ml-2 text-[#0038FF] underline">Lihat bukti</a>}<span className="block text-[10px] text-[#98a2b3]">{formatDate(ph.createdAt)}</span></li>; })}</ul></div>}</div>}
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2"><Link href={`/lacak?code=${encodeURIComponent(order.code)}`} className="ui-action text-sm font-medium text-[#0038FF] hover:underline">Lacak pesanan</Link><a href={`/api/member/orders/${encodeURIComponent(order.code)}/invoice`} className="ui-action text-sm font-medium text-[#667085] hover:text-[#0038FF]">Download invoice</a><a href={`https://wa.me/6285792006860?text=${encodeURIComponent(`Halo Kookiez, saya ingin membahas order ${order.code}.`)}`} target="_blank" rel="noreferrer" className="ui-action inline-flex items-center gap-1.5 text-sm font-medium text-[#667085] hover:text-[#0038FF]"><MessageCircle className="h-3.5 w-3.5" /> WhatsApp</a>{["progress", "review"].includes(order.status) && <button onClick={() => { setRevisionFor(revisionFor === order.code ? null : order.code); setRevisionStatus(""); }} className="ui-action text-sm font-medium text-[#667085] hover:text-[#0038FF]">Ajukan revisi</button>}</div>
              {order.events && order.events.length > 0 && <div className="mt-6 border-t border-black/[.07] pt-5"><div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.12em] text-[#667085]"><Clock3 className="h-3.5 w-3.5" /> Aktivitas order</div><ol className="space-y-3">{order.events.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((event) => <li key={event.id} className="flex gap-3 text-sm"><span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#0038FF]" /><span><span className="font-medium">{event.label}</span><span className="mt-0.5 block text-xs text-[#667085]">{formatDate(event.createdAt)} · {event.actor === "customer" ? "Kamu" : event.actor === "admin" ? "Kookiez" : "Sistem"}</span></span></li>)}</ol></div>}
              {order.deliverables && order.deliverables.length > 0 && <div className="mt-5 border-t border-black/[.07] pt-5"><div className="mb-3 text-xs font-semibold uppercase tracking-[.12em] text-[#667085]">File project</div><div className="space-y-2">{order.deliverables.map((file) => <div key={file.id} className="rounded-lg border border-black/[.08] px-3 py-2 text-sm"><div className="flex items-center justify-between gap-3"><a href={`/api/files/${file.id}`} target="_blank" rel="noreferrer" className="flex min-w-0 items-center gap-2 hover:text-[#0038FF]"><FileDown className="h-4 w-4 shrink-0 text-[#0038FF]" /><span className="truncate">{file.name ?? file.filename ?? "File project"}</span></a><ExternalLink className="h-3.5 w-3.5 shrink-0 text-[#667085]" /></div>{file.approvalStatus !== "approved" && <div className="mt-3 flex flex-wrap gap-2"><button onClick={() => approveDeliverable(order.code, file.id, "approved")} className="ui-action rounded-lg bg-[#0038FF] px-3 py-1.5 text-xs font-medium text-white">Setujui hasil</button><button onClick={() => approveDeliverable(order.code, file.id, "revision_requested")} className="ui-action rounded-lg border border-black/[.12] px-3 py-1.5 text-xs font-medium text-[#667085] hover:text-[#0038FF]">Minta revisi</button></div>}<span className="mt-2 block text-xs text-[#667085]">{file.approvalStatus === "approved" ? "Disetujui" : file.approvalStatus === "revision_requested" ? "Menunggu revisi" : "Menunggu persetujuan"}</span></div>)}</div>{approvalStatus && <p className="mt-2 text-xs text-[#667085]">{approvalStatus}</p>}</div>}
              {revisionFor === order.code && <div className="mt-4 rounded-xl border border-black/[.08] bg-[#eef2f7] p-4"><label className="block text-xs font-medium">Catatan revisi</label><textarea value={revisionMessage} onChange={(event) => setRevisionMessage(event.target.value)} rows={3} className="ui-input mt-2 w-full p-2.5 text-sm" placeholder="Jelaskan bagian yang ingin direvisi" /><button onClick={() => submitRevision(order.code)} disabled={!revisionMessage.trim()} className="ui-action mt-3 rounded-lg bg-[#0038FF] px-3.5 py-2 text-xs font-medium text-white disabled:opacity-40">Kirim revisi</button></div>}
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
