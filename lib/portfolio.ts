/* ------------------------------------------------------------------ */
/*  Penyimpanan karya/portofolio — DEMO lokal pakai localStorage.       */
/*  Mengikuti pola yang sama dengan lib/orders.ts supaya konsisten.    */
/*  Admin bisa menambah, mengubah, menghapus, dan menyembunyikan       */
/*  karya bawaan langsung dari /admin — tanpa perlu ubah kode.         */
/*                                                                      */
/*  Untuk produksi asli: ganti fungsi baca/tulis di sini dengan        */
/*  panggilan ke API/database sungguhan (mis. /api/portfolio +         */
/*  Postgres/Supabase/dst), lalu simpan gambar di storage eksternal.   */
/* ------------------------------------------------------------------ */

import type { ServiceId } from "./i18n";

export interface CustomWorkItem {
  id: string;
  title: string;
  tag: string;
  category: ServiceId | "lainnya";
  hue: string;
  image?: string;
  description?: string;
  createdAt: string;
}

const ITEMS_KEY = "kookiez_portfolio_items";
const HIDDEN_KEY = "kookiez_portfolio_hidden";
export const PORTFOLIO_UPDATED_EVENT = "kookiez:portfolio-updated";

function notify() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(PORTFOLIO_UPDATED_EVENT));
}

function readItems(): CustomWorkItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(ITEMS_KEY);
    return raw ? (JSON.parse(raw) as CustomWorkItem[]) : [];
  } catch {
    return [];
  }
}

function writeItems(items: CustomWorkItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ITEMS_KEY, JSON.stringify(items));
  notify();
}

export function getCustomWorkItems(): CustomWorkItem[] {
  return readItems();
}

export function addWorkItem(item: Omit<CustomWorkItem, "id" | "createdAt">): CustomWorkItem {
  const newItem: CustomWorkItem = {
    ...item,
    id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
  };
  const all = readItems();
  all.unshift(newItem);
  writeItems(all);
  return newItem;
}

export function updateWorkItem(id: string, patch: Partial<Omit<CustomWorkItem, "id" | "createdAt">>) {
  const all = readItems();
  const idx = all.findIndex((w) => w.id === id);
  if (idx >= 0) {
    all[idx] = { ...all[idx], ...patch };
    writeItems(all);
  }
}

export function deleteWorkItem(id: string) {
  writeItems(readItems().filter((w) => w.id !== id));
}

/* -------------------- Karya bawaan (default) -------------------- */
/* Karya bawaan didefinisikan di lib/i18n.tsx (workData) supaya bisa  */
/* diterjemahkan. Admin tidak bisa mengedit teksnya langsung, tapi     */
/* bisa menyembunyikannya dari tampilan publik lewat daftar ini.      */

function readHidden(): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HIDDEN_KEY);
    return raw ? (JSON.parse(raw) as number[]) : [];
  } catch {
    return [];
  }
}

function writeHidden(ids: number[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(HIDDEN_KEY, JSON.stringify(ids));
  notify();
}

export function getHiddenDefaultIds(): number[] {
  return readHidden();
}

export function toggleDefaultVisibility(id: number) {
  const hidden = readHidden();
  const next = hidden.includes(id) ? hidden.filter((h) => h !== id) : [...hidden, id];
  writeHidden(next);
}

/* -------------------- Katalog utama: public/data/portfolio.json -------------------- */
/* Ini SUMBER DATA ASLI untuk karya yang tampil di landing page.       */
/* Edit file public/data/portfolio.json untuk menambah/mengubah/       */
/* menghapus karya — website otomatis sinkron karena datanya diambil  */
/* langsung dari file ini saat halaman dimuat.                        */

interface RawPortfolioJsonItem {
  id: string;
  klien: string;
  kategori: string;
  tahun?: string;
  span?: string;
  image?: string;
  hue?: string;
  deskripsi?: string;
}

const CATEGORY_LABEL_TO_ID: Record<string, ServiceId> = {
  logo: "logo",
  banner: "banner",
  poster: "poster",
  flyer: "flyer",
  brosur: "brosur",
  konsultasi: "konsultasi",
};

function mapKategoriToCategory(kategori: string): ServiceId | "lainnya" {
  return CATEGORY_LABEL_TO_ID[kategori.trim().toLowerCase()] ?? "lainnya";
}

export async function fetchPublishedPortfolio(): Promise<CustomWorkItem[]> {
  try {
    const res = await fetch("/api/portfolio", { cache: "no-store" });
    if (!res.ok) return [];
    const payload = await res.json() as { items?: RawPortfolioJsonItem[] } | RawPortfolioJsonItem[];
    const raw = Array.isArray(payload) ? payload : payload.items ?? [];
    if (!Array.isArray(raw)) return [];
    return raw.map((item) => ({
      id: `json-${item.id}`,
      title: item.klien,
      tag: item.kategori,
      category: mapKategoriToCategory(item.kategori),
      hue: item.hue && item.hue.startsWith("#") ? item.hue : "#0038FF",
      image: item.image,
      description: item.deskripsi,
      createdAt: item.tahun ?? "",
    }));
  } catch {
    return [];
  }
}
