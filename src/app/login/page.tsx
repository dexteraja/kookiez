"use client";

import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Chrome, Loader2, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const [register, setRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    if (register) {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "Pendaftaran gagal.");
        setLoading(false);
        return;
      }
      setLoading(false);
      window.location.href = "/login";
      return;
    }
    const result = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (result?.error) {
      setError("Email atau password salah.");
      return;
    }
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
            <span className="stamp">Member desk / 2026</span>
          </div>

          <div className="max-w-md">
            <p className="kicker mb-3">Workspace member</p>
            <h1 className="display text-[clamp(2.8rem,4.8vw,4.4rem)]">
              Simpan brief,
              <br />
              pantau produksi.
            </h1>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-muted">
              Satu tempat untuk order aktif, invoice, dan riwayat project. Masuk dengan akun yang sama saat checkout.
            </p>

            <div className="mt-8 border-t border-line pt-5">
              {[
                "Status order dan antrean produksi",
                "Invoice dan riwayat pembayaran",
                "Brief serta file referensi tersimpan",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2.5 border-b border-line py-3 text-sm text-ink">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-accent" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
            Kookiez digital creative — Indonesia
          </p>
        </aside>

        <section className="flex flex-col justify-center px-5 py-8 sm:px-8 lg:px-12">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-8 flex items-center justify-between lg:hidden">
              <Link href="/" className="font-display text-xl font-semibold tracking-tight text-ink">
                kookiez<span className="text-accent">.</span>
              </Link>
              <Link href="/" className="inline-flex min-h-[44px] items-center gap-1.5 text-sm text-muted">
                <ArrowLeft className="h-4 w-4" /> Kembali
              </Link>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="kicker mb-2">Akun</p>
                <h2 className="display text-4xl">{register ? "Buat akun." : "Masuk."}</h2>
              </div>
              <span className="stamp stamp-accent">{register ? "Baru" : "Member"}</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              {register ? "Simpan progres desainmu di satu tempat." : "Lanjutkan ke workspace kookiez."}
            </p>

            <button
              type="button"
              onClick={() => signIn("google", { callbackUrl: "/" })}
              className="btn btn-secondary mt-6 w-full"
            >
              <Chrome className="h-4 w-4" /> Masuk dengan Google
            </button>

            <div className="my-5 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
              <span className="h-px flex-1 bg-line" /> atau email <span className="h-px flex-1 bg-line" />
            </div>

            <form onSubmit={submit} className="space-y-4">
              {register && (
                <div>
                  <label htmlFor="login-name" className="ui-label">
                    Nama
                  </label>
                  <input
                    id="login-name"
                    required
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="ui-input"
                    placeholder="Nama kamu"
                    autoComplete="name"
                  />
                </div>
              )}
              <div>
                <label htmlFor="login-email" className="ui-label">
                  Email
                </label>
                <input
                  id="login-email"
                  required
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="ui-input"
                  placeholder="kamu@email.com"
                  autoComplete="email"
                />
              </div>
              <div>
                <label htmlFor="login-password" className="ui-label">
                  Password
                </label>
                <input
                  id="login-password"
                  required
                  minLength={8}
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="ui-input"
                  placeholder="Minimal 8 karakter"
                  autoComplete={register ? "new-password" : "current-password"}
                />
              </div>

              {error && (
                <p role="alert" className="rounded-lg border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
                  {error}
                </p>
              )}

              <button type="submit" disabled={loading} className="btn btn-primary w-full">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Memproses
                  </>
                ) : (
                  <>
                    {register ? "Daftar" : "Masuk"} <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            <p className="mt-5 text-center text-sm text-muted">
              {register ? "Sudah punya akun?" : "Belum punya akun?"}{" "}
              <button
                type="button"
                onClick={() => {
                  setRegister((value) => !value);
                  setError("");
                }}
                className="font-semibold text-accent hover:underline"
              >
                {register ? "Masuk" : "Daftar"}
              </button>
            </p>

            <p className="mt-8 text-center text-xs leading-relaxed text-muted">
              Dengan masuk, kamu menyetujui ketentuan layanan dan kebijakan privasi Kookiez.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
