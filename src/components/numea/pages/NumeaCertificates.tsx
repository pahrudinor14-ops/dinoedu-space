import { type FormEvent, useCallback, useEffect, useState } from "react"
import { ArrowLeft, Award, BadgeCheck, CalendarDays, CheckCircle2, Download, Loader2, Search, ShieldCheck, Trash2, XCircle } from "lucide-react"
import { supabase } from "../../../lib/supabase"

interface NumeaCertificatesProps { onBack: () => void; darkMode?: boolean; onToggleTheme?: () => void }
type Certificate = {
  id: string; recipient_user_id: string; recipient_name: string; title: string;
  activity_name: string; description: string | null; issued_at: string; activity_date: string | null;
  issuer_user_id: string; issuer_name: string; verification_code: string; status: "valid" | "revoked";
  revoked_at: string | null; revoked_reason: string | null;
}
type Recipient = { user_id: string; full_name: string; role: string | null; institution: string | null }
type Verification = { verification_code: string; recipient_name: string; title: string; activity_name: string; activity_date: string | null; issued_at: string; issuer_name: string; status: string }
const fieldClass = "w-full rounded-xl border border-border/70 bg-background px-3 py-2.5 text-sm outline-none focus:border-pink-400"
const dateLabel = (value: string | null) => value ? new Date(value + (value.length === 10 ? "T00:00:00" : "")).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "—"

export default function NumeaCertificates({ onBack, darkMode = false, onToggleTheme }: NumeaCertificatesProps) {
  const [userId, setUserId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [items, setItems] = useState<Certificate[]>([])
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [search, setSearch] = useState("")
  const [recipientId, setRecipientId] = useState("")
  const [recipientName, setRecipientName] = useState("")
  const [title, setTitle] = useState("Sertifikat Penghargaan")
  const [activity, setActivity] = useState("")
  const [description, setDescription] = useState("")
  const [activityDate, setActivityDate] = useState("")
  const [verifyCode, setVerifyCode] = useState("")
  const [verification, setVerification] = useState<Verification | null>(null)
  const [verifyAttempted, setVerifyAttempted] = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setError("")
    try {
      const [{ data: auth, error: authError }, { data: adminData, error: adminError }] = await Promise.all([
        supabase.auth.getUser(), supabase.rpc("is_numea_admin"),
      ])
      if (authError) throw authError
      const current = auth.user
      setUserId(current?.id ?? null)
      const admin = !adminError && Boolean(adminData)
      setIsAdmin(admin)
      if (!current) { setItems([]); setError("Masuk ke akun terlebih dahulu untuk melihat sertifikat."); return }
      const { data, error: listError } = await supabase.from("numea_certificates")
        .select("id,recipient_user_id,recipient_name,title,activity_name,description,issued_at,activity_date,issuer_user_id,issuer_name,verification_code,status,revoked_at,revoked_reason")
        .order("issued_at", { ascending: false })
      if (listError) throw listError
      setItems((data ?? []) as Certificate[])
      if (admin) {
        const { data: directory, error: directoryError } = await supabase.rpc("numea_certificate_recipient_directory")
        if (directoryError) throw directoryError
        setRecipients((directory ?? []) as Recipient[])
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Sertifikat gagal dimuat") }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])
  useEffect(() => {
    const chosen = recipients.find((r) => r.user_id === recipientId)
    if (chosen) setRecipientName(chosen.full_name)
  }, [recipientId, recipients])

  const issue = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(""); setNotice("")
    if (!isAdmin || !userId) { setError("Hanya admin NUMEA yang dapat menerbitkan sertifikat."); return }
    const name = recipientName.trim(), cleanTitle = title.trim(), cleanActivity = activity.trim()
    if (!recipientId || name.length < 2 || cleanTitle.length < 2 || cleanActivity.length < 2) { setError("Pilih penerima dan lengkapi judul serta nama kegiatan."); return }
    setBusy(true)
    try {
      const { data: profile } = await supabase.from("numea_profiles").select("full_name").eq("user_id", userId).maybeSingle()
      const issuerName = profile?.full_name?.trim() || "Admin NUMEA"
      const { error: insertError } = await supabase.from("numea_certificates").insert({
        recipient_user_id: recipientId, recipient_name: name, title: cleanTitle, activity_name: cleanActivity,
        description: description.trim() || null, activity_date: activityDate || null,
        issuer_user_id: userId, issuer_name: issuerName, status: "valid",
      })
      if (insertError) throw insertError
      setNotice(`Sertifikat untuk ${name} berhasil diterbitkan.`)
      setTitle("Sertifikat Penghargaan"); setActivity(""); setDescription(""); setActivityDate("");
      await load()
    } catch (e) { setError(e instanceof Error ? e.message : "Sertifikat gagal diterbitkan") }
    finally { setBusy(false) }
  }
  const revoke = async (item: Certificate) => {
    const reason = window.prompt("Alasan pencabutan sertifikat:")?.trim()
    if (!reason) return
    if (!window.confirm(`Cabut sertifikat ${item.verification_code}?`)) return
    setError(""); setNotice("")
    const { error: revokeError } = await supabase.from("numea_certificates").update({ status: "revoked", revoked_at: new Date().toISOString(), revoked_reason: reason }).eq("id", item.id)
    if (revokeError) setError(revokeError.message); else { setNotice("Sertifikat dicabut dan status verifikasinya diperbarui."); await load() }
  }
  const permanentlyDelete = async (item: Certificate) => {
    if (!isAdmin) { setError("Hanya admin NUMEA yang dapat menghapus sertifikat."); return }
    if (item.status !== "revoked") { setError("Hanya sertifikat yang sudah dicabut yang dapat dihapus permanen."); return }
    const confirmation = window.prompt(
      `PENGHAPUSAN PERMANEN\n\nSertifikat: ${item.title}\nPenerima: ${item.recipient_name}\nKode: ${item.verification_code}\n\nTindakan ini tidak dapat dibatalkan. Ketik HAPUS untuk melanjutkan:`,
    )
    if (confirmation !== "HAPUS") return
    if (!window.confirm("Konfirmasi terakhir: hapus permanen sertifikat ini? Data dan riwayat verifikasinya akan hilang.")) return
    setError(""); setNotice(""); setBusy(true)
    try {
      const { error: deleteError } = await supabase.rpc("numea_admin_delete_revoked_certificate", { p_certificate_id: item.id })
      if (deleteError) throw deleteError
      setNotice(`Sertifikat ${item.verification_code} berhasil dihapus permanen.`)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sertifikat gagal dihapus permanen")
    } finally { setBusy(false) }
  }

  const verify = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setVerifyAttempted(true); setVerification(null); setError("")
    const code = verifyCode.trim().toUpperCase()
    if (!code) return
    const { data, error: verifyError } = await supabase.rpc("numea_verify_certificate", { p_code: code })
    if (verifyError) { setError(verifyError.message); return }
    setVerification(((data ?? []) as Verification[])[0] ?? null)
  }
  const visible = items.filter((item) => `${item.title} ${item.activity_name} ${item.recipient_name} ${item.verification_code}`.toLowerCase().includes(search.trim().toLowerCase()))
  const printCertificate = (item: Certificate) => {
    const popup = window.open("", "_blank", "width=1000,height=750")
    if (!popup) { setError("Popup diblokir browser. Izinkan popup untuk mencetak sertifikat."); return }
    const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] || c))
    popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escape(item.title)}</title><style>@page{size:A4 landscape;margin:12mm}*{box-sizing:border-box}body{font-family:Georgia,serif;color:#30232c;margin:0}.certificate{height:180mm;border:8px double #d89b38;padding:15mm;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;background:linear-gradient(135deg,#fffdf5,#fff 50%,#fff7fb)}.brand{font:700 12px Arial;letter-spacing:5px;color:#c65a91}.eyebrow{margin-top:12px;font:700 11px Arial;letter-spacing:3px;color:#c27b20}.title{font-size:36px;margin:10px 0;color:#9c4775}.name{font-size:32px;font-weight:bold;border-bottom:1px solid #d7b36b;padding:8px 24px;margin:8px 0 16px}.body{font-size:16px;max-width:700px;line-height:1.6}.meta{font:11px Arial;color:#665963;margin-top:18px}.code{font:10px monospace;margin-top:8px;color:#7a6170}.print{font:12px Arial;margin:18px}@media print{.print{display:none}}</style></head><body><main class="certificate"><div class="brand">NUMEA EDU</div><div class="eyebrow">SERTIFIKAT PENGHARGAAN</div><h1 class="title">${escape(item.title)}</h1><div class="body">Dengan ini diberikan kepada</div><div class="name">${escape(item.recipient_name)}</div><div class="body">atas partisipasi atau pencapaian dalam kegiatan <strong>${escape(item.activity_name)}</strong>${item.description ? ` — ${escape(item.description)}` : ""}.</div><div class="meta">Diterbitkan ${escape(dateLabel(item.issued_at.slice(0,10)))} · Penerbit: ${escape(item.issuer_name)}${item.activity_date ? ` · Tanggal kegiatan: ${escape(dateLabel(item.activity_date))}` : ""}</div><div class="code">Kode verifikasi: ${escape(item.verification_code)} · Status: ${escape(item.status === "valid" ? "VALID" : "DICABUT")}</div></main><div class="print"><button onclick="window.print()">Cetak / Simpan PDF</button></div><script>window.onload=()=>window.print()</script></body></html>`)
    popup.document.close()
  }

  return <div className="min-h-screen bg-background text-foreground">
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur-xl"><div className="mx-auto flex h-[68px] max-w-6xl items-center gap-3 px-4 sm:px-6">
      <button type="button" onClick={onBack} className="flex h-10 w-10 items-center justify-center rounded-full border border-border/60" aria-label="Kembali"><ArrowLeft className="h-4 w-4" /></button>
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-pink-500/10"><Award className="h-5 w-5 text-pink-500" /></div><div><p className="font-bold">Sertifikat NUMEA</p><p className="text-xs text-muted-foreground">Dokumentasi dan verifikasi pencapaian</p></div>
      {onToggleTheme && <button type="button" onClick={onToggleTheme} className="ml-auto rounded-full border border-border/60 p-2" aria-label="Ganti tema">{darkMode ? "☀" : "☾"}</button>}
    </div></header>
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-7 sm:px-6">
      {error && <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-600">{error}</div>}
      {notice && <div role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm text-emerald-700">{notice}</div>}
      <section className="rounded-3xl border border-border/60 bg-gradient-to-br from-amber-500/10 via-background to-pink-500/10 p-6 sm:p-9"><div className="flex items-start gap-4"><div className="rounded-2xl bg-pink-500/10 p-3"><ShieldCheck className="h-7 w-7 text-pink-500" /></div><div><p className="text-xs font-bold uppercase tracking-[.18em] text-pink-500">Learning achievements</p><h1 className="mt-2 text-3xl font-bold">Sertifikat pembelajaranmu</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Sertifikat yang diterbitkan admin NUMEA tersimpan dengan kode verifikasi unik. Kamu dapat mencetak atau menyimpannya sebagai PDF.</p></div></div></section>
      <section className="rounded-3xl border border-border/60 p-5 sm:p-6"><div className="flex items-center gap-2"><Search className="h-4 w-4 text-muted-foreground"/><h2 className="text-lg font-bold">Verifikasi sertifikat</h2></div><p className="mt-1 text-sm text-muted-foreground">Masukkan kode yang tercantum pada sertifikat.</p><form onSubmit={verify} className="mt-4 flex flex-col gap-2 sm:flex-row"><input value={verifyCode} onChange={(e) => setVerifyCode(e.target.value)} placeholder="Contoh: A1B2C3D4E5F60708" className={fieldClass} aria-label="Kode verifikasi"/><button className="rounded-xl bg-foreground px-5 py-2.5 text-sm font-semibold text-background" type="submit">Verifikasi</button></form>
        {verifyAttempted && verifyCode.trim() && <div className="mt-4 rounded-2xl border border-border/60 p-4">{verification ? <><div className={`flex items-center gap-2 font-bold ${verification.status === "valid" ? "text-emerald-600" : "text-red-600"}`}>{verification.status === "valid" ? <CheckCircle2 className="h-5 w-5"/> : <XCircle className="h-5 w-5"/>}{verification.status === "valid" ? "Sertifikat valid" : "Sertifikat telah dicabut"}</div><p className="mt-2 font-semibold">{verification.recipient_name}</p><p className="text-sm">{verification.title} · {verification.activity_name}</p><p className="mt-1 text-xs text-muted-foreground">Diterbitkan {dateLabel(verification.issued_at.slice(0,10))} oleh {verification.issuer_name}</p></> : <p className="text-sm text-muted-foreground">Kode tidak ditemukan. Periksa kembali kode sertifikat.</p>}</div>}
      </section>
      {isAdmin && <section className="rounded-3xl border border-pink-500/25 bg-pink-500/[.03] p-5 sm:p-6"><div className="flex items-center gap-2"><BadgeCheck className="h-5 w-5 text-pink-500"/><h2 className="text-xl font-bold">Terbitkan sertifikat</h2></div><p className="mt-1 text-sm text-muted-foreground">Pilih akun yang memiliki profil NUMEA. Nama penerima disimpan pada saat penerbitan.</p><form onSubmit={issue} className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium">Penerima<select required value={recipientId} onChange={(e) => {setRecipientId(e.target.value); const r=recipients.find(x=>x.user_id===e.target.value); setRecipientName(r?.full_name ?? "")}} className={`${fieldClass} mt-1`}><option value="">Pilih pengguna</option>{recipients.map(r=><option key={r.user_id} value={r.user_id}>{r.full_name} · {r.role || "Pengguna"}{r.institution ? ` · ${r.institution}` : ""}</option>)}</select></label>
        <label className="text-sm font-medium">Nama penerima pada sertifikat<input required minLength={2} maxLength={180} value={recipientName} onChange={(e)=>setRecipientName(e.target.value)} className={`${fieldClass} mt-1`}/></label>
        <label className="text-sm font-medium">Judul sertifikat<input required minLength={2} maxLength={200} value={title} onChange={(e)=>setTitle(e.target.value)} className={`${fieldClass} mt-1`}/></label>
        <label className="text-sm font-medium">Nama kegiatan<input required minLength={2} maxLength={200} value={activity} onChange={(e)=>setActivity(e.target.value)} placeholder="Misalnya: Webinar Pendidikan Digital" className={`${fieldClass} mt-1`}/></label>
        <label className="text-sm font-medium">Tanggal kegiatan (opsional)<input type="date" value={activityDate} onChange={(e)=>setActivityDate(e.target.value)} className={`${fieldClass} mt-1`}/></label>
        <label className="text-sm font-medium sm:col-span-2">Keterangan (opsional)<textarea rows={2} maxLength={1000} value={description} onChange={(e)=>setDescription(e.target.value)} className={`${fieldClass} mt-1`} placeholder="Keterangan partisipasi atau pencapaian"/></label>
        <div className="sm:col-span-2"><button disabled={busy || !recipients.length} type="submit" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-pink-500 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{busy ? <Loader2 className="h-4 w-4 animate-spin"/> : <BadgeCheck className="h-4 w-4"/>} Terbitkan sertifikat</button>{!recipients.length && <p className="mt-2 text-xs text-muted-foreground">Tidak ada profil penerima yang tersedia, atau direktori belum dapat dimuat.</p>}</div>
      </form></section>}
      <section><div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-pink-500">My collection</p><h2 className="mt-1 text-2xl font-bold">{isAdmin ? "Sertifikat terbit" : "Sertifikat saya"}</h2><p className="mt-1 text-sm text-muted-foreground">{isAdmin ? "Admin dapat melihat sertifikat yang diterbitkan." : "Hanya sertifikat yang terkait dengan akunmu yang ditampilkan."}</p></div><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Cari sertifikat..." className={`${fieldClass} sm:max-w-xs`}/></div>
        {loading ? <div className="flex items-center justify-center gap-2 py-14 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin"/>Memuat sertifikat...</div> : !userId ? <div className="rounded-2xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">Masuk untuk melihat koleksi sertifikat.</div> : visible.length === 0 ? <div className="rounded-2xl border border-dashed border-border/60 p-10 text-center"><Award className="mx-auto h-9 w-9 text-muted-foreground"/><p className="mt-3 font-semibold">Belum ada sertifikat</p><p className="mt-1 text-sm text-muted-foreground">Sertifikat yang diterbitkan untuk akunmu akan muncul di sini.</p></div> : <div className="grid gap-4 md:grid-cols-2">{visible.map(item=><article key={item.id} className="rounded-2xl border border-border/60 bg-white/30 p-5 dark:bg-white/[.03]"><div className="flex items-start justify-between gap-3"><div className="rounded-xl bg-amber-500/10 p-3"><Award className="h-5 w-5 text-amber-600"/></div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.status === "valid" ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600"}`}>{item.status === "valid" ? "Valid" : "Dicabut"}</span></div><h3 className="mt-4 text-lg font-bold">{item.title}</h3><p className="mt-1 text-sm text-muted-foreground">{item.activity_name}</p><p className="mt-3 text-sm">{item.recipient_name}</p><div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><CalendarDays className="h-3.5 w-3.5"/>Diterbitkan {dateLabel(item.issued_at.slice(0,10))}</div><p className="mt-2 break-all font-mono text-[10px] text-muted-foreground">Kode: {item.verification_code}</p>{item.revoked_reason && <p className="mt-2 text-xs text-red-600">Alasan pencabutan: {item.revoked_reason}</p>}<div className="mt-5 flex flex-wrap gap-2"><button type="button" onClick={()=>printCertificate(item)} className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background"><Download className="h-3.5 w-3.5"/>Cetak / Simpan PDF</button>{isAdmin && item.status === "valid" && <button type="button" disabled={busy} onClick={()=>void revoke(item)} className="rounded-full border border-red-500/30 px-4 py-2 text-xs font-semibold text-red-600 disabled:opacity-50">Cabut sertifikat</button>}{isAdmin && item.status === "revoked" && <button type="button" disabled={busy} onClick={()=>void permanentlyDelete(item)} className="inline-flex items-center gap-1.5 rounded-full border border-red-600/40 px-4 py-2 text-xs font-semibold text-red-700 disabled:opacity-50 dark:text-red-400"><Trash2 className="h-3.5 w-3.5"/>Hapus permanen</button>}</div></article>)}</div>}
      </section>
      <p className="text-xs leading-5 text-muted-foreground">Verifikasi publik menampilkan informasi sertifikat minimum. Data akun dan identitas internal tidak ditampilkan. Simpan kode verifikasi sebagai referensi.</p>
    </main>
  </div>
}
