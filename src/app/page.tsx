"use client";

import { useState, useRef, useEffect, useCallback, type ChangeEvent, type DragEvent, type KeyboardEvent, type RefObject } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu, X, ArrowRight, ArrowLeft, ArrowUpRight, Check, ChevronDown,
  UploadCloud, FileText, Trash2,
  QrCode, Landmark, CreditCard, ShieldCheck, Loader2, CheckCircle2,
  Calendar, Link2, Mail, LogOut, Instagram,
  MessageCircle, Globe, Copy, AlertCircle,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import {
  useLang, useServices, useBudgetTiers, useTerms,
  type ServiceId, type BudgetId, type ServiceItem, type BudgetTier, type WorkItem, type TermItem,
} from "@/lib/i18n";
import { clearOrderDraft, getOrderDraft, saveOrderDraft } from "@/lib/orders";
import { getCustomWorkItems, fetchPublishedPortfolio, PORTFOLIO_UPDATED_EVENT, type CustomWorkItem } from "@/lib/portfolio";
import Modal from "@/components/Modal";

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
type OrderPrefill = { service?: ServiceId; budget?: BudgetId; deadline?: string };
const MAX_BRIEF_FILES = 10;
const MAX_BRIEF_FILE_SIZE = 10 * 1024 * 1024;
const BRIEF_FILE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf", "application/zip"]);
const BRIEF_FILE_ACCEPT = ".jpg,.jpeg,.png,.webp,.pdf,.zip";
const BRIEF_FILE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".pdf", ".zip"]);

interface UploadedFile {
  id: string;
  name: string;
  size: string;
  url?: string;
  uploading?: boolean;
  error?: string;
}

interface BriefData {
  scope: string;
  refs: string;
  customerName: string;
  files: UploadedFile[];
}

interface BudgetData {
  budget: BudgetId | null;
  deadline: string;
}

interface OrderState {
  plan: PaymentPlan;
  method: PaymentMethod;
  promoCode: string;
  promoPercent: number;
  promoMessage: string;
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
  paymentRoute?: "whatsapp_fallback" | "online_pending";
  whatsappUrl?: string;
}

interface NavRefs {
  home: RefObject<HTMLDivElement>;
  work: RefObject<HTMLElement>;
  terms: RefObject<HTMLElement>;
}

const formatIDR = (n: number): string =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);


function Skeleton({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`relative block overflow-hidden rounded-md bg-ink/[0.07] before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.4s_infinite] before:bg-gradient-to-r before:from-transparent before:via-card/60 before:to-transparent ${className}`}
    />
  );
}

function TicketDivider() {
  return <div className="docket-rule my-1" aria-hidden="true" />;
}

function StepDots({ step }: { step: number }) {
  const { t } = useLang();
  const labels = t("step_labels") as string[];
  return (
    <ol className="flex items-center gap-1.5 overflow-x-auto">
      {labels.map((label, i) => {
        const n = i + 1;
        const active = n === step;
        const done = n < step;
        return (
          <li key={label} className="flex shrink-0 items-center gap-1.5">
            <span
              aria-current={active ? "step" : undefined}
              className={`flex h-7 w-7 items-center justify-center rounded-full border font-mono text-[11px] ${
                active
                  ? "border-accent bg-accent text-white"
                  : done
                  ? "border-ink/30 bg-ink/[0.04] text-ink"
                  : "border-line text-muted"
              }`}
            >
              {done ? <Check className="h-3.5 w-3.5" /> : `0${n}`}
            </span>
            <span
              className={`hidden font-mono text-[11px] uppercase tracking-[0.08em] sm:inline ${
                active ? "text-ink" : "text-muted"
              }`}
            >
              {label}
            </span>
            {n < 4 && <span aria-hidden="true" className="mx-1 h-px w-3 bg-line sm:w-5" />}
          </li>
        );
      })}
    </ol>
  );
}

function Accordion({ items }: { items: TermItem[] }) {
  const [open, setOpen] = useState<number>(0);
  return (
    <div className="border-t border-line">
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={item.title} className="border-b border-line">
            <button
              onClick={() => setOpen(isOpen ? -1 : i)}
              className="group flex min-h-[60px] w-full items-center gap-4 py-5 text-left"
              aria-expanded={isOpen}
            >
              <span className="font-mono text-[11px] text-muted">{String(i + 1).padStart(2, "0")}</span>
              <span className="flex-1 text-[15px] font-medium text-ink transition-colors group-hover:text-accent">
                {item.title}
              </span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-muted transition-transform duration-200 ${
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
                  <p className="max-w-2xl pb-6 pl-8 text-sm leading-relaxed text-muted">{item.body}</p>
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
  const { lang, setLang } = useLang();
  return (
    <div
      className={`inline-flex items-center rounded-full border border-line bg-card p-0.5 ${className}`}
      role="group"
      aria-label="Pilih bahasa"
    >
      {(["id", "en"] as const).map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => setLang(value)}
          aria-pressed={lang === value}
          className={`flex h-11 min-w-11 items-center justify-center rounded-full px-2 font-mono text-[11px] uppercase transition-colors ${
            lang === value ? "bg-ink text-card" : "text-muted hover:text-ink"
          }`}
        >
          {value}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Langkah-langkah formulir pembelian                                 */
/* ------------------------------------------------------------------ */

function StepService({ value, onChange }: { value: ServiceId | null; onChange: (id: ServiceId) => void }) {
  const { t } = useLang();
  const services = useServices().filter((service) => service.id !== "konsultasi");
  return (
    <div>
      <p className="kicker mb-2">{t("step1_kicker")}</p>
      <h2 className="display mb-6 text-3xl">{t("step1_title")}</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {services.map((s) => {
          const Icon = s.icon;
          const active = value === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onChange(s.id)}
              aria-pressed={active}
              className={`relative rounded-xl border p-4 text-left transition-colors ${
                active
                  ? "border-accent bg-accent/5"
                  : "border-line bg-card hover:border-ink/30"
              }`}
            >
              <div
                className={`mb-4 flex h-9 w-9 items-center justify-center rounded-lg ${
                  active ? "bg-accent text-white" : "bg-ink/5 text-muted"
                }`}
              >
                <Icon className="h-[18px] w-[18px]" />
              </div>
              <div className="text-[15px] font-semibold text-ink">{s.title}</div>
              <div className="mt-1 text-sm leading-relaxed text-muted">{s.desc}</div>
              {active && <Check className="absolute right-3 top-3 h-4 w-4 text-accent" />}
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
  const [dragActive, setDragActive] = useState(false);
  const [fileError, setFileError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // Upload nyata ke /api/upload (lihat route-nya untuk detail penyimpanan file).
  const addFiles = (fileList: FileList) => {
    const selected = Array.from(fileList);
    const invalid = selected.find((file) => {
      const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
      return !BRIEF_FILE_TYPES.has(file.type) || !BRIEF_FILE_EXTENSIONS.has(extension) || file.size > MAX_BRIEF_FILE_SIZE;
    });
    if (invalid) {
      setFileError(`${invalid.name}: gunakan JPG, PNG, WebP, PDF, atau ZIP dengan ukuran maksimal 10 MB.`);
      return;
    }
    if (data.files.length + selected.length > MAX_BRIEF_FILES) {
      setFileError(`Maksimal ${MAX_BRIEF_FILES} file dapat dilampirkan.`);
      return;
    }
    setFileError("");
    const incoming: UploadedFile[] = selected.map((f) => ({
      id: crypto.randomUUID(),
      name: f.name,
      size: (f.size / 1024).toFixed(0) + " KB",
      uploading: true,
    }));
    onChange((prev) => ({ ...prev, files: [...prev.files, ...incoming] }));

    selected.forEach(async (file, index) => {
      const fileId = incoming[index].id;
      try {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: form });
        const json = await res.json();
        if (!res.ok || !json?.url) throw new Error(json?.error || "Upload gagal.");
        onChange((prev) => ({
          ...prev,
          files: prev.files.map((f) =>
            f.id === fileId ? { ...f, uploading: false, url: json.url } : f
          ),
        }));
      } catch (error) {
        onChange((prev) => ({
          ...prev,
          files: prev.files.map((f) => (f.id === fileId ? { ...f, uploading: false, error: error instanceof Error ? error.message : "Upload gagal." } : f)),
        }));
      }
    });
  };

  const removeFile = (id: string) => {
    onChange((prev) => ({ ...prev, files: prev.files.filter((f) => f.id !== id) }));
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="kicker mb-2">{t("step2_kicker")}</p>
        <h2 className="display text-3xl">{t("step2_title")}</h2>
      </div>

      <div>
        <label htmlFor="order-name" className="ui-label">
          {t("step2_name_label")}
        </label>
        <input
          id="order-name"
          type="text"
          autoComplete="name"
          value={data.customerName}
          onChange={(e) => onChange({ ...data, customerName: e.target.value })}
          placeholder={t("step2_name_placeholder")}
          className="ui-input"
        />
      </div>

      <div>
        <label htmlFor="order-scope" className="ui-label">
          {t("step2_detail_label")}
        </label>
        <textarea
          id="order-scope"
          rows={4}
          value={data.scope}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onChange({ ...data, scope: e.target.value })}
          placeholder={t("step2_detail_placeholder")}
          className="ui-input resize-none"
        />
      </div>

      <div>
        <label htmlFor="order-refs" className="ui-label">
          {t("step2_ref_label")}
        </label>
        <div className="relative">
          <Link2 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            id="order-refs"
            type="text"
            value={data.refs}
            onChange={(e: ChangeEvent<HTMLInputElement>) => onChange({ ...data, refs: e.target.value })}
            placeholder={t("step2_ref_placeholder")}
            className="ui-input !pl-10"
          />
        </div>
      </div>

      <div>
        <span className="ui-label">{t("step2_file_label")}</span>
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
          role="button"
          tabIndex={0}
          onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              fileRef.current?.click();
            }
          }}
          className={`cursor-pointer select-none rounded-xl border border-dashed p-6 text-center transition-colors ${
            dragActive ? "border-accent bg-accent/5" : "border-ink/25 bg-card hover:border-ink/45"
          }`}
        >
          <input
            ref={fileRef}
            type="file"
            multiple
            accept={BRIEF_FILE_ACCEPT}
            className="hidden"
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              if (e.target.files?.length) addFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <UploadCloud className="mx-auto mb-2 h-5 w-5 text-muted" />
          <p className="text-sm text-muted">
            {t("step2_file_drag")} <span className="font-semibold text-accent">{t("step2_file_choose")}</span>
          </p>
          <p className="mt-1 text-xs text-muted">{t("step2_file_hint")}</p>
        </div>
        <p className="ui-hint">JPG, PNG, WebP, PDF, ZIP · maksimal 10 MB per file · maksimal 10 file.</p>
        {fileError && (
          <p role="alert" className="ui-error flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5" /> {fileError}
          </p>
        )}

        {data.files.length > 0 && (
          <ul className="mt-3 space-y-2">
            {data.files.map((f) => (
              <li
                key={f.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-line bg-paper/60 px-3 py-2 text-sm"
              >
                <span className="flex min-w-0 items-center gap-2 text-ink">
                  <FileText className="h-4 w-4 shrink-0 text-muted" />
                  <span className="truncate">{f.name}</span>
                  <span className="shrink-0 font-mono text-[11px] text-muted">{f.size}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className={`font-mono text-[11px] ${f.error ? "text-danger" : "text-accent"}`}>
                    {f.uploading ? t("step2_file_uploading") : f.error ? f.error : t("step2_file_uploaded")}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFile(f.id)}
                    aria-label={`Hapus ${f.name}`}
                    className="flex h-11 w-11 items-center justify-center rounded-lg text-muted hover:bg-ink/5 hover:text-danger"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function StepBudget({ data, onChange }: { data: BudgetData; onChange: (d: BudgetData) => void }) {
  const { t } = useLang();
  const budgetTiers = useBudgetTiers();
  return (
    <div className="space-y-6">
      <div>
        <p className="kicker mb-2">{t("step3_kicker")}</p>
        <h2 className="display text-3xl">{t("step3_title")}</h2>
      </div>

      <div>
        <span className="ui-label">{t("step3_budget_label")}</span>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {budgetTiers.map((tier) => {
            const active = data.budget === tier.id;
            return (
              <button
                key={tier.id}
                type="button"
                onClick={() => onChange({ ...data, budget: tier.id })}
                aria-pressed={active}
                className={`flex items-center justify-between gap-3 rounded-xl border p-4 text-left transition-colors ${
                  active ? "border-accent bg-accent/5" : "border-line bg-card hover:border-ink/30"
                }`}
              >
                <span>
                  <span className="block text-sm font-semibold text-ink">{tier.label}</span>
                  <span className="mt-1 block font-mono text-[11px] text-muted">{tier.range}</span>
                </span>
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                    active ? "border-accent bg-accent text-white" : "border-line text-transparent"
                  }`}
                >
                  <Check className="h-3 w-3" />
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label htmlFor="order-deadline" className="ui-label">
          {t("step3_deadline_label")}
        </label>
        <div className="relative">
          <Calendar className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            id="order-deadline"
            type="date"
            value={data.deadline}
            onChange={(e: ChangeEvent<HTMLInputElement>) => onChange({ ...data, deadline: e.target.value })}
            className="ui-input !pl-10"
          />
        </div>
        <p className="ui-hint">Kosongkan kalau belum ada tenggat pasti.</p>
      </div>
    </div>
  );
}

function StepCheckout({
  order,
  onChange,
  onPay,
  paying,
  onlinePaymentEnabled,
  onValidatePromo,
}: {
  order: CheckoutOrder;
  onChange: (o: OrderState) => void;
  onPay: () => void;
  paying: boolean;
  onlinePaymentEnabled: boolean;
  onValidatePromo: () => void;
}) {
  const { t } = useLang();
  const services = useServices();
  const budgetTiers = useBudgetTiers();
  const service = services.find((s) => s.id === order.service);
  const tier = budgetTiers.find((tItem) => tItem.id === order.budget);
  const isCustom = tier?.base == null;
  const base = tier?.base ?? 0;
  const packageDiscounted = Math.round(base * (1 - (tier?.promoPercent ?? 0) / 100));
  const discountedBase = Math.round(packageDiscounted * (1 - order.promoPercent / 100));
  const amount = order.plan === "deposit" ? Math.round(discountedBase * 0.3) : discountedBase;

  return (
    <div>
      <p className="kicker mb-2">{t("step4_kicker")}</p>
      <h2 className="display mb-6 text-3xl">{t("step4_title")}</h2>

      <div className="docket overflow-hidden">
        <div className="space-y-3 p-5 text-sm">
          <p className="mono-label">Ringkasan brief</p>
          <div className="flex justify-between gap-4">
            <span className="text-muted">{t("step4_service")}</span>
            <span className="text-right font-medium text-ink">{service?.title}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted">{t("step4_budget")}</span>
            <span className="text-right font-medium text-ink">
              {tier?.label} · {tier?.range}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted">{t("step4_deadline")}</span>
            <span className="text-right font-medium text-ink">{order.deadline || t("step4_flexible")}</span>
          </div>

          {!isCustom && (
            <div className="border-t border-line pt-3">
              <label htmlFor="promo-code" className="ui-label">
                Kode promo
              </label>
              <div className="flex gap-2">
                <input
                  id="promo-code"
                  value={order.promoCode}
                  onChange={(e) =>
                    onChange({ ...order, promoCode: e.target.value.toUpperCase(), promoPercent: 0, promoMessage: "" })
                  }
                  placeholder="Masukkan kode promo"
                  className="ui-input min-w-0 flex-1 font-mono"
                />
                <button type="button" onClick={onValidatePromo} disabled={!order.promoCode} className="btn btn-dark shrink-0">
                  Cek
                </button>
              </div>
              {order.promoMessage && <p className="ui-hint">{order.promoMessage}</p>}
            </div>
          )}
        </div>

        <TicketDivider />

        <div className="p-5">
          {isCustom ? (
            <p className="text-sm leading-relaxed text-muted">{t("step4_custom_note")}</p>
          ) : (
            <div className="space-y-5">
              <fieldset>
                <legend className="ui-label">{t("step4_pay_method")}</legend>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { id: "deposit", label: t("step4_pay_deposit"), sub: formatIDR(Math.round(base * 0.3)) },
                      { id: "full", label: t("step4_pay_full"), sub: formatIDR(base) },
                    ] as { id: PaymentPlan; label: string; sub: string }[]
                  ).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => onChange({ ...order, plan: p.id })}
                      aria-pressed={order.plan === p.id}
                      className={`rounded-xl border p-3.5 text-left transition-colors ${
                        order.plan === p.id ? "border-accent bg-accent/5" : "border-line bg-card hover:border-ink/30"
                      }`}
                    >
                      <span className="block text-sm font-semibold text-ink">{p.label}</span>
                      <span className="mt-1 block font-mono text-[11px] text-muted">{p.sub}</span>
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend className="ui-label">{t("step4_pay_with")}</legend>
                <div className="grid grid-cols-3 gap-2">
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
                        type="button"
                        onClick={() => onChange({ ...order, method: m.id })}
                        aria-pressed={active}
                        className={`flex min-h-[64px] flex-col items-center justify-center gap-1.5 rounded-lg border transition-colors ${
                          active
                            ? "border-accent bg-accent/5 text-accent"
                            : "border-line bg-card text-muted hover:border-ink/30"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="text-xs font-medium">{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              {onlinePaymentEnabled ? (
                <PaymentMethodPanel method={order.method} />
              ) : (
                <div className="rounded-lg border border-pending/30 bg-pending/10 p-4 text-sm leading-relaxed text-pending">
                  Payment online sedang tidak tersedia. Setelah order tersimpan, kamu akan diarahkan ke WhatsApp CS untuk konfirmasi.
                </div>
              )}

              <div className="flex items-end justify-between gap-4 border-t border-line pt-4">
                <span className="text-sm text-muted">{t("step4_total")}</span>
                <span className="font-mono text-2xl font-medium tracking-tight text-ink">{formatIDR(amount)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <button type="button" onClick={onPay} disabled={paying} className="btn btn-primary mt-5 w-full">
        {paying ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> {t("step4_processing")}
          </>
        ) : isCustom ? (
          <>
            {t("step4_ask_quote")} <ArrowRight className="h-4 w-4" />
          </>
        ) : (
          <>
            <ShieldCheck className="h-4 w-4" />{" "}
            {onlinePaymentEnabled ? `${t("step4_confirm_pay")} ${formatIDR(amount)}` : "Simpan order & buka WhatsApp"}
          </>
        )}
      </button>
    </div>
  );
}

function PaymentMethodPanel({ method }: { method: PaymentMethod }) {
  if (method === "qris") {
    return (
      <div className="flex flex-col items-center rounded-xl border border-line bg-paper/50 p-5">
        <div className="mb-2 flex h-32 w-32 items-center justify-center rounded-lg border border-line bg-card">
          <QrCode className="h-12 w-12 text-muted" />
        </div>
        <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">Scan QRIS untuk bayar</p>
      </div>
    );
  }
  if (method === "va") {
    return (
      <div className="rounded-xl border border-line bg-paper/50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="text-muted">No. Virtual Account</span>
          <span className="font-mono font-medium text-ink">8808 1234 5678 90</span>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-3 rounded-xl border border-line bg-paper/50 p-4">
      <input placeholder="Nomor kartu" aria-label="Nomor kartu" className="ui-input" />
      <div className="flex gap-3">
        <input placeholder="MM/YY" aria-label="Masa berlaku" className="ui-input" />
        <input placeholder="CVC" aria-label="CVC" className="ui-input" />
      </div>
    </div>
  );
}

function OrderModal({
  open,
  onClose,
  onSuccess,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: (data: SuccessData) => void;
  initial?: OrderPrefill | null;
}) {
  const { t } = useLang();
  const { data: session } = useSession();
  const budgetTiers = useBudgetTiers();
  const services = useServices();
  const [step, setStep] = useState(1);
  const [service, setService] = useState<ServiceId | null>(null);
  const [brief, setBrief] = useState<BriefData>({ scope: "", refs: "", customerName: "", files: [] });
  const [budgetData, setBudgetData] = useState<BudgetData>({ budget: null, deadline: "" });
  const [orderState, setOrderState] = useState<OrderState>({ plan: "deposit", method: "qris", promoCode: "", promoPercent: 0, promoMessage: "" });
  const [paying, setPaying] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [onlinePaymentEnabled, setOnlinePaymentEnabled] = useState(false);
  const idempotencyKeyRef = useRef<string | null>(null);
  const namePrefilled = useRef(false);

  useEffect(() => {
    const draft = getOrderDraft();
    if (!draft) return;
    setService(draft.service as ServiceId | null);
    setBrief({ ...draft.brief, customerName: "", files: [] });
    setBudgetData({ budget: draft.budget as BudgetId | null, deadline: draft.deadline });
  }, []);

  useEffect(() => {
    if (!initial) return;
    if (initial.service) setService(initial.service);
    setBudgetData((prev) => ({
      budget: initial.budget ?? prev.budget,
      deadline: initial.deadline ?? prev.deadline,
    }));
  }, [initial]);

  useEffect(() => {
    if (!open) {
      setSubmitError("");
      return;
    }
    if (!namePrefilled.current && session?.user?.name) {
      setBrief((prev) => ({ ...prev, customerName: session.user.name ?? "" }));
      namePrefilled.current = true;
    }
  }, [open, session?.user?.name]);

  useEffect(() => {
    saveOrderDraft({ service, brief: { scope: brief.scope, refs: brief.refs }, budget: budgetData.budget, deadline: budgetData.deadline, updatedAt: new Date().toISOString() });
  }, [service, brief.scope, brief.refs, budgetData.budget, budgetData.deadline]);

  useEffect(() => {
    fetch("/api/site-settings", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setOnlinePaymentEnabled(data.onlinePaymentEnabled === true))
      .catch(() => setOnlinePaymentEnabled(false));
  }, []);

  const canNext =
    (step === 1 && service) ||
    (step === 2 && brief.scope.trim().length > 0 && brief.customerName.trim().length > 0) ||
    step === 3 && budgetData.budget ||
    step === 4;

  const handlePay = async () => {
    const references = brief.refs.split(/[\n,]+/).map((link) => link.trim()).filter(Boolean);
    const validReferences = references.length <= 5 && references.every((link) => {
      try {
        const url = new URL(link);
        return ["http:", "https:"].includes(url.protocol) && link.length <= 500;
      } catch {
        return false;
      }
    });
    if (!validReferences) {
      setSubmitError("Link referensi harus berupa URL http/https yang valid, maksimal 5 link.");
      setStep(2);
      return;
    }
    if (brief.files.some((file) => file.uploading || !file.url)) {
      setSubmitError("Tunggu sampai semua file selesai diunggah atau hapus file yang gagal.");
      setStep(2);
      return;
    }
    setSubmitError("");
    setPaying(true);
    idempotencyKeyRef.current ??= crypto.randomUUID();
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
          packageId: budgetData.budget,
          customerName: brief.customerName,
          promoCode: orderState.promoCode,
          budgetLabel: tier ? `${tier.label} · ${tier.range}` : "",
          deadline: budgetData.deadline,
          plan: orderState.plan,
          method: orderState.method,
          amount,
          isCustom,
          briefScope: brief.scope,
          briefRefs: brief.refs,
          fileNames: brief.files.map((f) => f.name),
          fileUrls: brief.files.flatMap((f) => f.url ? [new URL(f.url, window.location.origin).toString()] : []),
          idempotencyKey: idempotencyKeyRef.current,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Gagal masuk antrean");
      clearOrderDraft();
      window.localStorage.setItem("kookiez:last-order-code", result.code);
      onSuccess({ code: result.code, service: serviceObj?.title, tier: tier?.label, deadline: budgetData.deadline, plan: orderState.plan, method: orderState.method, amount, isCustom, paymentRoute: result.paymentRoute, whatsappUrl: result.whatsappUrl });
      if (result.paymentRoute === "whatsapp_fallback" && result.whatsappUrl) {
        window.open(result.whatsappUrl, "_blank", "noopener,noreferrer");
      }
      onClose();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Gagal masuk antrean. Coba lagi.");
    } finally {
      setPaying(false);
    }
  };

  const validatePromo = async () => {
    try {
      const res = await fetch("/api/promo-codes/validate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: orderState.promoCode, packageId: budgetData.budget }) });
      const result = await res.json();
      setOrderState((current) => ({ ...current, promoPercent: result.valid ? result.percent : 0, promoMessage: result.valid ? `Kode aktif: diskon ${result.percent}%` : result.error || "Kode promo tidak berlaku." }));
    } catch {
      setOrderState((current) => ({ ...current, promoPercent: 0, promoMessage: "Gagal memeriksa kode promo. Coba lagi." }));
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="order-title"
      align="bottom"
      className="rounded-t-2xl bg-paper sm:max-w-xl sm:rounded-2xl"
    >
      <h2 id="order-title" className="sr-only">
        Form order
      </h2>
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-line bg-paper/95 px-5 pb-4 pt-5 backdrop-blur-xl sm:px-6">
        <StepDots step={step} />
        <button
          type="button"
          onClick={onClose}
          aria-label={t("modal_close")}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-ink/5 hover:text-ink"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="px-5 py-6 sm:px-6">
        {submitError && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/5 p-3 text-sm leading-relaxed text-danger"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{submitError}</span>
          </div>
        )}
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
                onlinePaymentEnabled={onlinePaymentEnabled}
                onValidatePromo={validatePromo}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-line bg-paper/95 px-5 py-4 backdrop-blur-xl sm:px-6">
        {step > 1 ? (
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            className="flex min-h-[44px] items-center gap-1.5 text-sm font-medium text-muted hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" /> {t("modal_back")}
          </button>
        ) : (
          <span />
        )}
        {step < 4 && (
          <button
            type="button"
            onClick={() => setStep((s) => Math.min(4, s + 1))}
            disabled={!canNext}
            className="btn btn-primary"
          >
            {t("modal_next")} <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </Modal>
  );
}

function SuccessModal({ data, onClose }: { data: SuccessData | null; onClose: () => void }) {
  const { t } = useLang();
  const [copied, setCopied] = useState(false);
  if (!data) return null;

  const waMsg = `Halo Kookiez, aku baru order dengan kode ${data.code} (${data.service ?? "custom"}). Mau konfirmasi ya!`;

  return (
    <Modal
      open={Boolean(data)}
      onClose={onClose}
      labelledBy="success-title"
      className="max-w-sm rounded-2xl bg-card p-6 sm:p-7"
    >
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent/10">
          <CheckCircle2 className="h-7 w-7 text-accent" />
        </div>
        <p className="kicker mb-2">Order diterima</p>
        <h3 id="success-title" className="display text-2xl">
          {t("success_title")}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">{t("success_desc")}</p>
      </div>

      <div className="my-5 rounded-xl border border-dashed border-accent/40 bg-accent/5 p-4">
        <div className="mono-label mb-1 text-center">{t("success_code_label")}</div>
        <div className="flex items-center justify-center gap-2">
          <span className="font-mono text-lg font-medium tracking-wider text-accent">{data.code}</span>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(data.code);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            aria-label="Copy kode order"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-muted hover:bg-accent/10 hover:text-accent"
          >
            <Copy className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-1 min-h-4 text-center font-mono text-[11px] text-accent" aria-live="polite">
          {copied ? "Tersalin" : ""}
        </div>
      </div>

      <div className="mb-6 space-y-2 border-y border-line py-4 text-sm">
        <Row label={t("step4_service")} value={data.service} />
        <Row label={t("step4_budget")} value={data.tier} />
        <Row label={t("step4_deadline")} value={data.deadline || t("step4_flexible")} />
        {!data.isCustom && data.amount != null && <Row label={t("step4_total")} value={formatIDR(data.amount)} />}
      </div>

      <div className="flex flex-col gap-2">
        <Link href={`/lacak?code=${encodeURIComponent(data.code)}`} className="btn btn-dark w-full">
          {t("success_track_btn")}
        </Link>
        <a href={waLink(waMsg)} target="_blank" rel="noreferrer" className="btn btn-secondary w-full">
          <MessageCircle className="h-4 w-4" style={{ color: "#25D366" }} /> {t("success_wa_btn")}
        </a>
        <button type="button" onClick={onClose} className="btn btn-ghost w-full">
          {t("success_close")}
        </button>
      </div>
    </Modal>
  );
}

function LoginPromptModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} labelledBy="login-prompt-title" className="max-w-sm rounded-2xl bg-card p-6 sm:p-7">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent/10">
          <Mail className="h-7 w-7 text-accent" />
        </div>
        <p className="kicker mb-2">Perlu akun</p>
        <h3 id="login-prompt-title" className="display text-2xl">
          Masuk dulu, yuk
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Kamu perlu masuk dengan akun Gmail untuk bisa pesan sekarang.
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => signIn("google", { callbackUrl: "https://kookiez-kappa.vercel.app/" })}
          className="btn btn-primary w-full"
        >
          Masuk dengan Google
        </button>
        <button type="button" onClick={onClose} className="btn btn-ghost w-full">
          Batal
        </button>
      </div>
    </Modal>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4">
      <span className="shrink-0 text-muted">{label}</span>
      <span className="text-right font-medium text-ink">{value}</span>
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
      aria-label="Chat CS via WhatsApp"
      className="fixed bottom-5 right-5 z-40 flex min-h-[48px] items-center gap-2 rounded-full border border-ink/10 bg-ink px-4 text-card shadow-float transition-transform hover:-translate-y-0.5"
    >
      <MessageCircle className="h-4 w-4" style={{ color: "#25D366" }} />
      <span className="hidden text-sm font-medium sm:inline">Chat CS</span>
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

  const close = () => setOpen(false);

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-line bg-paper/92 backdrop-blur-xl">
      <div className="mx-auto flex h-[68px] max-w-page items-center justify-between px-5 sm:px-7">
        <Link href="/" className="font-display text-xl font-semibold tracking-tight text-ink" aria-label="Kookiez, kembali ke atas">
          kookiez<span className="text-accent">.</span>
        </Link>

        <nav className="hidden items-center gap-6 text-[13px] font-medium text-muted lg:flex" aria-label="Navigasi utama">
          <button type="button" onClick={() => go(refs.home)} className="transition-colors hover:text-ink">
            {t("nav_home")}
          </button>
          <button type="button" onClick={() => go(refs.work)} className="transition-colors hover:text-ink">
            {t("nav_work")}
          </button>
          <Link href="/estimasi-harga" className="transition-colors hover:text-ink">
            {t("nav_price")}
          </Link>
          <button type="button" onClick={() => go(refs.terms)} className="transition-colors hover:text-ink">
            {t("nav_terms")}
          </button>
          <Link href="/lacak" className="transition-colors hover:text-ink">
            {t("nav_track")}
          </Link>
          {status === "authenticated" && (
            <Link href="/member" className="transition-colors hover:text-ink">
              Member
            </Link>
          )}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <LangToggle />
          {status === "authenticated" ? (
            <div className="flex items-center gap-1.5 border-l border-line pl-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/10 font-mono text-[11px] font-medium text-accent">
                {(session?.user?.name ?? session?.user?.email ?? "?").charAt(0).toUpperCase()}
              </span>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                aria-label="Keluar"
                title="Keluar"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-ink/5 hover:text-ink"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : null}
          {session?.user?.role === "admin" && (
            <Link href="/admin" className="btn btn-secondary !px-3 !py-1.5 !text-xs">
              Admin
            </Link>
          )}
          <button type="button" onClick={onOrder} className="btn btn-primary !px-4">
            {t("nav_order")} <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <LangToggle />
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-label={open ? "Tutup menu" : "Buka menu"}
            aria-expanded={open}
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-line bg-card text-ink"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-line bg-card lg:hidden"
          >
            <div className="flex max-h-[calc(100dvh-68px)] flex-col overflow-y-auto px-5 py-4">
              {status === "authenticated" && (
                <div className="mb-3 flex items-center justify-between gap-3 border-b border-line pb-3">
                  <span className="min-w-0 truncate text-xs text-muted">
                    {session?.user?.name ?? session?.user?.email}
                  </span>
                  <button
                    type="button"
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="flex min-h-[44px] shrink-0 items-center gap-1.5 text-xs text-muted hover:text-ink"
                  >
                    <LogOut className="h-3.5 w-3.5" /> Keluar
                  </button>
                </div>
              )}
              {[
                { label: t("nav_home"), action: () => go(refs.home) },
                { label: t("nav_work"), action: () => go(refs.work) },
                { label: t("nav_terms"), action: () => go(refs.terms) },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={item.action}
                  className="flex min-h-[44px] items-center border-b border-line text-left text-sm font-medium text-ink"
                >
                  {item.label}
                </button>
              ))}
              <Link href="/estimasi-harga" onClick={close} className="flex min-h-[44px] items-center border-b border-line text-sm font-medium text-ink">
                {t("nav_price")}
              </Link>
              <Link href="/lacak" onClick={close} className="flex min-h-[44px] items-center border-b border-line text-sm font-medium text-ink">
                {t("nav_track")}
              </Link>
              {status === "authenticated" && (
                <Link href="/member" onClick={close} className="flex min-h-[44px] items-center border-b border-line text-sm font-medium text-ink">
                  Member Area
                </Link>
              )}
              {session?.user?.role === "admin" && (
                <Link href="/admin" onClick={close} className="flex min-h-[44px] items-center border-b border-line text-sm font-medium text-ink">
                  Admin
                </Link>
              )}
              <button
                type="button"
                onClick={() => {
                  onConsult();
                  close();
                }}
                className="flex min-h-[44px] items-center text-left text-sm font-medium text-muted"
              >
                {t("hero_consult_cta")}
              </button>
              <button
                type="button"
                onClick={() => {
                  onOrder();
                  close();
                }}
                className="btn btn-primary mt-3 w-full"
              >
                {t("nav_order")} <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

function Hero({ onOrder, onConsult, workRef }: { onOrder: () => void; onConsult: () => void; workRef: RefObject<HTMLElement> }) {
  const { t, lang } = useLang();
  const words = lang === "id" ? ["logo.", "banner.", "poster.", "stiker."] : ["logos.", "banners.", "posters.", "stickers."];
  const [i, setI] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setI((value) => (value + 1) % words.length), 2200);
    return () => clearInterval(id);
  }, [words.length]);

  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto grid max-w-page items-center gap-12 px-5 pb-16 pt-28 sm:px-7 lg:grid-cols-[1.06fr_.94fr] lg:gap-8 lg:pb-24 lg:pt-36">
        <div className="relative z-10">
          <div className="mb-7 flex flex-wrap items-center gap-3">
            <span className="kicker">{t("hero_kicker")}</span>
            <span className="h-px w-8 bg-accent/40" aria-hidden="true" />
            <span className="stamp stamp-accent">Open for commissions</span>
          </div>

          <h1 className="display max-w-[13ch] text-[clamp(3.1rem,8.4vw,6.6rem)]">
            {t("hero_need")}{" "}
            <span className="inline-block h-[.92em] overflow-hidden align-bottom text-accent">
              <AnimatePresence mode="wait">
                <motion.span
                  key={words[i]}
                  initial={{ y: 36, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -36, opacity: 0 }}
                  transition={{ duration: 0.35 }}
                  className="inline-block"
                >
                  {words[i]}
                </motion.span>
              </AnimatePresence>
            </span>
            <br />
            {t("hero_title_end")}
          </h1>

          <p className="lede mt-7 text-[15px] sm:text-base">{t("hero_desc")}</p>

          <div className="mt-8 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
            <button type="button" onClick={onOrder} className="btn btn-primary sm:!px-6">
              {t("hero_cta")} <ArrowRight className="h-4 w-4" />
            </button>
            <button type="button" onClick={onConsult} className="btn btn-secondary">
              {t("hero_consult_cta")}
            </button>
            <button
              type="button"
              onClick={() => workRef.current?.scrollIntoView({ behavior: "smooth" })}
              className="group inline-flex min-h-[44px] items-center justify-center gap-1.5 px-2 text-sm font-medium text-muted transition-colors hover:text-ink"
            >
              {t("hero_cta_secondary")}
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </button>
          </div>

          <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-line pt-5 sm:mt-12">
            {[
              { value: "300+", label: t("hero_stat_done") },
              { value: "4.9/5", label: t("hero_stat_rating") },
              { value: "< 1 jam", label: t("hero_stat_response") },
            ].map((stat) => (
              <div key={stat.label}>
                <dt className="font-mono text-lg font-medium tracking-tight text-ink">{stat.value}</dt>
                <dd className="mt-1 text-[11px] leading-snug text-muted">{stat.label}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="specimen hidden min-h-[27rem] lg:block" aria-hidden="true">
          <span className="crop crop-tl" />
          <span className="crop crop-tr" />
          <span className="crop crop-bl" />
          <span className="crop crop-br" />

          <div className="specimen-card specimen-card--back p-4">
            <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
              <span>KZ / 2026</span>
              <span>01</span>
            </div>
            <p className="mt-5 font-display text-3xl font-semibold leading-[0.9] tracking-[-0.05em] text-ink">
              Brand
              <br />
              sheet
            </p>
            <div className="mt-4 flex gap-1.5">
              <span className="h-5 w-5 border border-ink/20 bg-accent" />
              <span className="h-5 w-5 border border-ink/20 bg-ink" />
              <span className="h-5 w-5 border border-ink/20 bg-paper-2" />
              <span className="h-5 w-5 border border-ink/20 bg-card" />
            </div>
          </div>

          <div className="specimen-card specimen-card--main p-4">
            <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
              <span>Order</span>
              <span>KZ-2401</span>
            </div>
            <div className="mt-4 border-y border-line py-2.5">
              {["Logo primer", "Logo sekunder", "Panduan warna"].map((item) => (
                <div key={item} className="flex items-center justify-between py-1.5 text-[11px] text-ink">
                  <span>{item}</span>
                  <Check className="h-3 w-3 text-accent" />
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-end justify-between">
              <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">Total</span>
              <span className="font-mono text-sm font-medium text-ink">Rp 350.000</span>
            </div>
            <div className="mt-3 flex items-center justify-center gap-1.5 rounded-[3px] bg-accent px-2 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-white">
              <Check className="h-3 w-3" /> Approved
            </div>
          </div>

          <div className="specimen-card specimen-card--front p-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">Type specimen</p>
            <p className="mt-1 font-display text-[3.4rem] font-semibold leading-none tracking-[-0.07em] text-ink">Aa</p>
            <p className="mt-2 border-t border-line pt-2 font-mono text-[11px] uppercase leading-relaxed tracking-[0.08em] text-muted">
              Bricolage
              <br />
              Instrument / Plex
            </p>
          </div>

          <div className="absolute bottom-0 left-2 right-2 flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
            <span>Fig. 01 — production sheet</span>
            <span>Scale 1:1</span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-page px-5 sm:px-7">
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line py-3 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
          <span>Kookiez digital creative</span>
          <span>Logo / poster / banner / flyer</span>
          <span>Est. 2021 — Indonesia</span>
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
    return () => {
      window.clearInterval(interval);
    };
  }, [sync]);

  const activeSlots = queue?.activeSlots ?? 0;
  const maxSlots = queue?.maxSlots ?? 0;
  const availableSlots = queue?.availableSlots ?? 0;
  const percent = maxSlots > 0 ? Math.min(100, Math.round((activeSlots / maxSlots) * 100)) : 0;

  return (
    <section className="mx-auto max-w-page border-t border-line px-5 py-16 sm:px-7 sm:py-20" aria-labelledby="queue-title">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-xl">
          <p className="kicker mb-2">Kapasitas produksi</p>
          <h2 id="queue-title" className="display text-[clamp(2rem,4vw,3rem)]">
            Tahu kapan waktu terbaik untuk mulai.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            {status === "offline"
              ? "Kapasitas sedang tidak dapat dimuat. Coba muat ulang untuk melihat data terbaru."
              : queue?.note || "Kami sedang mengambil kapasitas terbaru."}
          </p>
        </div>
        <span
          className={`stamp ${
            status === "offline"
              ? "!border-danger/40 !text-danger"
              : status === "live"
              ? "!border-success/40 !text-success"
              : "!border-pending/40 !text-pending"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              status === "offline" ? "bg-danger" : status === "live" ? "bg-success" : "bg-pending"
            }`}
          />
          {status === "loading" ? "Memuat" : status === "live" ? "Live" : "Offline"}
        </span>
      </div>

      <div className="docket overflow-hidden">
        <div className="grid gap-0 sm:grid-cols-[1fr_auto]">
          <div className="p-6 sm:p-8">
            <p className="mono-label mb-3">Slot tersedia</p>
            {status === "loading" ? (
              <Skeleton className="h-14 w-24" />
            ) : (
              <p className="font-mono text-[3.5rem] font-medium leading-none tracking-[-0.06em] text-accent" aria-live="polite">
                {status === "offline" ? "—" : String(availableSlots).padStart(2, "0")}
              </p>
            )}
            <p className="mt-3 text-sm text-muted">
              {status === "offline"
                ? "Data kapasitas tidak tersedia saat ini."
                : `${activeSlots} dari ${maxSlots || "–"} slot sedang terisi.`}
            </p>
          </div>

          <div className="flex flex-col justify-between gap-6 border-t border-line p-6 sm:w-64 sm:border-l sm:border-t-0 sm:p-8">
            <div>
              <div className="mb-2 flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
                <span>Utilisasi</span>
                <span>{status === "loading" ? "–" : `${percent}%`}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-ink/10">
                <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${percent}%` }} />
              </div>
            </div>
            {status === "offline" ? (
              <button type="button" onClick={sync} className="btn btn-secondary w-full">
                Muat ulang
              </button>
            ) : (
              <Link href="/lacak" className="btn btn-primary w-full">
                Lacak pesanan <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function ServicePackages({ onOrder, onConsult }: { onOrder: () => void; onConsult: () => void }) {
  const services = useServices();
  return (
    <section id="layanan" className="mx-auto max-w-page border-t border-line px-5 py-16 sm:px-7 sm:py-20" aria-labelledby="services-title">
      <div className="mb-10 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <div className="max-w-xl">
          <p className="kicker mb-2">Layanan</p>
          <h2 id="services-title" className="display text-[clamp(2rem,4vw,3rem)]">
            Pilih paket yang pas.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Harga awal transparan, ruang lingkup jelas, dan konsultasi bisa dipisahkan dari pesanan.
          </p>
        </div>
        <Link href="/estimasi-harga" className="group inline-flex min-h-[44px] items-center gap-1.5 text-sm font-medium text-accent">
          Lihat estimasi harga
          <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((service, index) => {
          const Icon = service.icon;
          const consult = service.id === "konsultasi";
          return (
            <article
              key={service.id}
              className={`group flex min-h-56 flex-col rounded-xl border bg-card p-5 transition-colors ${
                consult ? "border-dashed border-ink/25 bg-paper/60" : "border-line hover:border-ink/35"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink/5 text-ink">
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
                  SVC / {String(index + 1).padStart(2, "0")}
                </span>
              </div>
              <h3 className="mt-7 font-display text-xl font-semibold tracking-[-0.03em] text-ink">{service.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{service.desc}</p>
              <div className="mt-5 flex items-end justify-between gap-3 border-t border-line pt-4">
                <span className="font-mono text-[11px] text-muted">
                  {consult ? "Gratis 15 menit" : "Mulai Rp 25.000"}
                </span>
                <button
                  type="button"
                  onClick={consult ? onConsult : onOrder}
                  className="inline-flex min-h-[44px] items-center gap-1 text-sm font-semibold text-accent"
                >
                  {consult ? "Atur konsultasi" : "Pesan"}
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
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
    <Modal open={open} onClose={onClose} labelledBy="consult-title" className="max-w-md rounded-2xl bg-card p-6 sm:p-7">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="kicker mb-2">Konsultasi desain</p>
          <h2 id="consult-title" className="display text-3xl">
            Cari arah sebelum mulai.
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-ink/5 hover:text-ink"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <p className="mb-5 text-sm leading-relaxed text-muted">
        Form ini hanya untuk diskusi awal. Tidak membuat pesanan atau pembayaran.
      </p>
      <div className="space-y-4">
        <div>
          <label htmlFor="consult-name" className="ui-label">
            Nama kamu
          </label>
          <input
            id="consult-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="ui-input"
            placeholder="Nama panggilan"
            autoComplete="name"
          />
        </div>
        <div>
          <label htmlFor="consult-need" className="ui-label">
            Yang ingin dibahas
          </label>
          <textarea
            id="consult-need"
            value={need}
            onChange={(event) => setNeed(event.target.value)}
            rows={4}
            className="ui-input resize-none"
            placeholder="Contoh: perlu logo untuk usaha kopi, belum yakin gaya dan warna."
          />
        </div>
      </div>
      <button
        type="button"
        disabled={!name.trim() || !need.trim()}
        onClick={submit}
        className="btn btn-dark mt-5 w-full"
      >
        Mulai konsultasi via WhatsApp <ArrowRight className="h-4 w-4" />
      </button>
    </Modal>
  );
}

function WorkLightbox({ item, onClose }: { item: DisplayWorkItem | null; onClose: () => void }) {
  const { t } = useLang();
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => setImageFailed(false), [item?.id]);
  if (!item) return null;

  return (
    <Modal open={Boolean(item)} onClose={onClose} labelledBy="work-title" className="max-w-2xl overflow-hidden rounded-2xl bg-card p-0">
      <div className="relative flex max-h-[64vh] w-full items-center justify-center overflow-hidden" style={{ backgroundColor: item.hue }}>
        {item.image && !imageFailed ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={item.image}
            alt={item.title}
            className="block h-auto max-h-[64vh] w-full object-contain"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="flex aspect-[16/10] w-full items-center justify-center bg-ink/5 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
            Tanpa gambar
          </div>
        )}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full border border-white/30 bg-ink/60 text-white backdrop-blur-sm hover:bg-ink"
          aria-label="Tutup"
        >
          <X className="h-5 w-5" />
        </button>
        <span className="absolute bottom-3 left-3 rounded-[3px] border border-white/30 bg-ink/60 px-2 py-1 font-mono text-[11px] uppercase tracking-[0.1em] text-white backdrop-blur-sm">
          #{typeof item.id === "number" ? String(item.id).padStart(3, "0") : "CUSTOM"}
        </span>
      </div>

      <div className="p-5 sm:p-6">
        <p className="kicker mb-2">{item.tag}</p>
        <h3 id="work-title" className="display text-2xl">
          {item.title}
        </h3>
        {item.clientName && item.clientName !== item.title && (
          <p className="mt-1 text-xs text-muted">Klien: {item.clientName}</p>
        )}
        <p className="mt-3 text-sm leading-relaxed text-muted">
          {item.description || `Contoh hasil pengerjaan untuk kategori ${item.tag}.`}
        </p>
        <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
          <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">{t("work_view")}</span>
          <button type="button" onClick={onClose} className="btn btn-secondary !min-h-9 !px-3 !py-1.5 !text-xs">
            Tutup
          </button>
        </div>
      </div>
    </Modal>
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

  const filtered = filter === "all" ? work : work.filter((item) => item.category === filter);

  return (
    <section ref={refProp} className="mx-auto max-w-page border-t border-line px-5 py-16 sm:px-7 sm:py-20" aria-labelledby="work-title-section">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="kicker mb-2">{t("work_kicker")}</p>
          <h2 id="work-title-section" className="display text-[clamp(2rem,4vw,3rem)]">
            {t("work_title")}
          </h2>
        </div>
        <span className="stamp">{String(filtered.length).padStart(2, "0")} karya</span>
      </div>

      <div className="mb-7 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter karya">
        <button
          type="button"
          onClick={() => setFilter("all")}
          aria-pressed={filter === "all"}
          className={`min-h-[44px] shrink-0 rounded-full border px-3.5 py-2 font-mono text-[11px] uppercase tracking-[0.06em] transition-colors ${
            filter === "all" ? "border-accent bg-accent/5 text-accent" : "border-line text-muted hover:border-ink/35 hover:text-ink"
          }`}
        >
          {t("work_filter_all")}
        </button>
        {services.filter((service) => service.id !== "konsultasi").map((service) => (
          <button
            key={service.id}
            type="button"
            onClick={() => setFilter(service.id)}
            aria-pressed={filter === service.id}
            className={`min-h-[44px] shrink-0 rounded-full border px-3.5 py-2 font-mono text-[11px] uppercase tracking-[0.06em] transition-colors ${
              filter === service.id ? "border-accent bg-accent/5 text-accent" : "border-line text-muted hover:border-ink/35 hover:text-ink"
            }`}
          >
            {service.title}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="docket flex flex-col items-center justify-center px-6 py-16 text-center">
          <p className="font-display text-2xl font-semibold">Belum ada karya di kategori ini.</p>
          <p className="mt-2 max-w-sm text-sm text-muted">Karya baru akan muncul di sini setelah dipublikasikan.</p>
          <button type="button" onClick={onOrder} className="btn btn-primary mt-5">
            Mulai project <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActive(item)}
              className="group overflow-hidden rounded-xl border border-line bg-card text-left transition-colors hover:border-ink/35"
            >
              <div
                className="relative h-44 overflow-hidden bg-cover bg-center"
                style={{ backgroundColor: item.hue, backgroundImage: item.image ? `url(${item.image})` : undefined }}
              >
                <span className="absolute left-3 top-3 rounded-[3px] border border-white/30 bg-ink/55 px-2 py-1 font-mono text-[11px] uppercase tracking-[0.08em] text-white backdrop-blur-sm">
                  {item.tag}
                </span>
                <span className="absolute bottom-3 left-3 font-mono text-[11px] uppercase tracking-[0.1em] text-white/80">
                  #{typeof item.id === "number" ? String(item.id).padStart(3, "0") : "CUSTOM"}
                </span>
                <span className="absolute inset-0 flex items-center justify-center bg-ink/0 transition-colors group-hover:bg-ink/25">
                  <span className="translate-y-2 rounded-full border border-white/40 bg-ink/60 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-white opacity-0 backdrop-blur-sm transition-all group-hover:translate-y-0 group-hover:opacity-100">
                    {t("work_view")}
                  </span>
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 p-4">
                <span>
                  <span className="block text-sm font-semibold text-ink">{item.title}</span>
                  {item.clientName && item.clientName !== item.title && (
                    <span className="mt-0.5 block text-xs text-muted">{item.clientName}</span>
                  )}
                </span>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-muted transition-colors group-hover:text-accent" />
              </div>
            </button>
          ))}
        </div>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
        <p className="text-sm text-muted">Punya brief yang belum jelas arahnya?</p>
        <button type="button" onClick={onOrder} className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-accent">
          Mulai dari brief <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {active && <WorkLightbox item={active} onClose={() => setActive(null)} />}
    </section>
  );
}

function TermsSection({ refProp }: { refProp: RefObject<HTMLElement> }) {
  const { t } = useLang();
  const terms = useTerms();
  return (
    <section ref={refProp} className="mx-auto max-w-page border-t border-line px-5 py-16 sm:px-7 sm:py-20" aria-labelledby="terms-title">
      <div className="grid gap-8 lg:grid-cols-[.8fr_1.2fr] lg:gap-16">
        <div>
          <p className="kicker mb-2">{t("terms_kicker")}</p>
          <h2 id="terms-title" className="display text-[clamp(2rem,4vw,3rem)]">
            {t("terms_title")}
          </h2>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
            Syarat yang kamu setujui saat order. Kalau ada yang belum jelas, tanyakan sebelum bayar.
          </p>
          <span className="stamp mt-5">Production terms / v.2026</span>
        </div>
        <Accordion items={terms} />
      </div>
    </section>
  );
}

function Footer({ onOrder }: { onOrder: () => void }) {
  const { t } = useLang();
  return (
    <footer className="border-t border-line bg-card">
      <div className="mx-auto max-w-page px-5 py-14 sm:px-7">
        <div className="grid gap-10 sm:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Link href="/" className="font-display text-2xl font-semibold tracking-tight text-ink">
              kookiez<span className="text-accent">.</span>
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">{t("footer_tagline")}</p>
            <div className="mt-5 flex flex-col gap-2">
              <a
                href="https://instagram.com/kookiez.idn"
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-[44px] items-center gap-2 text-sm text-muted transition-colors hover:text-accent"
              >
                <Instagram className="h-4 w-4" /> @kookiez.idn
              </a>
              <a
                href="mailto:kookiezst@gmail.com"
                className="inline-flex min-h-[44px] items-center gap-2 text-sm text-muted transition-colors hover:text-accent"
              >
                <Mail className="h-4 w-4" /> kookiezst@gmail.com
              </a>
            </div>
          </div>

          <div>
            <p className="mono-label mb-3">Halaman</p>
            <div className="flex flex-col gap-1 text-sm">
              <Link href="/estimasi-harga" className="flex min-h-[44px] items-center text-muted transition-colors hover:text-ink">
                {t("nav_price")}
              </Link>
              <Link href="/lacak" className="flex min-h-[40px] items-center text-muted transition-colors hover:text-ink">
                {t("nav_track")}
              </Link>
              <Link href="/member" className="flex min-h-[40px] items-center text-muted transition-colors hover:text-ink">
                Member Area
              </Link>
            </div>
          </div>

          <div>
            <p className="mono-label mb-3">Mulai project</p>
            <p className="mb-4 text-sm leading-relaxed text-muted">Brief singkat, estimasi jelas, dikerjakan sesuai antrean.</p>
            <button type="button" onClick={onOrder} className="btn btn-primary w-full">
              {t("nav_order")} <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-line pt-5 font-mono text-[11px] uppercase tracking-[0.12em] text-muted sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Kookiez Digital Creative</span>
          <span>Made in Indonesia · Working worldwide</span>
        </div>
      </div>
    </footer>
  );
}

export default function Page() {
  const { status } = useSession();
  const services = useServices();
  const budgetTiers = useBudgetTiers();
  const [orderOpen, setOrderOpen] = useState(false);
  const [loginPromptOpen, setLoginPromptOpen] = useState(false);
  const [consultationOpen, setConsultationOpen] = useState(false);
  const [successData, setSuccessData] = useState<SuccessData | null>(null);
  const [orderPrefill, setOrderPrefill] = useState<OrderPrefill | null>(null);
  const queryHandled = useRef(false);

  const home = useRef<HTMLDivElement>(null);
  const work = useRef<HTMLElement>(null);
  const terms = useRef<HTMLElement>(null);

  useEffect(() => {
    if (queryHandled.current) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("order") !== "1") {
      queryHandled.current = true;
      return;
    }
    if (status === "loading") return;

    const requestedService = services.find((service) => service.id === params.get("service"))?.id;
    const requestedBudget = budgetTiers.find((tier) => tier.id === params.get("budget"))?.id;
    const requestedDeadline = params.get("deadline") ?? "";
    const deadline = /^\d{4}-\d{2}-\d{2}$/.test(requestedDeadline) ? requestedDeadline : "";

    setOrderPrefill({
      service: requestedService,
      budget: requestedBudget,
      deadline,
    });
    if (status === "authenticated") {
      setOrderOpen(true);
    } else {
      setLoginPromptOpen(true);
    }
    queryHandled.current = true;
  }, [budgetTiers, services, status]);

  const handleOrder = () => {
    if (status === "authenticated") {
      setOrderOpen(true);
    } else {
      setLoginPromptOpen(true);
    }
  };

  return (
    <div className="ui-shell min-h-screen font-sans text-ink">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-ink focus:px-4 focus:py-3 focus:text-sm focus:font-medium focus:text-white"
      >
        Lewati ke konten
      </a>

      <Navbar onOrder={handleOrder} onConsult={() => setConsultationOpen(true)} refs={{ home, work, terms }} />

      <main id="main">
        <div ref={home}>
          <Hero onOrder={handleOrder} onConsult={() => setConsultationOpen(true)} workRef={work} />
        </div>
        <ServicePackages onOrder={handleOrder} onConsult={() => setConsultationOpen(true)} />
        <WorkSection refProp={work} onOrder={handleOrder} />
        <AvailabilityBanner />
        <TermsSection refProp={terms} />
      </main>

      <Footer onOrder={handleOrder} />
      <FloatingWhatsApp />

      <OrderModal
        open={orderOpen}
        initial={orderPrefill}
        onClose={() => setOrderOpen(false)}
        onSuccess={(data) => setSuccessData(data)}
      />
      {successData && <SuccessModal data={successData} onClose={() => setSuccessData(null)} />}
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
  clientName?: string;
};
