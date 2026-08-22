"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    setError(false);
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      setError(true);
      return;
    }
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-[#F9F9FB] text-[#1A1A1E] flex items-center justify-center px-6">
      <div className="max-w-sm w-full">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-[#1A1A1E]/50 hover:text-[#1A1A1E] mb-8">
          <ArrowLeft className="w-4 h-4" /> kookiez.
        </Link>

        <h1 className="font-heading text-2xl font-semibold mb-6">Masuk</h1>

        <button
          onClick={() => signIn("google", { callbackUrl: "/" })}
          className="w-full flex items-center justify-center gap-2 border border-[#1A1A1E]/15 bg-white py-3 rounded-lg text-sm font-medium hover:bg-[#1A1A1E]/5 transition-colors mb-4"
        >
          Masuk dengan Google
        </button>

        <div className="flex items-center gap-3 my-4 text-xs text-[#1A1A1E]/40">
          <div className="h-px flex-1 bg-[#1A1A1E]/10" /> atau <div className="h-px flex-1 bg-[#1A1A1E]/10" />
        </div>

        <label className="block text-sm font-medium mb-2">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="kamu@email.com"
          className="w-full rounded-lg border border-[#1A1A1E]/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#0038FF] focus:border-[#0038FF] mb-3"
        />
        <label className="block text-sm font-medium mb-2">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="••••••••"
          className="w-full rounded-lg border border-[#1A1A1E]/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#0038FF] focus:border-[#0038FF] mb-2"
        />
        {error && <p className="text-xs text-red-500 mb-2">Email atau password salah.</p>}
        <button
          onClick={submit}
          disabled={loading}
          className="w-full bg-[#0038FF] text-white py-3 rounded-lg text-sm font-medium hover:bg-[#0030DB] transition-colors mt-2 disabled:opacity-50"
        >
          {loading ? "Memproses…" : "Masuk"}
        </button>
      </div>
    </div>
  );
}