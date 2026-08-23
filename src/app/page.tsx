"use client";

import { useState, useRef, useEffect, useCallback, type ChangeEvent, type DragEvent, type RefObject } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu, X, ArrowRight, ArrowLeft, Check, ChevronDown,
  UploadCloud, FileText, Trash2,
  QrCode, Landmark, CreditCard, ShieldCheck, Loader2, CheckCircle2,
  Calendar, Link2, Mail, LogOut, Instagram,
  MessageCircle, Globe, Copy,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useSession, signIn, signOut } from "next-auth/react";
import {
  useLang, useServices, useBudgetTiers, useTerms, useTestimonials,
  type ServiceId, type BudgetId, type ServiceItem, type BudgetTier, type WorkItem, type TermItem,
} from "@/lib/i18n";
import { clearOrderDraft, getOrderDraft, saveOrderDraft } from "@/lib/orders";
import { getCustomWorkItems, fetchPublishedPortfolio, PORTFOLIO_UPDATED_EVENT, type CustomWorkItem } from "@/lib/portfolio";
import { Renderer, Camera, Transform, Mesh, Program, Box, Torus, Cylinder } from "ogl";

/* ------------------------------------------------------------------ */
/*  Konfigurasi CS WhatsApp — ganti nomor & pesan default di sini      */
/* ------------------------------------------------------------------ */

const WA_NUMBER = "6285792006860"; // TODO: ganti dengan nomor CS asli
const waLink = (msg: string): string => `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;

/* ------------------------------------------------------------------ */
/*  Tipe data                                                          */
/* ------------------------------------------------------------------ */

type PaymentPlan = "deposit" | "full";
type PaymentMethod = "qris" | "va" | "card";
type Responsive3DLayout = {
  cameraZ: number;
  fov: number;

  pencil: {
    x: number;
    y: number;
    z: number;
    scale: number;
  };

  cube: {
    x: number;
    y: number;
    z: number;
    scale: number;
  };

  ring: {
    x: number;
    y: number;
    z: number;
    scale: number;
  };
};

function getResponsive3DLayout(
  width: number,
  height: number
): Responsive3DLayout {
  const aspect = width / Math.max(height, 1);

  // Mobile portrait: objek diletakkan lebih rendah & di tengah,
  // dengan skala sedang supaya tidak menabrak judul di atasnya.
  if (aspect < 0.6) {
    return {
      cameraZ: 9.5,
      fov: 42,

      pencil: {
        x: 0.9,
        y: -2.6,
        z: 0,
        scale: 1.6,
      },

      cube: {
        x: -1.3,
        y: -3.2,
        z: -0.6,
        scale: 1.0,
      },

      ring: {
        x: 1.6,
        y: -4.0,
        z: 0.4,
        scale: 1.15,
      },
    };
  }

  // Tablet / layar sedang: geser ke kanan-bawah, cukup besar
  // tapi masih memberi ruang untuk teks di kolom kiri.
  if (aspect < 1.15) {
    return {
      cameraZ: 9,
      fov: 40,

      pencil: {
        x: 2.4,
        y: -0.8,
        z: 0.2,
        scale: 2.1,
      },

      cube: {
        x: 3.4,
        y: 1.6,
        z: -0.4,
        scale: 1.3,
      },

      ring: {
        x: 2.6,
        y: -2.8,
        z: 0.6,
        scale: 1.5,
      },
    };
  }

  // Desktop: komposisi besar di sisi kanan hero, cukup jauh dari
  // kolom teks (yang dibatasi max-w-2xl) supaya berfungsi sebagai
  // elemen background, bukan menimpa judul.
  return {
    cameraZ: 9,
    fov: 42,

    pencil: {
      x: 3.2,
      y: -0.4,
      z: 0.3,
      scale: 2.9,
    },

    cube: {
      x: 4.3,
      y: 2.0,
      z: -0.6,
      scale: 1.6,
    },

    ring: {
      x: 3.0,
      y: -2.6,
      z: 0.6,
      scale: 1.9,
    },
  };
}

function applyResponsive3DLayout(
  camera: Camera,
  pencil: Transform,
  cube: Mesh,
  ring: Mesh,
  layout: Responsive3DLayout,
  aspect: number
): void {
  camera.position.set(0, 0, layout.cameraZ);
  camera.lookAt([0, 0, 0]);
  camera.perspective({
    aspect,
    fov: layout.fov,
    near: 0.1,
    far: 50,
  });

  pencil.position.set(
    layout.pencil.x,
    layout.pencil.y,
    layout.pencil.z
  );
  pencil.scale.set(layout.pencil.scale, layout.pencil.scale, layout.pencil.scale);

  cube.position.set(
    layout.cube.x,
    layout.cube.y,
    layout.cube.z
  );
  cube.scale.set(layout.cube.scale, layout.cube.scale, layout.cube.scale);

  ring.position.set(
    layout.ring.x,
    layout.ring.y,
    layout.ring.z
  );
 ring.scale.set(layout.ring.scale, layout.ring.scale, layout.ring.scale);
}

function resizeResponsive3D(
  canvas: HTMLCanvasElement,
  renderer: Renderer,
  camera: Camera,
  pencil: Transform,
  cube: Mesh,
  ring: Mesh
): Responsive3DLayout {
  const width = Math.max(canvas.clientWidth, 1);
  const height = Math.max(canvas.clientHeight, 1);
  const aspect = width / height;

  renderer.setSize(width, height);

  const layout = getResponsive3DLayout(width, height);
  applyResponsive3DLayout(
    camera,
    pencil,
    cube,
    ring,
    layout,
    aspect
  );

  return layout;
}

function updateResponsive3DAnimation(
  time: number,
  pencil: Transform,
  cube: Mesh,
  ring: Mesh,
  layout: Responsive3DLayout
): void {
  const t = time * 0.001;

  cube.rotation.x = t * 0.35;
  cube.rotation.y = t * 0.5;
  cube.position.y = layout.cube.y + Math.sin(t * 0.9) * 0.15;

  ring.rotation.z = t * 0.3;
  ring.position.y = layout.ring.y + Math.sin(t * 0.8 + 1.4) * 0.15;

  pencil.rotation.y = t * 0.35;
  pencil.position.y = layout.pencil.y + Math.sin(t * 1.1 + 0.6) * 0.15;
}

interface UploadedFile {
  name: string;
  size: string;
  url?: string;
  uploading?: boolean;
}

interface BriefData {
  scope: string;
  refs: string;
  files: UploadedFile[];
}

interface BudgetData {
  budget: BudgetId | null;
  deadline: string;
}

interface OrderState {
  plan: PaymentPlan;
  method: PaymentMethod;
}

interface CheckoutOrder extends OrderState {
  service: ServiceId | null;
  budget: BudgetId | null;
  deadline: string;
}

interface SuccessData {
  code: string;
  service?: string;
  tier?: string;
  deadline: string;
  plan: string;
  method: PaymentMethod;
  amount: number | null;
  isCustom: boolean;
}

interface NavRefs {
  home: RefObject<HTMLDivElement>;
  work: RefObject<HTMLElement>;
  terms: RefObject<HTMLElement>;
}

const formatIDR = (n: number): string =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

/* ------------------------------------------------------------------ */
/*  Komponen kecil                                                     */
/* ------------------------------------------------------------------ */

function Skeleton({ className = "" }: { className?: string }) {
  return <span aria-hidden="true" className={`relative block overflow-hidden rounded-xl bg-[#1A1A1E]/8 before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.4s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/50 before:to-transparent ${className}`} />;
}

function TicketDivider() {
  return (
    <div className="relative flex items-center py-1">
      <div className="h-3 w-3 -ml-[22px] rounded-full bg-[#F9F9FB] border border-[#1A1A1E]/10" />
      <div className="flex-1 border-t border-dashed border-[#1A1A1E]/20 mx-2" />
      <div className="h-3 w-3 -mr-[22px] rounded-full bg-[#F9F9FB] border border-[#1A1A1E]/10" />
    </div>
  );
}

function StepDots({ step }: { step: number }) {
  const { t } = useLang();
  const labels = t("step_labels") as string[];
  return (
    <div className="flex items-center gap-2 font-mono text-[11px] tracking-wide">
      {labels.map((label, i) => {
        const n = i + 1;
        const active = n === step;
        const done = n < step;
        return (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`flex items-center gap-1.5 px-2 py-1 rounded-xl border ${
                active
                  ? "border-[#0038FF] text-[#0038FF] bg-[#0038FF]/5"
                  : done
                  ? "border-[#1A1A1E]/15 text-[#1A1A1E]/60"
                  : "border-[#1A1A1E]/10 text-[#1A1A1E]/30"
              }`}
            >
              <span>{done ? <Check className="w-3 h-3" /> : `0${n}`}</span>
              <span className="hidden sm:inline">{label}</span>
            </div>
            {n < 4 && <div className="w-3 h-px bg-[#1A1A1E]/15" />}
          </div>
        );
      })}
    </div>
  );
}

function Accordion({ items }: { items: TermItem[] }) {
  const [open, setOpen] = useState<number>(0);
  return (
    <div className="divide-y divide-[#1A1A1E]/10 border-t border-b border-[#1A1A1E]/10">
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={item.title}>
            <button
              onClick={() => setOpen(isOpen ? -1 : i)}
              className="w-full flex items-center justify-between py-5 text-left group"
              aria-expanded={isOpen}
            >
              <span className="font-medium text-[#1A1A1E] group-hover:text-[#0038FF] transition-colors">
                {item.title}
              </span>
              <ChevronDown
                className={`w-4 h-4 text-[#1A1A1E]/40 shrink-0 transition-transform duration-200 ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <p className="pb-5 text-sm leading-relaxed text-[#1A1A1E]/60 max-w-2xl">{item.body}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

function LangToggle({ className = "" }: { className?: string }) {
  const { lang, toggleLang } = useLang();
  return (
    <button
      onClick={toggleLang}
      className={`flex items-center gap-1.5 font-mono text-xs font-medium border border-[#1A1A1E]/15 rounded-full px-3 py-1.5 hover:border-[#1A1A1E]/30 transition-colors ${className}`}
      aria-label="Toggle language"
    >
      <Globe className="w-3.5 h-3.5" />
      {lang === "id" ? "ID" : "EN"}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Langkah-langkah formulir pembelian                                 */
/* ------------------------------------------------------------------ */

function StepService({ value, onChange }: { value: ServiceId | null; onChange: (id: ServiceId) => void }) {
  const { t } = useLang();
  const services = useServices();
  return (
    <div>
      <h3 className="font-mono text-xs tracking-widest text-[#1A1A1E]/40 mb-1">{t("step1_kicker")}</h3>
      <h2 className="font-heading text-2xl font-semibold text-[#1A1A1E] mb-6">{t("step1_title")}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {services.map((s) => {
          const Icon = s.icon;
          const active = value === s.id;
          return (
            <button
              key={s.id}
              onClick={() => onChange(s.id)}
              className={`text-left p-5 rounded-2xl border transition-colors ${
                active ? "border-[#0038FF] bg-[#0038FF]/5" : "border-[#1A1A1E]/10 hover:border-[#1A1A1E]/30"
              }`}
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center mb-4 ${
                  active ? "bg-[#0038FF] text-white" : "bg-[#1A1A1E]/5 text-[#1A1A1E]/60"
                }`}
              >
                <Icon className="w-[18px] h-[18px]" />
              </div>
              <div className="font-medium text-[#1A1A1E]">{s.title}</div>
              <div className="text-sm text-[#1A1A1E]/50 mt-1">{s.desc}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepBrief({
  data,
  onChange,
}: {
  data: BriefData;
  onChange: (updater: BriefData | ((prev: BriefData) => BriefData)) => void;
}) {
  const { t } = useLang();
  const { data: session } = useSession();
  const [dragActive, setDragActive] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Upload nyata ke /api/upload (lihat route-nya untuk detail penyimpanan file).
  const addFiles = (fileList: FileList) => {
    const incoming: UploadedFile[] = Array.from(fileList).map((f) => ({
      name: f.name,
      size: (f.size / 1024).toFixed(0) + " KB",
      uploading: true,
    }));
    onChange((prev) => ({ ...prev, files: [...prev.files, ...incoming] }));

    Array.from(fileList).forEach(async (file) => {
      try {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: form });
        const json = await res.json();
        onChange((prev) => ({
          ...prev,
          files: prev.files.map((f) =>
            f.name === file.name ? { ...f, uploading: false, url: json?.url } : f
          ),
        }));
      } catch {
        // Upload gagal — tetap tandai selesai supaya UI tidak macet; brief text tetap terkirim manual via WA.
        onChange((prev) => ({
          ...prev,
          files: prev.files.map((f) => (f.name === file.name ? { ...f, uploading: false } : f)),
        }));
      }
    });
  };

  const removeFile = (name: string) => {
    onChange((prev) => ({ ...prev, files: prev.files.filter((f) => f.name !== name) }));
  };

  return (
    <div>
      <h3 className="font-mono text-xs tracking-widest text-[#1A1A1E]/40 mb-1">{t("step2_kicker")}</h3>
      <h2 className="font-heading text-2xl font-semibold text-[#1A1A1E] mb-6">{t("step2_title")}</h2>

      <label className="block text-sm font-medium text-[#1A1A1E] mb-2">{t("step2_detail_label")}</label>
      <textarea
        rows={4}
        value={data.scope}
        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onChange({ ...data, scope: e.target.value })}
        placeholder={t("step2_detail_placeholder")}
        className="w-full rounded-2xl border border-[#1A1A1E]/15 bg-white px-4 py-3 text-sm text-[#1A1A1E] placeholder:text-[#1A1A1E]/30 focus:outline-none focus:ring-1 focus:ring-[#0038FF] focus:border-[#0038FF] resize-none"
      />

      <label className="block text-sm font-medium text-[#1A1A1E] mb-2 mt-5">{t("step2_ref_label")}</label>
      <div className="relative">
        <Link2 className="w-4 h-4 text-[#1A1A1E]/30 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={data.refs}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange({ ...data, refs: e.target.value })}
          placeholder={t("step2_ref_placeholder")}
          className="w-full rounded-2xl border border-[#1A1A1E]/15 bg-white pl-10 pr-4 py-3 text-sm text-[#1A1A1E] placeholder:text-[#1A1A1E]/30 focus:outline-none focus:ring-1 focus:ring-[#0038FF] focus:border-[#0038FF]"
        />
      </div>

      <label className="block text-sm font-medium text-[#1A1A1E] mb-2 mt-5">{t("step2_file_label")}</label>
      <div
        onDragOver={(e: DragEvent<HTMLDivElement>) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e: DragEvent<HTMLDivElement>) => {
          e.preventDefault();
          setDragActive(false);
          if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
        }}
        onClick={() => fileRef.current?.click()}
        className={`rounded-2xl border border-dashed p-8 text-center cursor-pointer transition-colors ${
          dragActive ? "border-[#0038FF] bg-[#0038FF]/5" : "border-[#1A1A1E]/20 hover:border-[#1A1A1E]/40"
        }`}
      >
        <input
          ref={fileRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e: ChangeEvent<HTMLInputElement>) => e.target.files?.length && addFiles(e.target.files)}
        />
        <UploadCloud className="w-5 h-5 mx-auto text-[#1A1A1E]/40 mb-2" />
        <p className="text-sm text-[#1A1A1E]/60">
          {t("step2_file_drag")} <span className="text-[#0038FF] font-medium">{t("step2_file_choose")}</span>
        </p>
        <p className="text-xs text-[#1A1A1E]/35 mt-1">{t("step2_file_hint")}</p>
      </div>

      {data.files.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {data.files.map((f) => (
            <li
              key={f.name}
              className="flex items-center justify-between text-sm rounded-xl border border-[#1A1A1E]/10 px-3 py-2"
            >
              <span className="flex items-center gap-2 text-[#1A1A1E]/70 truncate">
                <FileText className="w-3.5 h-3.5 shrink-0 text-[#1A1A1E]/40" />
                {f.name}
                <span className="text-[#1A1A1E]/30 font-mono text-xs">{f.size}</span>
                <span className="text-[10px] font-mono text-[#0038FF]/60">
                  {f.uploading ? t("step2_file_uploading") : t("step2_file_uploaded")}
                </span>
              </span>
              <button onClick={() => removeFile(f.name)} aria-label={`Hapus ${f.name}`}>
                <Trash2 className="w-3.5 h-3.5 text-[#1A1A1E]/30 hover:text-[#0038FF]" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StepBudget({ data, onChange }: { data: BudgetData; onChange: (d: BudgetData) => void }) {
  const { t } = useLang();
  const budgetTiers = useBudgetTiers();
  return (
    <div>
      <h3 className="font-mono text-xs tracking-widest text-[#1A1A1E]/40 mb-1">{t("step3_kicker")}</h3>
      <h2 className="font-heading text-2xl font-semibold text-[#1A1A1E] mb-6">{t("step3_title")}</h2>

      <label className="block text-sm font-medium text-[#1A1A1E] mb-2">{t("step3_budget_label")}</label>
      <div className="grid grid-cols-2 gap-3">
        {budgetTiers.map((tier) => {
          const active = data.budget === tier.id;
          return (
            <button
              key={tier.id}
              onClick={() => onChange({ ...data, budget: tier.id })}
              className={`text-left p-4 rounded-2xl border transition-colors ${
                active ? "border-[#0038FF] bg-[#0038FF]/5" : "border-[#1A1A1E]/10 hover:border-[#1A1A1E]/30"
              }`}
            >
              <div className="font-medium text-[#1A1A1E] text-sm">{tier.label}</div>
              <div className="text-xs text-[#1A1A1E]/50 mt-1 font-mono">{tier.range}</div>
            </button>
          );
        })}
      </div>

      <label className="block text-sm font-medium text-[#1A1A1E] mb-2 mt-6">{t("step3_deadline_label")}</label>
      <div className="relative">
        <Calendar className="w-4 h-4 text-[#1A1A1E]/30 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="date"
          value={data.deadline}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange({ ...data, deadline: e.target.value })}
          className="w-full rounded-2xl border border-[#1A1A1E]/15 bg-white pl-10 pr-4 py-3 text-sm text-[#1A1A1E] focus:outline-none focus:ring-1 focus:ring-[#0038FF] focus:border-[#0038FF]"
        />
      </div>
    </div>
  );
}

function StepCheckout({
  order,
  onChange,
  onPay,
  paying,
}: {
  order: CheckoutOrder;
  onChange: (o: OrderState) => void;
  onPay: () => void;
  paying: boolean;
}) {
  const { t } = useLang();
  const services = useServices();
  const budgetTiers = useBudgetTiers();
  const service = services.find((s) => s.id === order.service);
  const tier = budgetTiers.find((tItem) => tItem.id === order.budget);
  const isCustom = tier?.base == null;
  const base = tier?.base ?? 0;
  const amount = order.plan === "deposit" ? Math.round(base * 0.3) : base;

  return (
    <div>
      <h3 className="font-mono text-xs tracking-widest text-[#1A1A1E]/40 mb-1">{t("step4_kicker")}</h3>
      <h2 className="font-heading text-2xl font-semibold text-[#1A1A1E] mb-6">{t("step4_title")}</h2>

      <div className="rounded-2xl border border-[#1A1A1E]/10 overflow-hidden">
        <div className="p-5 space-y-2.5 text-sm">
          <div className="flex justify-between">
            <span className="text-[#1A1A1E]/50">{t("step4_service")}</span>
            <span className="font-medium text-[#1A1A1E]">{service?.title}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#1A1A1E]/50">{t("step4_budget")}</span>
            <span className="font-medium text-[#1A1A1E]">
              {tier?.label} · {tier?.range}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#1A1A1E]/50">{t("step4_deadline")}</span>
            <span className="font-medium text-[#1A1A1E]">{order.deadline || t("step4_flexible")}</span>
          </div>
        </div>
        <TicketDivider />
        <div className="p-5">
          {isCustom ? (
            <p className="text-sm text-[#1A1A1E]/60">{t("step4_custom_note")}</p>
          ) : (
            <>
              <div className="text-sm font-medium text-[#1A1A1E] mb-2">{t("step4_pay_method")}</div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {(
                  [
                    { id: "deposit", label: t("step4_pay_deposit"), sub: formatIDR(Math.round(base * 0.3)) },
                    { id: "full", label: t("step4_pay_full"), sub: formatIDR(base) },
                  ] as { id: PaymentPlan; label: string; sub: string }[]
                ).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => onChange({ ...order, plan: p.id })}
                    className={`text-left p-3.5 rounded-2xl border transition-colors ${
                      order.plan === p.id ? "border-[#0038FF] bg-[#0038FF]/5" : "border-[#1A1A1E]/10 hover:border-[#1A1A1E]/30"
                    }`}
                  >
                    <div className="text-sm font-medium text-[#1A1A1E]">{p.label}</div>
                    <div className="text-xs font-mono text-[#1A1A1E]/50 mt-1">{p.sub}</div>
                  </button>
                ))}
              </div>

              <div className="text-sm font-medium text-[#1A1A1E] mb-2">{t("step4_pay_with")}</div>
              <div className="grid grid-cols-3 gap-3 mb-5">
                {(
                  [
                    { id: "qris", label: "QRIS", icon: QrCode },
                    { id: "va", label: "Bank VA", icon: Landmark },
                    { id: "card", label: "Kartu", icon: CreditCard },
                  ] as { id: PaymentMethod; label: string; icon: LucideIcon }[]
                ).map((m) => {
                  const Icon = m.icon;
                  const active = order.method === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => onChange({ ...order, method: m.id })}
                      className={`flex flex-col items-center gap-1.5 py-3 rounded-2xl border transition-colors ${
                        active ? "border-[#0038FF] bg-[#0038FF]/5 text-[#0038FF]" : "border-[#1A1A1E]/10 text-[#1A1A1E]/60 hover:border-[#1A1A1E]/30"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-xs font-medium">{m.label}</span>
                    </button>
                  );
                })}
              </div>

              <PaymentMethodPanel method={order.method} />

              <div className="flex items-center justify-between border-t border-[#1A1A1E]/10 pt-4 mt-1">
                <span className="text-sm text-[#1A1A1E]/50">{t("step4_total")}</span>
                <span className="text-lg font-semibold text-[#1A1A1E] font-mono">{formatIDR(amount)}</span>
              </div>
            </>
          )}
        </div>
      </div>

      <button
        onClick={onPay}
        disabled={paying}
        className="mt-6 w-full flex items-center justify-center gap-2 bg-[#0038FF] text-white py-3.5 rounded-2xl font-medium hover:bg-[#0030DB] transition-colors disabled:opacity-60"
      >
        {paying ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> {t("step4_processing")}
          </>
        ) : isCustom ? (
          <>
            {t("step4_ask_quote")} <ArrowRight className="w-4 h-4" />
          </>
        ) : (
          <>
            <ShieldCheck className="w-4 h-4" /> {t("step4_confirm_pay")} {formatIDR(amount)}
          </>
        )}
      </button>
    </div>
  );
}

function PaymentMethodPanel({ method }: { method: PaymentMethod }) {
  if (method === "qris") {
    return (
      <div className="rounded-2xl border border-[#1A1A1E]/10 p-5 flex flex-col items-center mb-5">
        <div className="w-32 h-32 rounded-xl bg-[#1A1A1E]/5 flex items-center justify-center mb-2">
          <QrCode className="w-12 h-12 text-[#1A1A1E]/30" />
        </div>
        <p className="text-xs text-[#1A1A1E]/40 font-mono">Scan QRIS untuk bayar</p>
      </div>
    );
  }
  if (method === "va") {
    return (
      <div className="rounded-2xl border border-[#1A1A1E]/10 p-5 mb-5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-[#1A1A1E]/50">No. Virtual Account</span>
          <span className="font-mono font-medium text-[#1A1A1E]">8808 1234 5678 90</span>
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-[#1A1A1E]/10 p-5 mb-5 space-y-3">
      <input
        placeholder="Nomor kartu"
        className="w-full rounded-xl border border-[#1A1A1E]/15 px-3 py-2.5 text-sm placeholder:text-[#1A1A1E]/30 focus:outline-none focus:ring-1 focus:ring-[#0038FF]"
      />
      <div className="flex gap-3">
        <input
          placeholder="MM/YY"
          className="w-1/2 rounded-xl border border-[#1A1A1E]/15 px-3 py-2.5 text-sm placeholder:text-[#1A1A1E]/30 focus:outline-none focus:ring-1 focus:ring-[#0038FF]"
        />
        <input
          placeholder="CVC"
          className="w-1/2 rounded-xl border border-[#1A1A1E]/15 px-3 py-2.5 text-sm placeholder:text-[#1A1A1E]/30 focus:outline-none focus:ring-1 focus:ring-[#0038FF]"
        />
      </div>
    </div>
  );
}

function OrderModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: (data: SuccessData) => void;
}) {
  const { t } = useLang();
  const { data: session } = useSession();
  const budgetTiers = useBudgetTiers();
  const services = useServices();
  const [step, setStep] = useState(1);
  const [service, setService] = useState<ServiceId | null>(null);
  const [brief, setBrief] = useState<BriefData>({ scope: "", refs: "", files: [] });
  const [budgetData, setBudgetData] = useState<BudgetData>({ budget: null, deadline: "" });
  const [orderState, setOrderState] = useState<OrderState>({ plan: "deposit", method: "qris" });
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    const draft = getOrderDraft();
    if (!draft) return;
    setService(draft.service as ServiceId | null);
    setBrief({ ...draft.brief, files: [] });
    setBudgetData({ budget: draft.budget as BudgetId | null, deadline: draft.deadline });
  }, []);

  useEffect(() => {
    saveOrderDraft({ service, brief: { scope: brief.scope, refs: brief.refs }, budget: budgetData.budget, deadline: budgetData.deadline, updatedAt: new Date().toISOString() });
  }, [service, brief.scope, brief.refs, budgetData.budget, budgetData.deadline]);

  const canNext =
    (step === 1 && service) ||
    (step === 2 && brief.scope.trim().length > 0) ||
    step === 3 && budgetData.budget ||
    step === 4;

  const handlePay = async () => {
    setPaying(true);
    const tier = budgetTiers.find((tItem) => tItem.id === budgetData.budget);
    const isCustom = tier?.base == null;
    const base = tier?.base ?? 0;
    const amount = isCustom ? null : orderState.plan === "deposit" ? Math.round(base * 0.3) : base;
    const serviceObj = services.find((s) => s.id === service);

    try {
      const res = await fetch("/api/queue/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service: serviceObj?.title ?? service,
          budgetLabel: tier ? `${tier.label} · ${tier.range}` : "",
          deadline: budgetData.deadline,
          plan: orderState.plan,
          method: orderState.method,
          amount,
          isCustom,
          briefScope: brief.scope,
          briefRefs: brief.refs,
          fileNames: brief.files.map((f) => f.name),
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Gagal masuk antrean");
      clearOrderDraft();
      onSuccess({ code: result.code, service: serviceObj?.title, tier: tier?.label, deadline: budgetData.deadline, plan: orderState.plan, method: orderState.method, amount, isCustom });
      onClose();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Gagal masuk antrean. Coba lagi.");
    } finally {
      setPaying(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-[#1A1A1E]/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ duration: 0.25 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#F9F9FB] w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-4 sticky top-0 bg-[#F9F9FB] z-10 border-b border-[#1A1A1E]/10">
          <StepDots step={step} />
          <button onClick={onClose} aria-label={t("modal_close")}>
            <X className="w-5 h-5 text-[#1A1A1E]/40 hover:text-[#1A1A1E]" />
          </button>
        </div>

        <div className="px-6 py-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.2 }}
            >
              {step === 1 && <StepService value={service} onChange={setService} />}
              {step === 2 && <StepBrief data={brief} onChange={setBrief} />}
              {step === 3 && <StepBudget data={budgetData} onChange={setBudgetData} />}
              {step === 4 && (
                <StepCheckout
                  order={{ service, budget: budgetData.budget, deadline: budgetData.deadline, ...orderState }}
                  onChange={setOrderState}
                  onPay={handlePay}
                  paying={paying}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {step < 4 && (
          <div className="flex items-center justify-between px-6 pb-6 pt-2">
            <button
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              disabled={step === 1}
              className="flex items-center gap-1.5 text-sm font-medium text-[#1A1A1E]/60 disabled:opacity-0 hover:text-[#1A1A1E]"
            >
              <ArrowLeft className="w-4 h-4" /> {t("modal_back")}
            </button>
            <button
              onClick={() => setStep((s) => Math.min(4, s + 1))}
              disabled={!canNext}
              className="flex items-center gap-2 bg-[#0038FF] text-white text-sm font-medium px-5 py-2.5 rounded-2xl disabled:opacity-40 hover:bg-[#0030DB] transition-colors"
            >
              {t("modal_next")} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

function SuccessModal({ data, onClose }: { data: SuccessData | null; onClose: () => void }) {
  const { t } = useLang();
  const [copied, setCopied] = useState(false);
  if (!data) return null;

  const waMsg = `Halo Kookiez, aku baru order dengan kode ${data.code} (${data.service ?? "custom"}). Mau konfirmasi ya!`;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-[#1A1A1E]/40 backdrop-blur-sm flex items-center justify-center p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl max-w-sm w-full p-7 text-center"
      >
        <div className="w-14 h-14 rounded-full bg-[#0038FF]/10 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-7 h-7 text-[#0038FF]" />
        </div>
        <h3 className="font-heading text-xl font-semibold text-[#1A1A1E] mb-2">{t("success_title")}</h3>
        <p className="text-sm text-[#1A1A1E]/50 mb-5">{t("success_desc")}</p>

        <div className="rounded-2xl border border-dashed border-[#0038FF]/40 bg-[#0038FF]/5 p-4 mb-5">
          <div className="text-[10px] font-mono tracking-widest text-[#1A1A1E]/40 mb-1">
            {t("success_code_label")}
          </div>
          <div className="flex items-center justify-center gap-2">
            <span className="font-mono text-lg font-semibold text-[#0038FF] tracking-wider">{data.code}</span>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(data.code);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              aria-label="Copy"
            >
              <Copy className="w-3.5 h-3.5 text-[#1A1A1E]/40 hover:text-[#0038FF]" />
            </button>
          </div>
          {copied && <div className="text-[10px] text-[#0038FF] mt-1 font-mono">Copied!</div>}
        </div>

        <div className="text-left space-y-1.5 text-sm mb-6">
          <Row label={t("step4_service")} value={data.service} />
          <Row label={t("step4_budget")} value={data.tier} />
          <Row label={t("step4_deadline")} value={data.deadline || t("step4_flexible")} />
          {!data.isCustom && data.amount != null && (
            <Row label={t("step4_total")} value={formatIDR(data.amount)} />
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Link
            href={`/lacak?code=${encodeURIComponent(data.code)}`}
            className="w-full bg-[#1A1A1E] text-white py-3 rounded-2xl font-medium text-sm hover:bg-[#1A1A1E]/85 transition-colors"
          >
            {t("success_track_btn")}
          </Link>
          <a
            href={waLink(waMsg)}
            target="_blank"
            rel="noreferrer"
            className="w-full border border-[#1A1A1E]/15 text-[#1A1A1E] py-3 rounded-2xl font-medium text-sm hover:border-[#1A1A1E]/30 transition-colors flex items-center justify-center gap-2"
          >
            <MessageCircle className="w-4 h-4" style={{ color: "#25D366" }} /> {t("success_wa_btn")}
          </a>
          <button
            onClick={onClose}
            className="w-full text-[#1A1A1E]/50 py-2 rounded-2xl font-medium text-sm hover:text-[#1A1A1E] transition-colors"
          >
            {t("success_close")}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function LoginPromptModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-[#1A1A1E]/40 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-sm w-full p-7 text-center"
          >
            <div className="w-14 h-14 rounded-full bg-[#0038FF]/10 flex items-center justify-center mx-auto mb-4">
              <Mail className="w-7 h-7 text-[#0038FF]" />
            </div>
            <h3 className="font-heading text-xl font-semibold text-[#1A1A1E] mb-2">Masuk dulu, yuk</h3>
            <p className="text-sm text-[#1A1A1E]/50 mb-6">
              Kamu perlu masuk dengan akun Gmail untuk bisa pesan sekarang.
            </p>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => signIn("google", { callbackUrl: "https://kookiez-kappa.vercel.app/" })}
                className="w-full flex items-center justify-center gap-2 bg-[#0038FF] text-white py-3 rounded-2xl font-medium text-sm hover:bg-[#0030DB] transition-colors"
              >
                Masuk dengan Google
              </button>
              <button
                onClick={onClose}
                className="w-full text-[#1A1A1E]/50 py-2 rounded-2xl font-medium text-sm hover:text-[#1A1A1E] transition-colors"
              >
                Batal
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex justify-between">
      <span className="text-[#1A1A1E]/45">{label}</span>
      <span className="font-medium text-[#1A1A1E]">{value}</span>
    </div>
  );
}

function FloatingWhatsApp() {
  const { lang } = useLang();
  const msg = lang === "id" ? "Halo Kookiez, aku mau tanya-tanya soal jasa desain 👋" : "Hi Kookiez, I'd like to ask about your design services 👋";
  return (
    <a
      href={waLink(msg)}
      target="_blank"
      rel="noreferrer"
      className="fixed bottom-5 right-5 z-40 flex items-center gap-2 bg-[#1A1A1E] text-white px-4 py-3 rounded-full shadow-lg hover:bg-[#1A1A1E]/90 transition-colors"
    >
      <MessageCircle className="w-4 h-4" style={{ color: "#25D366" }} />
      <span className="text-sm font-medium hidden sm:inline">Chat CS</span>
    </a>
  );
}

function Navbar({ onOrder, onConsult, refs }: { onOrder: () => void; onConsult: () => void; refs: NavRefs }) {
  const { t } = useLang();
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);

  const go = (ref: RefObject<HTMLElement | HTMLDivElement>) => {
    ref.current?.scrollIntoView({ behavior: "smooth" });
    setOpen(false);
  };

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-[#1A1A1E]/10 bg-[#F9F9FB]/95 backdrop-blur">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <button onClick={() => go(refs.home)} className="font-heading font-semibold text-lg text-[#1A1A1E]">
          kookiez<span className="text-[#0038FF]">.</span>
        </button>

        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#1A1A1E]/70">
          <button onClick={() => go(refs.home)} className="hover:text-[#1A1A1E] transition-colors">
            {t("nav_home")}
          </button>
          <button onClick={() => go(refs.work)} className="hover:text-[#1A1A1E] transition-colors">
            {t("nav_work")}
          </button>
          <Link href="/estimasi-harga" className="hover:text-[#1A1A1E] transition-colors">
            {t("nav_price")}
          </Link>
          <button onClick={() => go(refs.terms)} className="hover:text-[#1A1A1E] transition-colors">
            {t("nav_terms")}
          </button>
          <Link href="/lacak" className="hover:text-[#1A1A1E] transition-colors">
            {t("nav_track")}
          </Link>
        </nav>

        <div className="hidden md:flex items-center gap-3">
          {status === "authenticated" && (
            <div className="flex items-center gap-2 pr-1">
              <div className="w-7 h-7 rounded-full bg-[#0038FF]/10 text-[#0038FF] text-xs font-semibold flex items-center justify-center shrink-0">
                {(session?.user?.name ?? session?.user?.email ?? "?").charAt(0).toUpperCase()}
              </div>
              <span className="text-xs text-[#1A1A1E]/60 max-w-[110px] truncate hidden lg:inline">
                {session?.user?.name ?? session?.user?.email}
              </span>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                aria-label="Keluar"
                title="Keluar"
                className="w-8 h-8 flex items-center justify-center rounded-2xl text-[#1A1A1E]/50 hover:text-[#1A1A1E] hover:bg-[#1A1A1E]/5 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
          <LangToggle />
  {session?.user?.role === "admin" ? (
  <Link href="/admin" className="border border-[#1A1A1E]/15 px-3 py-2 rounded-xl text-xs font-medium text-[#1A1A1E]/70 hover:text-[#1A1A1E] hover:border-[#1A1A1E]/35 transition-colors">Admin</Link>
  ) : session?.user ? (
  <Link href="/member" className="border border-[#1A1A1E]/15 px-3 py-2 rounded-xl text-xs font-medium text-[#1A1A1E]/70 hover:text-[#1A1A1E] hover:border-[#1A1A1E]/35 transition-colors">Member area</Link>
  ) : null}
          <button
            onClick={onOrder}
            className="bg-[#0038FF] text-white font-medium px-4 py-2 rounded-2xl text-sm hover:bg-[#0030DB] transition-colors"
          >
            {t("nav_order")}
          </button>
        </div>

        <div className="md:hidden flex items-center gap-2">
          <LangToggle />
          <button onClick={() => setOpen((v) => !v)} aria-label="Menu">
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden overflow-hidden border-t border-[#1A1A1E]/10 bg-[#F9F9FB]"
          >
            <div className="px-6 py-5 flex flex-col gap-4 text-sm font-medium text-[#1A1A1E]/80">
              {status === "authenticated" && (
                <div className="flex items-center justify-between gap-3 pb-3 border-b border-[#1A1A1E]/10">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-[#0038FF]/10 text-[#0038FF] text-xs font-semibold flex items-center justify-center shrink-0">
                      {(session?.user?.name ?? session?.user?.email ?? "?").charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs text-[#1A1A1E]/60 truncate">
                      {session?.user?.name ?? session?.user?.email}
                    </span>
                  </div>
                  <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="flex items-center gap-1.5 text-xs text-[#1A1A1E]/50 hover:text-[#1A1A1E] transition-colors shrink-0"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Keluar
                  </button>
                </div>
              )}
              <button onClick={() => go(refs.home)} className="text-left">
                {t("nav_home")}
              </button>
              <button onClick={() => go(refs.work)} className="text-left">
                {t("nav_work")}
              </button>
              <Link href="/estimasi-harga" className="text-left" onClick={() => setOpen(false)}>
                {t("nav_price")}
              </Link>
              <button onClick={() => go(refs.terms)} className="text-left">
                {t("nav_terms")}
              </button>
              <Link href="/lacak" className="text-left">
                {t("nav_track")}
              </Link>
              <a href={waLink("Halo Kookiez, aku mau tanya-tanya soal jasa desain")} target="_blank" rel="noreferrer">
                {t("nav_cs")}
              </a>
              {session?.user?.role === "admin" && (
                <Link href="/admin" onClick={() => setOpen(false)} className="text-left">Admin</Link>
              )}
              <button onClick={() => { onConsult(); setOpen(false); }} className="text-left text-[#0038FF]">
                {t("hero_consult_cta")}
              </button>
              <button
                onClick={() => {
                  onOrder();
                  setOpen(false);
                }}
                className="bg-[#0038FF] text-white font-medium px-4 py-2 rounded-2xl text-sm hover:bg-[#0030DB] transition-colors w-fit"
              >
                {t("nav_order")}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

function Real3DScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new Renderer({
      canvas,
      alpha: true,
      dpr: Math.min(window.devicePixelRatio, 2),
    });
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);

    const camera = new Camera(gl, {
      fov: 35,
      near: 0.1,
      far: 50,
    });
    camera.position.set(0, 0, 7);
    camera.lookAt([0, 0, 0]);

    const scene = new Transform();

    const vertex = `
      attribute vec3 position;
      attribute vec3 normal;
      uniform mat4 modelViewMatrix;
      uniform mat4 projectionMatrix;
      uniform mat3 normalMatrix;
      varying vec3 vNormal;
      varying vec3 vViewPos;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 viewPos = modelViewMatrix * vec4(position, 1.0);
        vViewPos = viewPos.xyz;
        gl_Position = projectionMatrix * viewPos;
      }
    `;

    const fragment = `
      precision highp float;
      varying vec3 vNormal;
      varying vec3 vViewPos;
      uniform vec3 uColor;
      uniform vec3 uColorDark;
      void main() {
        vec3 n = normalize(vNormal);
        vec3 v = normalize(-vViewPos);
        vec3 l = normalize(vec3(0.5, 0.8, 0.6));
        vec3 h = normalize(l + v);

        float diff = max(dot(n, l), 0.0);
        float wrap = clamp(diff * 0.7 + 0.3, 0.0, 1.0);
        float spec = pow(max(dot(n, h), 0.0), 64.0) * 0.5;
        float rim = pow(1.0 - max(dot(n, v), 0.0), 2.5) * 0.3;

        vec3 color = mix(uColorDark, uColor, wrap) + spec + rim;
        gl_FragColor = vec4(color, 1.0);
      }
    `;

    const makeProgram = (
      color: [number, number, number],
      dark: [number, number, number]
    ) =>
      new Program(gl, {
        vertex,
        fragment,
        uniforms: {
          uColor: { value: color },
          uColorDark: { value: dark },
        },
      });

    const cube = new Mesh(gl, {
      geometry: new Box(gl, {
        width: 1,
        height: 1,
        depth: 1,
      }),
      program: makeProgram([0.2, 0.45, 1.0], [0.0, 0.1, 0.4]),
    });
    cube.setParent(scene);

    const ring = new Mesh(gl, {
      geometry: new Torus(gl, {
        radius: 0.6,
        tube: 0.2,
        radialSegments: 32,
        tubularSegments: 64,
      }),
      program: makeProgram([0.15, 0.5, 1.0], [0.0, 0.1, 0.5]),
    });
    ring.rotation.x = Math.PI / 2.2;
    ring.setParent(scene);

    const pencil = new Transform();
    pencil.rotation.z = 0.25;
    pencil.rotation.x = -0.15;
    pencil.setParent(scene);

    const pencilBody = new Mesh(gl, {
      geometry: new Cylinder(gl, {
        radiusTop: 0.16,
        radiusBottom: 0.16,
        height: 1.1,
        radialSegments: 32,
      }),
      program: makeProgram([1.0, 0.72, 0.15], [0.55, 0.3, 0.0]),
    });
    pencilBody.position.y = 0.2;
    pencilBody.setParent(pencil);

    const pencilWood = new Mesh(gl, {
      geometry: new Cylinder(gl, {
        radiusTop: 0.16,
        radiusBottom: 0.04,
        height: 0.4,
        radialSegments: 32,
      }),
      program: makeProgram([0.9, 0.75, 0.6], [0.5, 0.35, 0.2]),
    });
    pencilWood.position.y = -0.55;
    pencilWood.setParent(pencil);

    const pencilLead = new Mesh(gl, {
      geometry: new Cylinder(gl, {
        radiusTop: 0.04,
        radiusBottom: 0,
        height: 0.15,
        radialSegments: 32,
      }),
      program: makeProgram([0.15, 0.15, 0.15], [0.02, 0.02, 0.02]),
    });
    pencilLead.position.y = -0.825;
    pencilLead.setParent(pencil);

    const pencilMetal = new Mesh(gl, {
      geometry: new Cylinder(gl, {
        radiusTop: 0.16,
        radiusBottom: 0.16,
        height: 0.15,
        radialSegments: 32,
      }),
      program: makeProgram([0.8, 0.8, 0.85], [0.4, 0.4, 0.45]),
    });
    pencilMetal.position.y = 0.825;
    pencilMetal.setParent(pencil);

    const pencilEraser = new Mesh(gl, {
      geometry: new Cylinder(gl, {
        radiusTop: 0.16,
        radiusBottom: 0.16,
        height: 0.25,
        radialSegments: 32,
      }),
      program: makeProgram([1.0, 0.6, 0.65], [0.6, 0.2, 0.25]),
    });
    pencilEraser.position.y = 1.025;
    pencilEraser.setParent(pencil);

    let layout = resizeResponsive3D(
      canvas,
      renderer,
      camera,
      pencil,
      cube,
      ring
    );

    const resize = () => {
      layout = resizeResponsive3D(
        canvas,
        renderer,
        camera,
        pencil,
        cube,
        ring
      );
    };

    let frame = 0;
    const render = (time: number) => {
      updateResponsive3DAnimation(
        time,
        pencil,
        cube,
        ring,
        layout
      );

      const t = time * 0.001;
      scene.rotation.y = Math.sin(t * 0.15) * 0.05;

      renderer.render({ scene, camera });
      frame = requestAnimationFrame(render);
    };

    window.addEventListener("resize", resize);
    frame = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="h-full w-full outline-none"
      aria-label="Objek 3D: pensil, kubus, dan cincin"
    />
  );
}

function Hero({ onOrder, onConsult, workRef }: { onOrder: () => void; onConsult: () => void; workRef: RefObject<HTMLElement> }) {
  const { t, lang } = useLang();
  const words = lang === "id" ? ["logo.", "banner.", "poster.", "stiker."] : ["logo.", "banner.", "poster.", "stickers."];
  const [i, setI] = useState(0);
  
  useEffect(() => {
    const id = setInterval(() => setI((v) => (v + 1) % words.length), 1800);
    return () => clearInterval(id);
  }, [words.length]);

  return (
    // 1. Mengubah struktur menjadi relatif dengan tinggi layar yang pas
    <section className="relative mx-auto flex min-h-[90vh] max-w-7xl items-center overflow-hidden px-5 pb-16 pt-24 sm:px-8">
      
      {/* 2. BACKGROUND 3D - Memenuhi seluruh section di belakang teks.
          Diberi mask gradient supaya objek memudar ke arah kolom teks
          (kiri) dan tetap penuh/terlihat jelas di sisi kanan sebagai
          elemen background, bukan menimpa judul. */}
      <div
        className="absolute inset-0 z-0 pointer-events-none opacity-90"
        style={{
          maskImage: "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.35) 32%, rgba(0,0,0,0.9) 55%, black 70%)",
          WebkitMaskImage: "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.35) 32%, rgba(0,0,0,0.9) 55%, black 70%)",
        }}
      >
        <Real3DScene />
      </div>

      {/* 3. KONTEN TEKS - Diberi z-10 agar berada di atas canvas 3D */}
      <div className="relative z-10 w-full max-w-2xl">
        <p className="mb-5 font-mono text-xs tracking-[.22em] text-[#0038FF]">{t("hero_kicker")}</p>
        <h1 className="max-w-2xl font-heading text-[clamp(2.65rem,5.8vw,5.35rem)] font-semibold leading-[.92] tracking-[-0.055em] text-[#1A1A1E]">
          {t("hero_need")} {" "}
          <span className="inline-block h-[.9em] overflow-hidden align-bottom text-[#0038FF]">
            <AnimatePresence mode="wait">
              <motion.span key={words[i]} initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -30, opacity: 0 }} transition={{ duration: 0.35 }} className="inline-block">{words[i]}</motion.span>
            </AnimatePresence>
          </span>
          <br />
          {t("hero_title_end")}
        </h1>
        <p className="mt-7 max-w-lg text-base leading-relaxed text-[#1A1A1E]/60 sm:text-lg">{t("hero_desc")}</p>
        
        <div className="mt-9 flex flex-wrap items-center gap-3">
          <button onClick={onOrder} className="flex items-center gap-2 rounded-2xl bg-[#0038FF] px-6 py-3.5 font-medium text-white transition-all hover:-translate-y-0.5 hover:bg-[#0030DB] active:translate-y-0">{t("hero_cta")} <ArrowRight className="h-4 w-4" /></button>
          <button onClick={onConsult} className="rounded-2xl border border-[#1A1A1E]/20 bg-white/50 backdrop-blur-sm px-5 py-3.5 font-medium text-[#1A1A1E] transition-colors hover:border-[#0038FF] hover:text-[#0038FF]">{t("hero_consult_cta")}</button>
          <button onClick={() => workRef.current?.scrollIntoView({ behavior: "smooth" })} className="px-2 py-3.5 font-medium text-[#1A1A1E]/60 transition-colors hover:text-[#1A1A1E]">{t("hero_cta_secondary")}</button>
        </div>
        
        <div className="mt-12 grid max-w-xl grid-cols-3 border-t border-[#1A1A1E]/10 pt-6 text-sm">
          <div><span className="block font-mono font-medium text-[#1A1A1E]">300+</span><span className="text-[#1A1A1E]/50">{t("hero_stat_done")}</span></div>
          <div><span className="block font-mono font-medium text-[#1A1A1E]">4.9/5</span><span className="text-[#1A1A1E]/50">{t("hero_stat_rating")}</span></div>
          <div><span className="block font-mono font-medium text-[#1A1A1E]">&lt;1 jam</span><span className="text-[#1A1A1E]/50">{t("hero_stat_response")}</span></div>
        </div>
      </div>
    </section>
  );
}

interface QueueSnapshot {
  maxSlots: number;
  activeSlots: number;
  availableSlots: number;
  note: string;
}

function AvailabilityBanner() {
  const [queue, setQueue] = useState<QueueSnapshot | null>(null);
  const [status, setStatus] = useState<"loading" | "live" | "offline">("loading");
  const sync = useCallback(async () => {
    try {
      const response = await fetch("/api/queue/settings", { cache: "no-store" });
      if (!response.ok) throw new Error("queue request failed");
      setQueue(await response.json());
      setStatus("live");
    } catch {
      setStatus("offline");
    }
  }, []);

  useEffect(() => {
    sync();
    const interval = window.setInterval(sync, 15000);
    const events = new EventSource("/api/queue/stream");
    const update = (event: MessageEvent) => {
      try {
        setQueue(JSON.parse(event.data));
      } catch {
        sync();
      }
    };
    events.addEventListener("slot_update", update);
    events.addEventListener("new_order", update);
    events.addEventListener("queue_update", update);
    events.onerror = () => events.close();
    return () => {
      window.clearInterval(interval);
      events.close();
    };
  }, [sync]);

  const activeSlots = queue?.activeSlots ?? 0;
  const maxSlots = queue?.maxSlots ?? 0;
  const availableSlots = queue?.availableSlots ?? 0;
  const percent = maxSlots > 0 ? Math.min(100, Math.round((activeSlots / maxSlots) * 100)) : 0;
  const isFull = maxSlots > 0 && availableSlots === 0;
  const isLimited = !isFull && availableSlots <= 2;
  const label = isFull ? "Antrean penuh" : isLimited ? "Slot terbatas" : "Slot tersedia";
  const tone = isFull
    ? "border-[#9F2F2D]/25 bg-[#FDEBEC] text-[#9F2F2D]"
    : isLimited
    ? "border-[#956400]/25 bg-[#FBF3DB] text-[#956400]"
    : "border-[#0038FF]/20 bg-[#0038FF]/5 text-[#0038FF]";

  return (
    <section className="max-w-6xl mx-auto px-6 py-20 border-t border-[#1A1A1E]/10" aria-live="polite">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div className="max-w-xl">
          <p className="font-mono text-xs tracking-widest text-[#0038FF] mb-2">KAPASITAS PRODUKSI</p>
          <h2 className="font-heading text-3xl font-semibold text-[#1A1A1E] tracking-tight">
            Tahu kapan waktu terbaik untuk mulai.
          </h2>
          <p className="text-sm leading-relaxed text-[#1A1A1E]/55 mt-3">
            {status === "offline"
              ? "Kapasitas sedang tidak dapat dimuat. Coba refresh untuk melihat data terbaru."
              : queue?.note || "Kami sedang mengambil kapasitas terbaru."}
          </p>
        </div>
        <span className={`shrink-0 font-mono text-[11px] tracking-widest uppercase px-3 py-1.5 rounded-full border ${tone}`}>
          {status === "loading" ? "Memuat" : label}
        </span>
      </div>

      <div className="rounded-2xl border border-[#1A1A1E]/10 bg-white overflow-hidden">
        <div className="p-6 sm:p-8">
          {status === "loading" ? (
            <div className="space-y-3">
              <Skeleton className="h-2 w-full" />
              <div className="flex justify-between">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ) : (
            <>
              <div className="h-2 overflow-hidden rounded-full bg-[#1A1A1E]/8">
                <div
                  className="h-full rounded-full bg-[#0038FF] transition-all duration-500"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <div className="mt-3 flex justify-between font-mono text-xs text-[#1A1A1E]/45">
                <span>{activeSlots} dari {maxSlots || "–"} slot terisi</span>
                <span>{percent}% terpakai</span>
              </div>
            </>
          )}
        </div>

        <TicketDivider />

        <div className="p-6 sm:p-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-mono tracking-widest text-[#1A1A1E]/40 mb-1">SLOT TERSEDIA</p>
            {status === "loading" ? (
              <Skeleton className="h-10 w-16" />
            ) : (
              <p className="font-heading text-4xl font-semibold text-[#0038FF]">{availableSlots}</p>
            )}
          </div>
          <Link
            href="/lacak"
            className="flex items-center gap-2 bg-[#0038FF] text-white text-sm font-medium px-5 py-3 rounded-2xl hover:bg-[#0030DB] transition-colors"
          >
            Lacak pesanan <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function ServicePackages({ onOrder, onConsult }: { onOrder: () => void; onConsult: () => void }) {
  const services = useServices();
  return <section className="max-w-6xl mx-auto px-6 -mt-6 pb-20"><div className="max-w-xl mb-10"><p className="font-mono text-xs tracking-widest text-[#0038FF] mb-2">LAYANAN</p><h2 className="font-heading text-4xl tracking-tight">Pilih paket yang pas.</h2><p className="text-sm leading-relaxed text-[#1A1A1E]/55 mt-3">Harga awal transparan, ruang lingkup jelas, dan konsultasi bisa dipisahkan dari pesanan.</p></div><div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">{services.map((service, index) => { const Icon = service.icon; const consult = service.id === "konsultasi"; return <motion.article key={service.id} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .25 }} transition={{ delay: index * .06, duration: .45 }} className="border border-[#1A1A1E]/10 bg-white rounded-2xl p-6 flex flex-col min-h-56"><Icon className="w-5 h-5 text-[#0038FF]" /><h3 className="font-semibold mt-8">{service.title}</h3><p className="text-sm leading-relaxed text-[#1A1A1E]/55 mt-2">{service.desc}</p><p className="font-mono text-xs text-[#1A1A1E]/45 mt-5">{consult ? "Mulai dari diskusi singkat" : "Mulai dari Rp 25.000"}</p><button onClick={consult ? onConsult : onOrder} className="mt-auto pt-5 text-left text-sm font-semibold text-[#0038FF]">{consult ? "Atur konsultasi" : "Pesan layanan"}</button></motion.article>; })}</div></section>;
}

function TestimonialsSection() {
  const testimonials = useTestimonials();
  const projectLabels = ["Logo Warung Kopi Aksara", "Banner Bazar Sekolah", "Flyer Promo Toko Klarin", "Brosur Company Profile Maju Jaya"];
  return <section className="max-w-6xl mx-auto px-6 py-20 border-t border-[#1A1A1E]/10"><div className="max-w-xl mb-10"><p className="font-mono text-xs tracking-widest text-[#0038FF] mb-2">PENGALAMAN KLIEN</p><h2 className="font-heading text-4xl tracking-tight">Karya yang terasa selesai.</h2></div><div className="grid md:grid-cols-2 gap-px border border-[#1A1A1E]/10 bg-[#1A1A1E]/10">{testimonials.map((item, index) => <article key={item.name} className="bg-[#F9F9FB] p-6 sm:p-8"><p className="text-base leading-relaxed text-[#1A1A1E]">“{item.text}”</p><div className="mt-7 flex items-end justify-between gap-4"><div><p className="text-sm font-semibold">{item.name}</p><p className="text-xs text-[#1A1A1E]/50 mt-1">{item.role}</p></div><span className="text-[11px] text-[#0038FF] text-right">{projectLabels[index]}</span></div></article>)}</div></section>;
}

function ConsultationModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { lang } = useLang();
  const [name, setName] = useState("");
  const [need, setNeed] = useState("");
  const submit = () => {
    if (!name.trim() || !need.trim()) return;
    const intro = lang === "id" ? "Halo Kookiez, saya ingin konsultasi desain." : "Hi Kookiez, I'd like a design consultation.";
    window.open(waLink(`${intro}\n\nNama: ${name}\nKebutuhan: ${need}`), "_blank", "noopener,noreferrer");
    onClose();
  };
  return (
    <AnimatePresence>
      {open && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-50 bg-[#1A1A1E]/40 backdrop-blur-sm flex items-center justify-center p-6">
        <motion.div initial={{ y: 18, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 18, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="bg-[#FBFBFA] border border-[#1A1A1E]/10 rounded-2xl max-w-md w-full p-7">
          <div className="flex justify-between items-start gap-4 mb-5"><div><p className="font-mono text-[10px] tracking-widest text-[#0038FF]">KONSULTASI DESAIN</p><h2 className="font-heading text-3xl leading-none mt-2">Cari arah sebelum mulai.</h2></div><button onClick={onClose} aria-label="Tutup"><X className="w-5 h-5 text-[#1A1A1E]/45" /></button></div>
          <p className="text-sm leading-relaxed text-[#1A1A1E]/55 mb-5">Form ini hanya untuk diskusi awal. Tidak membuat pesanan atau pembayaran.</p>
          <label className="block text-sm font-medium mb-2">Nama kamu</label><input value={name} onChange={(e) => setName(e.target.value)} className="w-full border border-[#1A1A1E]/15 bg-white rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-[#0038FF]" placeholder="Nama panggilan" />
          <label className="block text-sm font-medium mt-4 mb-2">Yang ingin dibahas</label><textarea value={need} onChange={(e) => setNeed(e.target.value)} rows={4} className="w-full border border-[#1A1A1E]/15 bg-white rounded-xl px-3 py-3 text-sm resize-none focus:outline-none focus:border-[#0038FF]" placeholder="Contoh: perlu logo untuk usaha kopi, belum yakin gaya dan warna." />
          <button disabled={!name.trim() || !need.trim()} onClick={submit} className="mt-5 w-full bg-[#1A1A1E] text-white rounded-xl py-3 text-sm font-medium disabled:opacity-40">Mulai konsultasi via WhatsApp</button>
        </motion.div>
      </motion.div>}
    </AnimatePresence>
  );
}

function WorkLightbox({ item, onClose }: { item: DisplayWorkItem | null; onClose: () => void }) {
  const { t } = useLang();
  if (!item) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-[#1A1A1E]/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* Container Gambar (Size Asli & Uncropped) */}
        <div 
          className="relative w-full bg-[#1A1A1E]/5 flex items-center justify-center overflow-hidden shrink-0"
          style={{ backgroundColor: item.hue }}
        >
          {item.image ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={item.image}
              alt={item.title}
              className="w-full h-auto max-h-[65vh] object-contain block"
            />
          ) : (
            <div className="h-64 w-full flex items-center justify-center text-xs font-mono text-[#1A1A1E]/40">
              [ Tanpa Gambar ]
            </div>
          )}

          {/* Tombol Close */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors z-10 backdrop-blur-sm"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Badge ID */}
          <span className="absolute bottom-3 left-4 font-mono text-xs text-white bg-black/50 px-2.5 py-1 rounded-xl backdrop-blur-sm z-10">
            #{typeof item.id === "number" ? String(item.id).padStart(3, "0") : "CUSTOM"}
          </span>
        </div>

        {/* Deskripsi */}
        <div className="p-6 overflow-y-auto">
          <span className="font-mono text-[10px] tracking-widest text-[#0038FF]">{item.tag.toUpperCase()}</span>
          <h3 className="font-heading text-xl font-semibold text-[#1A1A1E] mt-1">{item.title}</h3>
          <p className="text-sm text-[#1A1A1E]/60 mt-2 leading-relaxed">
            {item.description || `Contoh hasil pengerjaan untuk kategori ${item.tag}.`}
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

function WorkSection({ refProp, onOrder }: { refProp: RefObject<HTMLElement>; onOrder: () => void }) {
  const { t } = useLang();
  const services = useServices();
  const [filter, setFilter] = useState<ServiceId | "all">("all");
  const [active, setActive] = useState<DisplayWorkItem | null>(null);
  const [work, setWork] = useState<DisplayWorkItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    const sync = async () => {
      const published = await fetchPublishedPortfolio();
      if (cancelled) return;
      setWork([...getCustomWorkItems(), ...published]);
    };
    sync();
    window.addEventListener(PORTFOLIO_UPDATED_EVENT, sync);
    return () => {
      cancelled = true;
      window.removeEventListener(PORTFOLIO_UPDATED_EVENT, sync);
    };
  }, []);

  const filtered = filter === "all" ? work : work.filter((w) => w.category === filter);

  return (
    <section ref={refProp} className="max-w-6xl mx-auto px-6 py-20 border-t border-[#1A1A1E]/10">
      <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
        <div>
          <p className="font-mono text-xs tracking-widest text-[#0038FF] mb-2">{t("work_kicker")}</p>
          <h2 className="font-heading text-3xl font-semibold text-[#1A1A1E] tracking-tight">{t("work_title")}</h2>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        <button
          onClick={() => setFilter("all")}
          className={`text-xs font-mono px-3 py-1.5 rounded-full border transition-colors ${
            filter === "all" ? "border-[#0038FF] text-[#0038FF] bg-[#0038FF]/5" : "border-[#1A1A1E]/15 text-[#1A1A1E]/60 hover:border-[#1A1A1E]/30"
          }`}
        >
          {t("work_filter_all")}
        </button>
        {services.map((s) => (
          <button
            key={s.id}
            onClick={() => setFilter(s.id)}
            className={`text-xs font-mono px-3 py-1.5 rounded-full border transition-colors ${
              filter === s.id ? "border-[#0038FF] text-[#0038FF] bg-[#0038FF]/5" : "border-[#1A1A1E]/15 text-[#1A1A1E]/60 hover:border-[#1A1A1E]/30"
            }`}
          >
            {s.title}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((w) => (
          <button
            key={w.id}
            onClick={() => setActive(w)}
            className="group text-left rounded-2xl border border-[#1A1A1E]/10 overflow-hidden hover:border-[#1A1A1E]/25 transition-colors"
          >
            <div className="h-40 relative overflow-hidden bg-cover bg-center" style={{ backgroundColor: w.hue, backgroundImage: w.image ? `url(${w.image})` : undefined }}>
              <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors flex items-center justify-center">
                <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[11px] font-mono text-white bg-black/30 px-2.5 py-1 rounded-full">
                  {t("work_view")}
                </span>
              </div>
              <span className="absolute bottom-3 left-4 font-mono text-[11px] text-white/70">
                #{typeof w.id === "number" ? String(w.id).padStart(3, "0") : "CUSTOM"}
              </span>
              <span className="absolute top-3 right-3 font-mono text-[10px] text-white/80 border border-dashed border-white/30 rounded-full px-2 py-1 rotate-3">
                {w.tag}
              </span>
            </div>
            <div className="p-4">
              <span className="font-medium text-[#1A1A1E] text-sm">{w.title}</span>
            </div>
          </button>
        ))}
      </div>

      <AnimatePresence>{active && <WorkLightbox item={active} onClose={() => setActive(null)} />}</AnimatePresence>
    </section>
  );
}

function TermsSection({ refProp }: { refProp: RefObject<HTMLElement> }) {
  const { t } = useLang();
  const terms = useTerms();
  return (
    <section ref={refProp} className="max-w-3xl mx-auto px-6 py-20 border-t border-[#1A1A1E]/10">
      <p className="font-mono text-xs tracking-widest text-[#0038FF] mb-2">{t("terms_kicker")}</p>
      <h2 className="font-heading text-3xl font-semibold text-[#1A1A1E] tracking-tight mb-10">{t("terms_title")}</h2>
      <Accordion items={terms} />
    </section>
  );
}

function Footer({ onOrder }: { onOrder: () => void }) {
  const { t } = useLang();
  return (
    <footer className="border-t border-[#1A1A1E]/10">
      <div className="max-w-6xl mx-auto px-6 py-14 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>
          <span className="font-heading font-semibold text-lg text-[#1A1A1E]">
            kookiez<span className="text-[#0038FF]">.</span>
          </span>
          <p className="text-sm text-[#1A1A1E]/45 mt-1">{t("footer_tagline")}</p>
          <div className="flex items-center gap-4 mt-4">
            <a
              href="https://instagram.com/kookiez.id"
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram"
              className="flex items-center gap-1.5 text-xs text-[#1A1A1E]/45 hover:text-[#0038FF] transition-colors"
            >
              <Instagram className="w-4 h-4" /> @kookiez.id
            </a>
            <a
              href="mailto:hello@kookiez.id"
              aria-label="Email"
              className="flex items-center gap-1.5 text-xs text-[#1A1A1E]/45 hover:text-[#0038FF] transition-colors"
            >
              <Mail className="w-4 h-4" /> hello@kookiez.id
            </a>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={waLink("Halo Kookiez, aku mau tanya-tanya soal jasa desain")}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 border border-[#1A1A1E]/15 text-[#1A1A1E] font-medium px-5 py-3 rounded-2xl hover:border-[#1A1A1E]/30 transition-colors"
          >
            <MessageCircle className="w-4 h-4" style={{ color: "#25D366" }} /> {t("nav_cs")}
          </a>
          <button
            onClick={onOrder}
            className="flex items-center gap-2 bg-[#1A1A1E] text-white font-medium px-5 py-3 rounded-2xl hover:bg-[#1A1A1E]/85 transition-colors"
          >
            {t("nav_order")} <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-6 pb-8 text-xs text-[#1A1A1E]/35 font-mono">
        <span>© {new Date().getFullYear()} Kookiez Digital Creative</span>
      </div>
    </footer>
  );
}

/* ------------------------------------------------------------------ */
/*  Root — default export untuk app/page.tsx                          */
/* ------------------------------------------------------------------ */

export default function Page() {
  const { status } = useSession();
  const [orderOpen, setOrderOpen] = useState(false);
  const [loginPromptOpen, setLoginPromptOpen] = useState(false);
  const [consultationOpen, setConsultationOpen] = useState(false);
  const [successData, setSuccessData] = useState<SuccessData | null>(null);

  const home = useRef<HTMLDivElement>(null);
  const work = useRef<HTMLElement>(null);
  const terms = useRef<HTMLElement>(null);

  const handleOrder = () => {
    if (status === "authenticated") {
      setOrderOpen(true);
    } else {
      setLoginPromptOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F9FB] text-[#1A1A1E] font-sans pt-16">
      <Navbar onOrder={handleOrder} onConsult={() => setConsultationOpen(true)} refs={{ home, work, terms }} />
      <div ref={home}>
        <Hero onOrder={handleOrder} onConsult={() => setConsultationOpen(true)} workRef={work} />
      </div>
      <ServicePackages onOrder={handleOrder} onConsult={() => setConsultationOpen(true)} />
      <WorkSection refProp={work} onOrder={handleOrder} />
      <TestimonialsSection />
      <AvailabilityBanner />
      <TermsSection refProp={terms} />
      <Footer onOrder={handleOrder} />

      <FloatingWhatsApp />

      <AnimatePresence>
        {orderOpen && (
          <OrderModal open={orderOpen} onClose={() => setOrderOpen(false)} onSuccess={(data) => setSuccessData(data)} />
        )}
      </AnimatePresence>

      <AnimatePresence>{successData && <SuccessModal data={successData} onClose={() => setSuccessData(null)} />}</AnimatePresence>

      <LoginPromptModal open={loginPromptOpen} onClose={() => setLoginPromptOpen(false)} />
      <ConsultationModal open={consultationOpen} onClose={() => setConsultationOpen(false)} />
    </div>
  );
}

type DisplayWorkItem = Omit<WorkItem, "id" | "category"> & {
  id: number | string;
  category: ServiceId | "lainnya";
  image?: string;
  description?: string;
};
