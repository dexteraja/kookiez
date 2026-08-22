import { NextRequest, NextResponse } from "next/server";

// STUB — belum benar-benar mengirim email. Untuk mengaktifkan pengiriman
// email sungguhan, paling gampang pakai layanan seperti Resend
// (https://resend.com) atau Nodemailer + SMTP. Contoh dengan Resend:
//
//   npm install resend
//
//   import { Resend } from "resend";
//   const resend = new Resend(process.env.RESEND_API_KEY);
//   await resend.emails.send({
//     from: "Kookiez <order@yourdomain.com>",
//     to: order.customerEmail, // perlu tambah field email di form checkout
//     subject: `Pesanan ${order.code} diterima`,
//     html: `<p>Terima kasih! Kode pesananmu: <b>${order.code}</b></p>`,
//   });
//
// Simpan RESEND_API_KEY di file .env.local (jangan commit ke git).
// Saat ini route ini hanya mencatat pesanan ke log server sebagai bukti
// data sampai — cukup untuk demo, tidak untuk produksi.

export async function POST(req: NextRequest) {
  try {
    const order = await req.json();
    console.log("[send-confirmation] Order received:", order.code, order.service);
    // TODO: ganti baris di atas dengan pemanggilan layanan email sungguhan.
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("send-confirmation error:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}