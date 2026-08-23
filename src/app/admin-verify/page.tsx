"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";

export default function AdminVerifyPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  if (status === "loading") return null;
  if (status === "unauthenticated") {
    router.replace("/login");
    return null;
  }
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role === "admin") {
    router.replace("/admin");
    return null;
  }
  if (role !== "pending-admin") {
    router.replace("/");
    return null;
  }

  const submit = async () => {
    setLoading(true);
    setError(false);
    // `update()` memicu callbacks.jwt di server dengan trigger "update".
    // Password DIVERIFIKASI DI SERVER (lihat auth.ts) — bukan di sini.
    const updated = await update({ adminPassword: pw });
    setLoading(false);
    if (updated?.user?.role === "admin") {
      router.replace("/admin");
    } else {
      setError(true);
      setPw("");
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F9FB] text-[#1A1A1E] flex items-center justify-center px-6">
      <div className="max-w-sm w-full">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-[#1A1A1E]/50 hover:text-[#1A1A1E] mb-8">
          <ArrowLeft className="w-4 h-4" /> kookiez.
        </Link>
        <div className="w-10 h-10 rounded-lg bg-[#1A1A1E]/5 flex items-center justify-center mb-4">
          <Lock className="w-4 h-4 text-[#1A1A1E]/50" />
        </div>
        <h1 className="font-heading text-xl font-semibold mb-2">Konfirmasi akun admin</h1>
        <p className="text-sm text-[#1A1A1E]/60 mb-4">
          Akun Google <span className="font-medium">{session?.user?.email}</span> terdaftar sebagai admin. Masukkan
          password admin untuk lanjut.
        </p>
        <input
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Password admin"
          className="w-full rounded-lg border border-[#1A1A1E]/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#0038FF] focus:border-[#0038FF] mb-2"
          autoFocus
        />
        {error && <p className="text-xs text-red-500 mb-2">Password salah.</p>}
        <button
          onClick={submit}
          disabled={loading || !pw}
          className="w-full bg-[#0038FF] text-white py-3 rounded-lg text-sm font-medium hover:bg-[#0030DB] transition-colors mt-2 disabled:opacity-50"
        >
          {loading ? "Memeriksa…" : "Konfirmasi"}
        </button>
      </div>
    </div>
  );
}
