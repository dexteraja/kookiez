"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function AdminVerifyPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === "loading") return null;
  if (status === "unauthenticated") {
    router.replace("/login");
    return null;
  }
  router.replace(session?.user?.role === "admin" ? "/admin" : "/");
  return null;
}