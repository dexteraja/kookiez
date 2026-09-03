import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { bootstrapAdminIfNeeded, getOrCreateOAuthUser, getUserByEmail, normalizeEmail, verifyUserPassword } from "@/lib/users";
import { rateLimit } from "@/lib/rate-limit";

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
export type Role = "member" | "admin";

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
      async authorize(credentials, request) {
        const email = credentials?.email ? normalizeEmail(credentials.email.toString()) : "";
        const password = credentials?.password?.toString() ?? "";
        if (!email || !password) return null;
        const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
        const attempt = rateLimit(`login:${ip}:${email}`, 5, 15 * 60 * 1000);
        if (!attempt.allowed) return null;
        await bootstrapAdminIfNeeded();
        const user = await verifyUserPassword(email, password);
        if (!user || !user._id) return null;
        return { id: String(user._id), name: user.name, email: user.email, role: user.role };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email) {
        await bootstrapAdminIfNeeded();
        const existing = await getUserByEmail(user.email);
        if (existing?.status === "disabled") return false;
      }
      return true;
    },
    async jwt({ token, user, account, trigger, session }) {
      // Saat baru saja berhasil login (Google atau Credentials)
      if (user) {
        const email = user.email;
        const databaseUser = email ? await getOrCreateOAuthUser(email, user.name) : null;
        token.role = ((databaseUser?.role ?? (user as { role?: Role }).role ?? "member")) as Role;
        token.sub = databaseUser?._id ? String(databaseUser._id) : user.id;
        token.email = email;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as Role;
        if (token.sub) session.user.id = token.sub;
      }
      return session;
    },
  },
});
