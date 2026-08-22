# Kookiez

Landing page + form pemesanan untuk studio desain Kookiez. Dibuat dengan
Next.js (App Router), TypeScript, Tailwind CSS, dan Lucide React.

## Menjalankan secara lokal

```bash
npm install
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

> Build butuh koneksi internet saat pertama kali dijalankan karena font
> (Fraunces, Inter, IBM Plex Mono) diambil dari Google Fonts lewat `next/font`.

## Struktur

```
app/
  layout.tsx      → font & metadata
  page.tsx         → merangkai semua section
  globals.css
components/
  Navbar.tsx       → header sticky + glassmorphism
  Hero.tsx         → headline, CTA, bento grid karya
  Services.tsx     → 3 paket harga
  Portfolio.tsx     → grid karya dengan filter kategori
  CaraOrder.tsx     → 4 langkah proses order
  OrderForm.tsx     → form pemesanan + ringkasan harga live
  WhatsAppButton.tsx→ tombol CS mengambang
  Footer.tsx
lib/
  data.ts          → daftar paket & karya (edit di sini)
```

## Yang perlu disambungkan sebelum production

- **Pembayaran**: `components/OrderForm.tsx` punya komentar `TODO` di
  `handleSubmit` — ganti dengan pemanggilan API Midtrans Snap atau Xendit
  Invoice, lalu redirect ke halaman pembayaran.
- **Upload referensi**: file yang dipilih user saat ini hanya disimpan di
  state lokal (`components/OrderForm.tsx`). Sambungkan ke storage (S3,
  Cloudinary, dll.) saat submit.
- **Nomor WhatsApp**: ganti `6281234567890` di
  `components/WhatsAppButton.tsx` dengan nomor CS asli.
- **Link sosial media**: ganti URL Instagram/Dribbble di
  `components/Footer.tsx`.
- **Gambar portofolio**: tile di `Hero.tsx` dan `Portfolio.tsx` memakai
  gradient sebagai placeholder (menghindari isu lisensi gambar acak). Ganti
  dengan foto karya asli — cukup tambahkan `<Image>` di dalam masing-masing
  tile dan pertahankan struktur teks di atasnya untuk keterbacaan.
- **Halaman TOS & Kebijakan Privasi**: link di footer (`/tos`, `/privasi`)
  belum punya halaman — buat `app/tos/page.tsx` dan `app/privasi/page.tsx`.
