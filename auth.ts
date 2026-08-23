import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyPassword } from "@/lib/password";
import { consumeOtp, createAndSendOtp } from "@/lib/otp";

/* ------------------------------------------------------------------ */
/*  Role admin — DEMO: daftar email & password di sini. Untuk          */
/*  produksi asli, pindahkan ke database (tabel users + kolom role)    */
/*  dan simpan password sebagai HASH (bcrypt), bukan plaintext.        */
/*                                                                      */
/*  Aturan:                                                            */
/*  - Email yang ADA di ADMIN_EMAILS WAJIB verifikasi password admin,  */
/*    baik login lewat Google MAUPUN lewat form email/password.        */
/*  - Email lain (member biasa) bisa langsung masuk pakai Google,      */
/*    atau pakai email/password tanpa syarat tambahan.                 */
/* ------------------------------------------------------------------ */
const ADMIN_EMAILS = (process.env.AUTH_ADMIN_EMAILS ?? "admin@kookiez.com")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

// Pemilik situs: tetap admin meski daftar environment belum diperbarui.
const OWNER_ADMIN_EMAIL = "kookiezst@gmail.com";

const ADMIN_PASSWORD = process.env.AUTH_ADMIN_PASSWORD ?? "kuehnjir2";

function isAdminEmail(email?: string | null) {
  const normalized = email?.trim().toLowerCase();
  return !!normalized && (normalized === OWNER_ADMIN_EMAIL || ADMIN_EMAILS.includes(normalized));
}

export type Role = "member" | "admin" | "pending-admin";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        otp: { label: "OTP", type: "text" },
        googleOtp: { label: "Google OTP", type: "text" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.toString().trim().toLowerCase();
        const password = credentials?.password?.toString() ?? "";
        const otp = credentials?.otp?.toString().trim() ?? "";
        if (!email) return null;

        if (isAdminEmail(email)) {
          if (password !== ADMIN_PASSWORD) return null;
          return { id: email, name: "Admin", email, role: "admin" as Role };
        }

        if (!otp) return null;

        if (credentials?.googleOtp?.toString() === "true") {
          if (!(await consumeOtp(email, otp))) return null;
          return { id: email, name: email.split("@")[0], email, role: isAdminEmail(email) ? "admin" as Role : "member" as Role };
        }
        if (!(await consumeOtp(email, otp))) return null;

        if (isAdminEmail(email)) {
          // Admin lewat form login juga wajib password admin yang benar.
          if (password !== ADMIN_PASSWORD) return null;
          return { id: email, name: "Admin", email, role: "admin" as Role };
        }

        try {
          const { db } = await connectToDatabase();
          const member = await db.collection("users").findOne({ email });
          if (!member || typeof member.passwordHash !== "string" || !(await verifyPassword(password, member.passwordHash))) return null;
          return { id: String(member._id), name: String(member.name ?? email.split("@")[0]), email, role: "member" as Role };
        } catch {
          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email) {
        const email = user.email.toLowerCase();
        if (isAdminEmail(email)) {
          return `/admin-verify?email=${encodeURIComponent(email)}`;
        }
        await createAndSendOtp(email);
        return `/otp?provider=google&email=${encodeURIComponent(email)}`;
      }
      return true;
    },
    async jwt({ token, user, account, trigger, session }) {
      // Saat baru saja berhasil login (Google atau Credentials)
      if (user) {
        const email = user.email;
        token.otpVerified = account?.provider !== "google";
        // Google sudah memverifikasi kepemilikan akun. Email yang ada pada
        // allow-list langsung memperoleh role admin agar akses dashboard dan
        // tombol Admin konsisten setelah masuk.
        token.role = (account?.provider === "google" && isAdminEmail(email)
          ? "pending-admin"
          : ((user as { role?: Role }).role ?? (isAdminEmail(email) ? "admin" : "member"))) as Role;
        token.email = email;
      }

      // Dipanggil dari client lewat `update()` — dipakai halaman
      // /admin-verify untuk mengonfirmasi password admin setelah Google.
      // Verifikasi password TETAP dilakukan di server (di sini), client
      // cuma mengirim password yang diketik, bukan menentukan role-nya.
      if (trigger === "update" && token.role === "pending-admin") {
        const submittedPassword = (session as { adminPassword?: string } | null)?.adminPassword;
        if (submittedPassword === ADMIN_PASSWORD) {
          token.role = "admin" as Role;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as Role;
      }
      return session;
    },
  },
});
