export type PaketId = "basic" | "pro" | "business";

export type Paket = {
  id: PaketId;
  nama: string;
  harga: number;
  satuan: string;
  deskripsi: string;
  fitur: string[];
  populer?: boolean;
};

export const paketList: Paket[] = [
  {
    id: "basic",
    nama: "Basic",
    harga: 350000,
    satuan: "/ proyek",
    deskripsi: "Untuk kebutuhan desain simpel dan cepat.",
    fitur: [
      "1 konsep desain",
      "2x revisi",
      "Pengerjaan 2-3 hari",
      "File JPG & PNG",
    ],
  },
  {
    id: "pro",
    nama: "Pro",
    harga: 850000,
    satuan: "/ proyek",
    deskripsi: "Paling banyak dipilih untuk brand yang sedang tumbuh.",
    fitur: [
      "3 konsep desain",
      "5x revisi",
      "Pengerjaan 3-5 hari",
      "File master (AI, PSD, Figma)",
      "Konsultasi 1x via call",
    ],
    populer: true,
  },
  {
    id: "business",
    nama: "Business",
    harga: 2200000,
    satuan: "/ proyek",
    deskripsi: "Untuk kebutuhan identitas visual menyeluruh.",
    fitur: [
      "Konsep desain tanpa batas",
      "Revisi tanpa batas",
      "Pengerjaan 7-10 hari",
      "Semua file master",
      "Brand guideline ringkas",
      "Prioritas antrian",
    ],
  },
];

export type KategoriPortofolio = "Semua" | "Logo" | "UI/UX" | "Banner";

export type KaryaItem = {
  id: string;
  klien: string;
  kategori: Exclude<KategoriPortofolio, "Semua">;
  tahun: string;
  span: "tall" | "wide" | "normal";
  hue: string;
};

export const karyaList: KaryaItem[] = [
  { id: "k1", klien: "Warung Kopi Rindu", kategori: "Logo", tahun: "2026", span: "tall", hue: "from-honey-500 to-mocha-700" },
  { id: "k2", klien: "Nadin Skincare App", kategori: "UI/UX", tahun: "2025", span: "wide", hue: "from-mocha-700 to-mocha-900" },
  { id: "k3", klien: "Sate Bu Retno", kategori: "Banner", tahun: "2026", span: "normal", hue: "from-honey-400 to-honey-600" },
  { id: "k4", klien: "Alun Coffee App", kategori: "UI/UX", tahun: "2025", span: "tall", hue: "from-mocha-600 to-mocha-800" },
  { id: "k5", klien: "Rimba Outdoor", kategori: "Logo", tahun: "2026", span: "normal", hue: "from-cream-300 to-honey-500" },
  { id: "k6", klien: "Promo Ramadan Klarin", kategori: "Banner", tahun: "2025", span: "wide", hue: "from-mocha-800 to-mocha-950" },
  { id: "k7", klien: "Belanja.in Dashboard", kategori: "UI/UX", tahun: "2026", span: "normal", hue: "from-honey-500 to-mocha-800" },
  { id: "k8", klien: "Kedai Roti Nadia", kategori: "Logo", tahun: "2025", span: "normal", hue: "from-cream-200 to-cream-400" },
];
