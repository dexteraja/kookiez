"use client";

import { useState, useEffect, useCallback, useRef, type FormEvent } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, LogOut, Plus, Minus, Volume2, VolumeX,
  Clock, Loader2, CheckCircle2, Eye, X,
} from "lucide-react";
import { useLang } from "@/lib/i18n";

type OrderStatus = "pending" | "progress" | "review" | "done";

interface OrderData {
  code: string;
  status: OrderStatus;
  service: string;
  budgetLabel: string;
  deadline: string;
  plan: string;
  method: string;
  amount: number | null;
  isCustom: boolean;
  briefScope: string;
  briefRefs: string;
  fileNames: string[];
  queuePosition: number | null;
  createdAt: string;
  customerEmail: string | null;
}

interface QueueInfo {
  maxSlots: number;
  activeSlots: number;
  availableSlots: number;
  note: string;
}

function statusMeta(status: OrderStatus, t: (k: any) => string) {
  const map = {
    pending: { label: t("status_pending"), icon: Clock, color: "#B58900", bg: "#B5890015" },
    progress: { label: t("status_progress"), icon: Loader2, color: "#0038FF", bg: "#0038FF15" },
    review: { label: t("status_review"), icon: Eye, color: "#9333EA", bg: "#9333EA15" },
    done: { label: t("status_done"), icon: CheckCircle2, color: "#16A34A", bg: "#16A34A15" },
  } as const;
  return map[status];
}

export default function AdminPage() {
  const { t } = useLang();
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  const [orders, setOrders] = useState<OrderData[]>([]);
  const [queueInfo, setQueueInfo] = useState<QueueInfo>({
    maxSlots: 9,
    activeSlots: 0,
    availableSlots: 9,
    note: "",
  });
  const [note, setNote] = useState("");
  const [workJson, setWorkJson] = useState("[]");
  const [workMessage, setWorkMessage] = useState("");
  const [pricing, setPricing] = useState<Record<string, number | null>>({ hemat: 50000, standar: 150000, lengkap: 350000, borongan: null });
  const [pricingMessage, setPricingMessage] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [updatingSlot, setUpdatingSlot] = useState(false);
  const [slotMessage, setSlotMessage] = useState("");
  const eventSourceRef = useRef<EventSource | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [paymentSettings, setPaymentSettings] = useState({ onlinePaymentEnabled: false, whatsappCsNumber: "" });
  const [paymentMessage, setPaymentMessage] = useState("");
  const [admins, setAdmins] = useState<Array<{ _id: string; email: string; name?: string; status: string }>>([]);
  const [newAdmin, setNewAdmin] = useState({ email: "", name: "", password: "" });
  const [adminMessage, setAdminMessage] = useState("");
  const loadAccessSettings = useCallback(async () => { const [p, a] = await Promise.all([fetch("/api/admin/payment"), fetch("/api/admin/users")]); if (p.ok) setPaymentSettings(await p.json()); if (a.ok) setAdmins((await a.json()).admins); }, []);
  const savePayment = async () => { const res = await fetch("/api/admin/payment", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(paymentSettings) }); setPaymentMessage(res.ok ? "Pengaturan payment tersimpan." : "Gagal menyimpan pengaturan."); };
  const addAdmin = async (event: FormEvent) => { event.preventDefault(); const res = await fetch("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newAdmin) }); const data = await res.json(); setAdminMessage(res.ok ? "Admin berhasil ditambahkan." : data.error); if (res.ok) { setNewAdmin({ email: "", name: "", password: "" }); loadAccessSettings(); } };
  const toggleAdminAccess = async (id: string, active: boolean) => { const res = await fetch("/api/admin/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, active }) }); if (!res.ok) setAdminMessage((await res.json()).error); else loadAccessSettings(); };

  const savePricing = async () => {
    setPricingMessage("Menyimpan...");
    const res = await fetch("/api/admin/pricing", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pricing }) });
    setPricingMessage(res.ok ? "Harga berhasil disimpan." : "Harga gagal disimpan.");
  };

  useEffect(() => {
    if (authStatus === "unauthenticated") router.replace("/login");
    else if ((session?.user as { role?: string })?.role === "pending-admin")
      router.replace("/admin-verify");
    else if ((session?.user as { role?: string })?.role === "member") router.replace("/");
  }, [authStatus, session, router]);

  const fetchAdminData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/orders");
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders);
        setQueueInfo({
          maxSlots: data.maxSlots,
          activeSlots: data.activeSlots,
          availableSlots: data.availableSlots,
          note: data.note,
        });
        setNote(data.note);
      }
    } catch (err) {
      console.error("Failed to fetch admin data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if ((session?.user as { role?: string })?.role === "admin") {
      fetchAdminData();
      loadAccessSettings();
      fetch("/api/admin/portfolio").then((res) => res.ok ? res.json() : null).then((data) => {
        if (data) setWorkJson(JSON.stringify(data.items, null, 2));
      }).catch(() => {});
    }
  }, [session, fetchAdminData]);

  const saveWorkJson = async () => {
    try {
      const items = JSON.parse(workJson);
      const res = await fetch("/api/admin/portfolio", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setWorkJson(JSON.stringify(data.items, null, 2));
      setWorkMessage("Karya Kami tersimpan.");
    } catch (error) {
      setWorkMessage(error instanceof Error ? error.message : "JSON tidak valid.");
    }
  };

  useEffect(() => {
    if ((session?.user as { role?: string })?.role !== "admin") return;

    const es = new EventSource("/api/queue/stream");
    eventSourceRef.current = es;

    const playNotification = () => {
      if (!soundEnabled) return;
      try {
        if (!audioRef.current) {
          audioRef.current = new Audio(
            "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVggoKIe2EcCj+a2/vLbx0jNGaDh4ZyXk5Qf6e4xnpPPU1ujH2EdWRRR3qev8l9VjVEZ4F9g3RkUkd6nr7IflUzQ2eBfYN0ZFJHep6+yH5VM0NngX2DdGRSR3qevsh+VTNDZ4F9g3RkUkd6nr7IflUzQ2eBfYN0ZFJHep6+yH5VM0NngX2DdGRSR3qevsh+VTNDZ4F9g3Q="
          );
          audioRef.current.volume = 0.3;
        }
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      } catch {}
    };

    es.addEventListener("new_order", (e) => {
      try {
        const data = JSON.parse(e.data);
        setQueueInfo((prev) => ({
          ...prev,
          activeSlots: data.activeSlots,
          availableSlots: data.availableSlots,
        }));
        playNotification();
        fetchAdminData();
      } catch {}
    });

    es.addEventListener("order_status", () => {
      fetchAdminData();
    });

    es.addEventListener("slot_update", (e) => {
      try {
        const data = JSON.parse(e.data);
        setQueueInfo({
          maxSlots: data.maxSlots,
          activeSlots: data.activeSlots,
          availableSlots: data.availableSlots,
          note: data.note,
        });
        setNote(data.note);
      } catch {}
    });

    es.addEventListener("queue_update", (e) => {
      try {
        const data = JSON.parse(e.data);
        setQueueInfo((prev) => ({
          ...prev,
          activeSlots: data.activeSlots,
          availableSlots: data.availableSlots,
          maxSlots: data.maxSlots,
        }));
      } catch {}
    });

    es.onerror = () => {
      es.close();
      setTimeout(() => {
        if (eventSourceRef.current === es) {
          const newEs = new EventSource("/api/queue/stream");
          eventSourceRef.current = newEs;
        }
      }, 3000);
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [session, fetchAdminData, soundEnabled]);

  const updateSlots = async (delta: number) => {
    const newMax = queueInfo.maxSlots + delta;
    if (newMax < 1) return;

    setUpdatingSlot(true);
    setSlotMessage("");
    try {
      const res = await fetch("/api/queue/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxSlots: newMax, note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Slot gagal diperbarui.");
      setQueueInfo({
        maxSlots: data.maxSlots,
        activeSlots: data.activeSlots,
        availableSlots: data.availableSlots,
        note: data.note,
      });
      setSlotMessage(`Kapasitas diperbarui menjadi ${data.maxSlots} slot.`);
    } catch (err) {
      setSlotMessage(err instanceof Error ? err.message : "Slot gagal diperbarui.");
    } finally {
      setUpdatingSlot(false);
    }
  };

  const saveNote = async () => {
    try {
      const res = await fetch("/api/queue/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxSlots: queueInfo.maxSlots, note }),
      });
      if (res.ok) {
        const data = await res.json();
        setQueueInfo((prev) => ({ ...prev, note: data.note }));
      }
    } catch (err) {
      console.error("Failed to save note:", err);
    }
  };

  const changeStatus = async (code: string, newStatus: OrderStatus) => {
    try {
      const res = await fetch(`/api/orders/${code}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchAdminData();
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  if (authStatus === "loading" || (session?.user as { role?: string })?.role !== "admin") {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#F9F9FB] text-[#1A1A1E]">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-[#1A1A1E]/50 hover:text-[#1A1A1E]"
          >
            <ArrowLeft className="w-4 h-4" /> kookiez.
          </Link>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 rounded-lg border border-[#1A1A1E]/15 hover:border-[#1A1A1E]/30 transition-colors"
              title={soundEnabled ? "Matikan suara" : "Nyalakan suara"}
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-[#1A1A1E]/60" />
              ) : (
                <VolumeX className="w-4 h-4 text-[#1A1A1E]/40" />
              )}
            </button>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="inline-flex items-center gap-1.5 text-sm text-[#1A1A1E]/50 hover:text-[#1A1A1E]"
            >
              <LogOut className="w-4 h-4" /> {t("admin_logout")}
            </button>
          </div>
        </div>

        <h1 className="font-heading text-2xl font-semibold mb-6">Admin Dashboard</h1>

        <section className="mb-8 border border-[#1A1A1E]/10 rounded-xl p-6 bg-white">
          <p className="font-mono text-[10px] tracking-widest text-[#0038FF] mb-1">PRICE SETTINGS</p>
          <h2 className="font-heading text-xl font-semibold mb-2">Atur estimasi harga</h2>
          <p className="text-sm text-[#1A1A1E]/55 mb-5">Harga ini langsung dipakai kalkulator dan form pemesanan.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {[["hemat", "Hemat"], ["standar", "Standar"], ["lengkap", "Paket Lengkap"], ["borongan", "Borongan / Custom"]].map(([id, label]) => (
              <label key={id} className="grid gap-2 text-sm font-medium">
                {label}
                <div className="flex items-center gap-2">
                  <span className="text-[#1A1A1E]/45">Rp</span>
                  <input type="number" min="0" value={pricing[id] ?? ""} disabled={id === "borongan"} onChange={(e) => setPricing((current) => ({ ...current, [id]: e.target.value === "" ? null : Number(e.target.value) }))} className="w-full rounded-lg border border-[#1A1A1E]/15 bg-[#F9F9FB] px-3 py-2.5 font-mono text-sm focus:border-[#0038FF] focus:outline-none" />
                </div>
              </label>
            ))}
          </div>
          <div className="mt-5 flex items-center gap-3">
            <button onClick={savePricing} className="rounded-lg bg-[#0038FF] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#0030DB]">Simpan harga</button>
            {pricingMessage && <span className="text-xs text-[#1A1A1E]/55" role="status">{pricingMessage}</span>}
          </div>
        </section>

        <section className="mb-8 grid gap-6 lg:grid-cols-2">
    <div className="border border-[#1A1A1E]/10 rounded-xl p-6 bg-white">
      <p className="font-mono text-[10px] tracking-widest text-[#0038FF] mb-1">PAYMENT CONTROL</p>
      <h2 className="font-heading text-xl font-semibold mb-2">Payment online</h2>
      <p className="text-sm text-[#1A1A1E]/55 mb-5">Matikan sementara jika gateway bermasalah. Member akan diarahkan ke WhatsApp CS otomatis.</p>
      <label className="flex items-center justify-between gap-4 rounded-lg border border-[#1A1A1E]/10 p-4 text-sm font-medium"><span>{paymentSettings.onlinePaymentEnabled ? "Payment online aktif" : "Payment online nonaktif"}</span><input type="checkbox" checked={paymentSettings.onlinePaymentEnabled} onChange={(e) => setPaymentSettings((v) => ({ ...v, onlinePaymentEnabled: e.target.checked }))} className="h-5 w-5 accent-[#0038FF]" /></label>
      <label className="grid gap-2 mt-4 text-sm font-medium">Nomor WhatsApp CS<input value={paymentSettings.whatsappCsNumber} onChange={(e) => setPaymentSettings((v) => ({ ...v, whatsappCsNumber: e.target.value }))} placeholder="62812..." className="rounded-lg border border-[#1A1A1E]/15 bg-[#F9F9FB] px-3 py-2.5 font-mono text-sm" /></label>
      <div className="mt-4 flex items-center gap-3"><button onClick={savePayment} className="rounded-lg bg-[#0038FF] px-4 py-2.5 text-sm font-medium text-white">Simpan payment</button>{paymentMessage && <span className="text-xs text-[#1A1A1E]/55" role="status">{paymentMessage}</span>}</div>
    </div>
    <div className="border border-[#1A1A1E]/10 rounded-xl p-6 bg-white">
      <p className="font-mono text-[10px] tracking-widest text-[#0038FF] mb-1">ADMIN ACCESS</p><h2 className="font-heading text-xl font-semibold mb-2">Kelola admin</h2>
      <div className="grid gap-2 mb-4">{admins.map((admin) => <div key={admin._id} className="flex items-center justify-between gap-3 rounded-lg border border-[#1A1A1E]/10 px-3 py-2 text-sm"><span>{admin.name} <span className="text-[#1A1A1E]/45">{admin.email}</span></span><button onClick={() => toggleAdminAccess(admin._id, admin.status !== "active")} className="text-xs text-[#0038FF]">{admin.status === "active" ? "Nonaktifkan" : "Aktifkan"}</button></div>)}</div>
      <form onSubmit={addAdmin} className="grid gap-2"><input required type="email" placeholder="Email admin baru" value={newAdmin.email} onChange={(e) => setNewAdmin((v) => ({ ...v, email: e.target.value }))} className="rounded-lg border border-[#1A1A1E]/15 px-3 py-2 text-sm" /><input required placeholder="Nama" value={newAdmin.name} onChange={(e) => setNewAdmin((v) => ({ ...v, name: e.target.value }))} className="rounded-lg border border-[#1A1A1E]/15 px-3 py-2 text-sm" /><input required minLength={8} type="password" placeholder="Password minimal 8 karakter" value={newAdmin.password} onChange={(e) => setNewAdmin((v) => ({ ...v, password: e.target.value }))} className="rounded-lg border border-[#1A1A1E]/15 px-3 py-2 text-sm" /><button className="rounded-lg border border-[#0038FF] px-4 py-2.5 text-sm font-medium text-[#0038FF]">Tambah admin</button></form>{adminMessage && <p className="mt-2 text-xs text-[#1A1A1E]/55" role="status">{adminMessage}</p>}
    </div>
  </section>

  {/* Sales snapshot */}
        <section className="mb-8 grid gap-3 sm:grid-cols-3">
          {[
            ["Total pesanan", orders.length.toString()],
            ["Sedang berjalan", orders.filter((order) => order.status !== "done").length.toString()],
            ["Pendapatan tercatat", new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(orders.reduce((sum, order) => sum + (order.amount ?? 0), 0))],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-[#1A1A1E]/10 bg-white p-5">
              <p className="text-xs text-[#1A1A1E]/50">{label}</p>
              <p className="mt-2 font-mono text-2xl font-semibold text-[#0038FF]">{value}</p>
            </div>
          ))}
        </section>

        {/* Slot Management Panel */}
        <section className="mb-8 border border-[#1A1A1E]/10 rounded-xl p-6 bg-white">
          <p className="font-mono text-[10px] tracking-widest text-[#0038FF] mb-1">
            QUEUE CONTROL
          </p>
          <h2 className="font-heading text-xl font-semibold mb-5">
            Manajemen Slot Antrean
          </h2>

          <div className="grid sm:grid-cols-3 gap-4 mb-5">
            <div className="text-center p-4 rounded-lg bg-[#0038FF]/5 border border-[#0038FF]/10">
              <div className="text-3xl font-mono font-bold text-[#0038FF]">
                {queueInfo.maxSlots}
              </div>
              <div className="text-xs text-[#1A1A1E]/50 mt-1">Total Slot</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-[#B58900]/5 border border-[#B58900]/10">
              <div className="text-3xl font-mono font-bold text-[#B58900]">
                {queueInfo.activeSlots}
              </div>
              <div className="text-xs text-[#1A1A1E]/50 mt-1">Terisi</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-[#16A34A]/5 border border-[#16A34A]/10">
              <div className="text-3xl font-mono font-bold text-[#16A34A]">
                {queueInfo.availableSlots}
              </div>
              <div className="text-xs text-[#1A1A1E]/50 mt-1">Tersedia</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => updateSlots(-1)}
              disabled={updatingSlot || queueInfo.maxSlots <= 1}
              className="flex items-center justify-center w-10 h-10 rounded-lg border border-[#1A1A1E]/15 hover:border-[#1A1A1E]/30 disabled:opacity-40 transition-colors"
            >
              <Minus className="w-4 h-4" />
            </button>
            <div className="flex-1 text-center">
              <span className="font-mono text-lg font-semibold">
                {queueInfo.maxSlots}
              </span>
              <span className="text-xs text-[#1A1A1E]/50 ml-2">slot</span>
            </div>
            <button
              onClick={() => updateSlots(1)}
              disabled={updatingSlot}
              className="flex items-center justify-center w-10 h-10 rounded-lg border border-[#1A1A1E]/15 hover:border-[#1A1A1E]/30 disabled:opacity-40 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          {slotMessage && (
            <p className="mt-3 text-xs text-[#1A1A1E]/60" role="status">{slotMessage}</p>
          )}

          <div className="mt-4 flex gap-2">
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Catatan antrean (tampil di landing page)..."
              className="flex-1 border border-[#1A1A1E]/15 rounded-lg px-3 py-2.5 text-sm"
            />
            <button
              onClick={saveNote}
              className="bg-[#1A1A1E] text-white rounded-lg px-4 py-2.5 text-sm font-medium shrink-0"
            >
              Simpan
            </button>
          </div>

          {/* Slot bar visualization */}
          <div className="mt-5">
            <div className="flex gap-1">
              {Array.from({ length: queueInfo.maxSlots }).map((_, i) => (
                <div
                  key={i}
                  className={`h-2.5 flex-1 rounded-full transition-colors ${
                    i < queueInfo.activeSlots
                      ? "bg-[#0038FF]"
                      : "bg-[#1A1A1E]/10"
                  }`}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="mb-8 border border-[#1A1A1E]/10 rounded-xl p-6 bg-white">
          <p className="font-mono text-[10px] tracking-widest text-[#0038FF] mb-1">CONTENT CONFIG</p>
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="font-heading text-xl font-semibold">Karya Kami</h2>
            <button onClick={saveWorkJson} className="bg-[#0038FF] text-white rounded-lg px-4 py-2 text-sm font-medium">Simpan JSON</button>
          </div>
          <p className="text-sm text-[#1A1A1E]/55 mb-4">Kelola daftar karya tanpa mengubah kode. Gunakan format array JSON dengan kolom id, klien, kategori, tahun, span, image, hue, dan deskripsi.</p>
          <textarea value={workJson} onChange={(e) => setWorkJson(e.target.value)} rows={12} spellCheck={false} className="w-full rounded-lg border border-[#1A1A1E]/15 bg-[#F9F9FB] p-3 font-mono text-xs leading-relaxed focus:outline-none focus:border-[#0038FF]" aria-label="Konfigurasi Karya Kami dalam JSON" />
          {workMessage && <p className="mt-2 text-sm text-[#0038FF]">{workMessage}</p>}
        </section>

        {/* Orders Table */}
        <section className="border border-[#1A1A1E]/10 rounded-xl bg-white overflow-hidden">
          <div className="px-6 py-4 border-b border-[#1A1A1E]/10">
            <p className="font-mono text-[10px] tracking-widest text-[#0038FF]">
              ORDERS
            </p>
            <h2 className="font-heading text-xl font-semibold mt-1">
              Pesanan Masuk ({orders.length})
            </h2>
          </div>

          {loading ? (
            <div className="p-12 text-center text-sm text-[#1A1A1E]/40">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
              Memuat data...
            </div>
          ) : orders.length === 0 ? (
            <p className="p-12 text-center text-sm text-[#1A1A1E]/50">
              Belum ada pesanan masuk.
            </p>
          ) : (
            <div className="divide-y divide-[#1A1A1E]/10">
              {orders.map((order) => {
                const meta = statusMeta(order.status, t);
                const Icon = meta.icon;
                return (
                  <div key={order.code} className="px-6 py-4">
                    <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm font-semibold text-[#0038FF]">
                          {order.code}
                        </span>
                        <span
                          className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
                          style={{ color: meta.color, backgroundColor: meta.bg }}
                        >
                          <Icon
                            className={`w-3 h-3 ${
                              order.status === "progress" ? "animate-spin" : ""
                            }`}
                          />
                          {meta.label}
                        </span>
                        {order.queuePosition && (
                          <span className="text-xs font-mono text-[#1A1A1E]/40">
                            #{order.queuePosition}
                          </span>
                        )}
                      </div>
                      <select
                        value={order.status}
                        onChange={(e) =>
                          changeStatus(order.code, e.target.value as OrderStatus)
                        }
                        className="text-xs font-mono border border-[#1A1A1E]/15 rounded-md px-2 py-1.5 bg-white"
                      >
                        <option value="pending">{t("status_pending")}</option>
                        <option value="progress">{t("status_progress")}</option>
                        <option value="review">{t("status_review")}</option>
                        <option value="done">{t("status_done")}</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs text-[#1A1A1E]/70">
                      <div>
                        <div className="text-[#1A1A1E]/40">Layanan</div>
                        <div className="font-medium">{order.service || "—"}</div>
                      </div>
                      <div>
                        <div className="text-[#1A1A1E]/40">Budget</div>
                        <div className="font-medium">{order.budgetLabel || "—"}</div>
                      </div>
                      <div>
                        <div className="text-[#1A1A1E]/40">Tenggat</div>
                        <div className="font-medium">{order.deadline || "—"}</div>
                      </div>
                      <div>
                        <div className="text-[#1A1A1E]/40">Pembayaran</div>
                        <div className="font-medium">
                          {order.plan} · {order.method}
                        </div>
                      </div>
                      <div>
                        <div className="text-[#1A1A1E]/40">Waktu</div>
                        <div className="font-medium">
                          {new Date(order.createdAt).toLocaleString("id-ID")}
                        </div>
                      </div>
                    </div>

                    {order.briefScope && (
                      <p className="text-xs text-[#1A1A1E]/55 mt-3 pt-3 border-t border-[#1A1A1E]/8 line-clamp-2">
                        {order.briefScope}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
