import { useCallback, useEffect, useState } from "react"
import {
  ArrowLeft, CalendarDays, CheckCircle2, Clock3, ExternalLink, MapPin,
  RefreshCw, ShieldCheck, Ticket, Users, XCircle,
} from "lucide-react"
import { supabase } from "../../../lib/supabase"

type EventStatus = "draft" | "published" | "cancelled" | "completed"
type RegistrationStatus = "registered" | "cancelled" | "attended" | "no_show"

interface NumeaEvent {
  id: string
  title: string
  description: string
  category: string
  location: string
  meeting_url: string | null
  starts_at: string
  ends_at: string | null
  registration_deadline: string | null
  capacity: number | null
  status: EventStatus
  created_by: string
}

interface Registration {
  id: string
  event_id: string
  user_id: string
  status: RegistrationStatus
  registered_at: string
}

interface Props {
  onBack: () => void
  darkMode?: boolean
  onToggleTheme?: () => void
}

const inputClass = "w-full rounded-xl border border-border/70 bg-background/70 px-3.5 py-3 text-sm outline-none focus:border-[#E95C9E]"
const buttonClass = "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
const blankForm = {
  title: "", description: "", category: "Webinar", location: "Online", meeting_url: "",
  starts_at: "", ends_at: "", registration_deadline: "", capacity: "",
}

function localDateTime(value: string | null) {
  if (!value) return "Belum ditentukan"
  return new Date(value).toLocaleString("id-ID", {
    dateStyle: "medium", timeStyle: "short",
  })
}
function toLocalInput(value: string | null) {
  if (!value) return ""
  const date = new Date(value)
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16)
}
function statusLabel(status: EventStatus) {
  return ({ draft: "Draft", published: "Diterbitkan", cancelled: "Dibatalkan", completed: "Selesai" })[status]
}

export default function NumeaEvents({ onBack }: Props) {
  const [userId, setUserId] = useState("")
  const [isAdmin, setIsAdmin] = useState(false)
  const [events, setEvents] = useState<NumeaEvent[]>([])
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [myRegistrations, setMyRegistrations] = useState<Registration[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState("")
  const [error, setError] = useState("")
  const [showAdminForm, setShowAdminForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [participantNames, setParticipantNames] = useState<Record<string, string>>({})
  const [participantLoading, setParticipantLoading] = useState(false)
  const [form, setForm] = useState({ ...blankForm })

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const [{ data: authData, error: authError }, { data: adminData, error: adminError }] =
        await Promise.all([supabase.auth.getUser(), supabase.rpc("is_numea_admin")])
      if (authError) throw authError
      if (adminError) throw adminError
      const uid = authData.user?.id ?? ""
      setUserId(uid)
      const admin = Boolean(adminData)
      setIsAdmin(admin)

      const eventQuery = supabase.from("numea_events").select("*").order("starts_at", { ascending: true })
      const registrationQuery = supabase.from("numea_event_registrations").select("*").order("registered_at", { ascending: false })
      const [eventResult, ownResult, allResult] = await Promise.all([
        eventQuery,
        uid ? supabase.from("numea_event_registrations").select("*").eq("user_id", uid) : Promise.resolve({ data: [], error: null }),
        admin ? registrationQuery : Promise.resolve({ data: [], error: null }),
      ])
      if (eventResult.error) throw eventResult.error
      if (ownResult.error) throw ownResult.error
      if (allResult.error) throw allResult.error
      setEvents((eventResult.data ?? []) as NumeaEvent[])
      setMyRegistrations((ownResult.data ?? []) as Registration[])
      setRegistrations((allResult.data ?? []) as Registration[])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat data Events.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const selectedEvent = events.find((event) => event.id === selectedEventId) ?? null

  function startEdit(event: NumeaEvent) {
    setEditingId(event.id)
    setForm({
      title: event.title, description: event.description, category: event.category,
      location: event.location, meeting_url: event.meeting_url ?? "",
      starts_at: toLocalInput(event.starts_at), ends_at: toLocalInput(event.ends_at),
      registration_deadline: toLocalInput(event.registration_deadline),
      capacity: event.capacity == null ? "" : String(event.capacity),
    })
    setShowAdminForm(true)
    setNotice("")
  }
  function resetForm() {
    setForm({ ...blankForm })
    setEditingId(null)
    setShowAdminForm(false)
  }

  async function saveEvent(publish: boolean) {
    if (!form.title.trim() || !form.starts_at) {
      setError("Judul acara dan waktu mulai wajib diisi.")
      return
    }
    if (form.ends_at && new Date(form.ends_at) < new Date(form.starts_at)) {
      setError("Waktu selesai tidak boleh sebelum waktu mulai.")
      return
    }
    setSaving(true); setError(""); setNotice("")
    try {
      const payload = {
        title: form.title.trim(), description: form.description.trim(),
        category: form.category.trim() || "Kegiatan", location: form.location.trim() || "Online",
        meeting_url: form.meeting_url.trim() || null,
        starts_at: new Date(form.starts_at).toISOString(),
        ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
        registration_deadline: form.registration_deadline ? new Date(form.registration_deadline).toISOString() : null,
        capacity: form.capacity.trim() ? Number(form.capacity) : null,
        status: publish ? "published" : (editingId ? events.find((e) => e.id === editingId)?.status ?? "draft" : "draft"),
      }
      if (payload.capacity !== null && (!Number.isInteger(payload.capacity) || payload.capacity < 1)) {
        throw new Error("Kapasitas harus berupa bilangan bulat positif.")
      }
      const result = editingId
        ? await supabase.from("numea_events").update(payload).eq("id", editingId)
        : await supabase.from("numea_events").insert({ ...payload, created_by: userId })
      if (result.error) throw result.error
      resetForm()
      setNotice(publish ? "Acara berhasil disimpan dan diterbitkan." : "Acara berhasil disimpan sebagai draft.")
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan acara.")
    } finally { setSaving(false) }
  }

  async function changeStatus(event: NumeaEvent, status: EventStatus) {
    const action = status === "published" ? "menerbitkan kembali" : status === "cancelled" ? "membatalkan" : "menyelesaikan"
    if (!window.confirm(`Yakin ingin ${action} acara "${event.title}"?`)) return
    setError(""); setNotice("")
    const { error: updateError } = await supabase.from("numea_events").update({ status, updated_at: new Date().toISOString() }).eq("id", event.id)
    if (updateError) { setError(updateError.message); return }
    setNotice(`Status acara diperbarui menjadi ${statusLabel(status)}.`)
    await load()
  }

  async function toggleParticipants(event: NumeaEvent) {
    if (selectedEventId === event.id) {
      setSelectedEventId(null)
      return
    }
    setSelectedEventId(event.id)
    setParticipantLoading(true)
    setError("")
    try {
      const { data, error: participantError } = await supabase.rpc("numea_admin_event_participants", { p_event_id: event.id })
      if (participantError) throw participantError
      const names: Record<string, string> = {}
      for (const row of (data ?? []) as Array<{ user_id: string; display_name: string | null }>) {
        names[row.user_id] = row.display_name?.trim() || row.user_id
      }
      setParticipantNames((previous) => ({ ...previous, ...names }))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat identitas peserta.")
    } finally {
      setParticipantLoading(false)
    }
  }

  async function deleteEvent(event: NumeaEvent) {
    const confirmed = window.confirm(`Hapus permanen acara "${event.title}" beserta seluruh data pendaftarannya? Tindakan ini tidak dapat dibatalkan.`)
    if (!confirmed) return
    setSaving(true)
    setError("")
    setNotice("")
    try {
      const { error: deleteError } = await supabase.rpc("numea_admin_delete_event", { p_event_id: event.id })
      if (deleteError) throw deleteError
      if (selectedEventId === event.id) setSelectedEventId(null)
      setNotice("Acara dan data pendaftarannya berhasil dihapus.")
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menghapus acara.")
    } finally {
      setSaving(false)
    }
  }

  async function register(event: NumeaEvent) {
    if (!userId) { setError("Sesi pengguna tidak ditemukan. Silakan login kembali."); return }
    setSaving(true); setError(""); setNotice("")
    try {
      const { error: registerError } = await supabase.rpc("numea_register_for_event", { p_event_id: event.id })
      if (registerError) throw registerError
      setNotice("Pendaftaran acara berhasil.")
      await load()
    } catch (e) { setError(e instanceof Error ? e.message : "Pendaftaran gagal.") }
    finally { setSaving(false) }
  }

  async function cancelRegistration(registration: Registration) {
    if (!window.confirm("Batalkan pendaftaran acara ini?")) return
    const { error: updateError } = await supabase.rpc("numea_cancel_event_registration", { p_event_id: registration.event_id })
    if (updateError) { setError(updateError.message); return }
    setNotice("Pendaftaran dibatalkan.")
    await load()
  }

  const visibleEvents = events.filter((event) => isAdmin || event.status === "published")
  const selectedRegistrations = selectedEvent ? registrations.filter((r) => r.event_id === selectedEvent.id) : []

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4 sm:px-6">
          <button type="button" onClick={onBack} className={`${buttonClass} border border-border/70`}><ArrowLeft className="h-4 w-4" /> Kembali</button>
          <div className="min-w-0 flex-1"><p className="text-xs font-semibold uppercase tracking-[.18em] text-[#E95C9E]">NUMEA EDU</p><h1 className="text-xl font-bold sm:text-2xl">Events</h1></div>
          <button type="button" onClick={() => void load()} className={`${buttonClass} border border-border/70`} disabled={loading}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> <span className="hidden sm:inline">Muat ulang</span></button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-7 sm:px-6">
        <section className="rounded-3xl border border-border/60 bg-gradient-to-br from-[#F6C64F]/15 via-[#FF7411]/10 to-[#E95C9E]/15 p-6 sm:p-9">
          <div className="flex items-start gap-4"><div className="rounded-2xl bg-[#E95C9E]/10 p-3"><CalendarDays className="h-7 w-7 text-[#E95C9E]" /></div><div><h2 className="text-2xl font-bold">Belajar bersama, bertumbuh bersama</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Temukan webinar, pelatihan, diskusi, dan agenda pengembangan diri dari NUMEA EDU.</p></div></div>
          {isAdmin && <button type="button" onClick={() => { resetForm(); setShowAdminForm(true); setError(""); setNotice("") }} className={`${buttonClass} mt-5 bg-gradient-to-r from-[#FF7411] to-[#E95C9E] text-white`}><CalendarDays className="h-4 w-4" /> Buat acara</button>}
        </section>

        {notice && <div role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm">{notice}</div>}
        {error && <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm">{error}</div>}
        {loading && <p className="py-10 text-center text-sm text-muted-foreground">Memuat acara…</p>}

        {showAdminForm && isAdmin && <section className="rounded-2xl border border-border/70 p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3"><h2 className="text-lg font-bold">{editingId ? "Edit acara" : "Buat acara baru"}</h2><button type="button" onClick={resetForm} className={`${buttonClass} border border-border/70`}>Tutup</button></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm font-medium">Judul acara *<input className={inputClass} maxLength={160} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Contoh: Webinar Numerasi SD" /></label>
            <label className="space-y-1.5 text-sm font-medium">Kategori<select className={inputClass} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{["Webinar","Pelatihan","Lokakarya","Diskusi","Komunitas","Kegiatan"].map((v) => <option key={v}>{v}</option>)}</select></label>
            <label className="space-y-1.5 text-sm font-medium">Waktu mulai *<input type="datetime-local" className={inputClass} value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} /></label>
            <label className="space-y-1.5 text-sm font-medium">Waktu selesai<input type="datetime-local" className={inputClass} value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} /></label>
            <label className="space-y-1.5 text-sm font-medium">Batas pendaftaran<input type="datetime-local" className={inputClass} value={form.registration_deadline} onChange={(e) => setForm({ ...form, registration_deadline: e.target.value })} /></label>
            <label className="space-y-1.5 text-sm font-medium">Kapasitas peserta (opsional)<input type="number" min={1} step={1} className={inputClass} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} placeholder="Kosongkan jika tanpa batas" /></label>
            <label className="space-y-1.5 text-sm font-medium sm:col-span-2">Lokasi / platform<input className={inputClass} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Online / nama tempat" /></label>
            <label className="space-y-1.5 text-sm font-medium sm:col-span-2">Tautan acara (opsional)<input type="url" className={inputClass} value={form.meeting_url} onChange={(e) => setForm({ ...form, meeting_url: e.target.value })} placeholder="https://..." /></label>
            <label className="space-y-1.5 text-sm font-medium sm:col-span-2">Deskripsi<textarea rows={4} className={inputClass} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Tujuan, sasaran peserta, dan gambaran kegiatan…" /></label>
          </div>
          <div className="mt-5 flex flex-wrap gap-2"><button type="button" disabled={saving} onClick={() => void saveEvent(false)} className={`${buttonClass} border border-border/70`}>{saving ? "Menyimpan…" : "Simpan draft"}</button><button type="button" disabled={saving} onClick={() => void saveEvent(true)} className={`${buttonClass} bg-gradient-to-r from-[#FF7411] to-[#E95C9E] text-white`}>{saving ? "Menyimpan…" : "Terbitkan acara"}</button></div>
        </section>}

        {visibleEvents.length === 0 && !loading && <section className="rounded-2xl border border-dashed border-border p-10 text-center"><CalendarDays className="mx-auto h-8 w-8 text-muted-foreground" /><h2 className="mt-3 font-semibold">Belum ada acara</h2><p className="mt-1 text-sm text-muted-foreground">{isAdmin ? "Buat acara pertama NUMEA EDU menggunakan tombol di atas." : "Agenda yang diterbitkan admin akan muncul di sini."}</p></section>}

        <section className="grid gap-4 md:grid-cols-2">
          {visibleEvents.map((event) => {
            const registration = myRegistrations.find((r) => r.event_id === event.id)
            const registeredCount = registrations.filter((r) => r.event_id === event.id && r.status === "registered").length
            const isFull = event.capacity !== null && registeredCount >= event.capacity
            const isPastDeadline = Boolean(event.registration_deadline && new Date(event.registration_deadline).getTime() < Date.now())
            return <article key={event.id} className="overflow-hidden rounded-2xl border border-border/70 bg-card/70">
              <div className="h-1.5 bg-gradient-to-r from-[#F6C64F] via-[#FF7411] to-[#E95C9E]" />
              <div className="space-y-4 p-5">
                <div className="flex items-start justify-between gap-3"><span className="rounded-full bg-[#E95C9E]/10 px-3 py-1 text-xs font-semibold text-[#E95C9E]">{event.category}</span>{isAdmin && <span className="text-xs text-muted-foreground">{statusLabel(event.status)}</span>}</div>
                <div><h3 className="text-lg font-bold">{event.title}</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{event.description || "Informasi acara akan diperbarui oleh penyelenggara."}</p></div>
                <div className="space-y-2 text-sm text-muted-foreground"><p className="flex items-center gap-2"><Clock3 className="h-4 w-4 shrink-0" />{localDateTime(event.starts_at)}{event.ends_at ? ` – ${localDateTime(event.ends_at)}` : ""}</p><p className="flex items-center gap-2"><MapPin className="h-4 w-4 shrink-0" />{event.location}</p><p className="flex items-center gap-2"><Users className="h-4 w-4 shrink-0" />{isAdmin ? `${registeredCount} pendaftar` : event.capacity ? `Kapasitas ${event.capacity} peserta` : "Pendaftaran tersedia"}</p>{event.registration_deadline && <p className="text-xs">Batas pendaftaran: {localDateTime(event.registration_deadline)}</p>}</div>
                <div className="flex flex-wrap gap-2 border-t border-border/60 pt-4">
                  {!isAdmin && event.status === "published" && (registration?.status === "registered"
                    ? <button type="button" onClick={() => void cancelRegistration(registration)} className={`${buttonClass} border border-border/70`}><XCircle className="h-4 w-4" /> Batalkan pendaftaran</button>
                    : <button type="button" disabled={saving || isFull || isPastDeadline} onClick={() => void register(event)} className={`${buttonClass} bg-gradient-to-r from-[#FF7411] to-[#E95C9E] text-white`}><Ticket className="h-4 w-4" />{isFull ? "Kuota penuh" : isPastDeadline ? "Pendaftaran ditutup" : "Daftar acara"}</button>)}
                  {registration?.status === "registered" && !isAdmin && <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600"><CheckCircle2 className="h-4 w-4" /> Terdaftar</span>}
                  {event.meeting_url && event.status === "published" && <a href={event.meeting_url} target="_blank" rel="noreferrer" className={`${buttonClass} border border-border/70`}><ExternalLink className="h-4 w-4" /> Tautan acara</a>}
                  {isAdmin && <><button type="button" onClick={() => startEdit(event)} className={`${buttonClass} border border-border/70`}>Edit</button><button type="button" onClick={() => void toggleParticipants(event)} className={`${buttonClass} border border-border/70`}><Users className="h-4 w-4" /> Peserta ({registeredCount})</button>{event.status !== "published" && event.status !== "completed" && <button type="button" onClick={() => void changeStatus(event, "published")} className={`${buttonClass} border border-emerald-500/30 text-emerald-600`}><CheckCircle2 className="h-4 w-4" /> Terbitkan</button>}{event.status === "published" && <button type="button" onClick={() => void changeStatus(event, "cancelled")} className={`${buttonClass} border border-red-500/30 text-red-600`}><XCircle className="h-4 w-4" /> Batalkan acara</button>}{event.status === "published" && <button type="button" onClick={() => void changeStatus(event, "completed")} className={`${buttonClass} border border-border/70`}>Tandai selesai</button>}<button type="button" disabled={saving} onClick={() => void deleteEvent(event)} className={`${buttonClass} border border-red-500/40 text-red-600`}><XCircle className="h-4 w-4" /> Hapus permanen</button></>}
                </div>
                {isAdmin && selectedEventId === event.id && <div className="rounded-xl border border-border/70 p-3"><h4 className="mb-2 text-sm font-bold">Daftar peserta</h4>{participantLoading ? <p className="text-sm text-muted-foreground">Memuat identitas peserta…</p> : selectedRegistrations.filter((r) => r.status === "registered").length === 0 ? <p className="text-sm text-muted-foreground">Belum ada peserta terdaftar.</p> : <ul className="space-y-2">{selectedRegistrations.filter((r) => r.status === "registered").map((r) => <li key={r.id} className="break-all text-sm"><span className="font-semibold">{participantNames[r.user_id] || r.user_id}</span> <span className="text-muted-foreground">· {localDateTime(r.registered_at)}</span>{!participantNames[r.user_id] && <span className="block text-xs text-muted-foreground">Nama belum tersedia · ID: {r.user_id}</span>}</li>)}</ul>}<p className="mt-2 text-xs text-muted-foreground">Nama profil ditampilkan bila tersedia. Email peserta tidak ditampilkan.</p></div>}
              </div>
            </article>
          })}
        </section>

        {myRegistrations.some((r) => r.status === "registered") && <section className="rounded-2xl border border-border/70 p-5"><h2 className="flex items-center gap-2 font-bold"><Ticket className="h-5 w-5 text-[#E95C9E]" /> Pendaftaran saya</h2><div className="mt-3 space-y-2">{myRegistrations.filter((r) => r.status === "registered").map((r) => { const event = events.find((e) => e.id === r.event_id); return <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted/40 p-3 text-sm"><span>{event?.title ?? "Acara"} <span className="text-muted-foreground">· {event ? localDateTime(event.starts_at) : ""}</span></span><span className="inline-flex items-center gap-1 text-xs text-emerald-600"><CheckCircle2 className="h-4 w-4" /> Terdaftar</span></div>})}</div></section>}

        <p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /> Pendaftaran dan daftar peserta dilindungi oleh kebijakan akses Supabase. Admin mengelola agenda; peserta hanya dapat melihat dan mengubah pendaftarannya sendiri.</p>
      </main>
    </div>
  )
}
