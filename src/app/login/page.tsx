"use client";

import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function LoginPage() {
  const [register, setRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError("");
    if (register) {
      const response = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email, password }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) { setError(data.error ?? "Pendaftaran gagal."); setLoading(false); return; }
    }
    const result = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (result?.error) { setError("Email atau password salah."); return; }
    window.location.href = register ? "/member" : "/";
  }

  return <main className="flex min-h-screen items-center justify-center bg-[#F9F9FB] px-6 text-[#1A1A1E]"><div className="w-full max-w-sm"><Link href="/" className="mb-8 inline-flex items-center gap-1.5 text-sm text-[#1A1A1E]/50 hover:text-[#1A1A1E]"><ArrowLeft className="h-4 w-4" /> kookiez.</Link><h1 className="mb-2 font-heading text-3xl font-semibold">{register ? "Buat akun member" : "Masuk"}</h1><p className="mb-6 text-sm text-[#1A1A1E]/55">{register ? "Simpan progres desainmu di satu tempat." : "Lanjutkan ke workspace kookiez."}</p><button onClick={() => signIn("google", { callbackUrl: "/" })} className="mb-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-[#1A1A1E]/15 bg-white py-3 text-sm font-medium hover:bg-[#1A1A1E]/5">Masuk dengan Google</button><div className="my-4 flex items-center gap-3 text-xs text-[#1A1A1E]/40"><div className="h-px flex-1 bg-[#1A1A1E]/10" /> atau <div className="h-px flex-1 bg-[#1A1A1E]/10" /></div><form onSubmit={submit} className="space-y-3">{register && <div><label className="mb-2 block text-sm font-medium">Nama</label><input required value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-2xl border border-[#1A1A1E]/15 bg-white px-4 py-3 text-sm" placeholder="Nama kamu" /></div>}<div><label className="mb-2 block text-sm font-medium">Email</label><input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-2xl border border-[#1A1A1E]/15 bg-white px-4 py-3 text-sm" placeholder="kamu@email.com" /></div><div><label className="mb-2 block text-sm font-medium">Password</label><input required minLength={8} type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-2xl border border-[#1A1A1E]/15 bg-white px-4 py-3 text-sm" placeholder="Minimal 8 karakter" /></div>{error && <p className="text-xs text-red-600">{error}</p>}<button disabled={loading} className="w-full rounded-2xl bg-[#0038FF] py-3 text-sm font-medium text-white disabled:opacity-50">{loading ? "Memproses..." : register ? "Daftar dan masuk" : "Masuk"}</button></form><button onClick={() => { setRegister(!register); setError(""); }} className="mt-5 w-full text-center text-sm text-[#0038FF]">{register ? "Sudah punya akun? Masuk" : "Belum punya akun? Daftar email"}</button></div></main>;
}
