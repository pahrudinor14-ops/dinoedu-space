import { useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowLeft,
  Check,
  ClipboardCheck,
  Download,
  FileDown,
  Lightbulb,
  LoaderCircle,
  Pencil,
  Plus,
  Printer,
  Save,
  Trash2,
} from "lucide-react"
import { supabase } from "../lib/supabase"
import { invokeDinoAI } from "../lib/invokeDinoAI"
import "./AIPembuatRubrik.css"

interface AIPembuatRubrikProps {
  onBack: () => void
}

interface RubricLevel {
  label: string
  score: number
}

interface RubricCriterion {
  id: string
  name: string
  evidence: string
  weight: number
  descriptors: string[]
}

interface RubricResult {
  title: string
  purpose: string
  instructions: string
  successCriteria: string[]
  criteria: RubricCriterion[]
  feedbackGuide: string[]
  followUp: string
}

interface RubricForm {
  educationLevel: string
  grade: string
  subject: string
  assessmentTitle: string
  taskDescription: string
  learningObjective: string
  successCriteria: string
  assessmentType: string
  levelCount: number
  criterionCount: number
}

const initialRubricForm: RubricForm = {
  educationLevel: "SD/MI",
  grade: "Kelas IV",
  subject: "",
  assessmentTitle: "",
  taskDescription: "",
  learningObjective: "",
  successCriteria: "",
  assessmentType: "Proyek atau produk",
  levelCount: 4,
  criterionCount: 4,
}

interface StoredRubricContent {
  form?: Partial<RubricForm>
  resultForm?: Partial<RubricForm>
  levels?: RubricLevel[]
  result?: unknown
  scoreLevels?: Record<string, string>
  studentName?: string
  teacherFeedback?: string
}

interface RubricResponse {
  success?: boolean
  error?: string
  quotaWarning?: string
  rubric?: unknown
}

const gradeOptions: Record<string, string[]> = {
  PAUD: ["Kelompok A", "Kelompok B"],
  "SD/MI": ["Kelas I", "Kelas II", "Kelas III", "Kelas IV", "Kelas V", "Kelas VI"],
  "SMP/MTs": ["Kelas VII", "Kelas VIII", "Kelas IX"],
  "SMA/MA": ["Kelas X", "Kelas XI", "Kelas XII"],
  "SMK/MAK": ["Kelas X", "Kelas XI", "Kelas XII", "Kelas XIII"],
  Umum: ["Umum"],
}

const assessmentTypes = [
  "Proyek atau produk",
  "Presentasi lisan",
  "Praktik atau unjuk kerja",
  "Laporan atau tulisan",
  "Diskusi atau kolaborasi",
  "Portofolio",
  "Proses pembelajaran",
  "Lainnya",
]

const inputClass = "w-full rounded-2xl border border-border/70 bg-white/50 px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/70 focus:border-[#EF629F]/60 focus:ring-2 focus:ring-[#EF629F]/10 dark:bg-white/5"
const selectClass = `${inputClass} dino-themed-select`
const labelClass = "mb-2 block text-sm font-semibold text-foreground"

function makeLevels(count: number): RubricLevel[] {
  const names: Record<number, string[]> = {
    3: ["Mahir", "Berkembang Sesuai Harapan", "Perlu Bimbingan"],
    4: ["Mahir", "Cakap", "Berkembang", "Perlu Bimbingan"],
    5: ["Unggul", "Mahir", "Cakap", "Berkembang", "Perlu Bimbingan"],
  }
  return (names[count] ?? names[4]).map((label, index) => ({ label, score: count - index }))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function parseRubricResult(value: unknown, levels: RubricLevel[]): RubricResult {
  if (!isRecord(value)) throw new Error("Struktur hasil rubrik tidak valid. Silakan buat ulang.")
  const rawCriteria = value.criteria
  if (!Array.isArray(rawCriteria) || rawCriteria.length < 3 || rawCriteria.length > 8) {
    throw new Error("Rubrik harus memiliki 3–8 kriteria. Silakan buat ulang.")
  }
  const criteria = rawCriteria.map((raw, index): RubricCriterion => {
    if (!isRecord(raw) || !Array.isArray(raw.descriptors)) {
      throw new Error(`Deskriptor kriteria ${index + 1} tidak lengkap. Silakan buat ulang.`)
    }
    const descriptors = raw.descriptors.filter((item): item is string => typeof item === "string").map((item) => item.trim())
    const name = typeof raw.name === "string" ? raw.name.trim() : ""
    const evidence = typeof raw.evidence === "string" ? raw.evidence.trim() : ""
    const weight = Number(raw.weight)
    if (!name || !evidence || descriptors.length !== levels.length || descriptors.some((item) => !item)) {
      throw new Error(`Isi kriteria ${index + 1} belum lengkap. Silakan buat ulang.`)
    }
    if (!Number.isInteger(weight) || weight < 1 || weight > 100) {
      throw new Error(`Bobot kriteria ${index + 1} tidak valid. Silakan buat ulang.`)
    }
    return { id: crypto.randomUUID(), name, evidence, weight, descriptors }
  })
  if (criteria.reduce((sum, criterion) => sum + criterion.weight, 0) !== 100) {
    throw new Error("Total bobot rubrik dari AI tidak berjumlah 100%. Coba buat ulang.")
  }
  const successCriteria = Array.isArray(value.successCriteria)
    ? value.successCriteria.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean)
    : []
  const feedbackGuide = Array.isArray(value.feedbackGuide)
    ? value.feedbackGuide.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean)
    : []
  const purpose = typeof value.purpose === "string" ? value.purpose.trim() : ""
  const instructions = typeof value.instructions === "string" ? value.instructions.trim() : ""
  const followUp = typeof value.followUp === "string" ? value.followUp.trim() : ""
  if (!purpose || !instructions || !successCriteria.length || !feedbackGuide.length || !followUp) {
    throw new Error("Bagian panduan penggunaan rubrik belum lengkap. Silakan buat ulang.")
  }
  return {
    title: typeof value.title === "string" && value.title.trim() ? value.title.trim() : "Rubrik Penilaian",
    purpose,
    instructions,
    successCriteria,
    criteria,
    feedbackGuide,
    followUp,
  }
}

function readSavedRubric(value: unknown, levels: RubricLevel[]): RubricResult | null {
  if (!isRecord(value) || !Array.isArray(value.criteria)) return null
  try {
    const parsed = parseRubricResult(value, levels)
    parsed.criteria = value.criteria.map((raw, index) => {
      const criterion = parsed.criteria[index]
      return isRecord(raw) && typeof raw.id === "string"
        ? { ...criterion, id: raw.id }
        : criterion
    })
    return parsed
  } catch {
    return null
  }
}

function createIdempotencyKey(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID()
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

function phaseForGrade(level: string, grade: string): string {
  if (level === "PAUD") return "Fondasi"
  if (level === "SD/MI") {
    if (["Kelas I", "Kelas II"].includes(grade)) return "Fase A"
    if (["Kelas III", "Kelas IV"].includes(grade)) return "Fase B"
    return "Fase C"
  }
  if (level === "SMP/MTs") return "Fase D"
  if (["SMA/MA", "SMK/MAK"].includes(level)) {
    return grade === "Kelas X" ? "Fase E" : "Fase F"
  }
  return ""
}

function csvCell(value: string | number): string {
  const safe = String(value).replace(/^[=+@-]/, "'$&")
  return `"${safe.replaceAll('"', '""')}"`
}

export default function AIPembuatRubrik({ onBack }: AIPembuatRubrikProps) {
  const [form, setForm] = useState<RubricForm>(() => ({ ...initialRubricForm }))
  const [resultForm, setResultForm] = useState<RubricForm | null>(null)
  const [levels, setLevels] = useState<RubricLevel[]>(() => makeLevels(4))
  const [result, setResult] = useState<RubricResult | null>(null)
  const [scoreLevels, setScoreLevels] = useState<Record<string, string>>({})
  const [studentName, setStudentName] = useState("")
  const [teacherFeedback, setTeacherFeedback] = useState("")
  const [isEditing, setIsEditing] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingSaved, setIsLoadingSaved] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  const [savedDocumentId, setSavedDocumentId] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const generationInFlight = useRef(false)
  const grades = useMemo(() => gradeOptions[form.educationLevel] ?? [], [form.educationLevel])
  const displayedForm = resultForm ?? form
  const isFormComplete = Boolean(
    form.subject.trim() && form.assessmentTitle.trim() && form.taskDescription.trim() && form.learningObjective.trim(),
  )
  const totalWeight = result?.criteria.reduce((sum, criterion) => sum + Number(criterion.weight || 0), 0) ?? 0
  const scoreMaximum = levels[0]?.score ?? 4
  const allCriteriaScored = Boolean(result?.criteria.length) && result!.criteria.every((criterion) => scoreLevels[criterion.id] !== undefined && scoreLevels[criterion.id] !== "")
  const totalScore = result && allCriteriaScored
    ? result.criteria.reduce((sum, criterion) => sum + criterion.weight * (Number(scoreLevels[criterion.id]) / scoreMaximum), 0)
    : null

  function updateForm<Key extends keyof RubricForm>(key: Key, value: RubricForm[Key]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function buildDocumentContent(
    resultToSave: RubricResult | null = result,
    levelsToSave: RubricLevel[] = levels,
    scoreLevelsToSave: Record<string, string> = scoreLevels,
    studentNameToSave = studentName,
    teacherFeedbackToSave = teacherFeedback,
    formToSave: RubricForm = form,
    resultFormToSave: RubricForm | null = resultForm,
  ) {
    return { form: formToSave, resultForm: resultFormToSave, levels: levelsToSave, result: resultToSave, scoreLevels: scoreLevelsToSave, studentName: studentNameToSave, teacherFeedback: teacherFeedbackToSave }
  }

  async function loadSavedDocument() {
    setIsLoadingSaved(true)
    try {
      const { data, error } = await supabase
        .from("ai_documents")
        .select("id,content")
        .eq("document_type", "rubrik")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      if (!data) return
      setSavedDocumentId(data.id)
      const content = (data.content ?? {}) as StoredRubricContent
      const savedForm = content.form
      const loadedForm = { ...initialRubricForm, ...(savedForm ?? {}) }
      if (savedForm) {
        setForm(loadedForm)
      }
      if (Array.isArray(content.levels) && content.levels.every((level) => isRecord(level) && typeof level.label === "string" && typeof level.score === "number")) {
        setLevels(content.levels as RubricLevel[])
      }
      const loadedLevels = Array.isArray(content.levels) && content.levels.length >= 3
        ? content.levels as RubricLevel[]
        : makeLevels(4)
      const loadedResult = readSavedRubric(content.result, loadedLevels)
      if (loadedResult) {
        setResult(loadedResult)
        setResultForm({ ...loadedForm, ...(content.resultForm ?? {}) })
      }
      if (isRecord(content.scoreLevels)) {
        setScoreLevels(Object.fromEntries(Object.entries(content.scoreLevels).filter(([, value]) => typeof value === "string")))
      }
      if (typeof content.studentName === "string") setStudentName(content.studentName)
      if (typeof content.teacherFeedback === "string") setTeacherFeedback(content.teacherFeedback)
    } catch (error) {
      console.error("Load saved rubric error:", error)
      setErrorMessage(error instanceof Error ? `Rubrik tersimpan gagal dimuat: ${error.message}` : "Rubrik tersimpan gagal dimuat.")
    } finally {
      setIsLoadingSaved(false)
    }
  }

  async function saveDocument(
    resultToSave: RubricResult | null = result,
    levelsToSave: RubricLevel[] = levels,
    scoreLevelsToSave: Record<string, string> = scoreLevels,
    studentNameToSave = studentName,
    teacherFeedbackToSave = teacherFeedback,
    formToSave: RubricForm = form,
    resultFormToSave: RubricForm | null = resultForm,
  ): Promise<boolean> {
    if (!resultToSave) return false
    const weightSum = resultToSave.criteria.reduce((sum, criterion) => sum + Number(criterion.weight), 0)
    if (resultToSave.criteria.length < 3 || resultToSave.criteria.length > 8 || resultToSave.criteria.some((criterion) => !Number.isInteger(Number(criterion.weight)) || Number(criterion.weight) < 1 || Number(criterion.weight) > 100)) {
      setErrorMessage("Rubrik perlu memiliki 3–8 kriteria dengan bobot bilangan bulat positif.")
      return false
    }
    if (weightSum !== 100) {
      setErrorMessage("Total bobot harus tepat 100% sebelum rubrik disimpan.")
      return false
    }
    if (!resultToSave.successCriteria.some((criterion) => criterion.trim()) || !resultToSave.feedbackGuide.some((tip) => tip.trim()) || !resultToSave.instructions.trim() || !resultToSave.purpose.trim() || !resultToSave.followUp.trim()) {
      setErrorMessage("Lengkapi KKTP, petunjuk, panduan umpan balik, dan tindak lanjut sebelum menyimpan.")
      return false
    }
    if (levelsToSave.length < 3 || levelsToSave.length > 5 || levelsToSave.some((level, index) => !level.label.trim() || level.score !== levelsToSave.length - index)) {
      setErrorMessage("Lengkapi label dan urutan skor pada 3–5 tingkat performa sebelum menyimpan.")
      return false
    }
    if (new Set(levelsToSave.map((level) => level.label.trim().toLocaleLowerCase())).size !== levelsToSave.length) {
      setErrorMessage("Gunakan label yang berbeda untuk setiap tingkat performa.")
      return false
    }
    if (resultToSave.criteria.some((criterion) => !criterion.name.trim() || !criterion.evidence.trim() || criterion.descriptors.length !== levelsToSave.length || criterion.descriptors.some((descriptor) => !descriptor.trim()))) {
      setErrorMessage("Lengkapi semua kriteria dan deskriptor sebelum menyimpan rubrik.")
      return false
    }
    setIsSaving(true)
    setErrorMessage("")
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      const userId = sessionData.session?.user?.id
      if (sessionError || !userId) throw new Error("Sesi login tidak ditemukan. Silakan masuk kembali.")
      const content = buildDocumentContent(resultToSave, levelsToSave, scoreLevelsToSave, studentNameToSave, teacherFeedbackToSave, formToSave, resultFormToSave)
      const title = resultToSave.title || resultFormToSave?.assessmentTitle || formToSave.assessmentTitle || "Rubrik Penilaian"
      if (savedDocumentId) {
        const { error } = await supabase.from("ai_documents").update({ title, content }).eq("id", savedDocumentId).eq("user_id", userId)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from("ai_documents").insert({ user_id: userId, document_type: "rubrik", title, content }).select("id").single()
        if (error) throw error
        setSavedDocumentId(data.id)
      }
      setMessage("Rubrik berhasil disimpan.")
      return true
    } catch (error) {
      console.error("Save rubric error:", error)
      setErrorMessage(error instanceof Error ? `Rubrik gagal disimpan: ${error.message}` : "Rubrik gagal disimpan.")
      return false
    } finally {
      setIsSaving(false)
    }
  }

  useEffect(() => {
    void loadSavedDocument()
  }, [])

  async function generateRubric() {
    if (!isFormComplete) {
      setErrorMessage("Lengkapi mata pelajaran, judul asesmen, deskripsi tugas, dan tujuan pembelajaran terlebih dahulu.")
      return
    }
    if (generationInFlight.current) return
    generationInFlight.current = true
    setAiLoading(true)
    setErrorMessage("")
    setMessage("")
    const requestedLevels = makeLevels(form.levelCount)
    const requestedForm = { ...form }
    try {
      const data = await invokeDinoAI<RubricResponse>("dinoai-rubrik", {
        idempotencyKey: createIdempotencyKey(),
        ...requestedForm,
        phase: phaseForGrade(requestedForm.educationLevel, requestedForm.grade),
        levels: requestedLevels,
      })
      if (!data?.success || !data.rubric) throw new Error(data?.error || "AI tidak mengembalikan rubrik dengan struktur lengkap.")
      const generated = parseRubricResult(data.rubric, requestedLevels)
      if (generated.criteria.length !== requestedForm.criterionCount) {
        throw new Error(`AI membuat ${generated.criteria.length} kriteria, padahal diminta ${requestedForm.criterionCount}. Silakan coba lagi.`)
      }
      generated.title = requestedForm.assessmentTitle.trim()
      setLevels(requestedLevels)
      setResultForm(requestedForm)
      setResult(generated)
      setScoreLevels({})
      setStudentName("")
      setTeacherFeedback("")
      setIsEditing(false)
      const saved = await saveDocument(generated, requestedLevels, {}, "", "", requestedForm, requestedForm)
      const resultMessage = saved
        ? "Rubrik berhasil dibuat dan disimpan. Tinjau kesesuaiannya dengan tujuan pembelajaran sebelum digunakan."
        : "Rubrik berhasil dibuat, tetapi belum tersimpan. Tekan Simpan untuk menyimpannya."
      setMessage(data.quotaWarning ? `${resultMessage} ${data.quotaWarning}` : resultMessage)
      window.scrollTo({ top: 0, behavior: "smooth" })
    } catch (error) {
      console.error("AI Rubrik error:", error)
      setErrorMessage(error instanceof Error ? error.message : "Terjadi kesalahan saat membuat rubrik dengan AI.")
    } finally {
      generationInFlight.current = false
      setAiLoading(false)
    }
  }

  function updateCriterion(index: number, key: "name" | "evidence" | "weight", value: string) {
    setResult((current) => current ? {
      ...current,
      criteria: current.criteria.map((criterion, criterionIndex) => criterionIndex === index
        ? { ...criterion, [key]: key === "weight" ? Number(value) : value }
        : criterion),
    } : current)
  }

  function updateDescriptor(criterionIndex: number, levelIndex: number, value: string) {
    setResult((current) => current ? {
      ...current,
      criteria: current.criteria.map((criterion, index) => index === criterionIndex
        ? { ...criterion, descriptors: criterion.descriptors.map((descriptor, descriptorIndex) => descriptorIndex === levelIndex ? value : descriptor) }
        : criterion),
    } : current)
  }

  function updateLevelLabel(levelIndex: number, label: string) {
    setLevels((current) => current.map((level, index) => index === levelIndex ? { ...level, label } : level))
  }

  function removeCriterion(index: number) {
    setResult((current) => current ? { ...current, criteria: current.criteria.filter((_, criterionIndex) => criterionIndex !== index) } : current)
  }

  function addCriterion() {
    if (!result || result.criteria.length >= 8) return
    setResult((current) => current ? {
      ...current,
      criteria: [...current.criteria, {
        id: crypto.randomUUID(),
        name: "Kriteria baru",
        evidence: "",
        weight: 0,
        descriptors: levels.map(() => ""),
      }],
    } : current)
  }

  async function toggleEdit() {
    if (isEditing) {
      const saved = await saveDocument()
      if (saved) setIsEditing(false)
      return
    }
    setIsEditing(true)
  }

  async function deleteRubric() {
    if (!window.confirm("Hapus rubrik ini beserta isian dan skor penilaian yang tersimpan?")) return
    if (isSaving || aiLoading || isLoadingSaved) return
    setIsDeleting(true)
    setErrorMessage("")
    try {
      if (savedDocumentId) {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
        const userId = sessionData.session?.user?.id
        if (sessionError || !userId) throw new Error("Sesi login tidak ditemukan. Silakan masuk kembali.")
        const { error } = await supabase.from("ai_documents").delete().eq("id", savedDocumentId).eq("user_id", userId)
        if (error) throw error
      }
      setSavedDocumentId(null)
      setResult(null)
      setResultForm(null)
      setScoreLevels({})
      setStudentName("")
      setTeacherFeedback("")
      setMessage("Rubrik dihapus. Silakan susun rubrik baru.")
    } catch (error) {
      setErrorMessage(error instanceof Error ? `Rubrik gagal dihapus: ${error.message}` : "Rubrik gagal dihapus.")
    } finally {
      setIsDeleting(false)
    }
  }

  function printRubric() {
    window.print()
  }

  function downloadScoreCsv() {
    if (!result || totalScore === null) return
    const rows: Array<Array<string | number>> = [
      ["Nama peserta didik", studentName || "Belum diisi"],
      ["Rubrik", result.title],
      ["Kriteria", "Bobot", "Tingkat", "Skor", "Nilai berbobot"],
    ]
    result.criteria.forEach((criterion) => {
      const score = Number(scoreLevels[criterion.id])
      const selectedLevel = score === 0 ? "Belum ada bukti" : levels.find((level) => level.score === score)?.label ?? ""
      rows.push([criterion.name, `${criterion.weight}%`, selectedLevel, score, (criterion.weight * score / scoreMaximum).toFixed(2)])
    })
    rows.push(["Total", "", "", "", totalScore.toFixed(2)])
    const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
    const link = document.createElement("a")
    link.href = url
    link.download = `${(result.title || "rubrik-penilaian").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "rubrik-penilaian"}.csv`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
  }

  return (
    <div className="rubric-page min-h-dvh bg-background text-foreground">
      <header className="rubric-no-print sticky top-0 z-30 border-b border-border/50 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <button type="button" onClick={onBack} className="dino-button inline-flex shrink-0 items-center gap-2 rounded-full border border-border/60 bg-white/40 px-4 py-3 text-[14px] font-semibold backdrop-blur-xl dark:bg-white/5" aria-label="Kembali ke dashboard">
            <ArrowLeft className="h-4 w-4" /> Kembali
          </button>
          <div className="flex min-w-0 items-center justify-end gap-2 text-right text-[14px] font-semibold"><img src="/logodino.PNG" alt="" className="h-4 w-4 shrink-0 object-contain" />AI Rubrik Penilaian</div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 pb-20 pt-10 sm:px-6 sm:pt-14 lg:px-8">
        <section className="rubric-no-print dino-enter mb-10">
          <div className="dino-glass relative overflow-hidden rounded-[32px] p-7 sm:p-10">
            <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[#EF629F]/10 blur-3xl" />
            <div className="relative max-w-3xl text-left">
              <div className="flex items-center gap-2 text-[14px] font-semibold text-[#EF629F]"><img src="/logodino.PNG" alt="" className="h-4 w-4 object-contain" />DinoEdu AI</div>
              <h1 className="dino-hero-title mt-4 text-3xl font-bold sm:text-5xl">Susun rubrik penilaian<span className="block bg-gradient-to-r from-[#EECDA3] to-[#EF629F] bg-clip-text pb-1 text-transparent">dengan bantuan AI</span></h1>
              <p className="mt-4 max-w-2xl text-[18px] leading-relaxed text-muted-foreground">Susun kriteria, deskriptor performa, bobot, panduan umpan balik, dan lembar penskoran yang selaras dengan tujuan belajar.</p>
            </div>
          </div>
        </section>

        <div className="rubric-no-print mt-6 grid gap-6 xl:grid-cols-[minmax(320px,0.78fr)_minmax(0,1.22fr)]">
          <section className="dino-glass h-fit rounded-[28px] p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#EF629F]/10 text-[#EF629F]"><Lightbulb className="h-5 w-5" /></div>
              <div><h2 className="text-lg font-bold">Konteks asesmen</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">Tujuan dan tugas membantu AI menyusun indikator yang relevan.</p></div>
            </div>
            <div className="mt-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <div><label className={labelClass} htmlFor="rubric-level">Jenjang</label><select id="rubric-level" className={selectClass} value={form.educationLevel} onChange={(event) => { const nextLevel = event.target.value; updateForm("educationLevel", nextLevel); updateForm("grade", (gradeOptions[nextLevel] ?? [""])[0]) }}><option>PAUD</option><option>SD/MI</option><option>SMP/MTs</option><option>SMA/MA</option><option>SMK/MAK</option><option>Umum</option></select></div>
                <div><label className={labelClass} htmlFor="rubric-grade">Kelas / kelompok</label><select id="rubric-grade" className={selectClass} value={form.grade} onChange={(event) => updateForm("grade", event.target.value)}>{grades.map((grade) => <option key={grade}>{grade}</option>)}</select></div>
              </div>
              <div><label className={labelClass} htmlFor="rubric-subject">Mata pelajaran / bidang</label><input id="rubric-subject" className={inputClass} value={form.subject} onChange={(event) => updateForm("subject", event.target.value)} maxLength={160} placeholder="Contoh: IPAS" /></div>
              <div><label className={labelClass} htmlFor="rubric-title">Judul asesmen</label><input id="rubric-title" className={inputClass} value={form.assessmentTitle} onChange={(event) => updateForm("assessmentTitle", event.target.value)} maxLength={160} placeholder="Contoh: Proyek Poster Siklus Air" /></div>
              <div><label className={labelClass} htmlFor="rubric-task">Tugas / unjuk kerja yang dinilai</label><textarea id="rubric-task" className={inputClass} rows={3} maxLength={1600} value={form.taskDescription} onChange={(event) => updateForm("taskDescription", event.target.value)} placeholder="Jelaskan apa yang akan dikerjakan atau ditampilkan peserta didik." /></div>
              <div><label className={labelClass} htmlFor="rubric-objective">Tujuan pembelajaran (TP)</label><textarea id="rubric-objective" className={inputClass} rows={3} maxLength={1400} value={form.learningObjective} onChange={(event) => updateForm("learningObjective", event.target.value)} placeholder="Tuliskan kompetensi atau hasil belajar yang ingin dicapai." /></div>
              <div><label className={labelClass} htmlFor="rubric-kktp">KKTP / indikator ketercapaian <span className="font-normal text-muted-foreground">(opsional)</span></label><textarea id="rubric-kktp" className={inputClass} rows={2} maxLength={1000} value={form.successCriteria} onChange={(event) => updateForm("successCriteria", event.target.value)} placeholder="Jika dikosongkan, AI akan menyarankan indikator yang dapat ditinjau." /></div>
              <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
                <div><label className={labelClass} htmlFor="rubric-type">Teknik asesmen</label><select id="rubric-type" className={selectClass} value={form.assessmentType} onChange={(event) => updateForm("assessmentType", event.target.value)}>{assessmentTypes.map((type) => <option key={type}>{type}</option>)}</select></div>
                <div><label className={labelClass} htmlFor="rubric-level-count">Tingkat performa</label><select id="rubric-level-count" className={selectClass} value={form.levelCount} onChange={(event) => updateForm("levelCount", Number(event.target.value))}><option value={3}>3 tingkat</option><option value={4}>4 tingkat</option><option value={5}>5 tingkat</option></select></div>
                <div><label className={labelClass} htmlFor="rubric-criteria-count">Jumlah kriteria</label><select id="rubric-criteria-count" className={selectClass} value={form.criterionCount} onChange={(event) => updateForm("criterionCount", Number(event.target.value))}>{[3, 4, 5, 6, 7, 8].map((count) => <option key={count} value={count}>{count} kriteria</option>)}</select></div>
              </div>
              <button type="button" disabled={aiLoading || isSaving || isLoadingSaved} onClick={() => void generateRubric()} className={`dino-gradient mt-10 flex w-full items-center justify-center rounded-2xl px-5 py-4 text-center text-[15px] font-semibold text-white shadow-lg shadow-pink-500/10 transition-all duration-200 ${!aiLoading && !isSaving && !isLoadingSaved ? "dino-button" : "cursor-not-allowed opacity-50"}`}>
                <img src="/logodino.PNG" alt="" className="mr-2 h-4 w-4 object-contain" />
                {aiLoading ? "Sedang menyusun rubrik..." : "Buat Rubrik dengan AI · 2 kredit"}
              </button>
              <p className="text-center text-[11px] leading-5 text-muted-foreground">Membuat rubrik menggunakan 2 kredit DinoAI. Tinjau dan sesuaikan hasil sebelum dibagikan.</p>
            </div>
          </section>

          <section className="min-w-0 space-y-5">
            {(errorMessage || message) && <div role={errorMessage ? "alert" : "status"} className={`rounded-2xl border px-4 py-3 text-sm leading-6 ${errorMessage ? "border-red-500/25 bg-red-500/5 text-red-700 dark:text-red-300" : "border-emerald-500/25 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300"}`}>{errorMessage || message}</div>}
            {isLoadingSaved ? (
              <div className="dino-glass flex min-h-96 items-center justify-center rounded-[28px] text-sm text-muted-foreground"><LoaderCircle className="mr-2 h-4 w-4 animate-spin" />Memuat rubrik tersimpan…</div>
            ) : result ? (
              <>
                <div className="dino-glass rounded-[28px] p-5 sm:p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      {isEditing ? <input aria-label="Judul rubrik" className="w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-xl font-bold outline-none focus:border-[#EF629F]/50" value={result.title} onChange={(event) => setResult((current) => current ? { ...current, title: event.target.value } : current)} /> : <h2 className="text-xl font-bold sm:text-2xl">{result.title}</h2>}
                      <p className="mt-2 text-xs text-muted-foreground">{displayedForm.educationLevel} • {displayedForm.grade}{phaseForGrade(displayedForm.educationLevel, displayedForm.grade) ? ` • ${phaseForGrade(displayedForm.educationLevel, displayedForm.grade)}` : ""} • {displayedForm.subject}</p>
                      <p className="mt-3 text-sm leading-6 text-muted-foreground">{result.purpose}</p>
                    </div>
                    <div className="rubric-no-print flex flex-wrap gap-2">
                      <button type="button" onClick={() => void toggleEdit()} disabled={isSaving || isDeleting} className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/60 px-3 py-2 text-xs font-semibold hover:bg-muted">{isEditing ? <Check className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}{isEditing ? "Selesai edit" : "Edit"}</button>
                      <button type="button" onClick={() => void saveDocument()} disabled={isSaving || isDeleting} className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/60 px-3 py-2 text-xs font-semibold hover:bg-muted"><Save className="h-3.5 w-3.5" />{isSaving ? "Menyimpan…" : "Simpan"}</button>
                      <button type="button" onClick={printRubric} className="dino-gradient inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold text-white"><Printer className="h-3.5 w-3.5" />Cetak / PDF</button>
                      <button type="button" onClick={() => void deleteRubric()} disabled={isSaving || isDeleting} aria-label="Hapus rubrik tersimpan" className="inline-flex items-center justify-center rounded-full border border-red-500/25 bg-red-500/5 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-500/10"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-border/60 bg-white/40 p-4 dark:bg-white/5"><h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tujuan pembelajaran</h3><p className="mt-2 text-sm leading-6">{displayedForm.learningObjective}</p></div>
                    <div className="rounded-2xl border border-border/60 bg-white/40 p-4 dark:bg-white/5"><h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tugas yang dinilai</h3><p className="mt-2 text-sm leading-6">{displayedForm.taskDescription}</p></div>
                  </div>
                  <div className="mt-5 rounded-2xl border border-[#EF629F]/20 bg-[#EF629F]/5 p-4">
                    <h3 className="text-sm font-bold">Kriteria ketercapaian / KKTP</h3>
                    {isEditing ? <textarea className={`${inputClass} mt-3`} rows={3} value={result.successCriteria.join("\n")} onChange={(event) => setResult((current) => current ? { ...current, successCriteria: event.target.value.split("\n") } : current)} aria-label="Kriteria ketercapaian" /> : <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-muted-foreground">{result.successCriteria.map((criterion, index) => <li key={index}>{criterion}</li>)}</ul>}
                  </div>
                </div>

                <div className="dino-glass rounded-[28px] p-5 sm:p-6">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div><h3 className="text-lg font-bold">Rubrik analitik</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">Setiap baris memiliki bukti belajar dan deskriptor tersendiri; bobot saat ini {totalWeight}%.</p></div>
                    {isEditing && <button type="button" onClick={addCriterion} disabled={result.criteria.length >= 8} className="rubric-no-print inline-flex items-center gap-2 rounded-full border border-[#EF629F]/30 px-3 py-2 text-xs font-semibold text-[#c9447b] disabled:opacity-40"><Plus className="h-3.5 w-3.5" />Tambah kriteria</button>}
                  </div>
                  {totalWeight !== 100 && <p className="rubric-no-print mt-3 rounded-xl bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-700 dark:text-amber-300">Sesuaikan bobot agar totalnya tepat 100% sebelum menyimpan.</p>}
                  <div className="mt-4 overflow-x-auto rounded-2xl border border-border/70">
                    <table className="w-full min-w-[900px] border-collapse text-left text-xs">
                    <thead><tr className="bg-muted/70"><th className="border-b border-r border-border/70 px-3 py-3 align-top font-bold">Kriteria / bukti</th>{levels.map((level, levelIndex) => <th key={level.score} className="border-b border-r border-border/70 px-3 py-3 align-top font-bold">{isEditing ? <div><input className={`${inputClass} px-2 py-2 text-xs`} value={level.label} maxLength={80} onChange={(event) => updateLevelLabel(levelIndex, event.target.value)} aria-label={`Label tingkat skor ${level.score}`} /><span className="mt-1 block text-[10px] font-normal">{level.score} poin</span></div> : <>{level.label}<span className="mt-1 block text-[10px] font-normal">{level.score} poin</span></>}</th>)}<th className="border-b border-r border-border/70 px-3 py-3 text-center font-bold">Bobot</th>{isEditing && <th className="rubric-no-print border-b border-border/70 px-3 py-3">Aksi</th>}</tr></thead>
                      <tbody>
                        {result.criteria.map((criterion, criterionIndex) => <tr key={criterion.id} className="align-top even:bg-muted/25">
                          <td className="w-48 border-b border-r border-border/70 p-3"><div className="font-bold">{isEditing ? <input className={`${inputClass} py-2 text-xs`} value={criterion.name} onChange={(event) => updateCriterion(criterionIndex, "name", event.target.value)} aria-label={`Nama kriteria ${criterionIndex + 1}`} /> : criterion.name}</div><div className="mt-2 leading-5 text-muted-foreground">{isEditing ? <textarea className={`${inputClass} py-2 text-xs`} rows={3} value={criterion.evidence} onChange={(event) => updateCriterion(criterionIndex, "evidence", event.target.value)} aria-label={`Bukti kriteria ${criterionIndex + 1}`} /> : criterion.evidence}</div></td>
                          {levels.map((level, levelIndex) => <td key={`${criterion.id}-${level.score}`} className="min-w-36 border-b border-r border-border/70 p-3 leading-5 last:border-r-0">{isEditing ? <textarea className={`${inputClass} min-h-28 py-2 text-xs`} value={criterion.descriptors[levelIndex] ?? ""} onChange={(event) => updateDescriptor(criterionIndex, levelIndex, event.target.value)} aria-label={`${criterion.name}, ${level.label}`} /> : criterion.descriptors[levelIndex]}</td>)}
                          <td className="w-20 border-b border-r border-border/70 p-3 text-center font-bold">{isEditing ? <input type="number" min={0} max={100} className={`${inputClass} px-2 py-2 text-center text-xs`} value={criterion.weight} onChange={(event) => updateCriterion(criterionIndex, "weight", event.target.value)} aria-label={`Bobot ${criterion.name}`} /> : `${criterion.weight}%`}</td>
                          {isEditing && <td className="rubric-no-print border-b border-border/70 p-3 text-center"><button type="button" aria-label={`Hapus kriteria ${criterion.name}`} onClick={() => removeCriterion(criterionIndex)} disabled={result.criteria.length <= 3} className="rounded-lg p-2 text-red-500 hover:bg-red-500/10 disabled:opacity-30"><Trash2 className="h-4 w-4" /></button></td>}
                        </tr>)}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4 rounded-2xl border border-border/60 bg-white/40 p-4 text-xs leading-5 text-muted-foreground dark:bg-white/5"><strong className="text-foreground">Petunjuk:</strong> {result.instructions} Skor tiap kriteria dikalikan bobotnya, lalu dijumlahkan menjadi nilai 0–100. Sesuaikan pemaknaan hasil dengan KKTP satuan pendidikan.</div>
                </div>

                <div className="dino-glass rubric-no-print rounded-[28px] p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-lg font-bold">Lembar penskoran</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">Pilih tingkat performa berdasarkan bukti yang terlihat pada tugas peserta didik.</p></div><span className="rounded-full bg-[#EF629F]/10 px-3 py-1.5 text-xs font-bold text-[#c9447b]">{totalScore === null ? "Belum lengkap" : `${totalScore.toFixed(1)} / 100`}</span></div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div><label className={labelClass} htmlFor="rubric-student-name">Nama peserta didik</label><input id="rubric-student-name" className={inputClass} value={studentName} onChange={(event) => setStudentName(event.target.value)} placeholder="Nama yang dinilai" /></div>
                    <div className="flex items-end"><button type="button" onClick={downloadScoreCsv} disabled={totalScore === null} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-border/70 bg-background/60 px-4 py-3 text-sm font-semibold hover:bg-muted disabled:cursor-not-allowed disabled:opacity-45"><FileDown className="h-4 w-4" />Unduh hasil CSV</button></div>
                  </div>
                  <div className="mt-4 space-y-2">
                    {result.criteria.map((criterion) => <div key={`score-${criterion.id}`} className="grid gap-2 rounded-2xl border border-border/60 bg-white/40 p-3 dark:bg-white/5 sm:grid-cols-[minmax(0,1fr)_minmax(190px,0.72fr)] sm:items-center"><div><p className="text-sm font-semibold">{criterion.name} <span className="text-xs font-normal text-muted-foreground">· {criterion.weight}%</span></p><p className="mt-1 text-xs leading-5 text-muted-foreground">{criterion.evidence}</p></div><select className={inputClass} aria-label={`Tingkat performa ${criterion.name}`} value={scoreLevels[criterion.id] ?? ""} onChange={(event) => setScoreLevels((current) => ({ ...current, [criterion.id]: event.target.value }))}><option value="">Pilih tingkat performa</option><option value="0">Belum ada bukti · 0</option>{levels.map((level) => <option key={`${criterion.id}-${level.score}`} value={level.score}>{level.label} · {level.score}</option>)}</select></div>)}
                  </div>
                  <div className="mt-4"><label className={labelClass} htmlFor="rubric-feedback">Catatan umpan balik untuk peserta didik</label><textarea id="rubric-feedback" className={inputClass} rows={3} value={teacherFeedback} onChange={(event) => setTeacherFeedback(event.target.value)} placeholder="Tuliskan kekuatan, langkah berikutnya, atau dukungan yang dibutuhkan." /></div>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-border/60 bg-white/40 p-4 dark:bg-white/5"><h4 className="text-sm font-bold">Panduan umpan balik</h4><ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5 text-muted-foreground">{result.feedbackGuide.map((tip, index) => <li key={index}>{tip}</li>)}</ul></div>
                    <div className="rounded-2xl border border-border/60 bg-white/40 p-4 dark:bg-white/5"><h4 className="text-sm font-bold">Tindak lanjut belajar</h4><p className="mt-2 text-xs leading-5 text-muted-foreground">{result.followUp}</p></div>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2 border-t border-border/60 pt-4"><button type="button" onClick={() => void saveDocument()} disabled={isSaving || isDeleting} className="dino-gradient inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-bold text-white"><Save className="h-3.5 w-3.5" />{isSaving ? "Menyimpan…" : "Simpan rubrik dan skor"}</button><button type="button" onClick={() => { setScoreLevels({}); setTeacherFeedback("") }} className="inline-flex items-center gap-2 rounded-full border border-border/70 px-4 py-2.5 text-xs font-semibold hover:bg-muted"><Trash2 className="h-3.5 w-3.5" />Kosongkan penilaian</button></div>
                </div>
              </>
            ) : (
              <div className="dino-glass flex min-h-[520px] items-center justify-center rounded-[28px] p-7 text-center">
                <div className="max-w-sm"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#EF629F]/10 text-[#EF629F]"><ClipboardCheck className="h-7 w-7" /></div><h2 className="mt-5 text-xl font-bold">Rubrik siap disusun</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Isi konteks asesmen, lalu buat rubrik. Hasil yang tersimpan akan muncul kembali saat halaman ini dibuka.</p><div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground"><Download className="h-3.5 w-3.5" />Bisa dicetak atau disimpan sebagai PDF</div></div>
              </div>
            )}
          </section>
        </div>

        {result && <section id="rubric-print-document" className="rubric-print-document" aria-label="Dokumen rubrik untuk dicetak">
          <header className="rubric-print-header">
            <p className="rubric-print-brand">DinoEdu Space · Instrumen Asesmen</p>
            <h1>{result.title}</h1>
            <p>{displayedForm.educationLevel} • {displayedForm.grade}{phaseForGrade(displayedForm.educationLevel, displayedForm.grade) ? ` • ${phaseForGrade(displayedForm.educationLevel, displayedForm.grade)}` : ""} • {displayedForm.subject} • {displayedForm.assessmentType}</p>
            <p><strong>Tujuan pembelajaran:</strong> {displayedForm.learningObjective}</p>
            <p><strong>Tugas:</strong> {displayedForm.taskDescription}</p>
            <p><strong>Tujuan penggunaan:</strong> {result.purpose}</p>
            <h2>Kriteria ketercapaian / KKTP</h2>
            <ul>{result.successCriteria.map((criterion, index) => <li key={index}>{criterion}</li>)}</ul>
          </header>
          <table className="rubric-print-table">
            <thead><tr><th>Kriteria dan bukti belajar</th>{levels.map((level) => <th key={level.score}>{level.label}<br />{level.score} poin</th>)}<th>Bobot</th></tr></thead>
            <tbody>{result.criteria.map((criterion) => <tr key={criterion.id}><th><strong>{criterion.name}</strong><br /><span>{criterion.evidence}</span></th>{levels.map((level, index) => <td key={`${criterion.id}-${level.score}`}>{criterion.descriptors[index]}</td>)}<td>{criterion.weight}%</td></tr>)}</tbody>
          </table>
          <p className="rubric-print-instructions"><strong>Petunjuk penggunaan:</strong> {result.instructions} Catat bukti yang terlihat, pilih tingkat performa, lalu hitung skor berbobot. Selaraskan keputusan akhir dengan KKTP satuan pendidikan.</p>
          <section className="rubric-print-scoring">
            <h2>Lembar penskoran</h2>
            <p>Nama peserta didik: {studentName || "________________________________"}</p>
            <table><thead><tr><th>Kriteria</th><th>Bobot</th><th>Tingkat / skor</th><th>Nilai berbobot</th></tr></thead><tbody>{result.criteria.map((criterion) => {
              const score = scoreLevels[criterion.id] === undefined || scoreLevels[criterion.id] === "" ? null : Number(scoreLevels[criterion.id])
              const label = score === null ? "" : score === 0 ? "Belum ada bukti" : levels.find((level) => level.score === score)?.label ?? ""
              return <tr key={`print-${criterion.id}`}><td>{criterion.name}</td><td>{criterion.weight}%</td><td>{label}{score === null ? "" : ` (${score})`}</td><td>{score === null ? "" : `${(criterion.weight * score / scoreMaximum).toFixed(1)}%`}</td></tr>
            })}<tr><th>Total</th><td></td><td></td><th>{totalScore === null ? "" : `${totalScore.toFixed(1)} / 100`}</th></tr></tbody></table>
            <p><strong>Umpan balik:</strong> {teacherFeedback || "________________________________________________________________________________"}</p>
          </section>
          <footer>Petunjuk penskoran: tiap deskriptor diberi skor sesuai tingkatnya; nilai kriteria = bobot × (skor tingkat ÷ skor tertinggi). Rubrik dan skor perlu ditinjau pendidik sesuai konteks belajar.</footer>
        </section>}
      </main>
    </div>
  )
}
