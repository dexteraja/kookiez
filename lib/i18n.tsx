"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

export type Lang = "id" | "en";

/* ------------------------------------------------------------------ */
/*  Dictionary — semua string UI statis                                */
/* ------------------------------------------------------------------ */

const dict = {
  id: {
    nav_home: "Beranda",
    nav_work: "Karya Kami",
    nav_terms: "S&K",
    nav_track: "Lacak Pesanan",
    nav_price: "Estimasi Harga",
    nav_cs: "Chat CS",
    nav_order: "Pesan Sekarang",

    hero_kicker: "JASA DESAIN GRAFIS",
    hero_need: "Butuh",
    hero_title_end: "desain yang beres cepat.",
    hero_desc:
      "Kookiez bikinin logo, poster, banner, flyer, sampai brosur — plus sesi konsultasi desain kalau kamu masih bingung mau mulai dari mana. Pesan lewat form, revisi jelas, hasil rapi.",
    hero_cta: "Isi formulir pembelian",
    hero_cta_secondary: "Lihat karya kami",
    hero_stat_done: "desain selesai",
    hero_stat_rating: "rating klien",
    hero_stat_response: "respon chat",

    work_kicker: "KARYA PILIHAN",
    work_title: "Beberapa pesanan terakhir",
    work_filter_all: "Semua",
    work_view: "Lihat detail",

    testi_kicker: "KATA MEREKA",
    testi_title: "Testimoni klien",

    calc_kicker: "ESTIMASI HARGA",
    calc_title: "Hitung kira-kira budget kamu",
    calc_service: "Layanan",
    calc_budget: "Paket budget",
    calc_deadline: "Butuh kapan?",
    calc_deadline_normal: "Normal (5+ hari)",
    calc_deadline_fast: "Cepat (2–4 hari)",
    calc_deadline_rush: "Kilat (< 48 jam)",
    calc_result: "Estimasi total",
    calc_rush_note: "*Tenggat cepat kena biaya tambahan (rush fee).",
    calc_cta: "Lanjut pesan dengan estimasi ini",

    terms_kicker: "BACA DULU YA",
    terms_title: "Syarat & Ketentuan",

    footer_tagline: "Jasa desain logo, poster, banner, flyer, brosur, dan konsultasi.",

    track_kicker: "LACAK PESANAN",
    track_title: "Cek status pesananmu",
    track_desc: "Masukkan kode pesanan yang kamu terima setelah checkout.",
    track_placeholder: "Contoh: KKZ-A1B2C3",
    track_button: "Cek status",
    track_notfound: "Kode pesanan tidak ditemukan. Cek lagi ya, atau hubungi CS.",
    track_status_label: "Status",
    track_order_detail: "Detail pesanan",

    status_pending: "Menunggu konfirmasi",
    status_progress: "Sedang dikerjakan",
    status_review: "Menunggu review kamu",
    status_done: "Selesai",

    admin_title: "Admin — Pesanan Masuk",
    admin_pw_label: "Password admin",
    admin_pw_placeholder: "Masukkan password",
    admin_login: "Masuk",
    admin_wrong_pw: "Password salah.",
    admin_empty: "Belum ada pesanan masuk.",
    admin_logout: "Keluar",
    admin_warning:
      "Demo lokal - data disimpan di browser ini saja (localStorage). Untuk produksi asli, pakai database + autentikasi di backend.",

    step_labels: ["Layanan", "Brief", "Budget", "Bayar"],
    step1_kicker: "LANGKAH 01",
    step1_title: "Desain apa yang kamu butuh?",

    step2_kicker: "LANGKAH 02",
    step2_title: "Ceritakan brief-nya",
    step2_detail_label: "Detail desain",
    step2_detail_placeholder: "Mau desain seperti apa? Warna, gaya, ukuran, dan kegunaannya untuk apa.",
    step2_ref_label: "Link referensi",
    step2_ref_placeholder: "Pinterest, Instagram, dll (pisahkan dengan koma)",
    step2_file_label: "Lampiran",
    step2_file_drag: "Seret file ke sini, atau",
    step2_file_choose: "pilih file",
    step2_file_hint: "Logo lama, foto, atau contoh referensi",
    step2_file_uploading: "Mengunggah…",
    step2_file_uploaded: "Terunggah",

    step3_kicker: "LANGKAH 03",
    step3_title: "Budget & tenggat waktu",
    step3_budget_label: "Pilih budget",
    step3_deadline_label: "Butuh kapan?",

    step4_kicker: "LANGKAH 04",
    step4_title: "Ringkasan & pembayaran",
    step4_service: "Layanan",
    step4_budget: "Paket budget",
    step4_deadline: "Tenggat",
    step4_flexible: "Fleksibel",
    step4_custom_note:
      "Pesanan borongan/custom perlu dihitung manual — kami kirim penawaran lewat WhatsApp dalam 1x24 jam, tanpa pembayaran di sini dulu.",
    step4_pay_method: "Metode bayar",
    step4_pay_deposit: "DP 30%",
    step4_pay_full: "Bayar Lunas",
    step4_pay_with: "Bayar dengan",
    step4_total: "Total dibayar sekarang",
    step4_processing: "Memproses pembayaran…",
    step4_ask_quote: "Minta penawaran",
    step4_confirm_pay: "Konfirmasi & bayar",

    modal_back: "Kembali",
    modal_next: "Lanjut",
    modal_close: "Tutup",

    success_title: "Pesanan diterima!",
    success_code_label: "Kode pesanan kamu",
    success_desc: "Simpan kode ini untuk melacak status pesananmu kapan saja.",
    success_track_btn: "Lacak pesanan ini",
    success_wa_btn: "Konfirmasi via WhatsApp",
    success_close: "Tutup",
  },
  en: {
    nav_home: "Home",
    nav_work: "Our Work",
    nav_terms: "Terms",
    nav_track: "Track Order",
    nav_price: "Price Estimate",
    nav_cs: "Chat Support",
    nav_order: "Order Now",

    hero_kicker: "GRAPHIC DESIGN SERVICE",
    hero_need: "Need a",
    hero_title_end: "design done fast.",
    hero_desc:
      "Kookiez makes logos, posters, banners, flyers, and brochures — plus a design consultation session if you're not sure where to start. Order through a form, clear revisions, tidy results.",
    hero_cta: "Fill out the order form",
    hero_cta_secondary: "See our work",
    hero_stat_done: "designs completed",
    hero_stat_rating: "client rating",
    hero_stat_response: "chat response",

    work_kicker: "FEATURED WORK",
    work_title: "Some recent orders",
    work_filter_all: "All",
    work_view: "View detail",

    testi_kicker: "WHAT THEY SAY",
    testi_title: "Client testimonials",

    calc_kicker: "PRICE ESTIMATE",
    calc_title: "Get a rough estimate of your budget",
    calc_service: "Service",
    calc_budget: "Budget tier",
    calc_deadline: "When do you need it?",
    calc_deadline_normal: "Normal (5+ days)",
    calc_deadline_fast: "Fast (2–4 days)",
    calc_deadline_rush: "Rush (< 48 hours)",
    calc_result: "Estimated total",
    calc_rush_note: "*Rush deadlines carry an extra rush fee.",
    calc_cta: "Continue order with this estimate",

    terms_kicker: "READ FIRST",
    terms_title: "Terms & Conditions",

    footer_tagline: "Logo, poster, banner, flyer, brochure & consultation.",

    track_kicker: "TRACK ORDER",
    track_title: "Check your order status",
    track_desc: "Enter the order code you received after checkout.",
    track_placeholder: "e.g. KKZ-A1B2C3",
    track_button: "Check status",
    track_notfound: "Order code not found. Double-check it, or contact support.",
    track_status_label: "Status",
    track_order_detail: "Order details",

    status_pending: "Awaiting confirmation",
    status_progress: "In progress",
    status_review: "Waiting for your review",
    status_done: "Completed",

    admin_title: "Admin — Incoming Orders",
    admin_pw_label: "Admin password",
    admin_pw_placeholder: "Enter password",
    admin_login: "Log in",
    admin_wrong_pw: "Wrong password.",
    admin_empty: "No orders yet.",
    admin_logout: "Log out",
    admin_warning:
      "Local demo — data is stored only in this browser (localStorage). For real production use, use a database + backend authentication.",

    step_labels: ["Service", "Brief", "Budget", "Pay"],
    step1_kicker: "STEP 01",
    step1_title: "What design do you need?",

    step2_kicker: "STEP 02",
    step2_title: "Tell us the brief",
    step2_detail_label: "Design details",
    step2_detail_placeholder: "What kind of design do you want? Colors, style, size, and what it's for.",
    step2_ref_label: "Reference links",
    step2_ref_placeholder: "Pinterest, Instagram, etc. (comma separated)",
    step2_file_label: "Attachments",
    step2_file_drag: "Drag files here, or",
    step2_file_choose: "choose a file",
    step2_file_hint: "Old logo, photos, or reference examples",
    step2_file_uploading: "Uploading…",
    step2_file_uploaded: "Uploaded",

    step3_kicker: "STEP 03",
    step3_title: "Budget & deadline",
    step3_budget_label: "Choose a budget",
    step3_deadline_label: "When do you need it?",

    step4_kicker: "STEP 04",
    step4_title: "Summary & payment",
    step4_service: "Service",
    step4_budget: "Budget tier",
    step4_deadline: "Deadline",
    step4_flexible: "Flexible",
    step4_custom_note:
      "Bulk/custom orders need manual calculation — we'll send a quote via WhatsApp within 24 hours, no payment here yet.",
    step4_pay_method: "Payment plan",
    step4_pay_deposit: "30% Deposit",
    step4_pay_full: "Pay in Full",
    step4_pay_with: "Pay with",
    step4_total: "Total due now",
    step4_processing: "Processing payment…",
    step4_ask_quote: "Request a quote",
    step4_confirm_pay: "Confirm & pay",

    modal_back: "Back",
    modal_next: "Next",
    modal_close: "Close",

    success_title: "Order received!",
    success_code_label: "Your order code",
    success_desc: "Save this code to track your order status anytime.",
    success_track_btn: "Track this order",
    success_wa_btn: "Confirm via WhatsApp",
    success_close: "Close",
  },
} as const;

export type DictKey = keyof typeof dict["id"];

/* ------------------------------------------------------------------ */
/*  Context                                                            */
/* ------------------------------------------------------------------ */

interface LangContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  toggleLang: () => void;
  t: (key: DictKey) => any;
}

const LangContext = createContext<LangContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("id");

  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem("kookiez_lang") : null;
    if (saved === "id" || saved === "en") setLangState(saved);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") window.localStorage.setItem("kookiez_lang", l);
  };

  const toggleLang = () => setLang(lang === "id" ? "en" : "id");

  const t = (key: DictKey) => dict[lang][key];

  return <LangContext.Provider value={{ lang, setLang, toggleLang, t }}>{children}</LangContext.Provider>;
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used within LanguageProvider");
  return ctx;
}

/* ------------------------------------------------------------------ */
/*  Data terlokalisasi (services, budget tiers, work, terms, testi)    */
/* ------------------------------------------------------------------ */

import type { LucideIcon } from "lucide-react";
import { PenTool, Image as ImageIcon, FileImage, Layers, BookOpen, MessageCircle } from "lucide-react";

export type ServiceId = "logo" | "banner" | "poster" | "flyer" | "brosur" | "konsultasi";
export type BudgetId = "hemat" | "standar" | "lengkap" | "borongan";

export interface ServiceItem {
  id: ServiceId;
  title: string;
  desc: string;
  icon: LucideIcon;
}

export interface BudgetTier {
  id: BudgetId;
  label: string;
  range: string;
  base: number | null;
}

export interface WorkItem {
  id: number;
  title: string;
  tag: string;
  category: ServiceId;
  hue: string;
}

export interface TermItem {
  title: string;
  body: string;
}

export interface Testimonial {
  name: string;
  role: string;
  text: string;
  rating: number;
  initial: string;
}

const servicesData: Record<Lang, ServiceItem[]> = {
  id: [
    { id: "logo", title: "Desain Logo", desc: "Logo simpel, mudah diingat, siap pakai.", icon: PenTool },
    { id: "poster", title: "Poster", desc: "Poster acara, konser, campaign sekolah.", icon: FileImage },
    { id: "banner", title: "Banner & Spanduk", desc: "Untuk acara, bazar, promosi toko.", icon: ImageIcon },
    { id: "flyer", title: "Flyer", desc: "Selebaran promosi, event, produk.", icon: Layers },
    { id: "brosur", title: "Brosur", desc: "Company profile, katalog, produk usaha.", icon: BookOpen },
    { id: "konsultasi", title: "Konsultasi Desain", desc: "Diskusi kebutuhan & arahan desain sebelum order.", icon: MessageCircle },
  ],
  en: [
    { id: "logo", title: "Logo Design", desc: "Simple, memorable, ready-to-use logo.", icon: PenTool },
    { id: "poster", title: "Posters", desc: "Event posters, concerts, school campaigns.", icon: FileImage },
    { id: "banner", title: "Banners & Signage", desc: "For events, bazaars, store promos.", icon: ImageIcon },
    { id: "flyer", title: "Flyers", desc: "Promo leaflets for events & products.", icon: Layers },
    { id: "brosur", title: "Brochures", desc: "Company profiles, catalogs, business material.", icon: BookOpen },
    { id: "konsultasi", title: "Design Consultation", desc: "Discuss your needs & design direction before ordering.", icon: MessageCircle },
  ],
};

const budgetTiersData: Record<Lang, BudgetTier[]> = {
  id: [
    { id: "hemat", label: "Hemat", range: "Rp 25rb – 75rb", base: 50000 },
    { id: "standar", label: "Standar", range: "Rp 75rb – 200rb", base: 150000 },
    { id: "lengkap", label: "Paket Lengkap", range: "Rp 200rb – 500rb", base: 350000 },
    { id: "borongan", label: "Borongan / Custom", range: "500rb+ · custom", base: null },
  ],
  en: [
    { id: "hemat", label: "Basic", range: "IDR 25k – 75k", base: 50000 },
    { id: "standar", label: "Standard", range: "IDR 75k – 200k", base: 150000 },
    { id: "lengkap", label: "Full Package", range: "IDR 200k – 500k", base: 350000 },
    { id: "borongan", label: "Bulk / Custom", range: "500k+ · custom", base: null },
  ],
};

const workData: Record<Lang, WorkItem[]> = {
  id: [
    { id: 1, title: "Logo Warung Kopi Aksara", tag: "Desain Logo", category: "logo", hue: "#0038FF" },
    { id: 2, title: "Poster Konser Amal", tag: "Poster", category: "poster", hue: "#0038FF" },
    { id: 3, title: "Banner Bazar Sekolah", tag: "Banner & Spanduk", category: "banner", hue: "#1A1A1E" },
    { id: 4, title: "Flyer Promo Toko Klarin", tag: "Flyer", category: "flyer", hue: "#0038FF" },
    { id: 5, title: "Brosur Company Profile Maju Jaya", tag: "Brosur", category: "brosur", hue: "#1A1A1E" },
    { id: 6, title: "Konsultasi Branding UMKM", tag: "Konsultasi Desain", category: "konsultasi", hue: "#1A1A1E" },
  ],
  en: [
    { id: 1, title: "Aksara Coffee Shop Logo", tag: "Logo Design", category: "logo", hue: "#0038FF" },
    { id: 2, title: "Charity Concert Poster", tag: "Posters", category: "poster", hue: "#0038FF" },
    { id: 3, title: "School Bazaar Banner", tag: "Banners & Signage", category: "banner", hue: "#1A1A1E" },
    { id: 4, title: "Klarin Store Promo Flyer", tag: "Flyers", category: "flyer", hue: "#0038FF" },
    { id: 5, title: "Maju Jaya Company Profile Brochure", tag: "Brochures", category: "brosur", hue: "#1A1A1E" },
    { id: 6, title: "SME Branding Consultation", tag: "Design Consultation", category: "konsultasi", hue: "#1A1A1E" },
  ],
};

const termsData: Record<Lang, TermItem[]> = {
  id: [
    { title: "1. Proyek & Brief", body: "Pengerjaan dimulai setelah brief disepakati bersama secara tertulis (chat/form). Permintaan di luar brief yang sudah disepakati dihitung sebagai pesanan baru." },
    { title: "2. Pembayaran", body: "DP 30% mengunci antrean pengerjaanmu; sisanya dibayar sebelum file final dikirim. Bayar lunas di awal diprioritaskan lebih dulu dalam antrean." },
    { title: "3. Revisi", body: "Setiap pesanan dapat 2x revisi sesuai brief awal. Revisi tambahan atau perubahan di luar brief dikenakan biaya tambahan sesuai kompleksitas." },
    { title: "4. Waktu Pengerjaan", body: "Estimasi waktu disepakati di awal dan tergantung kecepatan respon serta feedback dari klien. Keterlambatan balasan dari klien akan menggeser tenggat sesuai jumlah hari yang terlewat." },
    { title: "5. File Final", body: "File final (PNG/JPG/PDF, dan format sumber bila disepakati) dikirim setelah pembayaran lunas. Format tambahan di luar kesepakatan awal dikenakan biaya terpisah." },
    { title: "6. Pembatalan & Refund", body: "DP tidak dapat dikembalikan setelah pengerjaan dimulai. Pesanan yang dibatalkan sebelum pengerjaan dimulai direfund penuh, dikurangi biaya admin pembayaran bila ada." },
    { title: "7. Tanggung Jawab Klien", body: "Klien bertanggung jawab atas keakuratan materi (logo lama, foto, teks) yang diberikan. Kami tidak bertanggung jawab atas materi pihak ketiga yang disertakan dalam pesanan." },
    { title: "8. Hak Portofolio", body: "Kami berhak menampilkan hasil desain di portofolio dan media promosi kami, kecuali klien meminta kerahasiaan sebelum proyek dimulai." },
    { title: "9. Kepuasan Klien", body: "Kalau hasil desain belum sesuai brief yang disepakati, kabari kami dalam 7 hari setelah file dikirim dan akan kami perbaiki tanpa biaya tambahan, selama masih dalam lingkup brief awal." },
  ],
  en: [
    { title: "1. Project & Brief", body: "Work begins once the brief is agreed in writing (chat/form). Requests outside the agreed brief are counted as a new order." },
    { title: "2. Payment", body: "A 30% deposit locks in your place in the queue; the rest is due before the final file is sent. Paying in full up front gets priority in the queue." },
    { title: "3. Revisions", body: "Each order includes 2 rounds of revisions based on the original brief. Extra revisions or changes outside the brief incur additional fees based on complexity." },
    { title: "4. Turnaround Time", body: "Timeline estimates are agreed at the start and depend on response speed and client feedback. Late replies from the client will shift the deadline by the number of days delayed." },
    { title: "5. Final Files", body: "Final files (PNG/JPG/PDF, plus source format if agreed) are sent after payment is complete. Additional formats outside the initial agreement are billed separately." },
    { title: "6. Cancellation & Refunds", body: "Deposits are non-refundable once work has started. Orders cancelled before work begins are refunded in full, minus payment admin fees if any." },
    { title: "7. Client Responsibility", body: "Clients are responsible for the accuracy of materials provided (old logos, photos, text). We are not liable for third-party materials included in an order." },
    { title: "8. Portfolio Rights", body: "We reserve the right to display finished designs in our portfolio and promotional media, unless the client requests confidentiality before the project starts." },
    { title: "9. Client Satisfaction", body: "If the design doesn't match the agreed brief, let us know within 7 days of delivery and we'll fix it at no extra cost, as long as it's within the scope of the original brief." },
  ],
};

const testimonialsData: Record<Lang, Testimonial[]> = {
  id: [
    { name: "Rani P.", role: "Pemilik, Warung Kopi Aksara", text: "Logo jadi lebih dari ekspektasi, revisinya juga cepat direspon. Recommended banget!", rating: 5, initial: "R" },
    { name: "Dimas A.", role: "Panitia Bazar Sekolah", text: "Banner selesai sehari sebelum acara, kualitasnya rapi dan sesuai brief.", rating: 5, initial: "D" },
    { name: "Sinta W.", role: "Admin @tokokita.id", text: "Feed Instagram jadi jauh lebih konsisten sejak pakai jasa Kookiez. Puas!", rating: 4, initial: "S" },
    { name: "Bagas F.", role: "Ketua OSIS", text: "Brosur company profile-nya rapi banget dan cepat, konsultasinya juga jelas dari awal.", rating: 5, initial: "B" },
  ],
  en: [
    { name: "Rani P.", role: "Owner, Aksara Coffee Shop", text: "The logo exceeded expectations and revisions were handled fast. Highly recommend!", rating: 5, initial: "R" },
    { name: "Dimas A.", role: "School Bazaar Committee", text: "Banner finished a day before the event, clean quality and matched the brief.", rating: 5, initial: "D" },
    { name: "Sinta W.", role: "Admin, @tokokita.id", text: "Our Instagram feed looks way more consistent since using Kookiez. Satisfied!", rating: 4, initial: "S" },
    { name: "Bagas F.", role: "Student Council Head", text: "The company profile brochure was clean and fast, plus the consultation was clear from the start.", rating: 5, initial: "B" },
  ],
};

export function useServices(): ServiceItem[] {
  const { lang } = useLang();
  return servicesData[lang];
}
export function useBudgetTiers(): BudgetTier[] {
  const { lang } = useLang();
  return budgetTiersData[lang];
}
export function useWork(): WorkItem[] {
  const { lang } = useLang();
  return workData[lang];
}
export function useTerms(): TermItem[] {
  const { lang } = useLang();
  return termsData[lang];
}
export function useTestimonials(): Testimonial[] {
  const { lang } = useLang();
  return testimonialsData[lang];
}