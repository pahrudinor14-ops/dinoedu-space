import { useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowLeft,
  BarChart3,
  Check,
  Download,
  FileDown,
  LoaderCircle,
  Pencil,
  Printer,
  Save,
  Trash2,
} from "lucide-react"
import { supabase } from "../lib/supabase"
import { invokeDinoAI } from "../lib/invokeDinoAI"
import "./AIEvaluasiPembelajaran.css"

interface AIEvaluasiPembelajaranProps {
  onBack: () => void
}

interface EvaluationForm {
  educationLevel: string
  grade: string
  subject: string
  topic: string
  learningObjective: string
  assessmentPurpose: string
  assessmentMethod: string
  threshold: number
  scoreText: string
  indicatorEvidence: string
  teacherNotes: string
}

interface EvaluationSummary {
  learnerCount: number
  mean: number
  median: number
  highest: number
  lowest: number
  achievedCount: number
  notAchievedCount: number
  achievementRate: number
  threshold: number
}

interface FollowUpAction {
  priority: string
  action: string
  evidenceToCheck: string
}

interface EvaluationResult {
  title: string
  overallInterpretation: string
  strengths: string[]
  learningGaps: string[]
  possibleFactors: string[]
  actions: FollowUpAction[]
  studentFeedback: string
  reflectionQuestions: string[]
  nextAssessment: string
}

interface EvaluationResponse {
  success?: boolean
  error?: string
  quotaWarning?: string
  evaluation?: unknown
  summary?: unknown
}

interface SavedEvaluationContent {
  form?: Partial<EvaluationForm>
  resultForm?: Partial<EvaluationForm>
  result?: unknown
  summary?: unknown
}

const initialForm: EvaluationForm = {
  educationLevel: "SD/MI",
  grade: "Kelas IV",
  subject: "",
  topic: "",
  learningObjective: "",
  assessmentPurpose: "Formatif",
  assessmentMethod: "Tes tertulis / kuis",
  threshold: 75,
  scoreText: "",
  indicatorEvidence: "",
  teacherNotes: "",
}

const gradeOptions: Record<string, string[]> = {
  PAUD: ["Kelompok A", "Kelompok B"],
  "SD/MI": ["Kelas I", "Kelas II", "Kelas III", "Kelas IV", "Kelas V", "Kelas VI"],
  "SMP/MTs": ["Kelas VII", "Kelas VIII", "Kelas IX"],
  "SMA/MA": ["Kelas X", "Kelas XI", "Kelas XII"],
  "SMK/MAK": ["Kelas X", "Kelas XI", "Kelas XII", "Kelas XIII"],
  Umum: ["Umum"],
}

const fieldClass = "w-full rounded-2xl border border-border/70 bg-white/40 px-4 py-3.5 text-[15px] text-foreground outline-none backdrop-blur-xl transition placeholder:text-muted-foreground/70 focus:border-[#EF629F]/60 focus:ring-2 focus:ring-[#EF629F]/10 dark:bg-white/5"
const selectClass = `${fieldClass} dino-themed-select`
const fieldLabelClass = "mb-2 block text-[14px] font-medium text-foreground"

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function parseScoreLines(value: string): { scores: number[]; error: string } {
  const lines = value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  if (lines.length > 100) return { scores: [], error: "Maksimal 100 nilai dalam satu laporan." }
  const scores: number[] = []
  for (let index = 0; index < lines.length; index += 1) {
    const normalized = lines[index].replace(",", ".")
    if (!/^\d{1,3}(\.\d{1,2})?$/.test(normalized)) {
      return { scores: [], error: `Baris nilai ke-${index + 1} belum berupa angka 0–100.` }
    }
    const score = Number(normalized)
    if (!Number.isFinite(score) || score < 0 || score > 100) {
      return { scores: [], error: `Nilai pada baris ke-${index + 1} harus berada di antara 0 dan 100.` }
    }
    scores.push(score)
  }
  if (scores.length < 2) return { scores, error: "Masukkan setidaknya 2 nilai agar pola kelas dapat dianalisis." }
  return { scores, error: "" }
}

function roundOne(value: number): number {
  return Math.round((value + Number.EPSILON) * 10) / 10
}

function calculateSummary(scores: number[], threshold: number): EvaluationSummary {
  const ordered = [...scores].sort((left, right) => left - right)
  const middle = Math.floor(ordered.length / 2)
  const median = ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2
  const achievedCount = scores.filter((score) => score >= threshold).length
  return {
    learnerCount: scores.length,
    mean: roundOne(scores.reduce((sum, score) => sum + score, 0) / scores.length),
    median: roundOne(median),
    highest: ordered[ordered.length - 1],
    lowest: ordered[0],
    achievedCount,
    notAchievedCount: scores.length - achievedCount,
    achievementRate: roundOne((achievedCount / scores.length) * 100),
    threshold,
  }
}

function phaseForGrade(level: string, grade: string): string {
  if (level === "PAUD") return "Fondasi"
  if (level === "SD/MI") {
    if (["Kelas I", "Kelas II"].includes(grade)) return "Fase A"
    if (["Kelas III", "Kelas IV"].includes(grade)) return "Fase B"
    return "Fase C"
  }
  if (level === "SMP/MTs") return "Fase D"
  if (["SMA/MA", "SMK/MAK"].includes(level)) return grade === "Kelas X" ? "Fase E" : "Fase F"
  return ""
}

function readEvaluation(value: unknown): EvaluationResult | null {
  if (!isRecord(value)) return null
  const readStrings = (input: unknown): string[] => Array.isArray(input)
    ? input.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean)
    : []
  const actions = Array.isArray(value.actions)
    ? value.actions.filter(isRecord).map((action) => ({
        priority: typeof action.priority === "string" ? action.priority.trim() : "",
        action: typeof action.action === "string" ? action.action.trim() : "",
        evidenceToCheck: typeof action.evidenceToCheck === "string" ? action.evidenceToCheck.trim() : "",
      })).filter((action) => action.priority && action.action && action.evidenceToCheck)
    : []
  const result: EvaluationResult = {
    title: typeof value.title === "string" && value.title.trim() ? value.title.trim() : "Evaluasi Pembelajaran",
    overallInterpretation: typeof value.overallInterpretation === "string" ? value.overallInterpretation.trim() : "",
    strengths: readStrings(value.strengths),
    learningGaps: readStrings(value.learningGaps),
    possibleFactors: readStrings(value.possibleFactors),
    actions,
    studentFeedback: typeof value.studentFeedback === "string" ? value.studentFeedback.trim() : "",
    reflectionQuestions: readStrings(value.reflectionQuestions),
    nextAssessment: typeof value.nextAssessment === "string" ? value.nextAssessment.trim() : "",
  }
  if (!result.overallInterpretation || !result.strengths.length || !result.learningGaps.length || !result.possibleFactors.length || actions.length < 2 || !result.studentFeedback || !result.reflectionQuestions.length || !result.nextAssessment) return null
  return result
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

function csvCell(value: string | number): string {
  const safe = String(value).replace(/^[=+@-]/, "'$&")
  return `"${safe.replaceAll('"', '""')}"`
}

export default function AIEvaluasiPembelajaran({ onBack }: AIEvaluasiPembelajaranProps) {
  const [form, setForm] = useState<EvaluationForm>(() => ({ ...initialForm }))
  const [resultForm, setResultForm] = useState<EvaluationForm | null>(null)
  const [result, setResult] = useState<EvaluationResult | null>(null)
  const [summary, setSummary] = useState<EvaluationSummary | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingSaved, setIsLoadingSaved] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  const [savedDocumentId, setSavedDocumentId] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const generationInFlight = useRef(false)
  const grades = useMemo(() => gradeOptions[form.educationLevel] ?? [], [form.educationLevel])
  const parsedScores = useMemo(() => parseScoreLines(form.scoreText), [form.scoreText])
  const isFormComplete = Boolean(form.subject.trim() && form.topic.trim() && form.learningObjective.trim() && parsedScores.scores.length >= 2 && !parsedScores.error)

  function updateForm<Key extends keyof EvaluationForm>(key: Key, value: EvaluationForm[Key]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function loadSavedDocument() {
    setIsLoadingSaved(true)
    try {
      const { data, error } = await supabase.from("ai_documents").select("id,content").eq("document_type", "evaluasi_pembelajaran").order("updated_at", { ascending: false }).limit(1).maybeSingle()
      if (error) throw error
      if (!data) return
      setSavedDocumentId(data.id)
      const content = (data.content ?? {}) as SavedEvaluationContent
      const savedForm = { ...initialForm, ...(content.form ?? {}) }
      setForm(savedForm)
      const snapshot = { ...initialForm, ...(content.resultForm ?? content.form ?? {}) }
      if (content.resultForm || content.result) setResultForm(snapshot)
      const restored = readEvaluation(content.result)
      if (restored) {
        const scores = parseScoreLines(snapshot.scoreText)
        if (!scores.error) {
          setResult(restored)
          setSummary(calculateSummary(scores.scores, snapshot.threshold))
        }
      }
    } catch (error) {
      console.error("Load AI Evaluasi error:", error)
      setErrorMessage(error instanceof Error ? `Laporan tersimpan gagal dimuat: ${error.message}` : "Laporan tersimpan gagal dimuat.")
    } finally {
      setIsLoadingSaved(false)
    }
  }

  async function saveDocument(
    resultToSave: EvaluationResult | null = result,
    summaryToSave: EvaluationSummary | null = summary,
    resultFormToSave: EvaluationForm | null = resultForm,
  ): Promise<boolean> {
    if (!resultToSave || !summaryToSave || !resultFormToSave) return false
    if (!resultToSave.overallInterpretation.trim() || !resultToSave.strengths.some((item) => item.trim()) || !resultToSave.learningGaps.some((item) => item.trim()) || !resultToSave.possibleFactors.some((item) => item.trim()) || !resultToSave.reflectionQuestions.some((item) => item.trim()) || resultToSave.actions.length < 2 || resultToSave.actions.some((action) => !action.priority.trim() || !action.action.trim() || !action.evidenceToCheck.trim()) || !resultToSave.studentFeedback.trim() || !resultToSave.nextAssessment.trim()) {
      setErrorMessage("Lengkapi seluruh bagian laporan dan tindak lanjut sebelum menyimpan.")
      return false
    }
    setIsSaving(true)
    setErrorMessage("")
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      const userId = sessionData.session?.user?.id
      if (sessionError || !userId) throw new Error("Sesi login tidak ditemukan. Silakan masuk kembali.")
      const content = { form, resultForm: resultFormToSave, summary: summaryToSave, result: resultToSave }
      const title = resultToSave.title || resultFormToSave.topic || "Evaluasi Pembelajaran"
      if (savedDocumentId) {
        const { error } = await supabase.from("ai_documents").update({ title, content }).eq("id", savedDocumentId).eq("user_id", userId)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from("ai_documents").insert({ user_id: userId, document_type: "evaluasi_pembelajaran", title, content }).select("id").single()
        if (error) throw error
        setSavedDocumentId(data.id)
      }
      setMessage("Laporan evaluasi berhasil disimpan.")
      return true
    } catch (error) {
      console.error("Save AI Evaluasi error:", error)
      setErrorMessage(error instanceof Error ? `Laporan gagal disimpan: ${error.message}` : "Laporan gagal disimpan.")
      return false
    } finally {
      setIsSaving(false)
    }
  }

  useEffect(() => { void loadSavedDocument() }, [])

  async function generateEvaluation() {
    if (!isFormComplete) {
      setErrorMessage(parsedScores.error || "Lengkapi mata pelajaran, topik, tujuan pembelajaran, dan data nilai terlebih dahulu.")
      return
    }
    if (generationInFlight.current) return
    generationInFlight.current = true
    setIsGenerating(true)
    setErrorMessage("")
    setMessage("")
    const requestedForm = { ...form }
    const requestedScores = [...parsedScores.scores]
    const requestedSummary = calculateSummary(requestedScores, requestedForm.threshold)
    try {
      const input = {
        educationLevel: requestedForm.educationLevel,
        grade: requestedForm.grade,
        subject: requestedForm.subject,
        topic: requestedForm.topic,
        learningObjective: requestedForm.learningObjective,
        assessmentPurpose: requestedForm.assessmentPurpose,
        assessmentMethod: requestedForm.assessmentMethod,
        threshold: requestedForm.threshold,
        indicatorEvidence: requestedForm.indicatorEvidence,
        teacherNotes: requestedForm.teacherNotes,
      }
      const data = await invokeDinoAI<EvaluationResponse>("dinoai-evaluasi", {
        idempotencyKey: createIdempotencyKey(),
        ...input,
        phase: phaseForGrade(requestedForm.educationLevel, requestedForm.grade),
        scores: requestedScores,
      })
      const generated = readEvaluation(data?.evaluation)
      if (!data?.success || !generated) throw new Error(data?.error || "AI belum mengembalikan laporan evaluasi dengan struktur lengkap.")
      setResult(generated)
      setSummary(requestedSummary)
      setResultForm(requestedForm)
      setIsEditing(false)
      const saved = await saveDocument(generated, requestedSummary, requestedForm)
      const resultMessage = saved
        ? "Evaluasi selesai dan tersimpan. Gunakan hasil sebagai bahan refleksi; keputusan pembelajaran tetap disesuaikan dengan bukti kelas."
        : "Evaluasi selesai, tetapi belum tersimpan. Tekan Simpan untuk menyimpan laporan."
      setMessage(data.quotaWarning ? `${resultMessage} ${data.quotaWarning}` : resultMessage)
      window.scrollTo({ top: 0, behavior: "smooth" })
    } catch (error) {
      console.error("AI Evaluasi error:", error)
      setErrorMessage(error instanceof Error ? error.message : "Terjadi kesalahan saat mengevaluasi pembelajaran.")
    } finally {
      generationInFlight.current = false
      setIsGenerating(false)
    }
  }

  async function toggleEdit() {
    if (isEditing) {
      if (await saveDocument()) setIsEditing(false)
      return
    }
    setIsEditing(true)
  }

  async function deleteEvaluation() {
    if (!window.confirm("Hapus laporan evaluasi ini beserta semua data nilai yang tersimpan? Tindakan ini tidak dapat dibatalkan.")) return
    if (isSaving || isGenerating || isLoadingSaved) return
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
      setSummary(null)
      setIsEditing(false)
      setMessage("Laporan dihapus. Formulir siap digunakan untuk evaluasi baru.")
    } catch (error) {
      console.error("Delete AI Evaluasi error:", error)
      setErrorMessage(error instanceof Error ? `Laporan gagal dihapus: ${error.message}` : "Laporan gagal dihapus.")
    } finally {
      setIsDeleting(false)
    }
  }

  function downloadCsv() {
    if (!summary || !resultForm) return
    const scores = parseScoreLines(resultForm.scoreText).scores
    const rows: Array<Array<string | number>> = [
      ["Ringkasan evaluasi", result?.title ?? resultForm.topic],
      ["Jumlah peserta didik", summary.learnerCount],
      ["Rata-rata", summary.mean],
      ["Median", summary.median],
      ["Nilai tertinggi", summary.highest],
      ["Nilai terendah", summary.lowest],
      [`Mencapai KKTP (>= ${summary.threshold})`, summary.achievedCount],
      ["Belum mencapai KKTP", summary.notAchievedCount],
      ["Persentase mencapai KKTP", `${summary.achievementRate}%`],
      [],
      ["Peserta (anonim)", "Nilai", "Status ketercapaian"],
      ...scores.map((score, index) => [`Peserta ${index + 1}`, score, score >= summary.threshold ? "Mencapai KKTP" : "Belum mencapai KKTP"]),
    ]
    const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
    const link = document.createElement("a")
    link.href = url
    link.download = `${(result?.title || "evaluasi-pembelajaran").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "evaluasi-pembelajaran"}.csv`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
  }

  function updateList(key: "strengths" | "learningGaps" | "possibleFactors" | "reflectionQuestions", value: string) {
    setResult((current) => current ? { ...current, [key]: value.split("\n") } : current)
  }

  function updateAction(index: number, key: keyof FollowUpAction, value: string) {
    setResult((current) => current ? {
      ...current,
      actions: current.actions.map((action, actionIndex) => actionIndex === index ? { ...action, [key]: value } : action),
    } : current)
  }

  const displayedForm = resultForm ?? form
  const analysisLimit = displayedForm.indicatorEvidence.trim()
    ? "Interpretasi indikator mempertimbangkan ringkasan bukti yang diberikan. Periksa kembali kesesuaiannya dengan hasil kerja peserta didik."
    : "Data yang tersedia hanya nilai total; laporan tidak dapat memastikan miskonsepsi atau butir yang sulit. Gunakan ringkasan per indikator untuk analisis yang lebih spesifik."

  return (
    <div className="evaluation-page min-h-dvh bg-background text-foreground">
      <header className="evaluation-no-print sticky top-0 z-30 border-b border-border/50 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <button type="button" onClick={onBack} className="dino-button inline-flex shrink-0 items-center gap-2 rounded-full border border-border/60 bg-white/40 px-4 py-3 text-[14px] font-semibold backdrop-blur-xl dark:bg-white/5" aria-label="Kembali ke dashboard"><ArrowLeft className="h-4 w-4" />Kembali</button>
          <div className="flex min-w-0 items-center justify-end gap-2 text-right text-[14px] font-semibold"><img src="/logodino.PNG" alt="" className="h-4 w-4 shrink-0 object-contain" />AI Evaluasi Pembelajaran</div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 pb-20 pt-10 sm:px-6 sm:pt-14 lg:px-8">
        <section className="evaluation-no-print dino-enter mb-10">
          <div className="dino-glass relative overflow-hidden rounded-[32px] p-7 sm:p-10">
            <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[#EF629F]/10 blur-3xl" />
            <div className="relative max-w-3xl text-left">
              <div className="flex items-center gap-2 text-[14px] font-semibold text-[#EF629F]"><img src="/logodino.PNG" alt="" className="h-4 w-4 object-contain" />DinoEdu AI</div>
              <h1 className="dino-hero-title mt-4 text-3xl font-bold sm:text-5xl">Evaluasi pembelajaran<span className="block bg-gradient-to-r from-[#EECDA3] to-[#EF629F] bg-clip-text pb-1 text-transparent">berbasis bukti kelas</span></h1>
              <p className="mt-4 max-w-2xl text-[18px] leading-relaxed text-muted-foreground">Ringkas capaian belajar, pahami kebutuhan kelas, lalu siapkan umpan balik dan langkah pembelajaran berikutnya.</p>
            </div>
          </div>
        </section>

        <div className="evaluation-no-print grid gap-6 lg:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.1fr)]">
          <section className="dino-glass h-fit rounded-[28px] p-5 sm:p-7">
            <div className="mb-7 flex items-start gap-3">
              <div className="dino-gradient flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg"><BarChart3 className="h-5 w-5" /></div>
              <div><p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-[#EF629F]">Data evaluasi</p><h2 className="mt-1 text-xl font-bold">Konteks dan capaian</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">Statistik dihitung dari nilai yang dimasukkan; AI membantu menafsirkan dan merancang tindak lanjut.</p></div>
            </div>

            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div><label className={fieldLabelClass} htmlFor="evaluation-level">Jenjang</label><select id="evaluation-level" className={selectClass} value={form.educationLevel} onChange={(event) => { const next = event.target.value; updateForm("educationLevel", next); updateForm("grade", (gradeOptions[next] ?? [""])[0]) }}>{Object.keys(gradeOptions).map((level) => <option key={level}>{level}</option>)}</select></div>
                <div><label className={fieldLabelClass} htmlFor="evaluation-grade">Kelas / kelompok</label><select id="evaluation-grade" className={selectClass} value={form.grade} onChange={(event) => updateForm("grade", event.target.value)}>{grades.map((grade) => <option key={grade}>{grade}</option>)}</select></div>
              </div>
              <div><label className={fieldLabelClass} htmlFor="evaluation-subject">Mata pelajaran</label><input id="evaluation-subject" className={fieldClass} value={form.subject} onChange={(event) => updateForm("subject", event.target.value)} maxLength={120} placeholder="Contoh: Matematika" /></div>
              <div><label className={fieldLabelClass} htmlFor="evaluation-topic">Materi / topik</label><input id="evaluation-topic" className={fieldClass} value={form.topic} onChange={(event) => updateForm("topic", event.target.value)} maxLength={160} placeholder="Contoh: Penjumlahan pecahan" /></div>
              <div><label className={fieldLabelClass} htmlFor="evaluation-objective">Tujuan pembelajaran</label><textarea id="evaluation-objective" className={fieldClass} rows={3} maxLength={1200} value={form.learningObjective} onChange={(event) => updateForm("learningObjective", event.target.value)} placeholder="Kompetensi apa yang sedang diperiksa?" /></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><label className={fieldLabelClass} htmlFor="evaluation-purpose">Tujuan asesmen</label><select id="evaluation-purpose" className={selectClass} value={form.assessmentPurpose} onChange={(event) => updateForm("assessmentPurpose", event.target.value)}><option>Diagnostik</option><option>Formatif</option><option>Sumatif</option></select></div>
                <div><label className={fieldLabelClass} htmlFor="evaluation-method">Teknik asesmen</label><select id="evaluation-method" className={selectClass} value={form.assessmentMethod} onChange={(event) => updateForm("assessmentMethod", event.target.value)}><option>Tes tertulis / kuis</option><option>Proyek / produk</option><option>Praktik / unjuk kerja</option><option>Observasi</option><option>Portofolio</option><option>Lainnya</option></select></div>
              </div>
              <div><label className={fieldLabelClass} htmlFor="evaluation-threshold">Batas ketercapaian / KKTP</label><div className="relative"><input id="evaluation-threshold" className={`${fieldClass} pr-14`} type="number" min={0} max={100} step={1} value={form.threshold} onChange={(event) => updateForm("threshold", Math.min(100, Math.max(0, Number(event.target.value))))} /><span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">/ 100</span></div><p className="mt-1 text-xs leading-5 text-muted-foreground">Nilai sama dengan atau di atas batas dihitung mencapai KKTP. Sesuaikan dengan ketetapan sekolah.</p></div>
              <div><label className={fieldLabelClass} htmlFor="evaluation-scores">Nilai peserta didik</label><textarea id="evaluation-scores" className={`${fieldClass} font-mono`} rows={7} maxLength={5000} value={form.scoreText} onChange={(event) => updateForm("scoreText", event.target.value)} placeholder={"Masukkan satu nilai per baris, tanpa nama.\n80\n65\n92\n74"} /><div className="mt-1 flex justify-between gap-3 text-xs leading-5 text-muted-foreground"><span>Angka 0–100; nilai desimal boleh memakai koma. Minimal 2 nilai.</span><span className="shrink-0">{parsedScores.scores.length} nilai</span></div>{form.scoreText.trim() && parsedScores.error && <p className="mt-1 text-xs text-red-600 dark:text-red-300">{parsedScores.error}</p>}</div>
              <div><label className={fieldLabelClass} htmlFor="evaluation-indicators">Ringkasan hasil per indikator / butir <span className="font-normal text-muted-foreground">(opsional)</span></label><textarea id="evaluation-indicators" className={fieldClass} rows={3} maxLength={2000} value={form.indicatorEvidence} onChange={(event) => updateForm("indicatorEvidence", event.target.value)} placeholder={"Contoh: Indikator A: 18 dari 25 siswa menjawab benar. Indikator B: 11 dari 25 siswa menjawab benar."} /><p className="mt-1 text-xs leading-5 text-muted-foreground">Tambahkan bukti ini agar analisis kesulitan belajar lebih spesifik.</p></div>
              <div><label className={fieldLabelClass} htmlFor="evaluation-notes">Catatan konteks kelas <span className="font-normal text-muted-foreground">(opsional)</span></label><textarea id="evaluation-notes" className={fieldClass} rows={2} maxLength={1000} value={form.teacherNotes} onChange={(event) => updateForm("teacherNotes", event.target.value)} placeholder="Misalnya kondisi pembelajaran atau dukungan yang sudah diberikan." /></div>

              <button type="button" disabled={!isFormComplete || isGenerating || isSaving || isLoadingSaved} onClick={() => void generateEvaluation()} className={`dino-gradient mt-10 flex w-full items-center justify-center rounded-2xl px-5 py-4 text-center text-[15px] font-semibold text-white shadow-lg shadow-pink-500/10 transition-all duration-200 ${isFormComplete && !isGenerating && !isSaving && !isLoadingSaved ? "dino-button" : "cursor-not-allowed opacity-50"}`}>
                <img src="/logodino.PNG" alt="" className="mr-2 h-4 w-4 object-contain" />
                {isGenerating ? "Sedang menganalisis capaian..." : "Buat Evaluasi dengan AI · 2 kredit"}
              </button>
              <p className="text-center text-[11px] leading-5 text-muted-foreground">Nilai dikirim tanpa nama. Jangan tuliskan identitas peserta didik di catatan. Tinjau hasil AI sebelum menjadi keputusan pembelajaran.</p>
              {(errorMessage || message) && <div role={errorMessage ? "alert" : "status"} className={`rounded-2xl border px-4 py-3 text-sm leading-6 ${errorMessage ? "border-red-500/25 bg-red-500/5 text-red-700 dark:text-red-300" : "border-emerald-500/25 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300"}`}>{errorMessage || message}</div>}
            </div>
          </section>

          <section className="min-w-0 space-y-5">
            <div className="evaluation-no-print flex flex-wrap items-end justify-between gap-4">
              <div><p className="text-[14px] font-semibold uppercase tracking-[0.18em] text-[#EF629F]">Preview</p><h2 className="mt-2 text-2xl font-bold">Laporan evaluasi</h2></div>
              {result && <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => void deleteEvaluation()} disabled={isDeleting || isSaving || isGenerating || isLoadingSaved} className="inline-flex items-center gap-2 rounded-full border border-red-500/25 bg-red-500/5 px-3 py-2 text-[13px] font-semibold text-red-600 disabled:opacity-50"><Trash2 className="h-4 w-4" />Hapus</button>
                <button type="button" onClick={() => void toggleEdit()} disabled={isSaving || isDeleting} className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-white/40 px-3 py-2 text-[13px] font-semibold backdrop-blur-xl dark:bg-white/5">{isEditing ? <Check className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}{isEditing ? "Simpan edit" : "Edit"}</button>
                <button type="button" onClick={() => void saveDocument()} disabled={isSaving || isDeleting} className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-white/40 px-3 py-2 text-[13px] font-semibold backdrop-blur-xl dark:bg-white/5"><Save className="h-4 w-4" />{isSaving ? "Menyimpan..." : "Simpan"}</button>
                <button type="button" onClick={() => window.print()} className="dino-gradient inline-flex items-center gap-2 rounded-full px-3 py-2 text-[13px] font-semibold text-white"><Printer className="h-4 w-4" />Cetak / PDF</button>
                <button type="button" onClick={downloadCsv} className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-white/40 px-3 py-2 text-[13px] font-semibold backdrop-blur-xl dark:bg-white/5"><FileDown className="h-4 w-4" />CSV</button>
              </div>}
            </div>

            {isLoadingSaved ? <div className="dino-glass flex min-h-96 items-center justify-center rounded-[28px] text-sm text-muted-foreground"><LoaderCircle className="mr-2 h-4 w-4 animate-spin" />Memuat evaluasi tersimpan...</div> : result && summary ? (
              <div id="evaluation-print-document" className="evaluation-print-document space-y-5">
                <header className="dino-glass rounded-[28px] p-5 sm:p-7">
                  <div className="evaluation-print-brand">DinoEdu Space · Laporan evaluasi pembelajaran</div>
                  {isEditing ? <input aria-label="Judul laporan" className={`${fieldClass} mt-3 text-2xl font-bold`} value={result.title} onChange={(event) => setResult((current) => current ? { ...current, title: event.target.value } : current)} /> : <h2 className="mt-2 text-xl font-bold sm:text-2xl">{result.title}</h2>}
                  <p className="mt-2 text-xs text-muted-foreground">{displayedForm.educationLevel} · {displayedForm.grade}{phaseForGrade(displayedForm.educationLevel, displayedForm.grade) ? ` · ${phaseForGrade(displayedForm.educationLevel, displayedForm.grade)}` : ""} · {displayedForm.subject} · {displayedForm.assessmentPurpose}</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-border/60 bg-white/40 p-3 dark:bg-white/5"><p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Materi / topik</p><p className="mt-1 text-sm leading-6">{displayedForm.topic}</p></div>
                    <div className="rounded-2xl border border-border/60 bg-white/40 p-3 dark:bg-white/5"><p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Teknik asesmen</p><p className="mt-1 text-sm leading-6">{displayedForm.assessmentMethod}</p></div>
                    <div className="rounded-2xl border border-border/60 bg-white/40 p-3 dark:bg-white/5 sm:col-span-2"><p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Tujuan pembelajaran</p><p className="mt-1 text-sm leading-6">{displayedForm.learningObjective}</p></div>
                    {displayedForm.indicatorEvidence.trim() && <div className="rounded-2xl border border-border/60 bg-white/40 p-3 dark:bg-white/5 sm:col-span-2"><p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Bukti per indikator / butir</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6">{displayedForm.indicatorEvidence}</p></div>}
                    {displayedForm.teacherNotes.trim() && <div className="rounded-2xl border border-border/60 bg-white/40 p-3 dark:bg-white/5 sm:col-span-2"><p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Catatan konteks kelas</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6">{displayedForm.teacherNotes}</p></div>}
                  </div>
                  <p className="mt-4 text-sm leading-7 text-muted-foreground">{isEditing ? <textarea aria-label="Interpretasi umum" className={fieldClass} rows={4} value={result.overallInterpretation} onChange={(event) => setResult((current) => current ? { ...current, overallInterpretation: event.target.value } : current)} /> : result.overallInterpretation}</p>
                  <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[["Jumlah peserta", summary.learnerCount], ["Rata-rata", summary.mean], ["Median", summary.median], ["Mencapai KKTP", `${summary.achievedCount}/${summary.learnerCount} · ${summary.achievementRate}%`]].map(([label, value]) => <div key={label} className="rounded-2xl border border-border/60 bg-white/40 p-3 dark:bg-white/5"><p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 text-lg font-bold">{value}</p></div>)}
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">Nilai tertinggi {summary.highest} · terendah {summary.lowest} · batas KKTP {summary.threshold}. Statistik dihitung otomatis dari data nilai.</p>
                </header>

                <div className="grid gap-5 sm:grid-cols-2">
                  {([
                    ["Kekuatan yang terlihat", "strengths", result.strengths],
                    ["Kebutuhan belajar", "learningGaps", result.learningGaps],
                    ["Faktor yang perlu diperiksa", "possibleFactors", result.possibleFactors],
                    ["Pertanyaan refleksi guru", "reflectionQuestions", result.reflectionQuestions],
                  ] as const).map(([title, key, items]) => <section key={key} className="dino-glass rounded-[28px] p-5 sm:p-6"><h3 className="text-base font-bold">{title}</h3>{isEditing ? <textarea className={`${fieldClass} mt-3`} rows={5} value={items.join("\n")} onChange={(event) => updateList(key, event.target.value)} /> : <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-muted-foreground">{items.map((item, index) => <li key={index}>{item}</li>)}</ul>}{key === "possibleFactors" && <p className="mt-3 text-[11px] leading-5 text-muted-foreground">Ini hipotesis untuk diperiksa, bukan penyebab yang dibuktikan oleh nilai.</p>}</section>)}
                </div>

                <section className="dino-glass rounded-[28px] p-5 sm:p-6">
                  <h3 className="text-base font-bold">Rencana tindak lanjut pembelajaran</h3>
                  <div className="mt-3 space-y-3">{result.actions.map((action, index) => <article key={index} className="rounded-2xl border border-border/60 bg-white/40 p-4 dark:bg-white/5">
                    {isEditing ? <div className="space-y-3"><input aria-label={`Prioritas tindak lanjut ${index + 1}`} className={fieldClass} value={action.priority} onChange={(event) => updateAction(index, "priority", event.target.value)} /><textarea aria-label={`Langkah tindak lanjut ${index + 1}`} className={fieldClass} rows={3} value={action.action} onChange={(event) => updateAction(index, "action", event.target.value)} /><textarea aria-label={`Bukti evaluasi tindak lanjut ${index + 1}`} className={fieldClass} rows={2} value={action.evidenceToCheck} onChange={(event) => updateAction(index, "evidenceToCheck", event.target.value)} /></div> : <><p className="text-xs font-bold uppercase tracking-wide text-[#EF629F]">{action.priority}</p><p className="mt-1 text-sm leading-6">{action.action}</p><p className="mt-2 text-xs leading-5 text-muted-foreground"><strong className="text-foreground">Bukti yang diperiksa:</strong> {action.evidenceToCheck}</p></>}
                  </article>)}</div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-[#EF629F]/20 bg-[#EF629F]/5 p-4"><h4 className="text-sm font-bold">Umpan balik untuk peserta didik</h4>{isEditing ? <textarea className={`${fieldClass} mt-2`} rows={4} value={result.studentFeedback} onChange={(event) => setResult((current) => current ? { ...current, studentFeedback: event.target.value } : current)} /> : <p className="mt-2 text-sm leading-6 text-muted-foreground">{result.studentFeedback}</p>}</div>
                    <div className="rounded-2xl border border-border/60 bg-white/40 p-4 dark:bg-white/5"><h4 className="text-sm font-bold">Pemeriksaan berikutnya</h4>{isEditing ? <textarea className={`${fieldClass} mt-2`} rows={4} value={result.nextAssessment} onChange={(event) => setResult((current) => current ? { ...current, nextAssessment: event.target.value } : current)} /> : <p className="mt-2 text-sm leading-6 text-muted-foreground">{result.nextAssessment}</p>}</div>
                  </div>
                  <div className="evaluation-no-print mt-5 flex flex-wrap gap-2 border-t border-border/60 pt-4"><button type="button" onClick={() => void saveDocument()} disabled={isSaving || isDeleting} className="dino-gradient inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-bold text-white"><Save className="h-3.5 w-3.5" />{isSaving ? "Menyimpan..." : "Simpan laporan"}</button><button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-full border border-border/70 px-4 py-2.5 text-xs font-semibold hover:bg-muted"><Printer className="h-3.5 w-3.5" />Cetak / PDF</button></div>
                </section>

                <aside className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs leading-6 text-muted-foreground"><strong className="text-foreground">Batas interpretasi data:</strong> {analysisLimit} Rekomendasi AI adalah bahan pertimbangan dan perlu ditinjau guru.</aside>
              </div>
            ) : (
              <div className="dino-glass flex min-h-[560px] items-center justify-center rounded-[28px] p-7 text-center"><div className="max-w-sm"><div className="dino-gradient mx-auto flex h-16 w-16 items-center justify-center rounded-3xl text-white"><BarChart3 className="h-7 w-7" /></div><h2 className="mt-5 text-xl font-bold">Laporan siap dianalisis</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Masukkan tujuan belajar dan nilai anonim. Hasil mencakup statistik kelas, interpretasi, umpan balik, serta tindak lanjut.</p><div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground"><Download className="h-3.5 w-3.5" />Laporan dapat dicetak dan diekspor ke CSV</div></div></div>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}
