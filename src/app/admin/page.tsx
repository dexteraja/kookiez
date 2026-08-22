"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, LogOut } from "lucide-react";
import { useLang, useServices, type ServiceId } from "@/lib/i18n";
import { getAllOrders, updateOrderStatus, type StoredOrder, type OrderStatus } from "@/lib/orders";
import { addWorkItem, deleteWorkItem, getCustomWorkItems, getHiddenDefaultIds, toggleDefaultVisibility, updateWorkItem, type CustomWorkItem } from "@/lib/portfolio";
import { getSiteSettings, saveSiteSettings, type SiteSettings } from "@/lib/site-settings";

const STATUS_OPTIONS: OrderStatus[] = ["pending", "progress", "review", "done"];

export default function AdminPage() {
  const { t } = useLang();
  const services = useServices();
  const { data: session, status } = useSession();
  const router = useRouter();
  const [orders, setOrders] = useState<StoredOrder[]>([]);
  const [works, setWorks] = useState<CustomWorkItem[]>([]);
  const [hiddenDefaults, setHiddenDefaults] = useState<number[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>({ availability: "available", note: "Menerima proyek baru minggu ini." });
  const emptyWork = { title: "", tag: "", category: "logo" as ServiceId, hue: "#0038FF", image: "", description: "" };
  const [workForm, setWorkForm] = useState(emptyWork);

  const refreshPortfolio = () => { setWorks(getCustomWorkItems()); setHiddenDefaults(getHiddenDefaultIds()); };

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    else if (session?.user?.role === "pending-admin") router.replace("/admin-verify");
    else if (session?.user?.role === "member") router.replace("/");
    else if (session?.user?.role === "admin") { setOrders(getAllOrders()); refreshPortfolio(); setSiteSettings(getSiteSettings()); }
  }, [status, session, router]);

  const changeStatus = (code: string, s: OrderStatus) => {
    updateOrderStatus(code, s);
    setOrders(getAllOrders());
  };

  const saveWork = (e: FormEvent) => {
    e.preventDefault();
    if (!workForm.title.trim() || !workForm.tag.trim()) return;
    if (editingId) updateWorkItem(editingId, workForm);
    else addWorkItem(workForm);
    setWorkForm(emptyWork); setEditingId(null); refreshPortfolio();
  };

  if (status === "loading" || session?.user?.role !== "admin") return null;

  return (
    <div className="min-h-screen bg-[#F9F9FB] text-[#1A1A1E]">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-6">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-[#1A1A1E]/50 hover:text-[#1A1A1E]">
            <ArrowLeft className="w-4 h-4" /> kookiez.
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="inline-flex items-center gap-1.5 text-sm text-[#1A1A1E]/50 hover:text-[#1A1A1E]"
          >
            <LogOut className="w-4 h-4" /> {t("admin_logout")}
          </button>
        </div>

        <h1 className="font-heading text-2xl font-semibold mb-3">{t("admin_title")}</h1>

        <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-8">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{t("admin_warning")}</span>
        </div>

        <section className="mb-12 border-t border-[#1A1A1E]/10 pt-8">
          <p className="font-mono text-[10px] tracking-widest text-[#0038FF]">STATUS STUDIO</p>
          <h2 className="font-heading text-3xl leading-none mt-2 mb-5">Ketersediaan proyek</h2>
          <div className="border border-[#1A1A1E]/10 rounded-lg p-5 bg-white grid sm:grid-cols-[180px_1fr_auto] gap-3 items-end">
            <label className="text-sm font-medium">Status<select value={siteSettings.availability} onChange={(e) => setSiteSettings({ ...siteSettings, availability: e.target.value as SiteSettings["availability"] })} className="mt-2 block w-full border border-[#1A1A1E]/15 rounded-md px-3 py-2.5 bg-white text-sm"><option value="available">Slot tersedia</option><option value="limited">Slot terbatas</option><option value="closed">Antrean penuh</option></select></label>
            <label className="text-sm font-medium">Catatan<input value={siteSettings.note} onChange={(e) => setSiteSettings({ ...siteSettings, note: e.target.value })} className="mt-2 block w-full border border-[#1A1A1E]/15 rounded-md px-3 py-2.5 text-sm" /></label>
            <button onClick={() => saveSiteSettings(siteSettings)} className="bg-[#1A1A1E] text-white rounded-md px-4 py-2.5 text-sm font-medium">Simpan</button>
          </div>
        </section>

        <section className="mb-12 border-t border-[#1A1A1E]/10 pt-8">
          <div className="flex items-end justify-between gap-4 mb-5"><div><p className="font-mono text-[10px] tracking-widest text-[#0038FF]">PORTFOLIO CMS</p><h2 className="font-heading text-3xl leading-none mt-2">Atur Karya Kami</h2></div><span className="text-xs text-[#1A1A1E]/45">Perubahan langsung tampil di landing pada browser ini.</span></div>
          <form onSubmit={saveWork} className="grid sm:grid-cols-2 gap-3 border border-[#1A1A1E]/10 rounded-lg p-5 bg-white">
            <input value={workForm.title} onChange={(e) => setWorkForm({ ...workForm, title: e.target.value })} placeholder="Judul karya" className="border border-[#1A1A1E]/15 rounded-md px-3 py-2.5 text-sm" required />
            <input value={workForm.tag} onChange={(e) => setWorkForm({ ...workForm, tag: e.target.value })} placeholder="Label kategori" className="border border-[#1A1A1E]/15 rounded-md px-3 py-2.5 text-sm" required />
            <select value={workForm.category} onChange={(e) => setWorkForm({ ...workForm, category: e.target.value as ServiceId })} className="border border-[#1A1A1E]/15 rounded-md px-3 py-2.5 text-sm bg-white">{services.filter((s) => s.id !== "konsultasi").map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}</select>
            <input value={workForm.hue} onChange={(e) => setWorkForm({ ...workForm, hue: e.target.value })} placeholder="Warna fallback, mis. #0038FF" className="border border-[#1A1A1E]/15 rounded-md px-3 py-2.5 text-sm" />
            <input value={workForm.image} onChange={(e) => setWorkForm({ ...workForm, image: e.target.value })} placeholder="URL gambar (opsional)" className="sm:col-span-2 border border-[#1A1A1E]/15 rounded-md px-3 py-2.5 text-sm" />
            <textarea value={workForm.description} onChange={(e) => setWorkForm({ ...workForm, description: e.target.value })} placeholder="Deskripsi singkat karya (opsional)" className="sm:col-span-2 border border-[#1A1A1E]/15 rounded-md px-3 py-2.5 text-sm resize-none" rows={2} />
            <div className="sm:col-span-2 flex gap-2"><button className="bg-[#1A1A1E] text-white rounded-md px-4 py-2.5 text-sm font-medium">{editingId ? "Simpan perubahan" : "Tambah karya"}</button>{editingId && <button type="button" onClick={() => { setEditingId(null); setWorkForm(emptyWork); }} className="border border-[#1A1A1E]/15 rounded-md px-4 py-2.5 text-sm">Batal</button>}</div>
          </form>
          <div className="mt-4 space-y-2">
            {works.map((work) => <div key={work.id} className="flex items-center justify-between gap-3 border border-[#1A1A1E]/10 rounded-md p-3 text-sm"><span className="truncate"><b>{work.title}</b> <span className="text-[#1A1A1E]/45">{work.tag}</span></span><span className="flex gap-3 shrink-0"><button onClick={() => { setEditingId(work.id); setWorkForm({ title: work.title, tag: work.tag, category: work.category as ServiceId, hue: work.hue, image: work.image || "", description: work.description || "" }); }} className="text-[#0038FF]">Edit</button><button onClick={() => { deleteWorkItem(work.id); refreshPortfolio(); }} className="text-red-700">Hapus</button></span></div>)}
            {[1,2,3,4,5,6].map((id) => <button key={id} onClick={() => { toggleDefaultVisibility(id); refreshPortfolio(); }} className="w-full text-left flex justify-between gap-3 border border-dashed border-[#1A1A1E]/15 rounded-md p-3 text-xs text-[#1A1A1E]/60"><span>Karya bawaan #{String(id).padStart(3, "0")}</span><span>{hiddenDefaults.includes(id) ? "Tampilkan" : "Sembunyikan"}</span></button>)}
          </div>
        </section>

        {orders.length === 0 ? (
          <p className="text-sm text-[#1A1A1E]/50">{t("admin_empty")}</p>
        ) : (
          <div className="space-y-3">
            {orders.map((o) => (
              <div key={o.code} className="rounded-lg border border-[#1A1A1E]/10 p-4">
                <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                  <div>
                    <span className="font-mono text-sm font-semibold text-[#0038FF]">{o.code}</span>
                    <span className="text-xs text-[#1A1A1E]/40 ml-2">{new Date(o.createdAt).toLocaleString()}</span>
                  </div>
                  <select
                    value={o.status}
                    onChange={(e) => changeStatus(o.code, e.target.value as OrderStatus)}
                    className="text-xs font-mono border border-[#1A1A1E]/15 rounded-md px-2 py-1.5 bg-white"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {t(`status_${s}` as any)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-[#1A1A1E]/70">
                  <div>
                    <div className="text-[#1A1A1E]/40">{t("step4_service")}</div>
                    <div className="font-medium">{o.service || "—"}</div>
                  </div>
                  <div>
                    <div className="text-[#1A1A1E]/40">{t("step4_budget")}</div>
                    <div className="font-medium">{o.budgetLabel || "—"}</div>
                  </div>
                  <div>
                    <div className="text-[#1A1A1E]/40">{t("step4_deadline")}</div>
                    <div className="font-medium">{o.deadline || "—"}</div>
                  </div>
                  <div>
                    <div className="text-[#1A1A1E]/40">{t("step4_pay_method")}</div>
                    <div className="font-medium">
                      {o.plan} · {o.method}
                    </div>
                  </div>
                </div>
                {o.briefScope && (
                  <p className="text-xs text-[#1A1A1E]/60 mt-3 pt-3 border-t border-[#1A1A1E]/10">{o.briefScope}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
