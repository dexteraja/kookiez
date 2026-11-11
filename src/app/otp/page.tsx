"use client";

import { FormEvent, Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Loader2, ShieldCheck } from "lucide-react";

function OtpContent() {
  const params = useSearchParams();
  const email = params.get("email") ?? "";
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const password = sessionStorage.getItem("kookiez_login_password") ?? "";
    const provider = params.get("provider");
    const result = await signIn("credentials", {
      email,
      password: provider === "google" ? "" : password,
      otp: code,
      googleOtp: provider === "google" ? "true" : "",
      redirect: false,
    });
    setLoading(false);
    if (result?.error) {
      setError("Kode OTP salah atau sudah kedaluwarsa.");
      return;
    }
    sessionStorage.removeItem("kookiez_login_password");
    window.location.href = "/";
  }

  return (
    <main className="ui-shell min-h-screen text-ink">
      <div className="mx-auto grid min-h-screen max-w-page lg:grid-cols-[1fr_.9fr]">
        <aside className="hidden flex-col justify-between border-r border-line px-8 py-10 lg:flex">
          <div className="flex items-center justify-between">
            <Link href="/" className="font-display text-xl font-semibold tracking-tight text-ink">
              kookiez<span className="text-accent">.</span>
            </Link>
            <span className="stamp">Secure entry / 2026</span>
          </div>
          <div className="max-w-md">
            <p className="kicker mb-3">Verifikasi dua langkah</p>
            <h1 className="display text-[clamp(2.8rem,4.8vw,4.4rem)]">
              Satu kode,
              <br />
              akses aman.
            </h1>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-muted">
              Kami mengirim kode 6 digit untuk memastikan yang masuk benar-benar kamu.
            </p>
            <div className="mt-8 flex items-start gap-3 border-t border-line pt-5 text-sm text-muted">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              Jangan bagikan kode ini ke siapa pun, termasuk yang mengaku dari Kookiez.
            </div>
          </div>
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">Kookiez digital creative — Indonesia</p>
        </aside>

        <section className="flex flex-col justify-center px-5 py-8 sm:px-8 lg:px-12">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-8 flex items-center justify-between lg:hidden">
              <Link href="/" className="font-display text-xl font-semibold tracking-tight text-ink">
                kookiez<span className="text-accent">.</span>
              </Link>
              <Link href="/login" className="inline-flex min-h-[44px] items-center gap-1.5 text-sm text-muted">
                <ArrowLeft className="h-4 w-4" /> Login
              </Link>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="kicker mb-2">Akun</p>
                <h2 className="display text-4xl">Verifikasi login.</h2>
              </div>
              <span className="stamp stamp-accent">OTP</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Masukkan kode 6 digit yang kami kirim ke{" "}
              <span className="font-medium text-ink">{email || "email kamu"}</span>.
            </p>

            <form onSubmit={submit} className="mt-7 space-y-4">
              <div>
                <label htmlFor="otp-code" className="ui-label">
                  Kode OTP
                </label>
                <input
                  id="otp-code"
                  required
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
                  className="ui-input py-4 text-center font-mono text-2xl tracking-[0.5em]"
                  placeholder="000000"
                />
              </div>

              {error && (
                <p role="alert" className="rounded-lg border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
                  {error}
                </p>
              )}

              <button type="submit" disabled={loading || code.length !== 6} className="btn btn-primary w-full">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Memeriksa
                  </>
                ) : (
                  <>
                    Verifikasi dan masuk <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            <Link
              href="/login"
              className="mt-5 flex min-h-[44px] items-center justify-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-ink"
            >
              <ArrowLeft className="h-4 w-4" /> Kembali ke login
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function OtpPage() {
  return (
    <Suspense fallback={<div className="ui-shell min-h-screen" />}>
      <OtpContent />
    </Suspense>
  );
}
