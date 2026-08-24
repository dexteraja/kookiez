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
    <main className="min-h-screen bg-[#F9F9FB] px-6 py-12 text-[#1A1A1E]">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="mb-10 inline-flex items-center gap-1.5 text-sm text-[#1A1A1E]/50 hover:text-[#1A1A1E]"><ArrowLeft className="h-4 w-4" /> kookiez.</Link>
        <p className="font-mono text-xs tracking-widest text-[#0038FF]">MEMBER AREA</p>
        <h1 className="mt-2 font-heading text-3xl font-semibold">Pesanan kamu</h1>
        <p className="mt-2 text-sm text-[#1A1A1E]/55">{session.user.email}</p>
        <section className="mt-8 overflow-hidden rounded-2xl border border-[#1A1A1E]/10 bg-white">
          {loading ? <div className="p-12 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div> : orders.length === 0 ? <p className="p-12 text-center text-sm text-[#1A1A1E]/50">Belum ada pesanan.</p> : orders.map((order) => (
            <article key={order.code} className="border-b border-[#1A1A1E]/10 p-5 last:border-0">
              <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-mono text-sm font-semibold text-[#0038FF]">{order.code}</p><h2 className="mt-1 font-medium">{order.service}</h2></div><span className="rounded-full bg-[#0038FF]/5 px-2.5 py-1 font-mono text-[11px] text-[#0038FF]">{order.status}</span></div>
              <div className="mt-4 grid gap-2 text-sm text-[#1A1A1E]/60 sm:grid-cols-3"><span>{order.budgetLabel || "Custom"}</span><span>{order.deadline || "Fleksibel"}</span><span>{order.paymentRoute ?? "-"}</span></div>
              <div className="mt-4 flex flex-wrap gap-4"><Link href={`/lacak?code=${encodeURIComponent(order.code)}`} className="text-sm font-medium text-[#0038FF]">Lacak pesanan</Link><a href={`/api/member/orders/${encodeURIComponent(order.code)}/invoice`} className="text-sm font-medium text-[#1A1A1E]/60 hover:text-[#0038FF]">Download invoice</a>{["progress", "review"].includes(order.status) && <button onClick={() => { setRevisionFor(revisionFor === order.code ? null : order.code); setRevisionStatus(""); }} className="text-sm font-medium text-[#1A1A1E]/60 hover:text-[#0038FF]">Ajukan revisi</button>}</div>
              {revisionFor === order.code && <div className="mt-4 rounded-xl border border-[#1A1A1E]/10 bg-[#F9F9FB] p-3"><label className="block text-xs font-medium">Catatan revisi</label><textarea value={revisionMessage} onChange={(event) => setRevisionMessage(event.target.value)} rows={3} className="mt-2 w-full rounded-lg border border-[#1A1A1E]/15 bg-white p-2.5 text-sm" placeholder="Jelaskan bagian yang ingin direvisi" /><button onClick={() => submitRevision(order.code)} disabled={!revisionMessage.trim()} className="mt-2 rounded-lg bg-[#0038FF] px-3 py-2 text-xs font-medium text-white disabled:opacity-40">Kirim revisi</button></div>}
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
