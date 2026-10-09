import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ArrowLeft, ArrowRight, BookOpen, Bookmark, BookOpenCheck, Clock3, LoaderCircle,
  Plus, Search, ShieldCheck, Sun, Moon, X, Archive, Trash2, Save, ImagePlus, Send, Check, XCircle,
} from "lucide-react"
import { supabase } from "../../../lib/supabase"

interface NumeaLearnProps {
  onBack: () => void
  darkMode?: boolean
  onToggleTheme?: () => void
}

type LearnSection = { heading: string; body: string }
type LearnResource = {
  id: string
  title: string
  slug: string
  category_id: string
  category: string
  summary: string
  content: { sections?: LearnSection[] }
  reading_minutes: number
  level: string
  status: "draft" | "pending_review" | "published" | "rejected" | "archived"
  created_by?: string | null
  review_note?: string | null
}
type LearnCategory = { id: string; name: string; slug: string }

const localBookmarkKey = "numea-learn-bookmarks"
const emptyForm = { title: "", categoryId: "", summary: "", body: "", readingMinutes: "5", level: "Praktis", publish: true }
const imageBucket = "numea-learn-images"
const renderArticleBody = (body: string) => body.split("\n").map((line, index) => {
  const imageMatch = line.trim().match(/^!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)$/)
  if (imageMatch) return <figure key={index} className="my-5"><img src={imageMatch[2]} alt={imageMatch[1] || "Gambar materi"} loading="lazy" className="max-h-[560px] w-full rounded-2xl border border-border/50 object-contain" /><figcaption className="mt-2 text-center text-xs text-muted-foreground">{imageMatch[1]}</figcaption></figure>
  if (!line.trim()) return <div key={index} className="h-2" />
  return <p key={index} className="text-sm leading-7 text-muted-foreground">{line}</p>
})

export default function NumeaLearn({ onBack, darkMode = false, onToggleTheme }: NumeaLearnProps) {
  const [resources, setResources] = useState<LearnResource[]>([])
  const [categories, setCategories] = useState<LearnCategory[]>([])
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isApprovedMember, setIsApprovedMember] = useState(false)
  const [submitMode, setSubmitMode] = useState<"draft" | "submit">("draft")
  const [editingResourceId, setEditingResourceId] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("Semua")
  const [showSavedOnly, setShowSavedOnly] = useState(false)
  const [selectedResource, setSelectedResource] = useState<LearnResource | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  const loadData = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const [{ data: authData }, { data: adminData, error: adminError }, { data: categoryData, error: categoryError }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.rpc("is_numea_admin"),
        supabase.from("numea_learning_categories").select("id,name,slug").eq("is_active", true).order("sort_order"),
      ])
      const currentUserId = authData.user?.id ?? null
      setUserId(currentUserId)
      const admin = !adminError && Boolean(adminData)
      setIsAdmin(admin)
      if (currentUserId && !admin) {
        const { data: membershipData } = await supabase.from("numea_memberships").select("status").eq("user_id", currentUserId).maybeSingle()
        setIsApprovedMember(membershipData?.status === "approved")
      } else {
        setIsApprovedMember(false)
      }
      if (categoryError) throw categoryError
      const categoryRows = (categoryData ?? []) as LearnCategory[]
      setCategories(categoryRows)
      const { data: resourceData, error: resourceError } = await supabase
        .from("numea_learning_resources")
        .select("id,title,slug,category_id,summary,content,reading_minutes,level,status,created_by,review_note,numea_learning_categories(name)")
        .order("created_at", { ascending: false })
      if (resourceError) throw resourceError
      const rows = (resourceData ?? []).map((row: any) => ({
        ...row,
        category: row.numea_learning_categories?.name ?? "Umum",
        content: row.content && typeof row.content === "object" ? row.content : { sections: [] },
      })) as LearnResource[]
      setResources(rows)
      if (currentUserId) {
        const { data: savedData, error: savedError } = await supabase
          .from("numea_learning_bookmarks").select("resource_id").eq("user_id", currentUserId)
        if (savedError) throw savedError
        setBookmarkedIds((savedData ?? []).map((item: { resource_id: string }) => item.resource_id))
      } else {
        try {
          const saved = window.localStorage.getItem(localBookmarkKey)
          setBookmarkedIds(saved ? JSON.parse(saved) as string[] : [])
        } catch {
          setBookmarkedIds([])
        }
      }
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Terjadi kesalahan saat memuat Learn"
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void loadData() }, [loadData])

  const visibleResources = useMemo(() => resources.filter((resource) => {
    if (!isAdmin && resource.status !== "published" && !(userId && resource.created_by === userId)) return false
    if (showSavedOnly && !bookmarkedIds.includes(resource.id)) return false
    if (categoryFilter !== "Semua" && resource.category !== categoryFilter) return false
    const normalizedQuery = query.trim().toLowerCase()
    return !normalizedQuery || `${resource.title} ${resource.summary} ${resource.category}`.toLowerCase().includes(normalizedQuery)
  }), [resources, isAdmin, userId, showSavedOnly, bookmarkedIds, categoryFilter, query])

  const toggleBookmark = async (resourceId: string) => {
    const alreadySaved = bookmarkedIds.includes(resourceId)
    if (userId) {
      setError("")
      const result = alreadySaved
        ? await supabase.from("numea_learning_bookmarks").delete().eq("user_id", userId).eq("resource_id", resourceId)
        : await supabase.from("numea_learning_bookmarks").insert({ user_id: userId, resource_id: resourceId })
      if (result.error) {
        setError(result.error.message)
        return
      }
    } else {
      const next = alreadySaved ? bookmarkedIds.filter((id) => id !== resourceId) : [...bookmarkedIds, resourceId]
      try { window.localStorage.setItem(localBookmarkKey, JSON.stringify(next)) } catch { /* Simpan selama sesi jika storage tidak tersedia */ }
    }
    setBookmarkedIds((current) => alreadySaved ? current.filter((id) => id !== resourceId) : [...current, resourceId])
  }

  const createResource = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!userId || (!isAdmin && !isApprovedMember)) {
      setError("Untuk mengirim materi, masuk dan pastikan keanggotaan NUMEA kamu sudah disetujui")
      return
    }
    const title = form.title.trim()
    const summary = form.summary.trim()
    const body = form.body.trim()
    if (!title || !summary || !body || !form.categoryId) {
      setError("Lengkapi judul, kategori, ringkasan, dan isi materi")
      return
    }
    setSaving(true)
    setError("")
    const slug = title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    const status = isAdmin ? (form.publish ? "published" : "draft") : (submitMode === "submit" ? "pending_review" : "draft")
    const payload = {
      title,
      slug: `${slug}-${crypto.randomUUID().slice(0, 8)}`,
      category_id: form.categoryId,
      summary,
      content: { sections: [{ heading: "Materi", body }] },
      reading_minutes: Math.max(1, Number(form.readingMinutes) || 5),
      level: form.level,
      status,
      created_by: userId,
      published_at: status === "published" ? new Date().toISOString() : null,
      submitted_at: status === "pending_review" ? new Date().toISOString() : null,
      reviewed_by: isAdmin && status === "published" ? userId : null,
      reviewed_at: isAdmin && status === "published" ? new Date().toISOString() : null,
      review_note: null,
    }
    const saveResult = editingResourceId
      ? await supabase.from("numea_learning_resources").update({
          title, category_id: form.categoryId, summary,
          content: { sections: [{ heading: "Materi", body }] },
          reading_minutes: Math.max(1, Number(form.readingMinutes) || 5), level: form.level,
          status, published_at: status === "published" ? new Date().toISOString() : null,
          submitted_at: status === "pending_review" ? new Date().toISOString() : null,
          review_note: null,
        }).eq("id", editingResourceId)
      : await supabase.from("numea_learning_resources").insert(payload)
    setSaving(false)
    if (saveResult.error) {
      setError(saveResult.error.message)
      return
    }
    setNotice(status === "published" ? "Materi berhasil dipublikasikan" : status === "pending_review" ? "Materi dikirim ke admin untuk ditinjau" : "Draf materi berhasil disimpan")
    setForm(emptyForm)
    setSubmitMode("draft")
    setEditingResourceId(null)
    setShowForm(false)
    await loadData()
  }

  const uploadInlineImage = async (file?: File) => {
    if (!file || !userId) return
    if (!isAdmin && !isApprovedMember) {
      setError("Hanya admin dan anggota NUMEA yang disetujui yang dapat mengunggah gambar")
      return
    }
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    if (!allowedTypes.includes(file.type)) {
      setError("Format gambar yang didukung: JPG, PNG, WEBP, atau GIF")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Ukuran gambar maksimal 5 MB")
      return
    }
    setSaving(true)
    setError("")
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg"
    const path = `${userId}/${crypto.randomUUID()}.${extension}`
    const { error: uploadError } = await supabase.storage.from(imageBucket).upload(path, file, { contentType: file.type, upsert: false })
    setSaving(false)
    if (uploadError) {
      setError(`Gagal mengunggah gambar: ${uploadError.message}. Pastikan migrasi Storage Learn sudah dijalankan`)
      return
    }
    const { data } = supabase.storage.from(imageBucket).getPublicUrl(path)
    const alt = file.name.replace(/\.[^.]+$/, "").replace(/[\[\]()]/g, " ").trim() || "Gambar materi"
    setForm((current) => ({ ...current, body: `${current.body}${current.body.trim() ? "\n\n" : ""}![${alt}](${data.publicUrl})\n` }))
    setNotice("Gambar berhasil diunggah dan ditambahkan ke isi materi")
  }

  const editOwnResource = (resource: LearnResource) => {
    if (!userId || resource.created_by !== userId || !["draft", "rejected"].includes(resource.status)) return
    const firstSection = resource.content.sections?.[0]
    setEditingResourceId(resource.id)
    setForm({
      title: resource.title,
      categoryId: resource.category_id,
      summary: resource.summary,
      body: firstSection?.body ?? "",
      readingMinutes: String(resource.reading_minutes),
      level: resource.level,
      publish: false,
    })
    setSubmitMode("draft")
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const changeStatus = async (resource: LearnResource, status: LearnResource["status"]) => {
    if (!isAdmin) return
    let reviewNote: string | null = null
    if (status === "rejected") {
      reviewNote = window.prompt("Catatan untuk penulis (opsional):")?.trim() || "Silakan perbaiki materi sesuai panduan NUMEA Learn"
    }
    const now = new Date().toISOString()
    const { error: updateError } = await supabase.from("numea_learning_resources").update({
      status,
      published_at: status === "published" ? now : null,
      reviewed_by: status === "published" || status === "rejected" ? userId : null,
      reviewed_at: status === "published" || status === "rejected" ? now : null,
      review_note: status === "rejected" ? reviewNote : null,
    }).eq("id", resource.id)
    if (updateError) { setError(updateError.message); return }
    setNotice(status === "published" ? "Materi disetujui dan dipublikasikan" : status === "rejected" ? "Materi ditolak dan catatan dikirim ke penulis" : status === "draft" ? "Materi dipindahkan ke draf" : "Materi diarsipkan")
    await loadData()
  }

  const deleteResource = async (resource: LearnResource) => {
    if (!isAdmin || !window.confirm(`Hapus materi “${resource.title}”? Tindakan ini tidak dapat dibatalkan.`)) return
    const { error: deleteError } = await supabase.from("numea_learning_resources").delete().eq("id", resource.id)
    if (deleteError) { setError(deleteError.message); return }
    setNotice("Materi berhasil dihapus")
    if (selectedResource?.id === resource.id) setSelectedResource(null)
    await loadData()
  }

  return (
    <div className={`${darkMode ? "dark " : ""}min-h-screen bg-background text-foreground`}>
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-40 top-20 h-96 w-96 rounded-full bg-[#F6C64F]/20 blur-3xl" />
        <div className="absolute right-[-120px] top-32 h-[420px] w-[420px] rounded-full bg-[#E95C9E]/15 blur-3xl" />
      </div>
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <button type="button" onClick={onBack} className="inline-flex items-center gap-2 rounded-full border border-border/60 px-4 py-2.5 text-xs font-semibold hover:bg-muted"><ArrowLeft className="h-4 w-4" /> Kembali ke NUMEA</button>
          <div className="flex items-center gap-2">
            {isAdmin && <span className="hidden items-center gap-1.5 rounded-full bg-[#E95C9E]/10 px-3 py-2 text-xs font-semibold text-[#E95C9E] sm:inline-flex"><ShieldCheck className="h-4 w-4" /> Admin Learn</span>}
            {onToggleTheme && <button type="button" onClick={onToggleTheme} aria-label={darkMode ? "Aktifkan mode terang" : "Aktifkan mode gelap"} className="rounded-full border border-border/60 p-2.5">{darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</button>}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <section id="learn" className="scroll-mt-24">
          <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#E95C9E]">NUMEA Learn</p>
              <h1 className="mt-2 max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">Belajar dari hal yang bisa langsung dicoba</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">Panduan ringkas untuk praktik mengajar, asesmen, teknologi pendidikan, dan pengembangan diri</p>
              <p className="mt-3 text-xs text-muted-foreground">Materi berstatus terbit dapat dibaca semua pengunjung</p>
            </div>
            {(isAdmin || isApprovedMember) && <button type="button" onClick={() => setShowForm((value) => !value)} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#FF7411] to-[#E95C9E] px-5 py-3 text-xs font-bold text-white"><Plus className="h-4 w-4" /> {isAdmin ? "Tambah materi" : "Tulis materi"}</button>}
          </div>

          {notice && <div role="status" className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm">{notice}<button type="button" onClick={() => setNotice("")} aria-label="Tutup notifikasi"><X className="h-4 w-4" /></button></div>}
          {error && <div role="alert" className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm"><p className="font-semibold">Learn belum dapat memuat atau menyimpan data</p><p className="mt-1 break-words text-xs">{error}</p><button type="button" onClick={() => void loadData()} className="mt-2 underline">Coba lagi</button></div>}

          {showForm && (isAdmin || isApprovedMember) && <form onSubmit={createResource} className="mb-6 grid gap-4 rounded-3xl border border-[#E95C9E]/25 bg-[#E95C9E]/5 p-5 sm:p-6">
            <div><h2 className="text-lg font-bold">{editingResourceId ? "Edit materi" : isAdmin ? "Tambah materi Learn" : "Kontribusi materi Learn"}</h2><p className="mt-1 text-xs text-muted-foreground">{isAdmin ? "Admin dapat menyimpan draf atau langsung menerbitkan materi" : "Materi yang dikirim akan ditinjau admin sebelum dapat dibaca publik"}</p></div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-1.5 text-xs font-semibold">Judul materi<input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="rounded-xl border border-border bg-background px-3 py-3 text-sm font-normal outline-none focus:border-[#E95C9E]" /></label>
              <label className="grid gap-1.5 text-xs font-semibold">Kategori<select required value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })} className="rounded-xl border border-border bg-background px-3 py-3 text-sm font-normal"><option value="">Pilih kategori</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
              <label className="grid gap-1.5 text-xs font-semibold md:col-span-2">Ringkasan<textarea required rows={2} value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} className="rounded-xl border border-border bg-background px-3 py-3 text-sm font-normal outline-none focus:border-[#E95C9E]" /></label>
              <div className="grid gap-2 md:col-span-2"><label className="grid gap-1.5 text-xs font-semibold">Isi materi<textarea required rows={10} value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} className="rounded-xl border border-border bg-background px-3 py-3 text-sm font-normal leading-6 outline-none focus:border-[#E95C9E]" placeholder="Tulis materi di sini. Gunakan paragraf terpisah untuk menjaga keterbacaan..." /></label><div className="flex flex-wrap items-center gap-3"><label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border/60 px-4 py-2.5 text-xs font-semibold hover:bg-muted"><ImagePlus className="h-4 w-4" /> Sisipkan gambar<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; void uploadInlineImage(file); event.currentTarget.value = "" }} /></label><span className="text-[11px] text-muted-foreground">JPG, PNG, WEBP, GIF · Maksimal 5 MB. Gambar akan disisipkan di posisi kursor paling akhir</span></div></div>
              <label className="grid gap-1.5 text-xs font-semibold">Estimasi baca (menit)<input type="number" min="1" max="180" value={form.readingMinutes} onChange={(event) => setForm({ ...form, readingMinutes: event.target.value })} className="rounded-xl border border-border bg-background px-3 py-3 text-sm font-normal" /></label>
              <label className="grid gap-1.5 text-xs font-semibold">Tingkat<select value={form.level} onChange={(event) => setForm({ ...form, level: event.target.value })} className="rounded-xl border border-border bg-background px-3 py-3 text-sm font-normal"><option>Dasar</option><option>Praktis</option><option>Lanjutan</option><option>Penting</option></select></label>
            </div>
            {isAdmin && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.publish} onChange={(event) => setForm({ ...form, publish: event.target.checked })} /> Langsung publikasikan setelah disimpan</label>}
            <div className="flex flex-wrap gap-2"><button disabled={saving} type="submit" onClick={() => setSubmitMode("draft")} className="inline-flex items-center gap-2 rounded-full border border-border/60 px-5 py-3 text-xs font-bold disabled:opacity-60">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Simpan draf</button>{!isAdmin && <button disabled={saving} type="submit" onClick={() => setSubmitMode("submit")} className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#FF7411] to-[#E95C9E] px-5 py-3 text-xs font-bold text-white disabled:opacity-60"><Send className="h-4 w-4" />Kirim untuk ditinjau</button>}<button type="button" onClick={() => setShowForm(false)} className="rounded-full border border-border/60 px-5 py-3 text-xs font-semibold">Batal</button></div>
          </form>}

          <div className="dino-glass rounded-[28px] p-4 sm:p-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <label className="flex min-h-12 flex-1 items-center gap-3 rounded-2xl border border-border/60 bg-background/60 px-4"><Search className="h-4 w-4 shrink-0 text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari topik atau materi..." aria-label="Cari materi Learn" className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" />{query && <button type="button" onClick={() => setQuery("")} aria-label="Hapus pencarian"><X className="h-4 w-4" /></button>}</label>
              <button type="button" onClick={() => setShowSavedOnly((value) => !value)} aria-pressed={showSavedOnly} className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border px-4 text-xs font-semibold ${showSavedOnly ? "border-[#E95C9E]/40 bg-[#E95C9E]/10 text-[#E95C9E]" : "border-border/60 text-muted-foreground"}`}><Bookmark className="h-4 w-4" />{showSavedOnly ? "Materi tersimpan" : `${bookmarkedIds.length} tersimpan`}</button>
            </div>
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1" aria-label="Filter kategori materi">
              {["Semua", ...categories.map((category) => category.name)].map((category) => <button key={category} type="button" onClick={() => setCategoryFilter(category)} aria-pressed={categoryFilter === category} className={`shrink-0 rounded-full border px-4 py-2.5 text-xs font-semibold transition-colors ${categoryFilter === category ? "border-[#E95C9E]/40 bg-[#E95C9E]/10 text-[#E95C9E]" : "border-border/60 text-muted-foreground hover:bg-muted"}`}>{category}</button>)}
            </div>
            {loading ? <div className="flex items-center justify-center gap-3 py-16 text-sm text-muted-foreground"><LoaderCircle className="h-5 w-5 animate-spin" /> Memuat materi Learn...</div> : visibleResources.length ? <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visibleResources.map((resource, index) => <article key={resource.id} className="group flex min-w-0 flex-col rounded-[22px] border border-border/60 bg-background/60 p-5 transition-all hover:-translate-y-1 hover:border-[#E95C9E]/30 hover:shadow-lg hover:shadow-[#E95C9E]/5">
                <div className="flex items-start justify-between gap-3"><span className="rounded-full bg-gradient-to-r from-[#F6C64F]/25 to-[#E95C9E]/15 px-3 py-1.5 text-[10px] font-semibold">{resource.category}</span><div className="flex items-center gap-2">{(isAdmin || (userId && resource.created_by === userId)) && <span className={`rounded-full px-2 py-1 text-[9px] font-bold ${resource.status === "published" ? "bg-emerald-500/10 text-emerald-600" : resource.status === "pending_review" ? "bg-sky-500/10 text-sky-600" : resource.status === "rejected" ? "bg-red-500/10 text-red-600" : resource.status === "draft" ? "bg-amber-500/10 text-amber-600" : "bg-muted text-muted-foreground"}`}>{resource.status === "published" ? "Terbit" : resource.status === "pending_review" ? "Menunggu tinjauan" : resource.status === "rejected" ? "Perlu perbaikan" : resource.status === "draft" ? "Draf" : "Arsip"}</span>}<button type="button" onClick={() => void toggleBookmark(resource.id)} aria-label={bookmarkedIds.includes(resource.id) ? `Hapus ${resource.title} dari tersimpan` : `Simpan ${resource.title}`} aria-pressed={bookmarkedIds.includes(resource.id)} className={`rounded-xl p-2 ${bookmarkedIds.includes(resource.id) ? "bg-[#E95C9E]/10 text-[#E95C9E]" : "text-muted-foreground hover:bg-[#E95C9E]/10 hover:text-[#E95C9E]"}`}><Bookmark className="h-4 w-4" fill={bookmarkedIds.includes(resource.id) ? "currentColor" : "none"} /></button></div></div>
                <div className="mt-5 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#F6C64F]/25 to-[#FF7411]/10 text-[#E95C9E]">{index % 2 === 0 ? <BookOpenCheck className="h-5 w-5" /> : <BookOpen className="h-5 w-5" />}</div>
                <h2 className="mt-4 text-lg font-bold leading-snug">{resource.title}</h2><p className="mt-2 flex-1 text-xs leading-6 text-muted-foreground">{resource.summary}</p>
                <div className="mt-5 flex items-center justify-between gap-3 border-t border-border/50 pt-4"><div className="flex items-center gap-3 text-[10px] text-muted-foreground"><span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{resource.reading_minutes} menit</span><span>{resource.level}</span></div>{(resource.status === "published" || isAdmin || (userId && resource.created_by === userId)) && resource.status !== "archived" && <button type="button" onClick={() => setSelectedResource(resource)} className="inline-flex shrink-0 items-center gap-1.5 text-xs font-bold text-[#E95C9E]">{resource.status === "published" ? "Baca materi" : "Pratinjau"} <ArrowRight className="h-3.5 w-3.5" /></button>}</div>
                {!isAdmin && userId === resource.created_by && ["draft", "rejected"].includes(resource.status) && <div className="mt-3 border-t border-border/50 pt-3"><button type="button" onClick={() => editOwnResource(resource)} className="text-[10px] font-semibold text-[#E95C9E]">Edit dan kirim ulang</button></div>}{isAdmin && <div className="mt-3 flex flex-wrap gap-2 border-t border-border/50 pt-3">{resource.status !== "published" && resource.status !== "archived" && <button type="button" onClick={() => void changeStatus(resource, "published")} className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600"><Check className="h-3 w-3" /> Setujui & terbitkan</button>}{resource.status === "pending_review" && <button type="button" onClick={() => void changeStatus(resource, "rejected")} className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-500"><XCircle className="h-3 w-3" /> Tolak / minta revisi</button>}{resource.status === "published" && <button type="button" onClick={() => void changeStatus(resource, "draft")} className="text-[10px] font-semibold text-amber-600">Jadikan draf</button>}{resource.status !== "archived" && <button type="button" onClick={() => void changeStatus(resource, "archived")} className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground"><Archive className="h-3 w-3" /> Arsipkan</button>}<button type="button" onClick={() => void deleteResource(resource)} className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-500"><Trash2 className="h-3 w-3" /> Hapus</button></div>}{resource.status === "rejected" && userId === resource.created_by && resource.review_note && <p className="mt-3 rounded-xl bg-red-500/5 p-3 text-xs leading-5 text-red-600">Catatan admin: {resource.review_note}</p>}
              </article>)}
            </div> : <div className="mt-5 rounded-2xl border border-dashed border-border/70 px-5 py-12 text-center"><Search className="mx-auto h-7 w-7 text-muted-foreground" /><h2 className="mt-3 font-semibold">{showSavedOnly ? "Belum ada materi tersimpan" : "Materi belum ditemukan"}</h2><p className="mt-1 text-sm text-muted-foreground">Coba kata kunci lain atau pilih kategori Semua</p><button type="button" onClick={() => { setQuery(""); setCategoryFilter("Semua"); setShowSavedOnly(false) }} className="mt-4 rounded-full bg-[#E95C9E]/10 px-4 py-2 text-xs font-semibold text-[#E95C9E]">Atur ulang pencarian</button></div>}
          </div>
        </section>
        <footer className="mt-14 border-t border-border/50 py-8 text-[11px] text-muted-foreground"><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><span>© 2026 NUMEA EDU · A Space to Learn, Create & Explore</span><span>Bagian dari DinoEdu Space</span></div></footer>
      </main>

      {selectedResource && <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/55 p-0 backdrop-blur-sm sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedResource(null) }}>
        <section role="dialog" aria-modal="true" aria-labelledby="learn-detail-title" className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-[28px] border border-border/60 bg-background p-6 shadow-2xl sm:rounded-[28px] sm:p-8">
          <div className="flex items-start justify-between gap-4"><div><span className="rounded-full bg-[#E95C9E]/10 px-3 py-1.5 text-[10px] font-bold text-[#E95C9E]">{selectedResource.category}</span><h2 id="learn-detail-title" className="mt-4 text-2xl font-bold leading-tight sm:text-3xl">{selectedResource.title}</h2><div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{selectedResource.reading_minutes} menit</span><span>{selectedResource.level}</span></div></div><button type="button" onClick={() => setSelectedResource(null)} aria-label="Tutup materi" className="rounded-full border border-border/60 p-2 text-muted-foreground"><X className="h-5 w-5" /></button></div>
          <p className="mt-5 text-sm leading-7 text-muted-foreground">{selectedResource.summary}</p>{selectedResource.status === "rejected" && selectedResource.review_note && <p className="mt-4 rounded-xl bg-red-500/5 p-3 text-sm text-red-600">Catatan admin: {selectedResource.review_note}</p>}<div className="mt-6 space-y-6">{(selectedResource.content.sections ?? []).map((section, index) => <div key={`${section.heading}-${index}`}><h3 className="font-bold">{section.heading}</h3><div className="mt-2 space-y-1">{renderArticleBody(section.body)}</div></div>)}</div>
          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-border/50 pt-5 sm:flex-row sm:justify-between"><button type="button" onClick={() => void toggleBookmark(selectedResource.id)} className="inline-flex items-center justify-center gap-2 rounded-full border border-border/60 px-5 py-3 text-xs font-semibold"><Bookmark className="h-4 w-4" fill={bookmarkedIds.includes(selectedResource.id) ? "currentColor" : "none"} />{bookmarkedIds.includes(selectedResource.id) ? "Tersimpan" : "Simpan materi"}</button><button type="button" onClick={() => setSelectedResource(null)} className="rounded-full bg-gradient-to-r from-[#FF7411] to-[#E95C9E] px-6 py-3 text-xs font-bold text-white">Selesai membaca</button></div>
        </section>
      </div>}
    </div>
  )
}
