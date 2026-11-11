"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, LogOut, Plus, Minus, Volume2, VolumeX,
  Clock, Loader2, CheckCircle2, Eye, X, Upload, Send, Download,
} from "lucide-react";
import { useLang } from "@/lib/i18n";
import { DEFAULT_PRICING, type PricingOverride } from "@/lib/pricing";
import { ALLOWED_FILE_ACCEPT, MAX_FILE_SIZE } from "@/lib/file-constraints";
import LazyImage from "@/components/LazyImage";
import { Skeleton } from "@/components/Skeleton";

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
  paymentStatus?: string;
  dpAmount?: number | null;
  remainingAmount?: number | null;
  paidAmount?: number;
  paymentHistory?: Array<{ id: string; action: string; amount: number | null; note: string; actor: string; createdAt: string; proofId?: string }>;
}

interface QueueInfo {
  maxSlots: number;
  activeSlots: number;
  availableSlots: number;
  note: string;
}

const PORTFOLIO_CATEGORIES = [
  { value: "logo", label: "Desain Logo" },
  { value: "banner", label: "Banner & Spanduk" },
  { value: "poster", label: "Poster" },
  { value: "flyer", label: "Flyer" },
  { value: "brosur", label: "Brosur" },
] as const;
type PortfolioCategory = (typeof PORTFOLIO_CATEGORIES)[number]["value"];
type AdminTab = "overview" | "orders" | "pricing" | "promo" | "payments" | "queue" | "portfolio" | "settings";

interface PortfolioItem {
  id: string;
  judul: string;
  klien: string;
  klienSamaran: boolean;
  kategori: PortfolioCategory;
  imageId: string;
  deskripsi: string;
  createdAt: string;
}

function portfolioCategoryLabel(value: string) {
  return PORTFOLIO_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

const adminStatusLabels: Record<OrderStatus, string> = {
  pending: "Menunggu konfirmasi",
  progress: "Sedang dikerjakan",
  review: "Menunggu review",
  done: "Selesai",
};

function statusMeta(status: OrderStatus) {
  const map = {
    pending: { label: adminStatusLabels.pending, icon: Clock, tone: "badge-pending" },
    progress: { label: adminStatusLabels.progress, icon: Loader2, tone: "badge-accent" },
    review: { label: adminStatusLabels.review, icon: Eye, tone: "badge-review" },
    done: { label: adminStatusLabels.done, icon: CheckCircle2, tone: "badge-success" },
  } as const;
  return map[status];
}

const paymentLabels: Record<string, { label: string; tone: string }> = {
  dp_pending: { label: "Menunggu DP", tone: "badge-pending" },
  dp_paid: { label: "DP Diterima", tone: "badge-accent" },
  settlement_pending: { label: "Menunggu Pelunasan", tone: "badge-pending" },
  pending: { label: "Menunggu Bayar", tone: "badge-pending" },
  paid: { label: "Lunas", tone: "badge-success" },
  rejected: { label: "Ditolak", tone: "badge-danger" },
  manual_contact_required: { label: "Menunggu Bayar", tone: "badge-pending" },
};

const paymentActionLabels: Record<string, string> = {
  submit_dp: "Pengajuan DP",
  submit_full: "Pengajuan pembayaran",
  submit_settlement: "Pengajuan pelunasan",
  confirm_dp: "DP Dikonfirmasi",
  confirm_full: "Pembayaran Dikonfirmasi",
  confirm_settlement: "Pelunasan Dikonfirmasi",
  reject: "Pembayaran Ditolak",
};

export default function AdminPage() {
  const { t } = useLang();
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [tab, setTab] = useState<AdminTab>("orders");

  const [orders, setOrders] = useState<OrderData[]>([]);
  const [queueInfo, setQueueInfo] = useState<QueueInfo>({
    maxSlots: 9,
    activeSlots: 0,
    availableSlots: 9,
    note: "",
  });
  const [note, setNote] = useState("");
  const [workItems, setWorkItems] = useState<PortfolioItem[]>([]);
  const [workItemsLoading, setWorkItemsLoading] = useState(false);
  const [workItemsError, setWorkItemsError] = useState("");
  const [workMessage, setWorkMessage] = useState("");
  const [workError, setWorkError] = useState("");
  const [workSaving, setWorkSaving] = useState(false);
  const [workDeletingId, setWorkDeletingId] = useState<string | null>(null);
  const [workForm, setWorkForm] = useState<{ judul: string; klien: string; deskripsi: string; kategori: PortfolioCategory; klienSamaran: boolean }>({
    judul: "",
    klien: "",
    deskripsi: "",
    kategori: "logo",
    klienSamaran: false,
  });
  const [workImageFile, setWorkImageFile] = useState<File | null>(null);
  const [workImagePreview, setWorkImagePreview] = useState<string | null>(null);
  const workImageInputRef = useRef<HTMLInputElement>(null);
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
    else if (authStatus === "authenticated" && (session?.user as { role?: string })?.role !== "admin") {
      router.replace("/");
    }
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

  const fetchPortfolioItems = useCallback(async () => {
    setWorkItemsLoading(true);
    setWorkItemsError("");
    try {
      const res = await fetch("/api/admin/portfolio", { cache: "no-store" });
      if (!res.ok) throw new Error("Gagal memuat daftar karya.");
      const data = await res.json();
      setWorkItems(data.items ?? []);
    } catch (error) {
      console.error("Failed to fetch admin portfolio:", error);
      setWorkItemsError("Daftar karya gagal dimuat. Coba muat ulang.");
    } finally {
      setWorkItemsLoading(false);
    }
  }, []);

  useEffect(() => {
    if ((session?.user as { role?: string })?.role === "admin") {
      fetchAdminData();
      void fetchPortfolioItems();
      fetch("/api/admin/settings").then((res) => res.ok ? res.json() : null).then((data) => {
        if (!data) return;
        setOnlinePaymentEnabled(data.onlinePaymentEnabled === true);
        setWhatsappCsNumber(data.whatsappCsNumber ?? "");
        setWhatsappFallbackMessage(data.whatsappFallbackMessage ?? "");
      }).catch(() => {});
      fetch("/api/admin/pricing").then((res) => res.ok ? res.json() : null).then((data) => data?.pricing && setPricing(data.pricing)).catch(() => {});
      loadPromos().catch(() => {});
    }
  }, [session, fetchAdminData, fetchPortfolioItems]);

  const handleWorkImageChange = (file: File | null) => {
    setWorkImageFile(file);
    if (workImagePreview) URL.revokeObjectURL(workImagePreview);
    setWorkImagePreview(file ? URL.createObjectURL(file) : null);
  };

  const resetWorkForm = () => {
    setWorkForm({ judul: "", klien: "", deskripsi: "", kategori: "logo", klienSamaran: false });
    handleWorkImageChange(null);
    if (workImageInputRef.current) workImageInputRef.current.value = "";
  };

  const addWorkItem = async () => {
    setWorkError("");
    setWorkMessage("");
    if (!workForm.judul.trim() || !workForm.klien.trim()) {
      setWorkError("Judul dan nama klien wajib diisi.");
      return;
    }
    if (!workImageFile) {
      setWorkError("Pilih gambar karya terlebih dahulu.");
      return;
    }
    setWorkSaving(true);
    try {
      const formData = new FormData();
      formData.append("judul", workForm.judul.trim());
      formData.append("klien", workForm.klien.trim());
      formData.append("deskripsi", workForm.deskripsi.trim());
      formData.append("kategori", workForm.kategori);
      formData.append("klienSamaran", String(workForm.klienSamaran));
      formData.append("image", workImageFile);
      const res = await fetch("/api/admin/portfolio", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setWorkItems(data.items);
      setWorkMessage("Karya baru berhasil ditambahkan.");
      resetWorkForm();
    } catch (error) {
      setWorkError(error instanceof Error ? error.message : "Gagal menambah karya.");
    } finally {
      setWorkSaving(false);
    }
  };

  const deleteWorkItem = async (id: string) => {
    setWorkError("");
    setWorkMessage("");
    setWorkDeletingId(id);
    try {
      const res = await fetch(`/api/admin/portfolio?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setWorkItems(data.items);
      setWorkMessage("Karya berhasil dihapus.");
    } catch (error) {
      setWorkError(error instanceof Error ? error.message : "Gagal menghapus karya.");
    } finally {
      setWorkDeletingId(null);
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

  const confirmPayment = async (code: string, action: string) => {
    const note = action === "reject" ? window.prompt("Alasan penolakan (opsional):") ?? "" : "";
    setOrderActionMessage((current) => ({ ...current, [code]: "Memproses pembayaran..." }));
    try {
      const res = await fetch(`/api/admin/orders/${code}/payment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memproses pembayaran.");
      await fetchAdminData();
      setOrderActionMessage((current) => ({ ...current, [code]: "Status pembayaran diperbarui." }));
    } catch (error) {
      setOrderActionMessage((current) => ({ ...current, [code]: error instanceof Error ? error.message : "Gagal memproses pembayaran." }));
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

  if (authStatus === "loading") {
    return (
      <main className="ui-shell flex min-h-screen items-center justify-center text-ink">
        <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.12em] text-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Memuat admin desk
        </div>
      </main>
    );
  }

  if ((session?.user as { role?: string })?.role !== "admin") {
    return null;
  }

  return (
    <div className="ui-shell min-h-screen text-ink">
      <div className="mx-auto max-w-page px-5 py-8 sm:px-7 sm:py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="inline-flex min-h-[44px] items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink">
            <ArrowLeft className="h-4 w-4" /> kookiez.
          </Link>
          <div className="flex items-center gap-2">
            <span className="stamp">Admin desk</span>
            <button
              type="button"
              onClick={() => setSoundEnabled((value) => !value)}
              aria-pressed={soundEnabled}
              aria-label={soundEnabled ? "Matikan suara notifikasi" : "Nyalakan suara notifikasi"}
              title={soundEnabled ? "Suara notifikasi aktif" : "Suara notifikasi mati"}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-card text-muted hover:text-ink"
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-2 text-sm text-muted transition-colors hover:text-ink"
            >
              <LogOut className="h-4 w-4" /> {t("admin_logout")}
            </button>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="kicker mb-2">Workspace</p>
            <h1 className="display text-[clamp(2.4rem,5vw,4rem)]">Admin dashboard.</h1>
            <p className="mt-2 text-sm text-muted">
              Masuk sebagai <span className="font-medium text-ink">{session?.user?.email}</span>
            </p>
          </div>
          <span className="stamp stamp-accent">{orders.length} order tercatat</span>
        </div>

        <nav
          className="mt-7 flex flex-wrap gap-x-5 border-b border-line pb-0"
          aria-label="Bagian admin"
        >
          {(
            [
              { id: "overview", label: "Overview" },
              { id: "orders", label: "Orders" },
              { id: "pricing", label: "Pricing" },
              { id: "promo", label: "Promo" },
              { id: "payments", label: "Payments" },
              { id: "queue", label: "Queue" },
              { id: "portfolio", label: "Portfolio" },
              { id: "settings", label: "Settings" },
            ] as { id: AdminTab; label: string }[]
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              aria-current={tab === item.id ? "page" : undefined}
              className="admin-tab"
              data-active={tab === item.id}
            >
              {item.label}
              {item.id === "orders" && <span className="font-mono text-[11px] text-muted">{orders.length}</span>}
            </button>
          ))}
        </nav>

        <div className="pt-8">
        {tab === "pricing" && (
<section className="ui-panel p-5 sm:p-6">
          <p className="font-mono text-[11px] tracking-widest text-accent mb-1">PRICE SETTINGS</p>
          <h2 className="font-heading text-xl font-semibold mb-2">Atur estimasi harga</h2>
          <p className="text-sm text-muted mb-5">Harga ini langsung dipakai kalkulator dan form pemesanan.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {[["hemat", "Hemat"], ["standar", "Standar"], ["lengkap", "Paket Lengkap"], ["borongan", "Borongan / Custom"]].map(([id, label]) => (
              <label key={id} className="grid gap-2 text-sm font-medium">
                {label}
                <div className="flex items-center gap-2">
                  <span className="text-muted">Rp</span>
                  <input type="number" min="0" value={pricing[id as keyof PricingOverride].base ?? ""} disabled={id === "borongan"} onChange={(e) => setPricing((current) => ({ ...current, [id]: { ...current[id as keyof PricingOverride], base: e.target.value === "" ? null : Number(e.target.value) } }))} className="w-full rounded-lg border border-line bg-paper px-3 py-2.5 font-mono text-sm focus:border-accent focus:outline-none" />
                  <input type="number" min="0" max="100" value={pricing[id as keyof PricingOverride].promoPercent} onChange={(e) => setPricing((current) => ({ ...current, [id]: { ...current[id as keyof PricingOverride], promoPercent: Number(e.target.value) } }))} className="w-24 rounded-lg border border-line bg-paper px-3 py-2.5 font-mono text-sm focus:border-accent focus:outline-none" aria-label={`Promo ${label} persen`} />
                </div>
              </label>
            ))}
          </div>
          <div className="mt-5 flex items-center gap-3">
            <button onClick={savePricing} className="rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-strong">Simpan harga</button>
            {pricingMessage && <span className="text-xs text-muted" role="status">{pricingMessage}</span>}
          </div>
        </section>
        )}


        {tab === "promo" && (
<section className="ui-panel p-5 sm:p-6">
          <p className="font-mono text-[11px] tracking-widest text-accent mb-1">PROMO CODES</p>
          <h2 className="font-heading text-xl font-semibold mb-2">Kelola kode promo</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <input value={promoForm.code} onChange={(e) => setPromoForm((current) => ({ ...current, code: e.target.value }))} placeholder="Kode promo" className="rounded-lg border border-line bg-paper px-3 py-2.5 font-mono text-sm" />
            <input type="number" min="1" max="100" value={promoForm.percent} onChange={(e) => setPromoForm((current) => ({ ...current, percent: Number(e.target.value) }))} placeholder="Persen diskon" className="rounded-lg border border-line bg-paper px-3 py-2.5 font-mono text-sm" />
            <label className="grid gap-1 text-sm font-medium">Mulai berlaku<input type="datetime-local" value={promoForm.startsAt} onChange={(e) => setPromoForm((current) => ({ ...current, startsAt: e.target.value }))} className="rounded-lg border border-line bg-paper px-3 py-2.5 text-sm" /></label>
            <label className="grid gap-1 text-sm font-medium">Berakhir berlaku<input type="datetime-local" value={promoForm.expiresAt} onChange={(e) => setPromoForm((current) => ({ ...current, expiresAt: e.target.value }))} className="rounded-lg border border-line bg-paper px-3 py-2.5 text-sm" /></label>
          </div>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            {[["hemat", "Hemat"], ["standar", "Standar"], ["lengkap", "Paket Lengkap"]].map(([id, label]) => <label key={id} className="flex items-center gap-2"><input type="checkbox" checked={promoForm.packageIds.includes(id)} onChange={(e) => setPromoForm((current) => ({ ...current, packageIds: e.target.checked ? [...current.packageIds, id] : current.packageIds.filter((item) => item !== id) }))} />{label}</label>)}
          </div>
          <div className="mt-4 flex items-center gap-3"><button onClick={savePromo} disabled={!promoForm.code || !promoForm.startsAt || !promoForm.expiresAt || !promoForm.packageIds.length} className="rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40">Tambah kode promo</button>{promoMessage && <span className="text-xs text-muted" role="status">{promoMessage}</span>}</div>
          <div className="mt-5 space-y-2">
            {promos.map((promo) => <div key={promo._id} className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2.5 text-sm"><span><strong className="font-mono">{promo.code}</strong> · {promo.percent}% · {promo.packageIds.join(", ")}<span className="block text-xs text-muted">{new Date(promo.startsAt).toLocaleString("id-ID")} - {new Date(promo.expiresAt).toLocaleString("id-ID")}</span></span><button onClick={() => deletePromo(promo._id)} className="text-xs text-danger hover:underline">Hapus</button></div>)}
          </div>
        </section>
        )}


        {tab === "payments" && (
<section className="ui-panel p-5 sm:p-6">
          <p className="font-mono text-[11px] tracking-widest text-accent mb-1">PAYMENT SETTINGS</p>
          <h2 className="font-heading text-xl font-semibold mb-2">Payment online</h2>
          <label className="flex items-center gap-3 text-sm font-medium mb-5">
            <input type="checkbox" checked={onlinePaymentEnabled} onChange={(event) => setOnlinePaymentEnabled(event.target.checked)} className="h-4 w-4 accent-accent" />
            Payment online aktif
          </label>
          <div className="grid gap-4">
            <label className="grid gap-2 text-sm font-medium">
              Nomor WhatsApp CS
              <input value={whatsappCsNumber} onChange={(event) => setWhatsappCsNumber(event.target.value)} placeholder="628xxxxxxxxxx" className="rounded-lg border border-line bg-paper px-3 py-2.5 font-mono text-sm focus:border-accent focus:outline-none" />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Pesan fallback
              <textarea value={whatsappFallbackMessage} onChange={(event) => setWhatsappFallbackMessage(event.target.value)} rows={3} className="rounded-lg border border-line bg-paper px-3 py-2.5 text-sm focus:border-accent focus:outline-none" />
            </label>
          </div>
          <div className="mt-5 flex items-center gap-3">
            <button onClick={savePaymentSettings} className="rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-strong">Simpan pengaturan</button>
            {paymentMessage && <span className="text-xs text-muted" role="status">{paymentMessage}</span>}
          </div>
        </section>
        )}


        {/* Sales snapshot */}
        {tab === "overview" && (
<section className="mb-8 grid gap-3 sm:grid-cols-3">
          {[
            ["Total pesanan", orders.length.toString()],
            ["Sedang berjalan", orders.filter((order) => order.status !== "done").length.toString()],
            ["Pendapatan tercatat", new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(orders.reduce((sum, order) => sum + (order.amount ?? 0), 0))],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-line bg-card p-5">
              <p className="text-xs text-muted">{label}</p>
              <p className="mt-2 font-mono text-2xl font-semibold text-accent">{value}</p>
            </div>
          ))}
        </section>
        )}


        {/* Slot Management Panel */}
        {(tab === "queue" || tab === "overview") && (
<section className="ui-panel p-5 sm:p-6">
          <p className="font-mono text-[11px] tracking-widest text-accent mb-1">
            QUEUE CONTROL
          </p>
          <h2 className="font-heading text-xl font-semibold mb-5">
            Manajemen Slot Antrean
          </h2>

          <div className="grid sm:grid-cols-3 gap-4 mb-5">
            <div className="text-center p-4 rounded-lg bg-accent/5 border border-accent/10">
              <div className="text-3xl font-mono font-bold text-accent">
                {queueInfo.maxSlots}
              </div>
              <div className="text-xs text-muted mt-1">Total Slot</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-pending/5 border border-pending/20">
              <div className="text-3xl font-mono font-bold text-pending">
                {queueInfo.activeSlots}
              </div>
              <div className="text-xs text-muted mt-1">Terisi</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-success/5 border border-success/20">
              <div className="text-3xl font-mono font-bold text-success">
                {queueInfo.availableSlots}
              </div>
              <div className="text-xs text-muted mt-1">Tersedia</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => updateSlots(-1)}
              disabled={updatingSlot || queueInfo.maxSlots <= 1}
              aria-label="Kurangi slot"
              className="flex h-11 w-11 items-center justify-center rounded-lg border border-line transition-colors hover:border-ink/30 disabled:opacity-40"
            >
              <Minus className="w-4 h-4" />
            </button>
            <div className="flex-1 text-center">
              <span className="font-mono text-lg font-semibold">
                {queueInfo.maxSlots}
              </span>
              <span className="text-xs text-muted ml-2">slot</span>
            </div>
            <button
              onClick={() => updateSlots(1)}
              disabled={updatingSlot}
              aria-label="Tambah slot"
              className="flex h-11 w-11 items-center justify-center rounded-lg border border-line transition-colors hover:border-ink/30 disabled:opacity-40"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          {slotMessage && (
            <p className="mt-3 text-xs text-muted" role="status">{slotMessage}</p>
          )}

          <div className="mt-4 flex gap-2">
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Catatan antrean (tampil di landing page)..."
              className="flex-1 border border-line rounded-lg px-3 py-2.5 text-sm"
            />
            <button
              onClick={saveNote}
              className="bg-ink text-white rounded-lg px-4 py-2.5 text-sm font-medium shrink-0"
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
                      ? "bg-accent"
                      : "bg-ink/10"
                  }`}
                />
              ))}
            </div>
          </div>
        </section>
        )}


        {tab === "portfolio" && (
<section className="ui-panel p-5 sm:p-6">
          <p className="font-mono text-[11px] tracking-widest text-accent mb-1">CONTENT CONFIG</p>
          <h2 className="font-heading text-xl font-semibold mb-3">Karya Kami</h2>
          <p className="text-sm text-muted mb-5">Tambahkan karya baru dengan mengunggah gambar, lalu isi nama klien, judul, dan deskripsinya. Tidak perlu format JSON.</p>

          {/* Form tambah karya */}
          <div className="rounded-lg border border-line bg-paper p-4 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-muted mb-1.5">Gambar karya</label>
                <div className="flex items-center gap-3">
                  {workImagePreview ? (
                    <LazyImage
                      src={workImagePreview}
                      alt="Pratinjau"
                      loading="eager"
                      className="h-20 w-20 shrink-0 rounded-lg border border-line"
                      imageClassName="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-20 w-20 rounded-lg border border-dashed border-line flex items-center justify-center shrink-0 text-muted">
                      <Upload className="h-5 w-5" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <input
                      ref={workImageInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={(e) => handleWorkImageChange(e.target.files?.[0] ?? null)}
                      className="block w-full text-xs text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-accent file:px-3 file:py-2 file:text-xs file:font-medium file:text-white hover:file:bg-accent/90"
                    />
                    <p className="mt-1 text-[11px] text-muted">JPG, PNG, WEBP, atau GIF. Maks 4 MB.</p>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1.5">Nama klien pemesan</label>
                <input
                  value={workForm.klien}
                  onChange={(e) => setWorkForm((f) => ({ ...f, klien: e.target.value }))}
                  placeholder="cth. Warung Kopi Rindu"
                  className="w-full rounded-lg border border-line bg-card px-3 py-2.5 text-sm focus:outline-none focus:border-accent"
                />
                <label className="mt-2 flex items-center gap-2 text-xs text-muted">
                  <input
                    type="checkbox"
                    checked={workForm.klienSamaran}
                    onChange={(e) => setWorkForm((f) => ({ ...f, klienSamaran: e.target.checked }))}
                    className="h-3.5 w-3.5 rounded border-ink/30 text-accent focus:ring-accent"
                  />
                  Nama di atas adalah samaran (klien tidak ingin nama aslinya tampil publik)
                </label>
                {workForm.klienSamaran && (
                  <p className="mt-1 text-[11px] text-muted">Di halaman publik, nama klien akan diganti menjadi &quot;Klien Rahasia&quot;.</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1.5">Judul karya</label>
                <input
                  value={workForm.judul}
                  onChange={(e) => setWorkForm((f) => ({ ...f, judul: e.target.value }))}
                  placeholder="cth. Logo Kedai Kopi Modern"
                  className="w-full rounded-lg border border-line bg-card px-3 py-2.5 text-sm focus:outline-none focus:border-accent"
                />
                <label className="block text-xs font-medium text-muted mb-1.5 mt-3">Kategori</label>
                <select
                  value={workForm.kategori}
                  onChange={(e) => setWorkForm((f) => ({ ...f, kategori: e.target.value as PortfolioCategory }))}
                  className="w-full rounded-lg border border-line bg-card px-3 py-2.5 text-sm focus:outline-none focus:border-accent"
                >
                  {PORTFOLIO_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-muted mb-1.5">Deskripsi</label>
                <textarea
                  value={workForm.deskripsi}
                  onChange={(e) => setWorkForm((f) => ({ ...f, deskripsi: e.target.value }))}
                  rows={3}
                  placeholder="Ceritakan singkat tentang karya ini..."
                  className="w-full rounded-lg border border-line bg-card px-3 py-2.5 text-sm leading-relaxed focus:outline-none focus:border-accent"
                />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={addWorkItem}
                disabled={workSaving}
                className="inline-flex items-center gap-2 bg-accent text-white rounded-lg px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
              >
                {workSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {workSaving ? "Menyimpan..." : "Tambah Karya"}
              </button>
              {workError && <p className="text-sm text-danger">{workError}</p>}
              {!workError && workMessage && <p className="text-sm text-accent">{workMessage}</p>}
            </div>
          </div>

          {/* Daftar karya tersimpan */}
          {workItemsLoading ? (
            <div
              role="status"
              aria-label="Memuat daftar karya"
              aria-busy="true"
              className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
            >
              {Array.from({ length: 3 }, (_, index) => (
                <div key={index} aria-hidden="true" className="overflow-hidden rounded-lg border border-line bg-card">
                  <Skeleton className="h-32 w-full rounded-none" />
                  <div className="space-y-2 p-3">
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : workItemsError ? (
            <div className="flex flex-wrap items-center gap-3 text-sm text-danger" role="alert">
              <span>{workItemsError}</span>
              <button type="button" onClick={() => void fetchPortfolioItems()} className="font-medium underline">
                Coba lagi
              </button>
            </div>
          ) : workItems.length === 0 ? (
            <p className="text-sm text-muted">Belum ada karya yang ditambahkan lewat form ini.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {workItems.map((item) => (
                <div key={item.id} className="relative rounded-lg border border-line overflow-hidden bg-card">
                  <button
                    onClick={() => deleteWorkItem(item.id)}
                    disabled={workDeletingId === item.id}
                    aria-label={`Hapus karya ${item.judul}`}
                    className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-ink/50 hover:bg-danger text-white flex items-center justify-center transition-colors disabled:opacity-50"
                  >
                    {workDeletingId === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                  </button>
                  <LazyImage
                    src={`/api/portfolio/image/${item.imageId}`}
                    alt={item.judul}
                    className="h-32 w-full"
                    imageClassName="h-full w-full object-cover"
                  />
                  <div className="p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="font-mono text-[11px] tracking-widest text-accent bg-accent/5 border border-accent/20 rounded-full px-2 py-0.5">
                        {portfolioCategoryLabel(item.kategori).toUpperCase()}
                      </span>
                      {item.klienSamaran && (
                        <span className="font-mono text-[11px] tracking-widest text-pending bg-pending/5 border border-pending/30 rounded-full px-2 py-0.5">
                          SAMARAN
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-ink truncate">{item.judul}</p>
                    <p className="text-xs text-muted truncate">{item.klien}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
        )}


        {tab === "settings" && (
<section className="ui-panel !border-danger/30 !bg-danger/5 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="font-heading text-lg font-semibold text-danger">Reset data aplikasi</h2>
              <p className="mt-1 text-sm text-danger/80">Menghapus order, promo, pengaturan, portfolio, dan semua file GridFS. Akun admin tetap dipertahankan.</p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <input value={resetConfirmation} onChange={(event) => setResetConfirmation(event.target.value.toUpperCase())} placeholder="Ketik RESET" aria-label="Konfirmasi reset database" className="min-w-0 flex-1 rounded-lg border border-danger/30 bg-card px-3 py-2.5 font-mono text-sm focus:border-red-500 focus:outline-none" />
                <button onClick={resetDatabase} disabled={resetting || resetConfirmation !== "RESET"} className="inline-flex items-center justify-center gap-2 rounded-lg bg-danger px-4 py-2.5 text-sm font-medium text-white hover:bg-danger/90 disabled:cursor-not-allowed disabled:opacity-40">{resetting ? "Menghapus..." : "Hapus semua data"}</button>
              </div>
              {resetMessage && <p className="mt-2 text-xs text-danger" role="status">{resetMessage}</p>}
            </div>
          </div>
        </section>
        )}


        {/* Orders Table */}
        {tab === "orders" && (
<section className="admin-orders ui-panel overflow-hidden">
          <div className="px-6 py-5 border-b border-line">
            <p className="font-mono text-[11px] tracking-widest text-accent">
              ORDERS
            </p>
            <h2 className="font-heading text-2xl font-semibold mt-1 tracking-[-.02em]">
              Pesanan Masuk ({orders.length})
            </h2>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <input value={orderSearch} onChange={(event) => setOrderSearch(event.target.value)} placeholder="Cari kode, layanan, atau customer" className="min-h-[44px] min-w-0 flex-1 rounded-lg border border-line bg-paper px-3 py-2 text-sm" />
              <a href={`/api/admin/orders/export?search=${encodeURIComponent(orderSearch)}&status=${orderStatusFilter}`} className="inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-lg border border-line bg-card px-3 py-2 text-sm font-medium text-ink hover:border-accent hover:text-accent"><Download className="h-4 w-4" /> Export CSV</a>
              <select value={orderStatusFilter} onChange={(event) => setOrderStatusFilter(event.target.value as "all" | OrderStatus)} className="min-h-[44px] rounded-lg border border-line bg-card px-3 py-2 text-sm"><option value="all">Semua status</option><option value="pending">Pending</option><option value="progress">Progress</option><option value="review">Review</option><option value="done">Selesai</option></select>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-sm text-muted">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
              Memuat data...
            </div>
          ) : orders.length === 0 ? (
            <p className="p-12 text-center text-sm text-muted">
              Belum ada pesanan masuk.
            </p>
          ) : (
            <div className="divide-y divide-line">
              {visibleOrders.length === 0 && (
                <p className="p-12 text-center text-sm text-muted">Tidak ada order yang cocok dengan filter.</p>
              )}
              {visibleOrders.map((order) => {
                const meta = statusMeta(order.status);
                const Icon = meta.icon;
                return (
                  <div key={order.code} className="px-6 py-4">
                    <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <span className="shrink-0 font-mono text-sm font-semibold text-accent">
                          {order.code}
                        </span>
                        <span className={`badge ${meta.tone}`}>
                          <Icon
                            className={`h-3 w-3 ${
                              order.status === "progress" ? "animate-spin" : ""
                            }`}
                          />
                          {meta.label}
                        </span>
                        {(() => {
                          const pm = paymentLabels[order.paymentStatus ?? "pending"] ?? paymentLabels.pending;
                          return <span className={`badge ${pm.tone}`}>{pm.label}</span>;
                        })()}
                        {order.queuePosition && (
                          <span className="text-xs font-mono text-muted">
                            #{order.queuePosition}
                          </span>
                        )}
                      </div>
                      <select
                        value={order.status}
                        onChange={(e) =>
                          changeStatus(order.code, e.target.value as OrderStatus)
                        }
                        className="min-h-[44px] rounded-md border border-line bg-card px-2 py-1.5 font-mono text-xs"
                      >
                        <option value="pending">{adminStatusLabels.pending}</option>
                        <option value="progress">{adminStatusLabels.progress}</option>
                        <option value="review">{adminStatusLabels.review}</option>
                        <option value="done">{adminStatusLabels.done}</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-muted">
                      <div>
                        <div className="text-muted">Layanan</div>
                        <div className="font-medium">{order.service || "—"}</div>
                      </div>
                      <div>
                        <div className="text-muted">Budget</div>
                        <div className="font-medium">{order.budgetLabel || "—"}</div>
                      </div>
                      <div>
                        <div className="text-muted">Tenggat</div>
                        <div className="font-medium">{order.deadline || "—"}</div>
                      </div>
                      <div>
                        <div className="text-muted">Total</div>
                        <div className="font-medium">{order.finalAmount == null ? "Custom" : new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(order.finalAmount)}</div>
                      </div>
                      <div>
                        <div className="text-muted">Bayar</div>
                        <div className="font-medium">{order.plan} · {order.method}</div>
                      </div>
                      {order.dpAmount != null && (
                        <div>
                          <div className="text-muted">DP</div>
                          <div className="font-medium">
                            {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(order.dpAmount)}
                          </div>
                        </div>
                      )}
                      {order.remainingAmount != null && order.remainingAmount > 0 && (
                        <div>
                          <div className="text-muted">Sisa</div>
                          <div className="font-medium">
                            {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(order.remainingAmount)}
                          </div>
                        </div>
                      )}
                      {(order.paidAmount ?? 0) > 0 && (
                        <div>
                          <div className="text-muted">Terbayar</div>
                          <div className="font-medium text-success">
                            {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(order.paidAmount ?? 0)}
                          </div>
                        </div>
                      )}
                    </div>

                    <details className="mt-3 border-t border-line pt-3 group">
                      <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between text-xs font-medium text-muted hover:text-accent"><span>Lihat detail order</span><span className="text-[11px] text-muted group-open:hidden">Buka</span><span className="hidden text-[11px] text-muted group-open:inline">Tutup</span></summary>
                      <div className="mt-3 space-y-2 text-xs text-muted">
                        <p><span className="text-muted">Customer:</span> {order.customerName || "-"} {order.customerEmail ? `(${order.customerEmail})` : ""}</p>
                        {order.briefScope && <p><span className="text-muted">Brief:</span> {order.briefScope}</p>}
                        <p><span className="text-muted">Waktu:</span> {new Date(order.createdAt).toLocaleString("id-ID")}</p>
                        {order.promoCode && <p><span className="text-muted">Promo:</span> <span className="font-mono text-accent">{order.promoCode}</span></p>}
                        {order.deliverables?.length ? <div><span className="text-muted">File project:</span><ul className="mt-1 list-inside list-disc">{order.deliverables.map((file) => <li key={file.id}>{file.name}</li>)}</ul></div> : <p className="text-muted">Belum ada file project.</p>}
                      </div>
                      
                      {order.paymentHistory && order.paymentHistory.length > 0 && (
                        <div className="mt-3 border-t border-line pt-3">
                          <span className="text-muted text-xs font-semibold">Riwayat Pembayaran</span>
                          <ul className="mt-1 space-y-1">
                            {order.paymentHistory.map((ph) => (
                              <li key={ph.id} className="text-xs text-muted">
                                <span className="font-medium">{paymentActionLabels[ph.action] ?? paymentLabels[ph.action]?.label ?? ph.action}</span>
                                {ph.amount != null && <> — Rp {ph.amount.toLocaleString("id-ID")}</>}
                                {ph.note && <> ({ph.note})</>}
                                {ph.proofId && <a href={`/api/files/${ph.proofId}`} target="_blank" rel="noreferrer" className="ml-2 text-accent underline">Lihat bukti</a>}
                                <span className="block text-[11px] text-muted">{new Date(ph.createdAt).toLocaleString("id-ID")} · {ph.actor}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {order.paymentStatus === "dp_pending" && (
                          <div className="flex flex-wrap items-center gap-2 mb-2 w-full">
                            <button onClick={() => confirmPayment(order.code, "confirm_dp")} className="inline-flex items-center gap-1.5 rounded-md bg-success px-2.5 py-1.5 text-xs text-white hover:bg-success/90">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Konfirmasi DP
                            </button>
                            <button onClick={() => confirmPayment(order.code, "reject")} className="inline-flex items-center gap-1.5 rounded-md border border-danger/30 px-2.5 py-1.5 text-xs text-danger hover:bg-danger/5">
                              <X className="h-3.5 w-3.5" /> Batalkan
                            </button>
                          </div>
                        )}
                        {order.paymentStatus === "pending" && (
                          <div className="flex flex-wrap items-center gap-2 mb-2 w-full">
                            <button onClick={() => confirmPayment(order.code, "confirm_full")} className="inline-flex items-center gap-1.5 rounded-md bg-success px-2.5 py-1.5 text-xs text-white hover:bg-success/90">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Konfirmasi Pembayaran
                            </button>
                            <button onClick={() => confirmPayment(order.code, "reject")} className="inline-flex items-center gap-1.5 rounded-md border border-danger/30 px-2.5 py-1.5 text-xs text-danger hover:bg-danger/5">
                              <X className="h-3.5 w-3.5" /> Batalkan
                            </button>
                          </div>
                        )}
                        {order.paymentStatus === "settlement_pending" && (
                          <div className="flex flex-wrap items-center gap-2 mb-2 w-full">
                            <button onClick={() => confirmPayment(order.code, "confirm_settlement")} className="inline-flex items-center gap-1.5 rounded-md bg-success px-2.5 py-1.5 text-xs text-white hover:bg-success/90">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Konfirmasi Pelunasan
                            </button>
                            <button onClick={() => confirmPayment(order.code, "reject")} className="inline-flex items-center gap-1.5 rounded-md border border-danger/30 px-2.5 py-1.5 text-xs text-danger hover:bg-danger/5">
                              <X className="h-3.5 w-3.5" /> Batalkan
                            </button>
                          </div>
                        )}
                      <label className={`inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-xs ${uploadingCode === order.code ? "cursor-wait opacity-60" : "cursor-pointer hover:border-accent"}`}>
                        <Upload className="h-3.5 w-3.5" /> {uploadingCode === order.code ? "Mengunggah..." : "Upload project"}
                        <input type="file" accept={ALLOWED_FILE_ACCEPT} disabled={uploadingCode === order.code} className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) uploadDeliverable(order.code, file); event.currentTarget.value = ""; }} />
                      </label>
                      {!!order.deliverables?.length && <button disabled={sendingCode === order.code || uploadingCode === order.code} onClick={() => sendProject(order.code)} className="inline-flex items-center gap-1.5 rounded-md bg-accent px-2.5 py-1.5 text-xs text-white hover:bg-accent-strong disabled:cursor-wait disabled:opacity-50"><Send className="h-3.5 w-3.5" /> {sendingCode === order.code ? "Mengirim..." : "Kirim project"}</button>}
                      {order.projectSentAt && <span className="text-xs text-success">Terkirim</span>}
                      </div>
                      {orderActionMessage[order.code] && <p className="mt-2 text-xs text-muted" role="status">{orderActionMessage[order.code]}</p>}
                    </details>
                  </div>
                );
              })}
            </div>
          )}
        </section>
        )}

        </div>
      </div>
    </div>
  );
}
