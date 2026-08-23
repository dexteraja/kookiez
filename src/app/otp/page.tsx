"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function OtpPage() {
  const params = useSearchParams();
  const email = params.get("email") ?? "";
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (event.nativeEvent instanceof SubmitEvent === false) return;
    setLoading(true); setError("");
    const password = sessionStorage.getItem("kookiez_login_password") ?? "";
    const provider = params.get("provider");
    const response = provider === "google"
      ? await fetch("/api/auth/verify-otp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, code }) })
      : null;
    const result = provider === "google" ? null : await signIn("credentials", { email, password, otp: code, redirect: false });
    setLoading(false);
    if ((response && !response.ok) || result?.error) { setError("Kode OTP salah atau sudah kedaluwarsa."); return; }
    sessionStorage.removeItem("kookiez_login_password");
    window.location.href = "/";
  }

  return <main className="flex min-h-screen items-center justify-center bg-[#F9F9FB] px-6 text-[#1A1A1E]"><div className="w-full max-w-sm"><Link href="/login" className="mb-8 inline-flex text-sm text-[#1A1A1E]/50 hover:text-[#1A1A1E]">Kembali ke login</Link><h1 className="mb-2 font-heading text-3xl font-semibold">Verifikasi login</h1><p className="mb-6 text-sm text-[#1A1A1E]/55">Masukkan kode 6 digit yang kami kirim ke {email}.</p><form onSubmit={submit} className="space-y-4"><label className="block text-sm font-medium">Kode OTP<input required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} className="mt-2 w-full rounded-2xl border border-[#1A1A1E]/15 bg-white px-4 py-4 text-center text-2xl tracking-[0.5em] outline-none focus:border-[#0038FF]" placeholder="000000" /></label>{error && <p className="text-xs text-red-600">{error}</p>}<button disabled={loading} className="w-full rounded-2xl bg-[#0038FF] py-3 text-sm font-semibold text-white disabled:opacity-50">{loading ? "Memeriksa..." : "Verifikasi dan masuk"}</button></form></div></main>;
}
