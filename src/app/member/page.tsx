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
  createdAt: string;
  updatedAt?: string;
  fileUrls?: string[];
  deliverables?: Array<{ id: string; name?: string; filename?: string; uploadedAt?: string; approvalStatus?: string }>;
  revisionRequests?: Array<{ id: string; message: string; status: string; createdAt: string }>;
  events?: Array<{ id: string; label: string; actor: string; createdAt: string }>;
};
type OrderMessage = { id: string; message: string; sender: string; senderName?: string; createdAt: string };

const statusLabels: Record<string, string> = { pending: "Menunggu", progress: "Dikerjakan", review: "Review", done: "Selesai" };

export default function MemberPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [orders, setOrders] = useState<MemberOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [revisionFor, setRevisionFor] = useState<string | null>(null);
  const [revisionMessage, setRevisionMessage] = useState("");
  const [revisionStatus, setRevisionStatus] = useState("");
  const [approvalStatus, setApprovalStatus] = useState("");
  const [chatFor, setChatFor] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<OrderMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatStatus, setChatStatus] = useState("");

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

  const openChat = async (code: string) => {
    if (chatFor === code) { setChatFor(null); return; }
    setChatFor(code);
    const response = await fetch(`/api/member/orders/${encodeURIComponent(code)}/messages`, { cache: "no-store" });
    const data = await response.json();
    setChatMessages(data.messages ?? []);
  };

  const sendChat = async (code: string) => {
    if (!chatInput.trim()) return;
    setChatStatus("Mengirim...");
    const response = await fetch(`/api/member/orders/${encodeURIComponent(code)}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: chatInput }) });
    const data = await response.json();
    if (response.ok) { setChatMessages((current) => [...current, data.message]); setChatInput(""); setChatStatus(""); } else setChatStatus(data.error || "Pesan gagal dikirim.");
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

  if (status === "loading" || !session) return null;

  return (
    <main className="ui-shell min-h-screen px-4 py-8 text-[#17191f] sm:px-6 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-[#667085] transition-colors hover:text-[#17191f]"><ArrowLeft className="h-4 w-4" /> kookiez.</Link>
          <span className="rounded-full bg-[#0038FF]/[.07] px-3 py-1 font-mono text-[10px] tracking-[.16em] text-[#0038FF]">MEMBER</span>
        </div>
        <div className="mb-8 border-b border-black/[.08] pb-7">
          <h1 className="font-heading text-3xl font-semibold tracking-[-.02em] sm:text-4xl">Pesanan kamu</h1>
          <p className="mt-2 text-sm text-[#667085]">{session.user.email}</p>
        </div>
        <section className="ui-panel overflow-hidden">
          {loading ? <div className="p-12 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div> : orders.length === 0 ? <p className="p-12 text-center text-sm text-[#1A1A1E]/50">Belum ada pesanan.</p> : orders.map((order) => (
            <article key={order.code} className="border-b border-black/[.08] p-5 last:border-0 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-mono text-xs font-semibold tracking-[.08em] text-[#0038FF]">{order.code}</p><h2 className="mt-1 font-heading text-lg font-semibold">{order.service}</h2></div><span className="rounded-full bg-[#0038FF]/[.07] px-2.5 py-1 font-mono text-[11px] text-[#0038FF]">{statusLabels[order.status] ?? order.status}</span></div>
              <div className="mt-5 grid gap-3 border-y border-black/[.07] py-3 text-sm text-[#667085] sm:grid-cols-3"><span><small className="block text-[10px] uppercase tracking-[.12em] text-[#98a2b3]">Paket</small>{order.budgetLabel || "Custom"}</span><span><small className="block text-[10px] uppercase tracking-[.12em] text-[#98a2b3]">Deadline</small>{order.deadline || "Fleksibel"}</span><span><small className="block text-[10px] uppercase tracking-[.12em] text-[#98a2b3]">Pembayaran</small>{order.paymentRoute ?? "-"}</span></div>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2"><Link href={`/lacak?code=${encodeURIComponent(order.code)}`} className="ui-action text-sm font-medium text-[#0038FF] hover:underline">Lacak pesanan</Link><a href={`/api/member/orders/${encodeURIComponent(order.code)}/invoice`} className="ui-action text-sm font-medium text-[#667085] hover:text-[#0038FF]">Download invoice</a><button onClick={() => openChat(order.code)} className="ui-action inline-flex items-center gap-1.5 text-sm font-medium text-[#667085] hover:text-[#0038FF]"><MessageCircle className="h-3.5 w-3.5" />Chat Kookiez</button>{["progress", "review"].includes(order.status) && <button onClick={() => { setRevisionFor(revisionFor === order.code ? null : order.code); setRevisionStatus(""); }} className="ui-action text-sm font-medium text-[#667085] hover:text-[#0038FF]">Ajukan revisi</button>}</div>
              {chatFor === order.code && <div className="mt-4 rounded-xl border border-black/[.08] bg-[#f8fafc] p-4"><div className="max-h-52 space-y-3 overflow-y-auto">{chatMessages.length === 0 ? <p className="text-xs text-[#667085]">Belum ada pesan. Tanyakan apa pun tentang order ini.</p> : chatMessages.map((item) => <div key={item.id} className={`max-w-[90%] rounded-lg px-3 py-2 text-sm ${item.sender === "customer" ? "ml-auto bg-[#0038FF] text-white" : "bg-white text-[#17191f]"}`}><p className="whitespace-pre-wrap">{item.message}</p><span className="mt-1 block text-[10px] opacity-60">{item.sender === "customer" ? "Kamu" : "Kookiez"} · {formatDate(item.createdAt)}</span></div>)}</div><div className="mt-3 flex gap-2"><input value={chatInput} onChange={(event) => setChatInput(event.target.value)} onKeyDown={(event) => event.key === "Enter" && sendChat(order.code)} maxLength={2000} className="ui-input min-w-0 flex-1 px-3 py-2 text-sm" placeholder="Tulis pesan..." /><button onClick={() => sendChat(order.code)} disabled={!chatInput.trim()} className="ui-action rounded-lg bg-[#0038FF] px-3 py-2 text-xs font-medium text-white disabled:opacity-40">Kirim</button></div>{chatStatus && <p className="mt-2 text-xs text-[#667085]">{chatStatus}</p>}</div>}
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
