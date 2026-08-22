"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, LogOut } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { getAllOrders, updateOrderStatus, type StoredOrder, type OrderStatus } from "@/lib/orders";

const STATUS_OPTIONS: OrderStatus[] = ["pending", "progress", "review", "done"];

export default function AdminPage() {
  const { t } = useLang();
  const { data: session, status } = useSession();
  const router = useRouter();
  const [orders, setOrders] = useState<StoredOrder[]>([]);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    else if (session?.user?.role === "pending-admin") router.replace("/admin-verify");
    else if (session?.user?.role === "member") router.replace("/");
    else if (session?.user?.role === "admin") setOrders(getAllOrders());
  }, [status, session, router]);

  const changeStatus = (code: string, s: OrderStatus) => {
    updateOrderStatus(code, s);
    setOrders(getAllOrders());
  };

  if (status === "loading" || session?.user?.role !== "admin") return null;

  return (
    <div className="min-h-screen bg-[#F9F9FB] text-[#1A1A1E]">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-6">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-[#1A1A1E]/50 hover:text-[#1A1A1E]">
            <ArrowLeft className="w-4 h-4" /> kookiez.
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="inline-flex items-center gap-1.5 text-sm text-[#1A1A1E]/50 hover:text-[#1A1A1E]"
          >
            <LogOut className="w-4 h-4" /> {t("admin_logout")}
          </button>
        </div>

        <h1 className="font-heading text-2xl font-semibold mb-3">{t("admin_title")}</h1>

        <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-8">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{t("admin_warning")}</span>
        </div>

        {orders.length === 0 ? (
          <p className="text-sm text-[#1A1A1E]/50">{t("admin_empty")}</p>
        ) : (
          <div className="space-y-3">
            {orders.map((o) => (
              <div key={o.code} className="rounded-lg border border-[#1A1A1E]/10 p-4">
                <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                  <div>
                    <span className="font-mono text-sm font-semibold text-[#0038FF]">{o.code}</span>
                    <span className="text-xs text-[#1A1A1E]/40 ml-2">{new Date(o.createdAt).toLocaleString()}</span>
                  </div>
                  <select
                    value={o.status}
                    onChange={(e) => changeStatus(o.code, e.target.value as OrderStatus)}
                    className="text-xs font-mono border border-[#1A1A1E]/15 rounded-md px-2 py-1.5 bg-white"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {t(`status_${s}` as any)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-[#1A1A1E]/70">
                  <div>
                    <div className="text-[#1A1A1E]/40">{t("step4_service")}</div>
                    <div className="font-medium">{o.service || "—"}</div>
                  </div>
                  <div>
                    <div className="text-[#1A1A1E]/40">{t("step4_budget")}</div>
                    <div className="font-medium">{o.budgetLabel || "—"}</div>
                  </div>
                  <div>
                    <div className="text-[#1A1A1E]/40">{t("step4_deadline")}</div>
                    <div className="font-medium">{o.deadline || "—"}</div>
                  </div>
                  <div>
                    <div className="text-[#1A1A1E]/40">{t("step4_pay_method")}</div>
                    <div className="font-medium">
                      {o.plan} · {o.method}
                    </div>
                  </div>
                </div>
                {o.briefScope && (
                  <p className="text-xs text-[#1A1A1E]/60 mt-3 pt-3 border-t border-[#1A1A1E]/10">{o.briefScope}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}