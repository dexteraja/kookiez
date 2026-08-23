"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Clock3, FileUp, LogOut, RefreshCw, UserRound } from "lucide-react";

type Order = { code: string; service?: string; status: string; createdAt: string; queuePosition?: number | null; briefScope?: string };
const statusLabel: Record<string, string> = { pending: "Menunggu", progress: "Dikerjakan", review: "Menunggu review", done: "Selesai" };
const steps = ["pending", "progress", "review", "done"];

export default function MemberPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (authStatus === "unauthenticated") router.replace("/login"); }, [authStatus, router]);
  useEffect(() => { if (authStatus !== "authenticated") return; fetch("/api/member/orders").then((r) => r.ok ? r.json() : { orders: [] }).then((d) => setOrders(d.orders ?? [])).finally(() => setLoading(false)); }, [authStatus]);
  if (authStatus === "loading" || !session) return <main className="min-h-screen grid place-items-center bg-[#f7f5f0] text-[#1a1a1e]">Memuat akun...</main>;
  const active = orders.filter((o) => o.status !== "done").length;

  return <main className="min-h-screen bg-[#f7f5f0] px-4 py-6 text-[#1a1a1e] sm:px-8 lg:px-12">
    <div className="mx-auto max-w-6xl">
      <header className="flex items-center justify-between rounded-3xl border border-[#1a1a1e]/10 bg-white/80 px-5 py-4 shadow-sm backdrop-blur sm:px-7">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold"><ArrowLeft className="size-4" /> kookiez.</Link>
        <div className="flex items-center gap-3"><span className="hidden text-sm text-[#1a1a1e]/55 sm:block">{session.user?.name ?? session.user?.email}</span><button onClick={() => signOut({ callbackUrl: "/" })} className="flex items-center gap-2 rounded-full border border-[#1a1a1e]/10 px-3 py-2 text-xs font-semibold"><LogOut className="size-3.5" /> Keluar</button></div>
      </header>
      <section className="grid gap-5 py-10 lg:grid-cols-[1.5fr_1fr] lg:items-end"><div><p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#e56b4b]">Member area</p><h1 className="max-w-xl font-heading text-4xl font-semibold leading-tight sm:text-6xl">Semua progres desain, di satu tempat.</h1><p className="mt-4 max-w-lg text-base leading-7 text-[#1a1a1e]/60">Pantau pesanan, kirim brief, dan beri masukan tanpa kehilangan konteks.</p></div><div className="rounded-3xl bg-[#1a1a1e] p-6 text-white"><p className="text-sm text-white/60">Pesanan aktif</p><p className="mt-2 text-5xl font-semibold">{active}</p><Link href="/#order" className="mt-5 inline-flex rounded-full bg-[#f0a35b] px-4 py-2 text-sm font-bold text-[#1a1a1e]">Buat pesanan baru</Link></div></section>
      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]"><section className="rounded-3xl border border-[#1a1a1e]/10 bg-white p-5 sm:p-7"><div className="mb-6 flex items-center justify-between"><div><h2 className="text-xl font-bold">Pesanan saya</h2><p className="mt-1 text-sm text-[#1a1a1e]/50">Riwayat dan progres terbaru</p></div><RefreshCw className="size-4 text-[#1a1a1e]/35" /></div>{loading ? <p className="py-12 text-center text-sm text-[#1a1a1e]/50">Memuat pesanan...</p> : orders.length === 0 ? <div className="rounded-2xl bg-[#f7f5f0] p-8 text-center"><p className="font-semibold">Belum ada pesanan</p><p className="mt-2 text-sm text-[#1a1a1e]/55">Pesanan yang dibuat dengan akun ini akan muncul di sini.</p></div> : <div className="flex flex-col gap-4">{orders.map((order) => { const current = Math.max(0, steps.indexOf(order.status)); return <article key={order.code} className="rounded-2xl border border-[#1a1a1e]/10 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-mono text-sm font-bold text-[#e56b4b]">{order.code}</p><h3 className="mt-1 font-semibold">{order.service ?? "Proyek desain"}</h3></div><span className="rounded-full bg-[#f0a35b]/20 px-3 py-1 text-xs font-bold">{statusLabel[order.status] ?? order.status}</span></div><div className="mt-5 grid grid-cols-4 gap-2">{steps.map((step, index) => <div key={step}><div className={`h-1.5 rounded-full ${index <= current ? "bg-[#e56b4b]" : "bg-[#1a1a1e]/10"}`} /><p className="mt-2 text-[10px] text-[#1a1a1e]/45">{statusLabel[step]}</p></div>)}</div>{order.queuePosition ? <p className="mt-4 flex items-center gap-2 text-xs text-[#1a1a1e]/55"><Clock3 className="size-3.5" /> Posisi antrean {order.queuePosition}</p> : null}</article> })}</div>}</section>
      <aside className="flex flex-col gap-5"><section className="rounded-3xl bg-[#e56b4b] p-6 text-white"><FileUp className="size-6" /><h2 className="mt-5 text-xl font-bold">Kirim brief & referensi</h2><p className="mt-2 text-sm leading-6 text-white/75">Tambahkan file untuk membantu tim memahami kebutuhan desainmu.</p><button className="mt-5 rounded-full bg-white px-4 py-2 text-sm font-bold text-[#1a1a1e]">Upload file</button></section><section className="rounded-3xl border border-[#1a1a1e]/10 bg-white p-6"><UserRound className="size-5 text-[#e56b4b]" /><h2 className="mt-4 text-lg font-bold">Profil & invoice</h2><p className="mt-2 text-sm leading-6 text-[#1a1a1e]/55">Kelola data kontak, alamat invoice, dan preferensi akun.</p><button className="mt-5 w-full rounded-full border border-[#1a1a1e]/15 px-4 py-2.5 text-sm font-bold">Kelola profil</button></section></aside></div>
    </div>
  </main>;
}
