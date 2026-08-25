"use client";

import { useState, useEffect, useCallback, useRef, type FormEvent } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Topography from '@/components/TopographyBG';
import {
  ArrowLeft, LogOut, Plus, Minus, Volume2, VolumeX,
  Clock, Loader2, CheckCircle2, Eye, X, Upload, Send, AlertTriangle,
} from "lucide-react";
import { useLang } from "@/lib/i18n";
import { DEFAULT_PRICING, type PricingOverride } from "@/lib/pricing";
import { ALLOWED_FILE_ACCEPT, MAX_FILE_SIZE } from "@/lib/file-constraints";

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
  customerName?: string | null;
  promoCode?: string | null;
  discountAmount?: number;
  finalAmount?: number | null;
  deliverables?: Array<{ id: string; name: string }>;
  projectSentAt?: string | null;
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
  const [pricing, setPricing] = useState<PricingOverride>(DEFAULT_PRICING);
  const [pricingMessage, setPricingMessage] = useState("");
  const [onlinePaymentEnabled, setOnlinePaymentEnabled] = useState(false);
  const [whatsappCsNumber, setWhatsappCsNumber] = useState("");
  const [whatsappFallbackMessage, setWhatsappFallbackMessage] = useState("");
  const [paymentMessage, setPaymentMessage] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [updatingSlot, setUpdatingSlot] = useState(false);
  const [slotMessage, setSlotMessage] = useState("");
  const [promos, setPromos] = useState<Array<{ _id: string; code: string; percent: number; packageIds: string[]; startsAt: string; expiresAt: string; active: boolean }>>([]);
  const [promoForm, setPromoForm] = useState({ code: "", percent: 10, packageIds: ["hemat"], startsAt: "", expiresAt: "" });
  const [promoMessage, setPromoMessage] = useState("");
  const [resetConfirmation, setResetConfirmation] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [resetting, setResetting] = useState(false);
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState<"all" | OrderStatus>("all");
  const [uploadingCode, setUploadingCode] = useState<string | null>(null);
  const [sendingCode, setSendingCode] = useState<string | null>(null);
  const [orderActionMessage, setOrderActionMessage] = useState<Record<string, string>>({});
  const eventSourceRef = useRef<EventSource | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const savePricing = async () => {
    setPricingMessage("Menyimpan...");
    const res = await fetch("/api/admin/pricing", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pricing }) });
    setPricingMessage(res.ok ? "Harga berhasil disimpan." : "Harga gagal disimpan.");
  };

  const loadPromos = async () => {
    const res = await fetch("/api/admin/promo-codes");
    if (res.ok) setPromos((await res.json()).promos ?? []);
  };

  const savePromo = async () => {
    setPromoMessage("Menyimpan...");
    const res = await fetch("/api/admin/promo-codes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...promoForm, startsAt: new Date(promoForm.startsAt).toISOString(), expiresAt: new Date(promoForm.expiresAt).toISOString(), active: true }) });
    const data = await res.json();
    if (!res.ok) return setPromoMessage(data.error || "Kode promo gagal disimpan.");
    setPromoForm({ code: "", percent: 10, packageIds: ["hemat"], startsAt: "", expiresAt: "" });
    setPromoMessage("Kode promo tersimpan.");
    loadPromos();
  };

  const deletePromo = async (id: string) => {
    if (!window.confirm("Hapus kode promo ini?")) return;
    const res = await fetch(`/api/admin/promo-codes/${id}`, { method: "DELETE" });
    if (res.ok) loadPromos();
  };

  const savePaymentSettings = async () => {
    setPaymentMessage("Menyimpan...");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onlinePaymentEnabled, whatsappCsNumber, whatsappFallbackMessage }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Pengaturan gagal disimpan.");
      setOnlinePaymentEnabled(data.onlinePaymentEnabled);
      setWhatsappCsNumber(data.whatsappCsNumber);
      setWhatsappFallbackMessage(data.whatsappFallbackMessage);
      setPaymentMessage("Pengaturan pembayaran tersimpan.");
    } catch (error) {
      setPaymentMessage(error instanceof Error ? error.message : "Pengaturan gagal disimpan.");
    }
  };

  useEffect(() => {
    if (authStatus === "unauthenticated") router.replace("/login");
    else if ((session?.user as { role?: string })?.role !== "admin") router.replace("/");
  }, [authStatus, session, router]);

  const fetchAdminData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/orders", { cache: "no-store" });
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
      fetch("/api/admin/portfolio").then((res) => res.ok ? res.json() : null).then((data) => {
        if (data) setWorkJson(JSON.stringify(data.items, null, 2));
      }).catch(() => {});
      fetch("/api/admin/settings").then((res) => res.ok ? res.json() : null).then((data) => {
        if (!data) return;
        setOnlinePaymentEnabled(data.onlinePaymentEnabled === true);
        setWhatsappCsNumber(data.whatsappCsNumber ?? "");
        setWhatsappFallbackMessage(data.whatsappFallbackMessage ?? "");
      }).catch(() => {});
      fetch("/api/admin/pricing").then((res) => res.ok ? res.json() : null).then((data) => data?.pricing && setPricing(data.pricing)).catch(() => {});
      loadPromos().catch(() => {});
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

  const uploadDeliverable = async (code: string, file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      setOrderActionMessage((current) => ({ ...current, [code]: "Ukuran file maksimal 10 MB." }));
      return;
    }
    setUploadingCode(code);
    setOrderActionMessage((current) => ({ ...current, [code]: "Mengunggah project..." }));
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/admin/orders/${code}/deliverables`, { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload gagal.");
      await fetchAdminData();
      setOrderActionMessage((current) => ({ ...current, [code]: "File berhasil ditambahkan. Kamu bisa upload versi berikutnya atau kirim project." }));
    } catch (error) {
      setOrderActionMessage((current) => ({ ...current, [code]: error instanceof Error ? error.message : "Upload gagal." }));
    } finally {
      setUploadingCode(null);
    }
  };

  const sendProject = async (code: string) => {
    setSendingCode(code);
    setOrderActionMessage((current) => ({ ...current, [code]: "Mengirim project..." }));
    try {
      const res = await fetch(`/api/admin/orders/${code}/send`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Email gagal dikirim.");
      await fetchAdminData();
      setOrderActionMessage((current) => ({ ...current, [code]: `Project terkirim ke ${data.sentTo}.` }));
    } catch (error) {
      setOrderActionMessage((current) => ({ ...current, [code]: error instanceof Error ? error.message : "Email gagal dikirim." }));
    } finally {
      setSendingCode(null);
    }
  };

  const resetDatabase = async () => {
    if (resetConfirmation !== "RESET") return;
    setResetting(true);
    setResetMessage("");
    try {
      const res = await fetch("/api/admin/reset", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirmation: resetConfirmation }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Database gagal direset.");
      setResetConfirmation("");
      setResetMessage("Data aplikasi berhasil dihapus.");
      fetchAdminData();
      loadPromos();
    } catch (error) {
      setResetMessage(error instanceof Error ? error.message : "Database gagal direset.");
    } finally {
      setResetting(false);
    }
  };

  const visibleOrders = orders.filter((order) => {
    const search = orderSearch.trim().toLowerCase();
    const matchesSearch = !search || [order.code, order.service, order.customerName, order.customerEmail].some((value) => value?.toLowerCase().includes(search));
    return matchesSearch && (orderStatusFilter === "all" || order.status === orderStatusFilter);
  });

  if (authStatus === "loading" || (session?.user as { role?: string })?.role !== "admin") {
    return null;
  }

  return (
    <div className="admin-shell ui-shell min-h-screen text-[#17191f]">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <Topography
    lowColor="#3B82F6"
    midColor="#ffffff"
    highColor="#FFFFFF"
    speed={0.35}
    morphAmount={3}
    morphSpeed={0.05}
    bands={2}
    thickness={0.01}
    scale={2}
    pixelSize={1}
    glow={0.5}
    colorMode="elevation"
    contrast={3}
    brightness={1}
    fillBands={false}
    opacity={1}
    grain
    grainIntensity={0.05}
    mouseInteraction
    mouseRadius={0.3}
    mouseStrength={0.4}
  />
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-[#1A1A1E]/50 hover:text-[#1A1A1E]"
          >
            <ArrowLeft className="w-4 h-4" /> kookiez.
          </Link>
          <div className="flex items-center gap-3">
      
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="inline-flex items-center gap-1.5 text-sm text-[#1A1A1E]/50 hover:text-[#1A1A1E]"
            >
              <LogOut className="w-4 h-4" /> {t("admin_logout")}
            </button>
          </div>
        </div>

        <div className="mb-7 flex items-end justify-between gap-4 border-b border-black/[.08] pb-6">
          <div><p className="font-mono text-[10px] tracking-[.16em] text-[#0038FF]">WORKSPACE</p><h1 className="mt-1 font-heading text-3xl font-semibold tracking-[-.02em]">Admin Dashboard</h1></div>
          
        </div>

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
                  <input type="number" min="0" value={pricing[id as keyof PricingOverride].base ?? ""} disabled={id === "borongan"} onChange={(e) => setPricing((current) => ({ ...current, [id]: { ...current[id as keyof PricingOverride], base: e.target.value === "" ? null : Number(e.target.value) } }))} className="w-full rounded-lg border border-[#1A1A1E]/15 bg-[#F9F9FB] px-3 py-2.5 font-mono text-sm focus:border-[#0038FF] focus:outline-none" />
                  <input type="number" min="0" max="100" value={pricing[id as keyof PricingOverride].promoPercent} onChange={(e) => setPricing((current) => ({ ...current, [id]: { ...current[id as keyof PricingOverride], promoPercent: Number(e.target.value) } }))} className="w-24 rounded-lg border border-[#1A1A1E]/15 bg-[#F9F9FB] px-3 py-2.5 font-mono text-sm focus:border-[#0038FF] focus:outline-none" aria-label={`Promo ${label} persen`} />
                </div>
              </label>
            ))}
          </div>
          <div className="mt-5 flex items-center gap-3">
            <button onClick={savePricing} className="rounded-lg bg-[#0038FF] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#0030DB]">Simpan harga</button>
            {pricingMessage && <span className="text-xs text-[#1A1A1E]/55" role="status">{pricingMessage}</span>}
          </div>
        </section>

        <section className="mb-8 border border-[#1A1A1E]/10 rounded-xl p-6 bg-white">
          <p className="font-mono text-[10px] tracking-widest text-[#0038FF] mb-1">PROMO CODES</p>
          <h2 className="font-heading text-xl font-semibold mb-2">Kelola kode promo</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <input value={promoForm.code} onChange={(e) => setPromoForm((current) => ({ ...current, code: e.target.value }))} placeholder="Kode promo" className="rounded-lg border border-[#1A1A1E]/15 bg-[#F9F9FB] px-3 py-2.5 font-mono text-sm" />
            <input type="number" min="1" max="100" value={promoForm.percent} onChange={(e) => setPromoForm((current) => ({ ...current, percent: Number(e.target.value) }))} placeholder="Persen diskon" className="rounded-lg border border-[#1A1A1E]/15 bg-[#F9F9FB] px-3 py-2.5 font-mono text-sm" />
            <label className="grid gap-1 text-sm font-medium">Mulai berlaku<input type="datetime-local" value={promoForm.startsAt} onChange={(e) => setPromoForm((current) => ({ ...current, startsAt: e.target.value }))} className="rounded-lg border border-[#1A1A1E]/15 bg-[#F9F9FB] px-3 py-2.5 text-sm" /></label>
            <label className="grid gap-1 text-sm font-medium">Berakhir berlaku<input type="datetime-local" value={promoForm.expiresAt} onChange={(e) => setPromoForm((current) => ({ ...current, expiresAt: e.target.value }))} className="rounded-lg border border-[#1A1A1E]/15 bg-[#F9F9FB] px-3 py-2.5 text-sm" /></label>
          </div>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            {[["hemat", "Hemat"], ["standar", "Standar"], ["lengkap", "Paket Lengkap"]].map(([id, label]) => <label key={id} className="flex items-center gap-2"><input type="checkbox" checked={promoForm.packageIds.includes(id)} onChange={(e) => setPromoForm((current) => ({ ...current, packageIds: e.target.checked ? [...current.packageIds, id] : current.packageIds.filter((item) => item !== id) }))} />{label}</label>)}
          </div>
          <div className="mt-4 flex items-center gap-3"><button onClick={savePromo} disabled={!promoForm.code || !promoForm.startsAt || !promoForm.expiresAt || !promoForm.packageIds.length} className="rounded-lg bg-[#0038FF] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40">Tambah kode promo</button>{promoMessage && <span className="text-xs text-[#1A1A1E]/55" role="status">{promoMessage}</span>}</div>
          <div className="mt-5 space-y-2">
            {promos.map((promo) => <div key={promo._id} className="flex items-center justify-between gap-3 rounded-lg border border-[#1A1A1E]/10 px-3 py-2.5 text-sm"><span><strong className="font-mono">{promo.code}</strong> · {promo.percent}% · {promo.packageIds.join(", ")}<span className="block text-xs text-[#1A1A1E]/45">{new Date(promo.startsAt).toLocaleString("id-ID")} - {new Date(promo.expiresAt).toLocaleString("id-ID")}</span></span><button onClick={() => deletePromo(promo._id)} className="text-xs text-red-600 hover:underline">Hapus</button></div>)}
          </div>
        </section>

        <section className="mb-8 border border-[#1A1A1E]/10 rounded-xl p-6 bg-white">
          <p className="font-mono text-[10px] tracking-widest text-[#0038FF] mb-1">PAYMENT SETTINGS</p>
          <h2 className="font-heading text-xl font-semibold mb-2">Payment online</h2>
          <label className="flex items-center gap-3 text-sm font-medium mb-5">
            <input type="checkbox" checked={onlinePaymentEnabled} onChange={(event) => setOnlinePaymentEnabled(event.target.checked)} className="h-4 w-4 accent-[#0038FF]" />
            Payment online aktif
          </label>
          <div className="grid gap-4">
            <label className="grid gap-2 text-sm font-medium">
              Nomor WhatsApp CS
              <input value={whatsappCsNumber} onChange={(event) => setWhatsappCsNumber(event.target.value)} placeholder="628xxxxxxxxxx" className="rounded-lg border border-[#1A1A1E]/15 bg-[#F9F9FB] px-3 py-2.5 font-mono text-sm focus:border-[#0038FF] focus:outline-none" />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Pesan fallback
              <textarea value={whatsappFallbackMessage} onChange={(event) => setWhatsappFallbackMessage(event.target.value)} rows={3} className="rounded-lg border border-[#1A1A1E]/15 bg-[#F9F9FB] px-3 py-2.5 text-sm focus:border-[#0038FF] focus:outline-none" />
            </label>
          </div>
          <div className="mt-5 flex items-center gap-3">
            <button onClick={savePaymentSettings} className="rounded-lg bg-[#0038FF] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#0030DB]">Simpan pengaturan</button>
            {paymentMessage && <span className="text-xs text-[#1A1A1E]/55" role="status">{paymentMessage}</span>}
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

        <section className="mb-8 border border-red-200 rounded-xl p-5 bg-red-50/60">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="font-heading text-lg font-semibold text-red-900">Reset data aplikasi</h2>
              <p className="mt-1 text-sm text-red-800/75">Menghapus order, promo, pengaturan, portfolio, dan semua file GridFS. Akun admin tetap dipertahankan.</p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <input value={resetConfirmation} onChange={(event) => setResetConfirmation(event.target.value.toUpperCase())} placeholder="Ketik RESET" aria-label="Konfirmasi reset database" className="min-w-0 flex-1 rounded-lg border border-red-200 bg-white px-3 py-2.5 font-mono text-sm focus:border-red-500 focus:outline-none" />
                <button onClick={resetDatabase} disabled={resetting || resetConfirmation !== "RESET"} className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40">{resetting ? "Menghapus..." : "Hapus semua data"}</button>
              </div>
              {resetMessage && <p className="mt-2 text-xs text-red-800" role="status">{resetMessage}</p>}
            </div>
          </div>
        </section>

        {/* Orders Table */}
        <section className="admin-orders ui-panel overflow-hidden">
          <div className="px-6 py-5 border-b border-black/[.08]">
            <p className="font-mono text-[10px] tracking-widest text-[#0038FF]">
              ORDERS
            </p>
            <h2 className="font-heading text-2xl font-semibold mt-1 tracking-[-.02em]">
              Pesanan Masuk ({orders.length})
            </h2>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <input value={orderSearch} onChange={(event) => setOrderSearch(event.target.value)} placeholder="Cari kode, layanan, atau customer" className="min-w-0 flex-1 rounded-lg border border-[#1A1A1E]/15 bg-[#F9F9FB] px-3 py-2 text-sm" />
              <select value={orderStatusFilter} onChange={(event) => setOrderStatusFilter(event.target.value as "all" | OrderStatus)} className="rounded-lg border border-[#1A1A1E]/15 bg-white px-3 py-2 text-sm"><option value="all">Semua status</option><option value="pending">Pending</option><option value="progress">Progress</option><option value="review">Review</option><option value="done">Selesai</option></select>
            </div>
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
              {visibleOrders.map((order) => {
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

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-[#1A1A1E]/70">
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
                        <div className="text-[#1A1A1E]/40">Total</div>
                        <div className="font-medium">{order.finalAmount == null ? "Custom" : new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(order.finalAmount)}</div>
                      </div>
                      <div>
                        <div className="text-[#1A1A1E]/40">Bayar</div>
                        <div className="font-medium">{order.plan} · {order.method}</div>
                      </div>
                    </div>

                    <details className="mt-3 border-t border-[#1A1A1E]/8 pt-3 group">
                      <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-medium text-[#1A1A1E]/65 hover:text-[#0038FF]"><span>Lihat detail order</span><span className="text-[10px] text-[#98a2b3] group-open:hidden">Buka</span><span className="hidden text-[10px] text-[#98a2b3] group-open:inline">Tutup</span></summary>
                      <div className="mt-3 space-y-2 text-xs text-[#1A1A1E]/65">
                        <p><span className="text-[#1A1A1E]/40">Customer:</span> {order.customerName || "-"} {order.customerEmail ? `(${order.customerEmail})` : ""}</p>
                        {order.briefScope && <p><span className="text-[#1A1A1E]/40">Brief:</span> {order.briefScope}</p>}
                        <p><span className="text-[#1A1A1E]/40">Waktu:</span> {new Date(order.createdAt).toLocaleString("id-ID")}</p>
                        {order.promoCode && <p><span className="text-[#1A1A1E]/40">Promo:</span> <span className="font-mono text-[#0038FF]">{order.promoCode}</span></p>}
                        {order.deliverables?.length ? <div><span className="text-[#1A1A1E]/40">File project:</span><ul className="mt-1 list-inside list-disc">{order.deliverables.map((file) => <li key={file.id}>{file.name}</li>)}</ul></div> : <p className="text-[#98a2b3]">Belum ada file project.</p>}
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                      <label className={`inline-flex items-center gap-1.5 rounded-md border border-[#1A1A1E]/15 px-2.5 py-1.5 text-xs ${uploadingCode === order.code ? "cursor-wait opacity-60" : "cursor-pointer hover:border-[#0038FF]"}`}>
                        <Upload className="h-3.5 w-3.5" /> {uploadingCode === order.code ? "Mengunggah..." : "Upload project"}
                        <input type="file" accept={ALLOWED_FILE_ACCEPT} disabled={uploadingCode === order.code} className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) uploadDeliverable(order.code, file); event.currentTarget.value = ""; }} />
                      </label>
                      {!!order.deliverables?.length && <button disabled={sendingCode === order.code || uploadingCode === order.code} onClick={() => sendProject(order.code)} className="inline-flex items-center gap-1.5 rounded-md bg-[#0038FF] px-2.5 py-1.5 text-xs text-white hover:bg-[#0030DB] disabled:cursor-wait disabled:opacity-50"><Send className="h-3.5 w-3.5" /> {sendingCode === order.code ? "Mengirim..." : "Kirim project"}</button>}
                      {order.projectSentAt && <span className="text-xs text-green-700">Terkirim</span>}
                      </div>
                      {orderActionMessage[order.code] && <p className="mt-2 text-xs text-[#667085]" role="status">{orderActionMessage[order.code]}</p>}
                    </details>
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
