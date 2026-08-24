"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";

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
};

export default function MemberPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [orders, setOrders] = useState<MemberOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [revisionFor, setRevisionFor] = useState<string | null>(null);
  const [revisionMessage, setRevisionMessage] = useState("");
  const [revisionStatus, setRevisionStatus] = useState("");

  const submitRevision = async (code: string) => {
    setRevisionStatus("Mengirim...");
    const response = await fetch(`/api/member/orders/${encodeURIComponent(code)}/revisions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: revisionMessage }) });
    const data = await response.json();
    setRevisionStatus(response.ok ? "Permintaan revisi terkirim." : data.error || "Revisi gagal dikirim.");
    if (response.ok) { setRevisionMessage(""); setRevisionFor(null); }
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
              <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-mono text-xs font-semibold tracking-[.08em] text-[#0038FF]">{order.code}</p><h2 className="mt-1 font-heading text-lg font-semibold">{order.service}</h2></div><span className="rounded-full bg-[#0038FF]/[.07] px-2.5 py-1 font-mono text-[11px] text-[#0038FF]">{order.status}</span></div>
              <div className="mt-5 grid gap-3 border-y border-black/[.07] py-3 text-sm text-[#667085] sm:grid-cols-3"><span><small className="block text-[10px] uppercase tracking-[.12em] text-[#98a2b3]">Paket</small>{order.budgetLabel || "Custom"}</span><span><small className="block text-[10px] uppercase tracking-[.12em] text-[#98a2b3]">Deadline</small>{order.deadline || "Fleksibel"}</span><span><small className="block text-[10px] uppercase tracking-[.12em] text-[#98a2b3]">Pembayaran</small>{order.paymentRoute ?? "-"}</span></div>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2"><Link href={`/lacak?code=${encodeURIComponent(order.code)}`} className="ui-action text-sm font-medium text-[#0038FF] hover:underline">Lacak pesanan</Link><a href={`/api/member/orders/${encodeURIComponent(order.code)}/invoice`} className="ui-action text-sm font-medium text-[#667085] hover:text-[#0038FF]">Download invoice</a>{["progress", "review"].includes(order.status) && <button onClick={() => { setRevisionFor(revisionFor === order.code ? null : order.code); setRevisionStatus(""); }} className="ui-action text-sm font-medium text-[#667085] hover:text-[#0038FF]">Ajukan revisi</button>}</div>
              {revisionFor === order.code && <div className="mt-4 rounded-xl border border-black/[.08] bg-[#eef2f7] p-4"><label className="block text-xs font-medium">Catatan revisi</label><textarea value={revisionMessage} onChange={(event) => setRevisionMessage(event.target.value)} rows={3} className="ui-input mt-2 w-full p-2.5 text-sm" placeholder="Jelaskan bagian yang ingin direvisi" /><button onClick={() => submitRevision(order.code)} disabled={!revisionMessage.trim()} className="ui-action mt-3 rounded-lg bg-[#0038FF] px-3.5 py-2 text-xs font-medium text-white disabled:opacity-40">Kirim revisi</button></div>}
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
