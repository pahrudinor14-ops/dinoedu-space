import { useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowLeft,
  BookOpen,
  Check,
  ClipboardList,
  Download,
  FileText,
  Pencil,
  Presentation,
  Printer,
  Save,
  Trash2,
} from "lucide-react"
import { supabase } from "../lib/supabase"
import { invokeDinoAI } from "../lib/invokeDinoAI"
import { downloadPowerPoint, type PowerPointSlide } from "../lib/exportPowerPoint"

type ToolKind = "lkpd" | "ppt"
type EducationLevel = "PAUD" | "SD/MI" | "SMP/MTs" | "SMA/MA" | "SMK/MAK" | "Kesetaraan" | ""
interface AIGuruStudioProps {
  kind: ToolKind
  onBack: () => void
}
interface LearningResult {
  title: string
  subtitle: string
  worksheet?: string
  slides?: PowerPointSlide[]
}
interface ModuleResponse {
  success?: boolean
  error?: string
  modul?: unknown
}
interface LKPDResponse {
  success?: boolean
  error?: string
  title?: string
  worksheet?: string
  quotaWarning?: string
}

const phasesByLevel: Record<string, string[]> = {
  PAUD: ["Fondasi"],
  "SD/MI": ["Fase A", "Fase B", "Fase C"],
  "SMP/MTs": ["Fase D"],
  "SMA/MA": ["Fase E", "Fase F"],
  "SMK/MAK": ["Fase E", "Fase F"],
  Kesetaraan: ["Fase A", "Fase B", "Fase C", "Fase D", "Fase E", "Fase F"],
}
const gradesByLevel: Record<string, string[]> = {
  PAUD: ["Kelompok A", "Kelompok B"],
  "SD/MI": ["Kelas I", "Kelas II", "Kelas III", "Kelas IV", "Kelas V", "Kelas VI"],
  "SMP/MTs": ["Kelas VII", "Kelas VIII", "Kelas IX"],
  "SMA/MA": ["Kelas X", "Kelas XI", "Kelas XII"],
  "SMK/MAK": ["Kelas X", "Kelas XI", "Kelas XII", "Kelas XIII"],
  Kesetaraan: ["Setara SD", "Setara SMP", "Setara SMA"],
}
const inputClass = "w-full rounded-2xl border border-border/70 bg-white/40 px-4 py-3.5 text-[15px] outline-none backdrop-blur-xl transition placeholder:text-muted-foreground/70 focus:border-[#EF629F]/50 dark:bg-white/5"
const selectClass = `${inputClass} dino-ai-studio-select dark:bg-[#1D191F]`
const previewInputClass = "w-full rounded-2xl border border-zinc-300 bg-zinc-50 px-4 py-3.5 text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#EF629F]/50"

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function readStrings(value: unknown): string[] {
  if (typeof value === "string") {
    return value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean)
  }
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean)
}

function readText(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function titleFromModule(module: Record<string, unknown>, fallback: string): string {
  const metadata: Record<string, unknown> = isRecord(module.metadata) ? module.metadata : {}
  return readText(metadata.judul) || fallback
}

function subtitleFromModule(module: Record<string, unknown>, fallback: string): string {
  const metadata: Record<string, unknown> = isRecord(module.metadata) ? module.metadata : {}
  const parts = [metadata.jenjang, metadata.kelas, metadata.mataPelajaran, metadata.semester]
    .filter((item): item is string => typeof item === "string" && item.trim() !== "")
  return parts.join(" · ") || fallback
}

function buildSlides(module: Record<string, unknown>, topic: string): PowerPointSlide[] {
  const metadata: Record<string, unknown> = isRecord(module.metadata) ? module.metadata : {}
  const goals: Record<string, unknown> = isRecord(module.tujuanPembelajaran) ? module.tujuanPembelajaran : {}
  const slides: PowerPointSlide[] = [{
    title: titleFromModule(module, `Pembelajaran ${topic}`),
    bullets: [
      [metadata.jenjang, metadata.fase, metadata.kelas].filter(Boolean).join(" · "),
      [metadata.mataPelajaran, metadata.semester].filter(Boolean).join(" · "),
    ].filter(Boolean) as string[],
  }]
  const objectiveBullets = [
    ...(readText(goals.capaianPembelajaran) ? [readText(goals.capaianPembelajaran)] : []),
    ...readStrings(goals.tujuanPembelajaran),
  ].slice(0, 6)
  slides.push({
    title: "Tujuan Pembelajaran",
    bullets: objectiveBullets.length ? objectiveBullets : [`Memahami materi ${topic}`, "Menggunakan pemahaman dalam kegiatan belajar"],
  })

  const meetings = Array.isArray(module.pengalamanBelajar)
    ? module.pengalamanBelajar.filter(isRecord).slice(0, 7)
    : []
  for (const [index, meeting] of meetings.entries()) {
    const bullets = [
      ...(readText(meeting.tujuanPertemuan) ? [readText(meeting.tujuanPertemuan)] : []),
      ...readStrings(meeting.kegiatanPendahuluan).slice(0, 1).map((item) => `Pembuka: ${item}`),
      ...readStrings(meeting.kegiatanInti).slice(0, 4),
      ...readStrings(meeting.kegiatanPenutup).slice(0, 1).map((item) => `Penutup: ${item}`),
    ].slice(0, 7)
    slides.push({
      title: `Kegiatan Pembelajaran ${readText(meeting.pertemuan) || index + 1}`,
      bullets: bullets.length ? bullets : [`Diskusikan materi ${topic} bersama kelompok.`],
    })
  }

  const assessment: Record<string, unknown> = isRecord(module.asesmen) ? module.asesmen : {}
  const assessmentBullets = Object.entries(assessment).flatMap(([label, value]) => {
    if (!isRecord(value)) return []
    const technique = readText(value.teknik)
    const instrument = readText(value.instrumen)
    const criteria = readText(value.kriteria)
    const summary = [technique, instrument, criteria].filter(Boolean).join(" — ")
    return summary ? [`${label[0].toUpperCase()}${label.slice(1)}: ${summary}`] : []
  }).slice(0, 6)
  if (assessmentBullets.length) slides.push({ title: "Asesmen", bullets: assessmentBullets })

  const resources: Record<string, unknown> = isRecord(module.mediaDanSumber) ? module.mediaDanSumber : {}
  const resourceBullets = [
    ...readStrings(resources.media).map((item) => `Media: ${item}`),
    ...readStrings(resources.sumberBelajar).map((item) => `Sumber belajar: ${item}`),
  ].slice(0, 6)
  if (resourceBullets.length) slides.push({ title: "Media dan Sumber Belajar", bullets: resourceBullets })
  return slides
}

function parseSavedResult(value: unknown, kind: ToolKind): LearningResult | null {
  if (!isRecord(value) || typeof value.title !== "string") return null
  const result: LearningResult = {
    title: value.title,
    subtitle: typeof value.subtitle === "string" ? value.subtitle : "",
  }
  if (kind === "lkpd" && typeof value.worksheet === "string") {
    result.worksheet = value.worksheet
    return result
  }
  if (kind === "ppt" && Array.isArray(value.slides)) {
    result.slides = value.slides.filter(isRecord).map((slide) => ({
      title: typeof slide.title === "string" ? slide.title : "Slide",
      bullets: readStrings(slide.bullets),
    }))
    return result.slides.length > 0 ? result : null
  }
  return null
}

export default function AIGuruStudio({ kind, onBack }: AIGuruStudioProps) {
  const isPpt = kind === "ppt"
  const documentType = isPpt ? "ppt_pembelajaran" : "lkpd"
  const toolTitle = isPpt ? "AI PPT Pembelajaran" : "AI LKPD"
  const [educationLevel, setEducationLevel] = useState<EducationLevel>("")
  const [phase, setPhase] = useState("")
  const [grade, setGrade] = useState("")
  const [subject, setSubject] = useState("")
  const [semester, setSemester] = useState("")
  const [topic, setTopic] = useState("")
  const [learningObjectives, setLearningObjectives] = useState("")
  const [meetingCount, setMeetingCount] = useState(2)
  const [context, setContext] = useState("")
  const [result, setResult] = useState<LearningResult | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [savedDocumentId, setSavedDocumentId] = useState<string | null>(null)
  const [isLoadingSaved, setIsLoadingSaved] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const generationInFlight = useRef(false)
  const phases = useMemo(() => educationLevel ? phasesByLevel[educationLevel] ?? [] : [], [educationLevel])
  const grades = useMemo(() => educationLevel ? gradesByLevel[educationLevel] ?? [] : [], [educationLevel])
  const isComplete = Boolean(educationLevel && phase && grade && subject.trim() && semester && topic.trim() && learningObjectives.trim())
  const isBusy = isLoadingSaved || isGenerating || isSaving || isDeleting

  useEffect(() => {
    let isActive = true
    async function loadSavedDocument() {
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        const userId = sessionData.session?.user?.id
        if (!userId) return
        const { data, error: loadError } = await supabase
          .from("ai_documents")
          .select("id,content")
          .eq("user_id", userId)
          .eq("document_type", documentType)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle()
        if (loadError) throw loadError
        if (!data || !isActive) return
        setSavedDocumentId(data.id)
        const content = isRecord(data.content) ? data.content : {}
        const form = isRecord(content.form) ? content.form : {}
        if (typeof form.educationLevel === "string") setEducationLevel(form.educationLevel as EducationLevel)
        if (typeof form.phase === "string") setPhase(form.phase)
        if (typeof form.grade === "string") setGrade(form.grade)
        if (typeof form.subject === "string") setSubject(form.subject)
        if (typeof form.semester === "string") setSemester(form.semester)
        if (typeof form.topic === "string") setTopic(form.topic)
        if (typeof form.learningObjectives === "string") setLearningObjectives(form.learningObjectives)
        if (typeof form.meetingCount === "number") setMeetingCount(Math.max(1, Math.min(7, form.meetingCount)))
        if (typeof form.context === "string") setContext(form.context)
        const restored = parseSavedResult(content.result, kind)
        if (restored) setResult(restored)
      } catch (loadError) {
        console.error(`Load ${toolTitle} error:`, loadError)
      } finally {
        if (isActive) setIsLoadingSaved(false)
      }
    }
    void loadSavedDocument()
    return () => { isActive = false }
  }, [documentType, kind, toolTitle])

  const buildDocumentContent = (resultToSave: LearningResult | null) => ({
    form: { educationLevel, phase, grade, subject, semester, topic, learningObjectives, meetingCount, context },
    result: resultToSave,
  })

  async function saveDocument(resultToSave: LearningResult | null = result): Promise<boolean> {
    if (!resultToSave) return false
    setIsSaving(true)
    setError("")
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      const userId = sessionData.session?.user?.id
      if (sessionError || !userId) throw new Error("Sesi login tidak ditemukan. Silakan masuk kembali.")
      const title = resultToSave.title || `${toolTitle} ${topic}`
      const content = buildDocumentContent(resultToSave)
      if (savedDocumentId) {
        const { error: saveError } = await supabase.from("ai_documents").update({ title, content }).eq("id", savedDocumentId).eq("user_id", userId)
        if (saveError) throw saveError
      } else {
        const { data, error: saveError } = await supabase.from("ai_documents").insert({ user_id: userId, document_type: documentType, title, content }).select("id").single()
        if (saveError) throw saveError
        setSavedDocumentId(data.id)
      }
      setMessage(`${toolTitle} berhasil disimpan`)
      return true
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : `${toolTitle} gagal disimpan`)
      return false
    } finally {
      setIsSaving(false)
    }
  }

  async function deleteDocument() {
    if (!window.confirm(`Hapus ${toolTitle} ini beserta semua isiannya? Tindakan ini tidak dapat dibatalkan.`)) return
    setIsDeleting(true)
    setError("")
    try {
      if (savedDocumentId) {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
        const userId = sessionData.session?.user?.id
        if (sessionError || !userId) throw new Error("Sesi login tidak ditemukan. Silakan masuk kembali.")
        const { error: deleteError } = await supabase.from("ai_documents").delete().eq("id", savedDocumentId).eq("user_id", userId)
        if (deleteError) throw deleteError
      }
      setEducationLevel(""); setPhase(""); setGrade(""); setSubject(""); setSemester(""); setTopic("")
      setLearningObjectives(""); setMeetingCount(2); setContext(""); setResult(null); setSavedDocumentId(null); setIsEditing(false)
      setMessage(`${toolTitle} dihapus. Silakan mulai membuat dokumen baru.`)
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : `${toolTitle} gagal dihapus`)
    } finally {
      setIsDeleting(false)
    }
  }

  async function handleGenerate() {
    if (!isComplete) {
      setError("Lengkapi jenjang, fase, kelas, mata pelajaran, semester, topik, dan tujuan pembelajaran terlebih dahulu.")
      return
    }
    if (generationInFlight.current) return
    generationInFlight.current = true
    setIsGenerating(true)
    setError("")
    setMessage("")
    setIsEditing(false)
    try {
      let quotaWarning = ""
      let generated: LearningResult
      if (isPpt) {
        const data = await invokeDinoAI<ModuleResponse>("dinoai-modul-ajar", {
          educationLevel,
          phase,
          grade,
          subject: subject.trim(),
          semester,
          topic: topic.trim(),
          meetingCount,
          duration: 40,
          curriculumMode: "tp",
          cp: "",
          tp: learningObjectives.trim(),
          readiness: "Beragam",
          studentNotes: context.trim(),
          autoDimensions: true,
          dimensions: [],
          autoPedagogy: true,
          strategy: "",
          context: "Konteks kelas: " + (context.trim() || "belajar aktif dan kontekstual"),
          technologyMode: "relevant",
          technology: "",
          support: true,
          enrichment: true,
          productVariation: false,
          alternativeActivity: false,
          outputMode: "complete",
          attachments: [],
        })
        const generatedModule = data?.modul
        if (!data?.success || !isRecord(generatedModule)) {
          throw new Error(data?.error || `AI tidak mengembalikan hasil ${toolTitle} yang valid.`)
        }
        const module = generatedModule
        generated = {
          title: titleFromModule(module, `Presentasi ${subject.trim()}: ${topic.trim()}`),
          subtitle: subtitleFromModule(module, `${grade} · ${subject.trim()} · Semester ${semester}`),
          slides: buildSlides(module, topic.trim()),
        }
      } else {
        const data = await invokeDinoAI<LKPDResponse>("dinoai-lkpd", {
          idempotencyKey: crypto.randomUUID(),
          educationLevel,
          phase,
          grade,
          subject: subject.trim(),
          semester,
          topic: topic.trim(),
          learningObjectives: learningObjectives.trim(),
          meetingCount,
          context: context.trim(),
        })
        if (!data?.success || typeof data.worksheet !== "string" || !data.worksheet.trim()) {
          throw new Error(data?.error || "AI tidak mengembalikan isi LKPD yang valid.")
        }
        quotaWarning = data.quotaWarning || ""
        generated = {
          title: data.title?.trim() || `LKPD ${subject.trim()}: ${topic.trim()}`,
          subtitle: `${grade} · ${subject.trim()} · Semester ${semester}`,
          worksheet: data.worksheet,
        }
      }
      setResult(generated)
      const saved = await saveDocument(generated)
      const saveMessage = saved
        ? `${toolTitle} berhasil dibuat dan disimpan. Tinjau hasil sebelum digunakan.`
        : `${toolTitle} berhasil dibuat, tetapi belum tersimpan. Periksa koneksi lalu tekan Simpan.`
      setMessage([saveMessage, quotaWarning].filter(Boolean).join(" "))
      window.scrollTo({ top: 0, behavior: "smooth" })
    } catch (generationError) {
      console.error(`${toolTitle} error:`, generationError)
      setError(generationError instanceof Error ? generationError.message : `Terjadi kesalahan saat membuat ${toolTitle}`)
    } finally {
      generationInFlight.current = false
      setIsGenerating(false)
    }
  }

  function updateSlide(index: number, field: "title" | "bullets", value: string) {
    setResult((current) => {
      if (!current?.slides) return current
      return {
        ...current,
        slides: current.slides.map((slide, slideIndex) => {
          if (slideIndex !== index) return slide
          return field === "title"
            ? { ...slide, title: value }
            : { ...slide, bullets: value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean) }
        }),
      }
    })
  }

  const printOutput = () => {
    if (!result) return
    window.print()
  }

  return (
    <div aria-busy={isBusy} className="min-h-dvh overflow-x-clip bg-background text-foreground">
      <header className="dino-no-print sticky top-0 z-40 border-b border-border/50 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-5 sm:px-6 lg:px-8">
          <button type="button" onClick={onBack} className="dino-button inline-flex items-center gap-2 rounded-full border border-border/60 bg-white/40 px-4 py-3 text-sm font-semibold backdrop-blur-xl dark:bg-white/5">
            <ArrowLeft className="h-4 w-4" /> Kembali
          </button>
          <div className="flex items-center gap-2 text-sm font-semibold"><img src="/logodino.PNG" alt="" className="h-5 w-5 object-contain" />{toolTitle}</div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 pb-20 pt-10 sm:px-6 sm:pt-14 lg:px-8">
        <section className="dino-no-print dino-enter mb-8">
          <div className="dino-glass relative overflow-hidden rounded-[32px] p-7 sm:p-10">
            <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[#EF629F]/10 blur-3xl" />
            <div className="relative max-w-4xl">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#EF629F]"><img src="/logodino.PNG" alt="" className="h-4 w-4 object-contain" /> DinoEdu AI</div>
              <h1 className="dino-hero-title mt-3 text-3xl font-bold sm:text-5xl">{toolTitle}</h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg">
                {isPpt
                  ? "Susun materi menjadi presentasi pembelajaran yang terstruktur dan siap diunduh sebagai PowerPoint."
                  : "Buat lembar kerja peserta didik yang terarah, sesuai tujuan belajar, dan siap dicetak."}
              </p>
              <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-[#EF629F]/15 bg-[#EF629F]/5 px-4 py-2 text-xs font-medium text-muted-foreground">
                <BookOpen className="h-4 w-4 text-[#EF629F]" /> Menggunakan {isPpt ? 3 : 2} kredit AI per pembuatan
              </div>
            </div>
          </div>
        </section>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <section className="dino-no-print dino-glass rounded-[28px] p-6 sm:p-7">
            <div className="mb-6 flex items-center gap-3">
              <div className="dino-gradient flex h-12 w-12 items-center justify-center rounded-2xl text-white"><ClipboardList className="h-5 w-5" /></div>
              <div><h2 className="text-xl font-bold">Konteks Pembelajaran</h2><p className="mt-1 text-sm text-muted-foreground">Isi informasi agar hasil sesuai dengan kelas.</p></div>
            </div>
            <div className="space-y-4">
              <label className="block text-sm font-semibold">Jenjang
                <select value={educationLevel} onChange={(event) => { setEducationLevel(event.target.value as EducationLevel); setPhase(""); setGrade("") }} className={`${selectClass} mt-2`}>
                  <option value="">Pilih jenjang</option>
                  {Object.keys(phasesByLevel).map((level) => <option key={level} value={level}>{level}</option>)}
                </select>
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-semibold">Fase
                  <select value={phase} onChange={(event) => setPhase(event.target.value)} disabled={!educationLevel} className={`${selectClass} mt-2 disabled:cursor-not-allowed disabled:opacity-50`}>
                    <option value="">Pilih fase</option>{phases.map((item) => <option key={item}>{item}</option>)}
                  </select>
                </label>
                <label className="block text-sm font-semibold">Kelas
                  <select value={grade} onChange={(event) => setGrade(event.target.value)} disabled={!educationLevel} className={`${selectClass} mt-2 disabled:cursor-not-allowed disabled:opacity-50`}>
                    <option value="">Pilih kelas</option>{grades.map((item) => <option key={item}>{item}</option>)}
                  </select>
                </label>
              </div>
              <label className="block text-sm font-semibold">Mata Pelajaran
                <input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Contoh: IPAS" className={`${inputClass} mt-2`} />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-semibold">Semester
                  <select value={semester} onChange={(event) => setSemester(event.target.value)} className={`${selectClass} mt-2`}><option value="">Pilih semester</option><option>Ganjil</option><option>Genap</option></select>
                </label>
                <label className="block text-sm font-semibold">Jumlah pertemuan
                  <select value={meetingCount} onChange={(event) => setMeetingCount(Number(event.target.value))} className={`${selectClass} mt-2`}>{[1, 2, 3, 4, 5, 6, 7].map((count) => <option key={count} value={count}>{count} pertemuan</option>)}</select>
                </label>
              </div>
              <label className="block text-sm font-semibold">Topik / Materi
                <input value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="Contoh: Ekosistem dan interaksinya" className={`${inputClass} mt-2`} />
              </label>
              <label className="block text-sm font-semibold">Tujuan Pembelajaran
                <textarea value={learningObjectives} onChange={(event) => setLearningObjectives(event.target.value)} rows={4} placeholder="Tuliskan tujuan pembelajaran atau kompetensi yang ingin dicapai" className={`${inputClass} mt-2 resize-y leading-6`} />
              </label>
              <label className="block text-sm font-semibold">Konteks tambahan <span className="font-normal text-muted-foreground">(opsional)</span>
                <textarea value={context} onChange={(event) => setContext(event.target.value)} rows={3} placeholder="Karakteristik kelas, konteks lokal, atau arahan khusus" className={`${inputClass} mt-2 resize-y leading-6`} />
              </label>
              <button type="button" onClick={() => void handleGenerate()} disabled={!isComplete || isBusy} className="dino-gradient flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 text-[15px] font-semibold text-white shadow-lg shadow-pink-500/10 transition disabled:cursor-not-allowed disabled:opacity-50">
                <img src="/logodino.PNG" alt="" className="h-4 w-4 object-contain" />
                {isGenerating ? "Sedang menyusun..." : `Buat ${isPpt ? "Presentasi" : "LKPD"} dengan AI · ${isPpt ? 3 : 2} kredit`}
              </button>
              {message && <p role="status" className="rounded-2xl border border-[#EF629F]/20 bg-[#EF629F]/5 px-4 py-3 text-center text-sm leading-6 text-muted-foreground">{message}</p>}
              {error && <p role="alert" className="rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-center text-sm leading-6 text-red-500">{error}</p>}
              {isLoadingSaved && <p className="text-center text-xs text-muted-foreground">Memuat draf tersimpan…</p>}
            </div>
          </section>

          <section className="min-w-0">
            {result && (
              <div className="dino-no-print mb-4 flex flex-wrap gap-2">
                {isPpt && result.slides && <button type="button" onClick={() => downloadPowerPoint(result.title, result.slides ?? [])} className="dino-gradient inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold text-white"><Download className="h-4 w-4" /> Unduh PPTX</button>}
                <button type="button" onClick={printOutput} className="dino-button inline-flex items-center gap-2 rounded-xl border border-border/70 bg-white/40 px-4 py-2.5 text-[13px] font-semibold backdrop-blur-xl dark:bg-white/5"><Printer className="h-4 w-4" /> Simpan PDF</button>
                <button type="button" onClick={() => setIsEditing((value) => !value)} disabled={isBusy} className="dino-button inline-flex items-center gap-2 rounded-xl border border-border/70 bg-white/40 px-4 py-2.5 text-[13px] font-semibold backdrop-blur-xl disabled:opacity-50 dark:bg-white/5">{isEditing ? <Check className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}{isEditing ? "Selesai edit" : "Edit hasil"}</button>
                <button type="button" onClick={() => void saveDocument()} disabled={isBusy} className="dino-button inline-flex items-center gap-2 rounded-xl border border-border/70 bg-white/40 px-4 py-2.5 text-[13px] font-semibold backdrop-blur-xl disabled:opacity-50 dark:bg-white/5"><Save className="h-4 w-4" />{isSaving ? "Menyimpan…" : "Simpan"}</button>
                <button type="button" onClick={() => void deleteDocument()} disabled={isBusy} className="dino-button inline-flex items-center gap-2 rounded-xl border border-red-500/25 bg-red-500/5 px-4 py-2.5 text-[13px] font-semibold text-red-600 disabled:opacity-50"><Trash2 className="h-4 w-4" /> Hapus</button>
              </div>
            )}
            <div className="dino-no-print mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EF629F]/10 text-[#EF629F]">{isPpt ? <Presentation className="h-5 w-5" /> : <FileText className="h-5 w-5" />}</div>
              <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#EF629F]">Hasil DinoAI</p><h2 className="mt-1 text-xl font-bold">Pratinjau {isPpt ? "presentasi" : "LKPD"}</h2></div>
            </div>
            <div className="dino-glass min-h-[560px] rounded-[32px] p-5 sm:p-7">
              {result ? (
                <div className={`learning-print-document ${isPpt ? "min-h-[620px] rounded-2xl bg-white p-5 text-zinc-900 shadow-xl sm:p-8" : ""}`}>
                  {isPpt ? (
                    <div className="space-y-5">
                      <div className="print-document-heading mb-5 border-b border-zinc-200 pb-4">
                        {isEditing ? <input value={result.title} onChange={(event) => setResult((current) => current ? { ...current, title: event.target.value } : current)} className={`${previewInputClass} text-2xl font-bold`} /> : <h2 className="text-2xl font-bold">{result.title}</h2>}
                        <p className="mt-2 text-sm text-zinc-600">{result.subtitle}</p>
                      </div>
                      {(result.slides ?? []).map((slide, index) => (
                        <article key={`${index}-${slide.title}`} className="presentation-slide rounded-2xl border border-zinc-200 bg-white p-5 text-zinc-900 sm:p-7">
                          <div className="mb-4 flex items-center justify-between gap-3"><span className="rounded-full bg-[#EF629F]/10 px-3 py-1 text-xs font-bold text-[#EF629F]">SLIDE {index + 1}</span><span className="text-xs text-zinc-500">DinoEdu Space</span></div>
                          {isEditing ? <input value={slide.title} onChange={(event) => updateSlide(index, "title", event.target.value)} className={`${previewInputClass} text-lg font-bold`} /> : <h3 className="text-xl font-bold sm:text-2xl">{slide.title}</h3>}
                          {isEditing ? <textarea value={slide.bullets.join("\n")} onChange={(event) => updateSlide(index, "bullets", event.target.value)} rows={Math.max(4, slide.bullets.length)} className={`${previewInputClass} mt-4 resize-y leading-7`} placeholder="Satu poin per baris" /> : <ul className="mt-4 space-y-3">{slide.bullets.map((bullet, bulletIndex) => <li key={bulletIndex} className="flex gap-3 text-sm leading-7 text-zinc-700 sm:text-base"><span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#EF629F]" />{bullet}</li>)}</ul>}
                        </article>
                      ))}
                    </div>
                  ) : (
                    <article className="print-lkpd-document mx-auto min-h-[620px] max-w-3xl rounded-2xl bg-white p-6 text-zinc-900 shadow-xl sm:p-10">
                      <div className="print-document-heading border-b-2 border-zinc-800 pb-5 text-center">
                        {isEditing ? <input value={result.title} onChange={(event) => setResult((current) => current ? { ...current, title: event.target.value } : current)} className={`${previewInputClass} text-center text-2xl font-bold`} /> : <h2 className="text-2xl font-bold">{result.title}</h2>}
                        <p className="mt-2 text-sm text-zinc-600">{result.subtitle}</p>
                        <div className="mt-5 grid grid-cols-2 gap-3 text-left text-sm"><p>Nama: __________________________</p><p>Kelas: __________________</p><p>Tanggal: ________________________</p><p>Nilai: ___________________</p></div>
                      </div>
                      {isEditing ? <textarea value={result.worksheet ?? ""} onChange={(event) => setResult((current) => current ? { ...current, worksheet: event.target.value } : current)} rows={24} className={`${previewInputClass} mt-6 resize-y whitespace-pre-wrap leading-7`} /> : <div className="mt-6 whitespace-pre-wrap text-sm leading-7">{result.worksheet}</div>}
                    </article>
                  )}
                </div>
              ) : (
                <div className="flex min-h-[620px] flex-col items-center justify-center rounded-2xl bg-white px-8 py-10 text-center text-zinc-900 shadow-xl sm:px-10">
                  <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[#EF629F]/10 text-[#EF629F]">{isPpt ? <Presentation className="h-7 w-7" /> : <FileText className="h-7 w-7" />}</div>
                  <h3 className="mt-5 text-lg font-bold text-zinc-900">Hasil {isPpt ? "presentasi" : "LKPD"} akan tampil di sini</h3>
                  <p className="mt-2 max-w-md text-sm leading-6 text-zinc-600">Isi konteks pembelajaran, lalu buat dokumen dengan DinoAI. Hasil dapat ditinjau, diedit, dan disimpan.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
      <style>{`.dino-ai-studio-select{color-scheme:light}.dino-ai-studio-select option{background:#fff;color:#27272a}.dino-ai-studio-select option:checked{background:#EF629F;color:#fff}.dark .dino-ai-studio-select,html.dark .dino-ai-studio-select{color-scheme:dark;background-color:#1D191F!important;color:#F8F4F5!important}.dark .dino-ai-studio-select option,html.dark .dino-ai-studio-select option{background:#1D191F;color:#F8F4F5;-webkit-text-fill-color:#F8F4F5}.dark .dino-ai-studio-select option:checked,html.dark .dino-ai-studio-select option:checked{background:#EF629F;color:#fff;-webkit-text-fill-color:#fff}@media print{@page{size:${isPpt ? "landscape" : "A4"};margin:${isPpt ? "10mm" : "14mm"}}html,body{background:#fff!important;color:#111!important}body *{visibility:hidden!important}.learning-print-document,.learning-print-document *{visibility:visible!important}.learning-print-document{position:absolute!important;inset:0!important;width:100%!important;display:block!important}.presentation-slide{break-after:page;page-break-after:always;min-height:90vh!important;border:0!important;border-radius:0!important;background:#fff!important;box-shadow:none!important;padding:16mm!important}.presentation-slide:last-child{break-after:auto;page-break-after:auto}.presentation-slide h3{font-size:24pt!important}.presentation-slide li{font-size:16pt!important;line-height:1.5!important;color:#222!important}.print-lkpd-document{max-width:none!important;padding:0!important;box-shadow:none!important}.print-document-heading{color:#111!important;border-color:#555!important}${isPpt ? ".print-document-heading{display:none!important}" : ""}.learning-print-document input,.learning-print-document textarea{border:0!important;background:transparent!important;color:#111!important;padding:0!important}.dino-no-print,header{display:none!important}}`}</style>
    </div>
  )
}
