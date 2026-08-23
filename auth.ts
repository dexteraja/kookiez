import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyPassword } from "@/lib/password";
import { bootstrapConfiguredAdmins, isLocked, failedLogin, successfulLogin, auditLogin, getClientIp } from "@/lib/auth-helpers";

export type Role = "member" | "admin";

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    Google({ clientId: process.env.AUTH_GOOGLE_ID, clientSecret: process.env.AUTH_GOOGLE_SECRET }),
    Credentials({
      name: "Email dan password",
      credentials: { email: { label: "Email", type: "email" }, password: { label: "Password", type: "password" } },
      async authorize(credentials) {
        const email = credentials?.email?.toString().trim().toLowerCase();
        const password = credentials?.password?.toString() ?? "";
        if (!email || !password) return null;
        try {
          await bootstrapConfiguredAdmins();
          if (await isLocked(email)) return null;
          const { db } = await connectToDatabase();
          const user = await db.collection("users").findOne({ email, status: "active" });
          const valid = Boolean(user?.passwordHash && await verifyPassword(password, user.passwordHash));
          await auditLogin(email, valid, "credentials");
          if (!valid) { await failedLogin(email); return null; }
          await successfulLogin(email);
          return { id: String(user?._id), name: String(user?.name ?? email.split("@")[0]), email, role: (user?.role ?? "member") as Role };
        } catch { return null; }
      },
    }),
  ],
  pages: { signIn: "/login" },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email) {
        const { db } = await connectToDatabase();
        const email = user.email.toLowerCase();
        const existing = await db.collection("users").findOne({ email });
        if (!existing) await db.collection("users").insertOne({ email, name: user.name ?? email.split("@")[0], role: "member", status: "active", createdAt: new Date(), updatedAt: new Date() });
      }
      return true;
    },
    async jwt({ token, user }) { if (user) token.role = (user as { role?: Role }).role ?? "member"; return token; },
    async session({ session, token }) { if (session.user) session.user.role = token.role as Role; return session; },
  },
});

void getClientIp;
