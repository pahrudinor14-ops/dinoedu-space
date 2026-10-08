import {
  useEffect,
  useMemo,
  useState } from "react"

import {

  ArrowLeft,
  BookOpen,
  Check,
  Download,
  FileQuestion,
  Pencil,
  Plus,
  Trash2,
  Save,
} from "lucide-react"

import { supabase } from "../lib/supabase"

interface AIPembuatSoalProps {

  onBack: () => void

}

type CognitiveLevel = "LOTS" | "MOTS" | "HOTS"

type QuestionType =

  | "Pilihan Ganda"

  | "Pilihan Ganda Kompleks"

  | "Benar / Salah"

  | "Isian Singkat"

  | "Uraian"

interface QuestionItem {

  number: number

  type: QuestionType

  cognitiveLevel: CognitiveLevel

  question: string

  options: string[]

  answer: string

  explanation: string

}

interface BlueprintItem {

  indicator: string

  material: string

  cognitiveLevel: string

}

interface QuizResult {

  title: string

  instructions: string

  questions: QuestionItem[]

  blueprint: BlueprintItem[]

}

const QUESTION_TYPES: Array<QuestionType | "Campuran"> = [

  "Pilihan Ganda",

  "Pilihan Ganda Kompleks",

  "Benar / Salah",

  "Isian Singkat",

  "Uraian",

  "Campuran",

]

function normalizeQuestionType(value: unknown): QuestionType {

  if (value === "Pilihan Ganda Kompleks") return value

  if (value === "Benar / Salah") return value

  if (value === "Isian Singkat") return value

  if (value === "Uraian") return value

  return "Pilihan Ganda"

}

function normalizeCognitiveLevel(value: unknown): CognitiveLevel {

  if (value === "HOTS") return "HOTS"

  if (value === "LOTS") return "LOTS"

  return "MOTS"

}

function normalizeQuestion(item: unknown, index: number): QuestionItem {

  const source = item as Record<string, unknown> | null

  return {

    number: index + 1,

    type: normalizeQuestionType(source?.type),

    cognitiveLevel: normalizeCognitiveLevel(source?.cognitiveLevel),

    question: typeof source?.question === "string" ? source.question : "",

    options: Array.isArray(source?.options)

      ? source.options.filter((value): value is string => typeof value === "string").slice(0, 5)

      : [],

    answer: typeof source?.answer === "string" ? source.answer : "",

    explanation: typeof source?.explanation === "string" ? source.explanation : "",

  }

}

function normalizeQuiz(value: unknown): QuizResult {

  const source = value as Record<string, unknown> | null

  const rawQuestions = Array.isArray(source?.questions)

    ? source.questions

    : []

  const rawBlueprint = Array.isArray(source?.blueprint)

    ? source.blueprint

    : []

  return {

    title: typeof source?.title === "string" ? source.title : "Latihan Soal",

    instructions:

      typeof source?.instructions === "string"

        ? source.instructions

        : "Bacalah setiap soal dengan teliti lalu pilih atau tuliskan jawaban yang paling tepat",

    questions: rawQuestions.map(normalizeQuestion).slice(0, 20),

    blueprint: rawBlueprint

      .map((item) => {

        const row = item as Record<string, unknown> | null

        return {

          indicator: typeof row?.indicator === "string" ? row.indicator : "",

          material: typeof row?.material === "string" ? row.material : "",

          cognitiveLevel:

            typeof row?.cognitiveLevel === "string" ? row.cognitiveLevel : "",

        }

      })

      .filter((item) => item.indicator || item.material || item.cognitiveLevel),

  }

}

export default function AIPembuatSoal({ onBack }: AIPembuatSoalProps) {

  const [level, setLevel] = useState("SD")

  const [grade, setGrade] = useState("Kelas IV")

  const [subject, setSubject] = useState("")

  const [topic, setTopic] = useState("")

  const [learningObjective, setLearningObjective] = useState("")

  const [cognitiveLevel, setCognitiveLevel] = useState<CognitiveLevel | "Campuran">("Campuran")

  const [questionType, setQuestionType] = useState<QuestionType | "Campuran">("Pilihan Ganda")

  const [questionCount, setQuestionCount] = useState("10")

  const [context, setContext] = useState("")

  const [message, setMessage] = useState("")

  const [aiLoading, setAiLoading] = useState(false)

  const [aiError, setAiError] = useState("")

  const [quizResult, setQuizResult] = useState<QuizResult | null>(null)

  const [isEditingResult, setIsEditingResult] = useState(false)
  const [savedDocumentId, setSavedDocumentId] = useState<string | null>(null)
  const [isLoadingSaved, setIsLoadingSaved] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const isFormComplete = useMemo(

    () =>

      level.trim() !== "" &&

      grade.trim() !== "" &&

      subject.trim() !== "" &&

      topic.trim() !== "",

    [level, grade, subject, topic],

  )

    const buildDocumentContent = (result: QuizResult | null = quizResult) => ({
    form: { level, grade, subject, topic, learningObjective, cognitiveLevel, questionType, questionCount, context },
    result,
  })

  async function loadSavedDocument() {
    setIsLoadingSaved(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const userId = sessionData.session?.user?.id
      if (!userId) return
      const { data, error } = await supabase.from("ai_documents").select("id,content,updated_at").eq("user_id", userId).eq("document_type", "soal").order("updated_at", { ascending: false }).limit(1).maybeSingle()
      if (error) throw error
      if (!data) return
      setSavedDocumentId(data.id)
      const content = data.content as { form?: Record<string, unknown>; result?: QuizResult | null }
      const form = content?.form
      if (form) {
        if (typeof form.level === "string") setLevel(form.level)
        if (typeof form.grade === "string") setGrade(form.grade)
        if (typeof form.subject === "string") setSubject(form.subject)
        if (typeof form.topic === "string") setTopic(form.topic)
        if (typeof form.learningObjective === "string") setLearningObjective(form.learningObjective)
        if (typeof form.cognitiveLevel === "string") setCognitiveLevel(form.cognitiveLevel as CognitiveLevel | "Campuran")
        if (typeof form.questionType === "string") setQuestionType(form.questionType as QuestionType | "Campuran")
        if (typeof form.questionCount === "string") setQuestionCount(form.questionCount)
        if (typeof form.context === "string") setContext(form.context)
      }
      if (content?.result) setQuizResult(normalizeQuiz(content.result))
    } catch (error) {
      console.error("Load saved quiz error:", error)
    } finally {
      setIsLoadingSaved(false)
    }
  }

  async function saveDocument(resultToSave: QuizResult | null = quizResult) {
    if (!resultToSave) return
    setIsSaving(true)
    setAiError("")
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      const userId = sessionData.session?.user?.id
      if (sessionError || !userId) throw new Error("Session login tidak ditemukan. Silakan login kembali.")
      const title = resultToSave.title || `Soal ${subject || "Latihan"}${topic ? ` · ${topic}` : ""}`
      const content = buildDocumentContent(resultToSave)
      if (savedDocumentId) {
        const { error } = await supabase.from("ai_documents").update({ title, content }).eq("id", savedDocumentId).eq("user_id", userId)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from("ai_documents").insert({ user_id: userId, document_type: "soal", title, content }).select("id").single()
        if (error) throw error
        setSavedDocumentId(data.id)
      }
      setMessage("Soal berhasil disimpan")
    } catch (error) {
      console.error("Save quiz error:", error)
      setAiError(error instanceof Error ? error.message : "Soal gagal disimpan")
    } finally {
      setIsSaving(false)
    }
  }

  useEffect(() => {
    void loadSavedDocument()
  }, [])

  useEffect(() => {
    if (isLoadingSaved) return
  }, [isLoadingSaved])

async function handleGenerateQuestions() {

    if (!isFormComplete) {

      setMessage("Lengkapi jenjang, kelas, mata pelajaran, dan materi terlebih dahulu")

      return

    }

    setAiLoading(true)

    setAiError("")

    setMessage("")

    try {

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !sessionData.session?.access_token) {

        throw new Error("Session login tidak ditemukan. Silakan login kembali")

      }

      const accessToken = sessionData.session.access_token

      const { data, error } = await supabase.functions.invoke("dinoai-soal", {

        headers: {

          Authorization: `Bearer ${accessToken}`,

        },

        body: {

          level,

          grade,

          subject,

          topic,

          learningObjective,

          cognitiveLevel,

          questionType,

          questionCount: Number(questionCount),

          context,

        },

      })

      if (error) {

        let backendMessage = ""

        if (typeof error === "object" && error !== null && "context" in error) {

          const response = (error as { context?: unknown }).context

          if (response instanceof Response) {

            const body: unknown = await response.clone().json().catch(() => null)

            if (

              typeof body === "object" &&

              body !== null &&

              "error" in body &&

              typeof body.error === "string"

            ) {

              backendMessage = body.error

            }

          }

        }

        throw new Error(

          backendMessage || error.message || "AI Pembuat Soal gagal memproses data",

        )

      }

      if (!data?.success || !data?.quiz) {

        throw new Error("Respons dinoai-soal tidak sesuai")

      }

      const normalized = normalizeQuiz(data.quiz)

      if (normalized.questions.length !== Number(questionCount)) {

        throw new Error(

          `AI menghasilkan ${normalized.questions.length} soal, padahal diminta ${questionCount} soal. Silakan coba lagi`,

        )

      }
      setQuizResult(normalized)
      await saveDocument(normalized)
      setMessage(

        `Soal berhasil dibuat dengan bantuan AI menggunakan 2 kredit. Silakan periksa dan edit hasilnya`,

      )

    } catch (error) {

      console.error("AI Pembuat Soal error:", error)

      setQuizResult(null)

      setAiError(

        error instanceof Error

          ? error.message

          : "Terjadi kesalahan saat membuat soal dengan AI",

      )

    } finally {

      setAiLoading(false)

    }

  }

  async function handleEditToggle() {
    if (isEditingResult) {
      setIsEditingResult(false)
      await saveDocument()
      return
    }
    setIsEditingResult(true)
  }

  function updateQuestion(index: number, field: keyof QuestionItem, value: string | string[]) {

    setQuizResult((current) => {

      if (!current) return current

      return {

        ...current,

        questions: current.questions.map((item, itemIndex) =>

          itemIndex === index ? { ...item, [field]: value } : item,

        ),

      }

    })

  }

  function updateOption(questionIndex: number, optionIndex: number, value: string) {

    setQuizResult((current) => {

      if (!current) return current

      return {

        ...current,

        questions: current.questions.map((item, itemIndex) => {

          if (itemIndex !== questionIndex) return item

          const options = [...item.options]

          options[optionIndex] = value

          return { ...item, options }

        }),

      }

    })

  }

  function addOption(questionIndex: number) {

    setQuizResult((current) => {

      if (!current) return current

      return {

        ...current,

        questions: current.questions.map((item, itemIndex) => {

          if (itemIndex !== questionIndex || item.options.length >= 5) return item

          return { ...item, options: [...item.options, ""] }

        }),

      }

    })

  }

  function removeQuestion(index: number) {

    setQuizResult((current) => {

      if (!current || current.questions.length <= 1) return current

      return {

        ...current,

        questions: current.questions

          .filter((_, itemIndex) => itemIndex !== index)

          .map((item, itemIndex) => ({ ...item, number: itemIndex + 1 })),

      }

    })

  }

  function addQuestion() {

    setQuizResult((current) => {

      if (!current || current.questions.length >= 20) return current

      return {

        ...current,

        questions: [

          ...current.questions,

          {

            number: current.questions.length + 1,

            type: "Pilihan Ganda",

            cognitiveLevel: "MOTS",

            question: "",

            options: ["", "", "", ""],

            answer: "",

            explanation: "",

          },

        ],

      }

    })

  }

  function printQuestions() {

    window.print()

  }

  return (

    <div className="modal-scrollbar-hidden min-h-dvh overflow-x-hidden overflow-y-auto bg-background text-foreground">

      <style>{`        select,

        select option {

          background-color: #FFFFFF !important;

          color: #2B2729 !important;

        }

        select option:checked {

          background-color: #EF629F !important;

          color: #FFFFFF !important;

        }

        .dark select,

        html.dark select {

          color-scheme: dark !important;

          background-color: #1D191F !important;

          color: #F8F4F5 !important;

        }

        .dark select option,

        html.dark select option {

          background-color: #1D191F !important;

          color: #F8F4F5 !important;

          -webkit-text-fill-color: #F8F4F5 !important;

        }

        .dark select option:checked,

        html.dark select option:checked {

          background-color: #EF629F !important;

          color: #FFFFFF !important;

          -webkit-text-fill-color: #FFFFFF !important;

        }

@media print {

          @page { size: A4; margin: 12mm; }

          html, body {

            width: 100% !important;

            min-height: 0 !important;

            background: #ffffff !important;

          }

          body \* { visibility: hidden !important; }

          .question-print-area,

          .question-print-area \* { visibility: visible !important; }

          .question-print-area {

            position: absolute !important;

            top: 0 !important;

            left: 0 !important;

            width: 100% !important;

            margin: 0 !important;

            padding: 0 !important;

            background: #ffffff !important;

            color: #000000 !important;

            box-shadow: none !important;

            border: 0 !important;

          }

          .question-no-print { display: none !important; }

          .question-print-break {

            break-inside: avoid !important;

            page-break-inside: avoid !important;

          }

        }

      `}</style>

      {/* AI PEMBUAT SOAL BACKGROUND */}

      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">

        <div className="dino-float absolute left-[-140px] top-[100px] h-[320px] w-[320px] rounded-full bg-[#EECDA3]/25 blur-3xl" />

        <div className="dino-float-slow absolute right-[-120px] top-[180px] h-[360px] w-[360px] rounded-full bg-[#EF629F]/15 blur-3xl" />

      </div>

      <header className="question-no-print sticky top-0 z-50 border-b border-border/50 bg-background/70 backdrop-blur-xl">

        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-6 lg:px-8">

          <button

            type="button"

            onClick={onBack}

            className="dino-button inline-flex items-center gap-2 rounded-full border border-border/60 bg-white/40 px-4 py-3 text-[14px] font-semibold backdrop-blur-xl dark:bg-white/5"

          >

            <ArrowLeft className="h-4 w-4" />

            Kembali

          </button>

          <div className="flex items-center gap-2 text-[14px] font-semibold">

            <img

              src="/logodino.PNG"

              alt=""

              className="h-4 w-4 object-contain"

            />

            AI Pembuat Soal

          </div>

        </div>

      </header>

      <main className="mx-auto max-w-7xl px-5 pb-20 pt-10 sm:px-6 sm:pt-14 lg:px-8">

        <section className="question-no-print dino-enter mb-10">

          <div className="dino-glass relative overflow-hidden rounded-[32px] p-7 sm:p-10">

            <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[#EF629F]/10 blur-3xl" />

            <div className="relative max-w-3xl">

              <div className="flex items-center gap-2 text-[14px] font-semibold text-[#EF629F]">

                <img

                  src="/logodino.PNG"

                  alt=""

                  className="h-4 w-4 object-contain"

                />

                DinoEdu AI

              </div>

              <h1 className="mt-4 text-3xl font-bold tracking-normal sm:text-5xl">

                Buat soal pembelajaran

                <span className="block bg-gradient-to-r from-[#EECDA3] to-[#EF629F] bg-clip-text pb-1 text-transparent">

                  dengan bantuan AI

                </span>

              </h1>

              <p className="mt-4 max-w-2xl text-[18px] leading-relaxed text-muted-foreground">

                Tentukan jumlah soal, tingkat kognitif, dan bentuk soal lalu DinoAI membantu menyusun soal, kisi-kisi, kunci jawaban, dan pembahasan

              </p>

            </div>

          </div>

        </section>

        <section>

          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">

            <div className="question-no-print dino-glass rounded-[32px] p-6 sm:p-8">

              <div className="mb-8">

                <p className="text-[14px] font-semibold uppercase tracking-[0.18em] text-[#EF629F]">

                  Input soal

                </p>

                <h2 className="mt-2 text-2xl font-bold">Rancang latihan</h2>

              </div>

              <div className="space-y-5">

                <div className="grid gap-5 sm:grid-cols-2">

                  <div>

                    <label className="mb-2 block text-[14px] font-medium">Jenjang</label>

                    <select

                      value={level}

                      onChange={(event) => setLevel(event.target.value)}

                      className="w-full rounded-2xl border border-border/70 bg-white/40 px-4 py-3.5 text-[17px] outline-none backdrop-blur-xl dark:bg-white/5"

                    >

                      <option>SD</option>

                      <option>SMP</option>

                      <option>SMA</option>

                      <option>Umum</option>

                    </select>

                  </div>

                  <div>

                    <label className="mb-2 block text-[14px] font-medium">Kelas</label>

                    <select

                      value={grade}

                      onChange={(event) => setGrade(event.target.value)}

                      className="w-full rounded-2xl border border-border/70 bg-white/40 px-4 py-3.5 text-[17px] outline-none backdrop-blur-xl dark:bg-white/5"

                    >

                      <option>Kelas I</option>

                      <option>Kelas II</option>

                      <option>Kelas III</option>

                      <option>Kelas IV</option>

                      <option>Kelas V</option>

                      <option>Kelas VI</option>

                      <option>Kelas VII</option>

                      <option>Kelas VIII</option>

                      <option>Kelas IX</option>

                      <option>Kelas X</option>

                      <option>Kelas XI</option>

                      <option>Kelas XII</option>

                    </select>

                  </div>

                </div>

                <div>

                  <label className="mb-2 block text-[14px] font-medium">Mata pelajaran</label>

                  <div className="relative">

                    <BookOpen className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                    <input

                      value={subject}

                      onChange={(event) => setSubject(event.target.value)}

                      placeholder="Contoh: Matematika"

                      className="w-full rounded-2xl border border-border/70 bg-white/40 py-3.5 pl-11 pr-4 text-[17px] outline-none backdrop-blur-xl dark:bg-white/5"

                    />

                  </div>

                </div>

                <div>

                  <label className="mb-2 block text-[14px] font-medium">Materi / topik</label>

                  <input

                    value={topic}

                    onChange={(event) => setTopic(event.target.value)}

                    placeholder="Contoh: Operasi penjumlahan dan pengurangan pecahan"

                    className="w-full rounded-2xl border border-border/70 bg-white/40 px-4 py-3.5 text-[17px] outline-none backdrop-blur-xl dark:bg-white/5"

                  />

                </div>

                <div>

                  <label className="mb-2 block text-[14px] font-medium">Tujuan pembelajaran</label>

                  <textarea

                    rows={3}

                    value={learningObjective}

                    onChange={(event) => setLearningObjective(event.target.value)}

                    placeholder="Contoh: Siswa mampu menyelesaikan operasi pecahan dengan tepat"

                    className="modal-scrollbar-hidden w-full resize-none rounded-2xl border border-border/70 bg-white/40 px-4 py-3.5 text-[17px] leading-7 outline-none backdrop-blur-xl dark:bg-white/5"

                  />

                </div>

                <div className="grid gap-5 sm:grid-cols-2">

                  <div>

                    <label className="mb-2 block text-[14px] font-medium">Tingkat kognitif</label>

                    <select

                      value={cognitiveLevel}

                      onChange={(event) =>

                        setCognitiveLevel(event.target.value as CognitiveLevel | "Campuran")

                      }

                      className="w-full rounded-2xl border border-border/70 bg-white/40 px-4 py-3.5 text-[17px] outline-none backdrop-blur-xl dark:bg-white/5"

                    >

                      <option>LOTS</option>

                      <option>MOTS</option>

                      <option>HOTS</option>

                      <option>Campuran</option>

                    </select>

                    <p className="mt-2 text-[12px] leading-5 text-muted-foreground">

                      Pilih LOTS, MOTS, HOTS, atau campuran ketiganya

                    </p>

                  </div>

                  <div>

                    <label className="mb-2 block text-[14px] font-medium">Bentuk soal</label>

                    <select

                      value={questionType}

                      onChange={(event) =>

                        setQuestionType(event.target.value as QuestionType | "Campuran")

                      }

                      className="w-full rounded-2xl border border-border/70 bg-white/40 px-4 py-3.5 text-[17px] outline-none backdrop-blur-xl dark:bg-white/5"

                    >

                      {QUESTION_TYPES.map((type) => (

                        <option key={type}>{type}</option>

                      ))}

                    </select>

                  </div>

                </div>

                <div className="grid gap-5 sm:grid-cols-2">

                  <div>

                    <label className="mb-2 block text-[14px] font-medium">Jumlah soal</label>

                    <select

                      value={questionCount}

                      onChange={(event) => setQuestionCount(event.target.value)}

                      className="w-full rounded-2xl border border-border/70 bg-white/40 px-4 py-3.5 text-[17px] outline-none backdrop-blur-xl dark:bg-white/5"

                    >

                      <option value="5">5 soal</option>

                      <option value="10">10 soal</option>

                      <option value="15">15 soal</option>

                      <option value="20">20 soal</option>

                    </select>

                  </div>

                  <div>

                    <label className="mb-2 block text-[14px] font-medium">Konteks tambahan</label>

                    <input

                      value={context}

                      onChange={(event) => setContext(event.target.value)}

                      placeholder="Opsional"

                      className="w-full rounded-2xl border border-border/70 bg-white/40 px-4 py-3.5 text-[17px] outline-none backdrop-blur-xl dark:bg-white/5"

                    />

                  </div>

                </div>

              </div>

              <button

                type="button"

                onClick={handleGenerateQuestions}

                disabled={!isFormComplete || aiLoading}

                className={`dino-gradient mt-10 flex w-full items-center justify-center rounded-2xl px-5 py-4 text-[15px] font-semibold text-white shadow-lg shadow-pink-500/10 transition-all duration-200 ${

                  isFormComplete && !aiLoading

                    ? "dino-button"

                    : "cursor-not-allowed opacity-50"

                }`}

              >

                <img

                  src="/logodino.PNG"

                  alt=""

                  className="mr-2 h-4 w-4 object-contain"

                />

                {aiLoading

                  ? "Sedang membuat soal..."

                  : "Buat Soal dengan AI · 2 kredit"}

              </button>

              {message && (

                <div className="mt-4 rounded-2xl border border-[#EF629F]/20 bg-[#EF629F]/5 px-4 py-3 text-center text-[13px] leading-6 text-muted-foreground">

                  {message}

                </div>

              )}

              {aiError && (

                <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-center text-[13px] leading-6 text-red-500">

                  {aiError}

                </div>

              )}

              <p className="mt-3 text-center text-[12px] text-muted-foreground">

                Pembuatan soal menggunakan 2 kredit AI setelah hasil berhasil dibuat

              </p>

            </div>

            <div className="lg:sticky lg:top-28 lg:self-start">

              <div className="question-no-print mb-4 flex items-end justify-between gap-4">

                <div>

                  <p className="text-[14px] font-semibold uppercase tracking-[0.18em] text-[#EF629F]">

                    Preview

                  </p>

                  <h2 className="mt-2 text-2xl font-bold">Hasil soal</h2>

                </div>

                {quizResult && (

                  <div className="flex gap-2">

                    <button

                      type="button"

                      onClick={() => void handleEditToggle()}

                      className="dino-button inline-flex items-center gap-2 rounded-full border border-border/60 bg-white/40 px-3 py-2 text-[13px] font-semibold backdrop-blur-xl dark:bg-white/5"

                    >

                      {isEditingResult ? (

                        <Check className="h-4 w-4" />

                      ) : (

                        <Pencil className="h-4 w-4" />

                      )}

                      {isEditingResult ? "Selesai edit" : "Edit hasil"}

                    </button>                      <button
                        type="button"
                        onClick={() => void saveDocument()}
                        disabled={isSaving || !quizResult}
                        className="dino-button inline-flex items-center gap-2 rounded-full border border-border/60 bg-white/40 px-3 py-2 text-[13px] font-semibold backdrop-blur-xl dark:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Save className="h-4 w-4" />
                        {isSaving ? "Menyimpan..." : "Simpan"}
                      </button>

                    <button

                      type="button"

                      onClick={printQuestions}

                      className="dino-gradient dino-button inline-flex items-center gap-2 rounded-full px-3 py-2 text-[13px] font-semibold text-white"

                    >

                      <Download className="h-4 w-4" />

                      PDF

                    </button>

                  </div>

                )}

              </div>

              <div className="dino-glass rounded-[32px] p-5 sm:p-7">

                {quizResult ? (

                  <div className="question-screen-card rounded-2xl border border-border/70 bg-card p-7 text-card-foreground shadow-xl sm:p-8">

                    <div className="border-b border-border pb-5">

                      {isEditingResult ? (

                        <input

                          value={quizResult.title}

                          onChange={(event) =>

                            setQuizResult((current) =>

                              current ? { ...current, title: event.target.value } : current,

                            )

                          }

                          className="w-full border-b border-border bg-transparent pb-2 text-xl font-bold text-foreground outline-none placeholder:text-muted-foreground"

                        />

                      ) : (

                        <h3 className="text-xl font-bold">{quizResult.title}</h3>

                      )}

                      <p className="mt-2 text-[12px] text-muted-foreground">

                        {level} • {grade} • {subject || "Mata Pelajaran"} • {topic}

                      </p>

                      {isEditingResult ? (

                        <textarea

                          rows={3}

                          value={quizResult.instructions}

                          onChange={(event) =>

                            setQuizResult((current) =>

                              current ? { ...current, instructions: event.target.value } : current,

                            )

                          }

                          className="mt-4 w-full rounded-xl border border-border bg-background/60 p-3 text-[12px] leading-5 text-foreground outline-none placeholder:text-muted-foreground dark:bg-white/5"

                        />

                      ) : (

                        <p className="mt-4 text-[12px] leading-5 text-muted-foreground">

                          {quizResult.instructions}

                        </p>

                      )}

                    </div>

                    <div className="question-print-area mt-7 space-y-6">

                      {quizResult.questions.map((item, index) => (

                        <article key={`${item.number}-${index}`} className="question-print-break border-b border-border pb-5 last:border-0">

                          <div className="mb-2 flex items-start justify-between gap-3">

                            <div className="flex items-center gap-2">

                              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">

                                Soal {item.number}

                              </p>

                              <span className="question-no-print rounded-full border border-border bg-muted px-2 py-1 text-[10px] font-semibold text-muted-foreground">

                                {item.type}

                              </span>

                              <span className="question-no-print rounded-full bg-[#EF629F]/10 px-2 py-1 text-[10px] font-semibold text-[#EF629F]">

                                {item.cognitiveLevel}

                              </span>

                            </div>

                            {isEditingResult && quizResult.questions.length > 1 && (

                              <button

                                type="button"

                                onClick={() => removeQuestion(index)}

                                className="question-no-print inline-flex items-center gap-1 text-[11px] font-semibold text-red-500"

                              >

                                <Trash2 className="h-3.5 w-3.5" />

                                Hapus

                              </button>

                            )}

                          </div>

                          {isEditingResult ? (

                            <div className="space-y-3">

                              <textarea

                                rows={3}

                                value={item.question}

                                onChange={(event) => updateQuestion(index, "question", event.target.value)}

                                className="w-full rounded-xl border border-border bg-background/60 p-3 text-[13px] leading-6 text-foreground outline-none placeholder:text-muted-foreground dark:bg-white/5"

                              />

                              <div className="grid gap-3 sm:grid-cols-2">

                                <select

                                  value={item.type}

                                  onChange={(event) => updateQuestion(index, "type", event.target.value as QuestionType)}

                                  className="question-no-print rounded-xl border border-border bg-background/60 px-3 py-2 text-[12px] text-foreground outline-none dark:bg-white/5"

                                >

                                  {QUESTION_TYPES.filter((type): type is QuestionType => type !== "Campuran").map((type) => (

                                    <option key={type}>{type}</option>

                                  ))}

                                </select>

                                <select

                                  value={item.cognitiveLevel}

                                  onChange={(event) => updateQuestion(index, "cognitiveLevel", event.target.value as CognitiveLevel)}

                                  className="question-no-print rounded-xl border border-border bg-background/60 px-3 py-2 text-[12px] text-foreground outline-none dark:bg-white/5"

                                >

                                  <option>LOTS</option>

                                  <option>MOTS</option>

                                  <option>HOTS</option>

                                </select>

                              </div>

                            </div>

                          ) : (

                            <p className="text-[13px] font-medium leading-6 text-foreground">{item.question || "Pertanyaan belum diisi"}</p>

                          )}

                          {(item.type === "Pilihan Ganda" || item.type === "Pilihan Ganda Kompleks") && (

                            <div className="mt-3 space-y-2">

                              {item.options.map((option, optionIndex) => (

                                <div key={optionIndex} className="flex items-start gap-2 text-[12px] leading-5 text-foreground">

                                  <span className="shrink-0 font-semibold">

                                    {String.fromCharCode(65 + optionIndex)}.

                                  </span>

                                  {isEditingResult ? (

                                    <input

                                      value={option}

                                      onChange={(event) => updateOption(index, optionIndex, event.target.value)}

                                      className="min-w-0 flex-1 border-b border-border bg-transparent pb-1 text-foreground outline-none"

                                    />

                                  ) : (

                                    <span>{option || "Pilihan belum diisi"}</span>

                                  )}

                                </div>

                              ))}

                              {isEditingResult && item.options.length < 5 && (

                                <button

                                  type="button"

                                  onClick={() => addOption(index)}

                                  className="question-no-print inline-flex items-center gap-1 text-[11px] font-semibold text-[#EF629F]"

                                >

                                  <Plus className="h-3.5 w-3.5" />

                                  Tambah opsi

                                </button>

                              )}

                            </div>

                          )}

                          {isEditingResult ? (

                            <div className="question-no-print mt-3 space-y-3 rounded-xl border border-border/70 bg-muted/70 p-3 dark:bg-white/5">

                              <input

                                value={item.answer}

                                onChange={(event) => updateQuestion(index, "answer", event.target.value)}

                                placeholder="Kunci jawaban"

                                className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-[12px] text-foreground outline-none dark:bg-white/5"

                              />

                              <textarea

                                rows={2}

                                value={item.explanation}

                                onChange={(event) => updateQuestion(index, "explanation", event.target.value)}

                                placeholder="Pembahasan"

                                className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-[12px] text-foreground outline-none dark:bg-white/5"

                              />

                            </div>

                          ) : (

                            <div className="question-no-print mt-3 rounded-xl border border-border/70 bg-muted/70 p-3 text-[12px] leading-5 text-muted-foreground dark:bg-white/5">

                              <p>

                                <span className="font-semibold text-foreground">Kunci:</span> {item.answer || "Belum tersedia"}

                              </p>

                              {item.explanation && (

                                <p className="mt-1">

                                  <span className="font-semibold text-foreground">Pembahasan:</span> {item.explanation}

                                </p>

                              )}

                            </div>

                          )}

                        </article>

                      ))}

                    </div>

                    {isEditingResult && quizResult.questions.length < 20 && (

                      <button

                        type="button"

                        onClick={addQuestion}

                        className="question-no-print mt-5 inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-[12px] font-semibold text-foreground"

                      >

                        <Plus className="h-4 w-4" />

                        Tambah soal

                      </button>

                    )}

                    {quizResult.blueprint.length > 0 && (

                      <div className="question-no-print mt-8 border-t border-border pt-6">

                        <h4 className="text-[12px] font-bold uppercase tracking-[0.14em]">Kisi-kisi</h4>

                        <div className="mt-3 overflow-x-auto">

                          <table className="w-full min-w-[520px] border-collapse text-left text-[11px]">

                            <thead>

                              <tr className="border-b border-border">

                                <th className="px-2 py-2">Indikator</th>

                                <th className="px-2 py-2">Materi</th>

                                <th className="px-2 py-2">Level kognitif</th>

                              </tr>

                            </thead>

                            <tbody>

                              {quizResult.blueprint.map((item, index) => (

                                <tr key={index} className="border-b border-border/70 align-top">

                                  <td className="px-2 py-2">{item.indicator}</td>

                                  <td className="px-2 py-2">{item.material}</td>

                                  <td className="px-2 py-2">{item.cognitiveLevel}</td>

                                </tr>

                              ))}

                            </tbody>

                          </table>

                        </div>

                      </div>

                    )}

                  </div>

                ) : (

                  <div className="flex min-h-[620px] items-center justify-center rounded-2xl border border-border/70 bg-card p-8 text-center text-card-foreground shadow-xl">

                    <div className="max-w-sm">

                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#EF629F]/10">

                        <FileQuestion className="h-7 w-7 text-[#EF629F]" />

                      </div>

                      <h3 className="mt-5 text-lg font-bold">Preview soal</h3>

                      <p className="mt-2 text-[13px] leading-6 text-muted-foreground">

                        Hasil soal, kunci jawaban, pembahasan, dan kisi-kisi akan tampil di sini setelah generasi AI selesai

                      </p>

                    </div>

                  </div>

                )}

              </div>

            </div>

          </div>

        </section>

      </main>

    </div>

  )

}
