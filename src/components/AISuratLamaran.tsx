import {
  useCallback,
  useEffect,
  useRef,
  useState } from "react"
import {
  ArrowLeft,
  BriefcaseBusiness,
  Check,
  Download,
  GraduationCap,
  MapPin,
  UserRound,
  Pencil,
  Phone,
  X,
  Save,
  Trash2,
} from "lucide-react"
import { supabase } from "../lib/supabase"
import { invokeDinoAI } from "../lib/invokeDinoAI"
interface AISuratLamaranProps {
  onBack: () => void
}
interface LetterResult {
  subject: string
  greeting: string
  opening: string
  body: string[]
  closing: string
  signature: string
}
interface LetterResponse {
  success?: boolean
  error?: string
  quotaWarning?: string
  letter?: Partial<LetterResult> | null
}
const LETTER_TEMPLATES = [
  {
    id: "formal_resmi",
    label: "Formal Resmi",
    description: "Struktur surat Indonesia yang sopan untuk dokumen PDF.",
    guidance:
      "Gunakan Bahasa Indonesia formal dan susun surat dengan subjek, salam pembuka, tujuan melamar, kualifikasi relevan, motivasi, dan penutup sopan. Gunakan hanya detail penerima dan lampiran yang diberikan; jangan mengarang alamat atau dokumen.",
  },
  {
    id: "profesional_ringkas",
    label: "Profesional Ringkas",
    description: "Padat, langsung ke kecocokan posisi, idealnya satu halaman.",
    guidance:
      "Tulis singkat dan faktual, maksimal satu halaman. Hubungkan kebutuhan lowongan dengan satu atau dua bukti pengalaman atau keahlian yang paling relevan, jelaskan motivasi spesifik untuk perusahaan/posisi, dan hindari mengulang seluruh isi CV.",
  },
  {
    id: "fresh_graduate",
    label: "Fresh Graduate",
    description: "Tonjolkan pendidikan, proyek, magang, organisasi, dan potensi.",
    guidance:
      "Untuk pelamar awal karier, prioritaskan pendidikan, proyek, magang, organisasi, dan keahlian yang relevan bila datanya tersedia. Jelaskan kaitannya dengan persyaratan posisi. Jangan mengarang pengalaman kerja, pencapaian, atau angka.",
  },
  {
    id: "berpengalaman",
    label: "Berpengalaman",
    description: "Fokus pada kontribusi dan pencapaian kerja yang relevan.",
    guidance:
      "Prioritaskan pengalaman kerja yang paling relevan dan bukti kontribusi atau hasil yang memang diberikan pengguna. Hubungkan bukti tersebut dengan kebutuhan posisi; jangan mengulang seluruh CV atau mengarang angka pencapaian.",
  },
] as const
type LetterTemplateId = (typeof LETTER_TEMPLATES)[number]["id"]
function isLetterTemplateId(value: unknown): value is LetterTemplateId {
  return LETTER_TEMPLATES.some((template) => template.id === value)
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
function parseSavedLetterResult(value: unknown, fallbackName: string): LetterResult | null {
  if (!isRecord(value)) return null
  const body = Array.isArray(value.body)
    ? value.body.filter((item): item is string => typeof item === "string")
    : []
  const opening = typeof value.opening === "string" ? value.opening : ""
  if (!opening.trim() && !body.some((paragraph) => paragraph.trim())) return null
  return {
    subject: typeof value.subject === "string" ? value.subject : "Lamaran Pekerjaan",
    greeting: typeof value.greeting === "string" ? value.greeting : "Yth. Bapak/Ibu HRD",
    opening,
    body,
    closing: typeof value.closing === "string" ? value.closing : "",
    signature: typeof value.signature === "string" ? value.signature : fallbackName,
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
export default function AISuratLamaran({
  onBack,
}: AISuratLamaranProps) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [location, setLocation] = useState("")
  const [company, setCompany] = useState("")
  const [position, setPosition] = useState("")
  const [letterTemplateId, setLetterTemplateId] =
    useState<LetterTemplateId>("formal_resmi")
  const [jobSource, setJobSource] = useState("")
  const [jobDescription, setJobDescription] = useState("")
  const [institution, setInstitution] = useState("")
  const [studyProgram, setStudyProgram] = useState("")
  const [educationYear, setEducationYear] = useState("")
  const [experience, setExperience] = useState("")
  const [skills, setSkills] = useState("")
  const [motivation, setMotivation] = useState("")
  const [message, setMessage] = useState("")
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState("")
  const [letterResult, setLetterResult] = useState<LetterResult | null>(null)
  const [isEditingResult, setIsEditingResult] = useState(false)
  const [savedDocumentId, setSavedDocumentId] = useState<string | null>(null)
  const [isLoadingSaved, setIsLoadingSaved] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const generationInFlight = useRef(false)
  const isBasicDataComplete =
    name.trim() !== "" &&
    email.trim() !== "" &&
    phone.trim() !== "" &&
    location.trim() !== "" &&
    company.trim() !== "" &&
    position.trim() !== ""
  const isFormBusy = isLoadingSaved || aiLoading || isSaving || isDeleting
  function updateResultField(
    field: keyof Omit<LetterResult, "body">,
    value: string,
  ) {
    setLetterResult((current) => {
      if (!current) return current
      return {
        ...current,
        [field]: value,
      }
    })
  }
  function updateBody(index: number, value: string) {
    setLetterResult((current) => {
      if (!current) return current
      return {
        ...current,
        body: current.body.map((paragraph, paragraphIndex) =>
          paragraphIndex === index ? value : paragraph,
        ),
      }
    })
  }
  function addBodyParagraph() {
    setLetterResult((current) => {
      if (!current) return current
      return {
        ...current,
        body: [...current.body, ""],
      }
    })
  }
  function removeBodyParagraph(index: number) {
    setLetterResult((current) => {
      if (!current) return current
      return {
        ...current,
        body: current.body.filter((_, itemIndex) => itemIndex !== index),
      }
    })
  }
  const buildDocumentContent = (result: LetterResult | null = letterResult) => ({
    form: {
      name,
      email,
      phone,
      location,
      company,
      position,
      letterTemplateId,
      jobSource,
      jobDescription,
      institution,
      studyProgram,
      educationYear,
      experience,
      skills,
      motivation,
    },
    result,
  })
  const loadSavedDocument = useCallback(async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const userId = sessionData.session?.user?.id
      if (!userId) return
      const { data, error } = await supabase.from("ai_documents").select("id,content,updated_at").eq("user_id", userId).eq("document_type", "surat_lamaran").order("updated_at", { ascending: false }).limit(1).maybeSingle()
      if (error) throw error
      if (!data) return
      setSavedDocumentId(data.id)
      const content = data.content as { form?: Record<string, unknown>; result?: unknown } | null
      const form = content?.form
      if (form) {
        if (typeof form.name === "string") setName(form.name)
        if (typeof form.email === "string") setEmail(form.email)
        if (typeof form.phone === "string") setPhone(form.phone)
        if (typeof form.location === "string") setLocation(form.location)
        if (typeof form.company === "string") setCompany(form.company)
        if (typeof form.position === "string") setPosition(form.position)
        if (isLetterTemplateId(form.letterTemplateId)) {
          setLetterTemplateId(form.letterTemplateId)
        }
        if (typeof form.jobSource === "string") setJobSource(form.jobSource)
        if (typeof form.jobDescription === "string") setJobDescription(form.jobDescription)
        if (typeof form.institution === "string") setInstitution(form.institution)
        if (typeof form.studyProgram === "string") setStudyProgram(form.studyProgram)
        if (typeof form.educationYear === "string") setEducationYear(form.educationYear)
        if (typeof form.experience === "string") setExperience(form.experience)
        if (typeof form.skills === "string") setSkills(form.skills)
        if (typeof form.motivation === "string") setMotivation(form.motivation)
      }
      const savedLetter = parseSavedLetterResult(content?.result, "")
      if (savedLetter) {
        setLetterResult(savedLetter)
      } else if (content?.result) {
        setMessage("Draf tersimpan tidak berisi surat yang bisa dipulihkan. Buat ulang untuk melanjutkan.")
      }
    } catch (error) {
      console.error("Load saved letter error:", error)
    } finally {
      setIsLoadingSaved(false)
    }
  }, [])
  async function saveDocument(resultToSave: LetterResult | null = letterResult): Promise<boolean> {
    if (!resultToSave) return false
    setIsSaving(true)
    setAiError("")
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      const userId = sessionData.session?.user?.id
      if (sessionError || !userId) throw new Error("Session login tidak ditemukan. Silakan login kembali.")
      const title = `Surat Lamaran ${position || "Tanpa Posisi"}${company ? ` · ${company}` : ""}`
      const content = buildDocumentContent(resultToSave)
      if (savedDocumentId) {
        const { data, error } = await supabase
          .from("ai_documents")
          .update({ title, content })
          .eq("id", savedDocumentId)
          .eq("user_id", userId)
          .select("id")
          .maybeSingle()
        if (error) throw error
        if (data) {
          setSavedDocumentId(data.id)
        } else {
          const { data: inserted, error: insertError } = await supabase
            .from("ai_documents")
            .insert({ user_id: userId, document_type: "surat_lamaran", title, content })
            .select("id")
            .single()
          if (insertError) throw insertError
          setSavedDocumentId(inserted.id)
        }
      } else {
        const { data, error } = await supabase.from("ai_documents").insert({ user_id: userId, document_type: "surat_lamaran", title, content }).select("id").single()
        if (error) throw error
        setSavedDocumentId(data.id)
      }
      setMessage("Surat lamaran berhasil disimpan")
      return true
    } catch (error) {
      console.error("Save letter error:", error)
      setAiError(error instanceof Error ? error.message : "Surat lamaran gagal disimpan")
      return false
    } finally {
      setIsSaving(false)
    }
  }
  async function deleteLetter() {
    if (!window.confirm("Hapus surat lamaran ini dan semua data isiannya? Tindakan ini tidak dapat dibatalkan.")) return
    if (isSaving || aiLoading || isLoadingSaved) return
    setIsDeleting(true)
    try {
      if (savedDocumentId) {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
        const userId = sessionData.session?.user?.id
        if (sessionError || !userId) throw new Error("Session login tidak ditemukan. Silakan login kembali.")
        const { error } = await supabase.from("ai_documents").delete().eq("id", savedDocumentId).eq("user_id", userId)
        if (error) throw error
      }
      setName("")
      setEmail("")
      setPhone("")
      setLocation("")
      setCompany("")
      setPosition("")
      setLetterTemplateId("formal_resmi")
      setJobSource("")
      setJobDescription("")
      setInstitution("")
      setStudyProgram("")
      setEducationYear("")
      setExperience("")
      setSkills("")
      setMotivation("")
      setLetterResult(null)
      setIsEditingResult(false)
      setSavedDocumentId(null)
      setAiError("")
      setMessage("Surat lamaran dihapus. Silakan mulai mengisi surat baru.")
    } catch (error) {
      console.error("Delete letter error:", error)
      setAiError(error instanceof Error ? `Gagal menghapus surat: ${error.message}` : "Gagal menghapus surat lamaran")
    } finally {
      setIsDeleting(false)
    }
  }
  useEffect(() => {
    const loadTask = window.setTimeout(() => {
      void loadSavedDocument()
    }, 0)
    return () => window.clearTimeout(loadTask)
  }, [loadSavedDocument])
async function handleGenerateAI() {
    if (!isBasicDataComplete) {
      setMessage(
        "Lengkapi nama, email, nomor HP, lokasi, nama perusahaan, dan posisi terlebih dahulu",
      )
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setMessage("Periksa format email sebelum membuat surat lamaran")
      return
    }
    if (generationInFlight.current) return
    generationInFlight.current = true
    setAiLoading(true)
    setAiError("")
    setMessage("")
    setIsEditingResult(false)
    try {
      const selectedTemplate = LETTER_TEMPLATES.find(
        (template) => template.id === letterTemplateId,
      ) ?? LETTER_TEMPLATES[0]
      const data = await invokeDinoAI<LetterResponse>("dinoai-surat", {
          idempotencyKey: createIdempotencyKey(),
          name,
          email,
          phone,
          location,
          company,
          position,
          template: {
            id: selectedTemplate.id,
            name: selectedTemplate.label,
            instructions: selectedTemplate.guidance,
          },
          jobSource,
          jobDescription,
          education: {
            institution,
            studyProgram,
            year: educationYear,
          },
          experience,
          skills,
          motivation,
      })
      if (!data?.success || !data?.letter) {
        throw new Error(
          data?.error || "Respons dinoai-surat tidak sesuai. Silakan coba lagi.",
        )
      }
      const rawBody = Array.isArray(data.letter.body)
        ? data.letter.body.filter(
            (item: unknown): item is string =>
              typeof item === "string",
          )
        : []
      const nextLetterResult: LetterResult = {
        subject:
          typeof data.letter.subject === "string"
            ? data.letter.subject
            : `Lamaran ${position} di ${company}`,
        greeting:
          typeof data.letter.greeting === "string"
            ? data.letter.greeting
            : "Yth. Bapak/Ibu HRD",
        opening:
          typeof data.letter.opening === "string"
            ? data.letter.opening
            : "",
        body: rawBody,
        closing:
          typeof data.letter.closing === "string"
            ? data.letter.closing
            : "",
        signature:
          typeof data.letter.signature === "string"
            ? data.letter.signature
            : name,
      }
      if (!nextLetterResult.opening.trim() && !nextLetterResult.body.some((paragraph) => paragraph.trim())) {
        throw new Error("AI tidak mengembalikan isi surat yang dapat digunakan. Coba lagi sebentar.")
      }
      setLetterResult(nextLetterResult)
      const saved = await saveDocument(nextLetterResult)
      const resultMessage = saved
        ? "Surat lamaran berhasil dibuat dan disimpan. Periksa dan edit hasilnya sebelum disimpan sebagai PDF"
        : "Surat lamaran berhasil dibuat, tetapi belum tersimpan. Periksa koneksi lalu tekan Simpan."
      setMessage(data.quotaWarning
        ? `${resultMessage} ${data.quotaWarning}`
        : resultMessage)
    } catch (error) {
      console.error("AI Surat Lamaran error:", error)
      setAiError(
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat membuat surat lamaran dengan AI",
      )
    } finally {
      generationInFlight.current = false
      setAiLoading(false)
    }
  }
  function handlePrintPDF() {
    if (!letterResult) {
      setMessage(
        "Buat surat lamaran dengan AI terlebih dahulu sebelum menyimpan PDF",
      )
      return
    }
    setMessage("")
    setIsEditingResult(false)
    window.print()
  }
  async function handleEditToggle() {
    if (isEditingResult) {
      setIsEditingResult(false)
      await saveDocument()
      return
    }
    setIsEditingResult(true)
  }
  return (
    <>
      <style>{`
        @page {
          size: A4;
          margin: 3cm 3cm 4cm 4cm;
        }
        @media print {
          html,
          body,
          #root,
          #root > div,
          .min-h-dvh {
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
          }
          body {
            background: #ffffff !important;
          }
          body * {
            visibility: hidden !important;
          }
          #dinoedu-surat-print,
          #dinoedu-surat-print * {
            visibility: visible !important;
          }
          #dinoedu-surat-main {
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          #dinoedu-surat-grid {
            display: block !important;
          }
          #dinoedu-surat-preview {
            position: static !important;
            width: 100% !important;
          }
          #dinoedu-surat-preview-shell {
            padding: 0 !important;
            border: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
          }
          #dinoedu-surat-print {
            position: relative !important;
            min-height: 0 !important;
            height: auto !important;
            width: 100% !important;
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }
          .dino-no-print {
            display: none !important;
          }
        }
      `}</style>
      <div className="min-h-dvh overflow-x-clip bg-background text-foreground">
        {/* DINOEDU SPACE BACKGROUND */}
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="dino-float absolute left-[-140px] top-[100px] h-[320px] w-[320px] rounded-full bg-[#EECDA3]/25 blur-3xl" />
          <div className="dino-float-slow absolute right-[-120px] top-[180px] h-[360px] w-[360px] rounded-full bg-[#EF629F]/15 blur-3xl" />
        </div>
        {/* HEADER */}
        <header className="dino-no-print sticky top-0 z-50 border-b border-border/50 bg-background/70 backdrop-blur-xl">
          <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={onBack}
              className="dino-no-print dino-button inline-flex items-center gap-2 rounded-full border border-border/60 bg-white/40 px-4 py-3 text-[14px] font-semibold backdrop-blur-xl dark:bg-white/5"
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
              AI Surat Lamaran
            </div>
          </div>
        </header>
        <main
          id="dinoedu-surat-main"
          className="mx-auto max-w-7xl px-5 pb-20 pt-10 sm:px-6 sm:pt-14 lg:px-8"
        >
          {/* HERO */}
          <section className="dino-enter mb-10 dino-no-print">
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
                <h1 className="dino-hero-title mt-4 text-3xl font-bold sm:text-5xl">
                  Buat surat lamaran profesional
                  <span className="block bg-gradient-to-r from-[#EECDA3] to-[#EF629F] bg-clip-text pb-1 text-transparent">
                    dengan bantuan AI
                  </span>
                </h1>
                <p className="mt-4 max-w-2xl text-[18px] leading-relaxed text-muted-foreground">
                  Masukkan informasi kamu dan detail lowongan lalu DinoAI akan membantu menyusun surat lamaran yang profesional
                </p>
              </div>
            </div>
          </section>
          <section>
            <div
              id="dinoedu-surat-grid"
              className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]"
            >
              {/* LEFT FORM */}
              <div className="dino-glass rounded-[32px] p-6 sm:p-8 dino-no-print">
                <div className="mb-8">
                  <p className="text-[14px] font-semibold uppercase tracking-[0.18em] text-[#EF629F]">
                    Data pelamar
                  </p>
                  <h2 className="mt-2 text-2xl font-bold">
                    Informasi pribadi
                  </h2>
                </div>
                <fieldset
                  disabled={isFormBusy}
                  className="min-w-0 border-0 p-0"
                >
                <div className="space-y-5">
                  <div>
                    <label className="mb-2 block text-[14px] font-medium">
                      Nama lengkap
                    </label>
                    <div className="relative">
                      <UserRound className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder="Masukkan nama lengkap"
                        className="w-full rounded-2xl border border-border/70 bg-white/40 py-3.5 pl-11 pr-4 text-[17px] outline-none backdrop-blur-xl transition focus:border-[#EF629F]/50 dark:bg-white/5"
                      />
                    </div>
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-[14px] font-medium">
                        Email
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="nama@email.com"
                        className="w-full rounded-2xl border border-border/70 bg-white/40 px-4 py-3.5 text-[17px] outline-none backdrop-blur-xl transition focus:border-[#EF629F]/50 dark:bg-white/5"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-[14px] font-medium">
                        Nomor HP
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                          type="tel"
                          value={phone}
                          onChange={(event) => setPhone(event.target.value)}
                          placeholder="08xxxxxxxxxx"
                          className="w-full rounded-2xl border border-border/70 bg-white/40 py-3.5 pl-11 pr-4 text-[17px] outline-none backdrop-blur-xl transition focus:border-[#EF629F]/50 dark:bg-white/5"
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="mb-2 block text-[14px] font-medium">
                      Lokasi
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        value={location}
                        onChange={(event) => setLocation(event.target.value)}
                        placeholder="Kota, Provinsi"
                        className="w-full rounded-2xl border border-border/70 bg-white/40 py-3.5 pl-11 pr-4 text-[17px] outline-none backdrop-blur-xl transition focus:border-[#EF629F]/50 dark:bg-white/5"
                      />
                    </div>
                  </div>
                </div>
                <div className="my-10 border-t border-border/60" />
                {/* LOWONGAN */}
                <div className="mb-8">
                  <p className="text-[14px] font-semibold uppercase tracking-[0.18em] text-[#EF629F]">
                    Detail lowongan
                  </p>
                  <h2 className="mt-2 text-2xl font-bold">
                    Posisi yang dituju
                  </h2>
                </div>
                <div className="space-y-5">
                  <div>
                    <label className="mb-2 block text-[14px] font-medium">
                      Nama perusahaan / instansi
                    </label>
                    <div className="relative">
                      <BriefcaseBusiness className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        value={company}
                        onChange={(event) => setCompany(event.target.value)}
                        placeholder="Nama perusahaan atau instansi"
                        className="w-full rounded-2xl border border-border/70 bg-white/40 py-3.5 pl-11 pr-4 text-[17px] outline-none backdrop-blur-xl transition focus:border-[#EF629F]/50 dark:bg-white/5"
                      />
                    </div>
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-[14px] font-medium">
                        Posisi yang dilamar
                      </label>
                      <input
                        type="text"
                        value={position}
                        onChange={(event) => setPosition(event.target.value)}
                        placeholder="Contoh: Guru SD"
                        className="w-full rounded-2xl border border-border/70 bg-white/40 px-4 py-3.5 text-[17px] outline-none backdrop-blur-xl transition focus:border-[#EF629F]/50 dark:bg-white/5"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-[14px] font-medium">
                        Sumber lowongan
                      </label>
                      <input
                        type="text"
                        value={jobSource}
                        onChange={(event) => setJobSource(event.target.value)}
                        placeholder="Contoh: LinkedIn / Jobstreet"
                        className="w-full rounded-2xl border border-border/70 bg-white/40 px-4 py-3.5 text-[17px] outline-none backdrop-blur-xl transition focus:border-[#EF629F]/50 dark:bg-white/5"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-2 block text-[14px] font-medium">
                      Deskripsi lowongan
                    </label>
                    <textarea
                      rows={5}
                      value={jobDescription}
                      onChange={(event) => setJobDescription(event.target.value)}
                      placeholder="Tempel poin persyaratan atau deskripsi pekerjaan dari lowongan"
                      className="modal-scrollbar-hidden w-full resize-none rounded-2xl border border-border/70 bg-white/40 px-4 py-3.5 text-[17px] leading-7 outline-none backdrop-blur-xl transition focus:border-[#EF629F]/50 dark:bg-white/5"
                    />
                  </div>
                  <fieldset>
                    <legend className="mb-3 text-[14px] font-medium">
                      Gaya surat lamaran
                    </legend>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {LETTER_TEMPLATES.map((template) => {
                        const isSelected = letterTemplateId === template.id
                        return (
                          <label
                            key={template.id}
                            className={`cursor-pointer rounded-2xl border p-4 transition focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-[#EF629F]/60 ${
                              isSelected
                                ? "border-[#EF629F]/70 bg-[#EF629F]/10 shadow-sm"
                                : "border-border/70 bg-white/30 hover:border-[#EF629F]/40 dark:bg-white/5"
                            }`}
                          >
                            <input
                              type="radio"
                              name="letter-template"
                              value={template.id}
                              checked={isSelected}
                              onChange={() => setLetterTemplateId(template.id)}
                              className="sr-only"
                            />
                            <span className="flex items-center justify-between gap-3">
                              <span className="text-[14px] font-semibold">
                                {template.label}
                              </span>
                              <span
                                aria-hidden="true"
                                className={`h-4 w-4 rounded-full border ${
                                  isSelected
                                    ? "border-[#EF629F] bg-[#EF629F] shadow-[inset_0_0_0_3px_white]"
                                    : "border-muted-foreground/40"
                                }`}
                              />
                            </span>
                            <span className="mt-2 block text-[12px] leading-5 text-muted-foreground">
                              {template.description}
                            </span>
                          </label>
                        )
                      })}
                    </div>
                    <div className="mt-4 rounded-2xl border border-border/60 bg-white/20 p-4 text-[12px] leading-5 text-muted-foreground dark:bg-white/5">
                      <p className="font-semibold text-foreground">
                        Panduan penyusunan
                      </p>
                      <p className="mt-1">
                        Struktur surat formal merujuk materi Bahasa Indonesia Kemendikdasmen. Prinsip ringkas, relevan dengan lowongan, dan contoh untuk pelamar awal karier merujuk panduan Harvard FAS dan UC Berkeley.
                      </p>
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                        <a
                          href="https://repositori.kemendikdasmen.go.id/21805/1/XII_Bahasa-Indonesia_KD-3.1_Final.pdf"
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-[#EF629F] underline underline-offset-2"
                        >
                          Kemendikdasmen · Sistematika surat
                        </a>
                        <a
                          href="https://careerservices.fas.harvard.edu/resources/hes-create-impactful-resumes-and-cover-letters/"
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-[#EF629F] underline underline-offset-2"
                        >
                          Harvard FAS · Cover letter
                        </a>
                        <a
                          href="https://career.berkeley.edu/prepare-for-success/cover-letters/"
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-[#EF629F] underline underline-offset-2"
                        >
                          UC Berkeley · Cover letters
                        </a>
                      </div>
                    </div>
                  </fieldset>
                </div>
                <div className="my-10 border-t border-border/60" />
                {/* PROFIL */}
                <div className="mb-8">
                  <p className="text-[14px] font-semibold uppercase tracking-[0.18em] text-[#EF629F]">
                    Profil
                  </p>
                  <h2 className="mt-2 text-2xl font-bold">
                    Pendidikan dan pengalaman
                  </h2>
                </div>
                <div className="space-y-5">
                  <div>
                    <label className="mb-2 block text-[14px] font-medium">
                      Institusi pendidikan
                    </label>
                    <div className="relative">
                      <GraduationCap className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        value={institution}
                        onChange={(event) => setInstitution(event.target.value)}
                        placeholder="Nama universitas / sekolah"
                        className="w-full rounded-2xl border border-border/70 bg-white/40 py-3.5 pl-11 pr-4 text-[17px] outline-none backdrop-blur-xl transition focus:border-[#EF629F]/50 dark:bg-white/5"
                      />
                    </div>
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-[14px] font-medium">
                        Program studi
                      </label>
                      <input
                        type="text"
                        value={studyProgram}
                        onChange={(event) => setStudyProgram(event.target.value)}
                        placeholder="Program studi"
                        className="w-full rounded-2xl border border-border/70 bg-white/40 px-4 py-3.5 text-[17px] outline-none backdrop-blur-xl transition focus:border-[#EF629F]/50 dark:bg-white/5"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-[14px] font-medium">
                        Tahun
                      </label>
                      <input
                        type="text"
                        value={educationYear}
                        onChange={(event) => setEducationYear(event.target.value)}
                        placeholder="2022 - 2026"
                        className="w-full rounded-2xl border border-border/70 bg-white/40 px-4 py-3.5 text-[17px] outline-none backdrop-blur-xl transition focus:border-[#EF629F]/50 dark:bg-white/5"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-2 block text-[14px] font-medium">
                      Pengalaman relevan
                    </label>
                    <textarea
                      rows={5}
                      value={experience}
                      onChange={(event) => setExperience(event.target.value)}
                      placeholder="Tuliskan pengalaman yang paling relevan dengan posisi yang dilamar"
                      className="modal-scrollbar-hidden w-full resize-none rounded-2xl border border-border/70 bg-white/40 px-4 py-3.5 text-[17px] leading-7 outline-none backdrop-blur-xl transition focus:border-[#EF629F]/50 dark:bg-white/5"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-[14px] font-medium">
                      Keahlian utama
                    </label>
                    <textarea
                      rows={3}
                      value={skills}
                      onChange={(event) => setSkills(event.target.value)}
                      placeholder="Contoh: komunikasi, Microsoft Office, Canva, manajemen kelas"
                      className="modal-scrollbar-hidden w-full resize-none rounded-2xl border border-border/70 bg-white/40 px-4 py-3.5 text-[17px] leading-7 outline-none backdrop-blur-xl transition focus:border-[#EF629F]/50 dark:bg-white/5"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-[14px] font-medium">
                      Motivasi melamar
                    </label>
                    <textarea
                      rows={4}
                      value={motivation}
                      onChange={(event) => setMotivation(event.target.value)}
                      placeholder="Jelaskan secara singkat alasan tertarik pada posisi atau perusahaan tersebut"
                      className="modal-scrollbar-hidden w-full resize-none rounded-2xl border border-border/70 bg-white/40 px-4 py-3.5 text-[17px] leading-7 outline-none backdrop-blur-xl transition focus:border-[#EF629F]/50 dark:bg-white/5"
                    />
                  </div>
                </div>
                </fieldset>
                {/* AI BUTTON */}
                <button
                  type="button"
                  onClick={handleGenerateAI}
                  disabled={!isBasicDataComplete || isFormBusy}
                  className={`dino-gradient mt-10 flex w-full items-center justify-center rounded-2xl px-5 py-4 text-[15px] font-semibold text-white shadow-lg shadow-pink-500/10 transition-all duration-200 ${
                    isBasicDataComplete && !isFormBusy
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
                    ? "Sedang menyusun surat..."
                    : "Buat Surat dengan AI · 1 kredit"}
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
                  Pembuatan surat menggunakan 1 kredit AI setelah hasil berhasil dibuat
                </p>
              </div>
              {/* PREVIEW */}
              <div
                id="dinoedu-surat-preview"
                className="lg:sticky lg:top-28 lg:self-start"
              >
                <div className="mb-4 dino-no-print">
                  <p className="text-[14px] font-semibold uppercase tracking-[0.18em] text-[#EF629F]">
                    Preview
                  </p>
                  <h2 className="mt-2 text-2xl font-bold">
                    Pratinjau surat lamaran
                  </h2>
                </div>
                {letterResult && (
                  <div className="dino-no-print mb-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void deleteLetter()}
                      disabled={isDeleting || isSaving || aiLoading || isLoadingSaved}
                      className="dino-button inline-flex items-center gap-2 rounded-xl border border-red-500/25 bg-red-500/5 px-4 py-2.5 text-[13px] font-semibold text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      Hapus
                    </button>
                    <button
                      type="button"
                      onClick={handleEditToggle}
                      disabled={isFormBusy}
                      className="dino-button inline-flex items-center gap-2 rounded-xl border border-border/70 bg-white/40 px-4 py-2.5 text-[13px] font-semibold backdrop-blur-xl disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/5"
                    >
                      {isEditingResult ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Pencil className="h-4 w-4" />
                      )}
                      {isEditingResult ? "Selesai edit" : "Edit hasil"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void saveDocument()}
                      disabled={isFormBusy || isEditingResult || !letterResult}
                      className="dino-button inline-flex items-center gap-2 rounded-xl border border-border/70 bg-white/40 px-4 py-2.5 text-[13px] font-semibold backdrop-blur-xl disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/5"
                    >
                      <Save className="h-4 w-4" />
                      {isSaving ? "Menyimpan..." : "Simpan"}
                    </button>
                    <button
                      type="button"
                      onClick={handlePrintPDF}
                      disabled={isFormBusy}
                      className="dino-gradient dino-button inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold text-white shadow-lg shadow-pink-500/10 transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Download className="h-4 w-4" />
                      Simpan PDF
                    </button>
                  </div>
                )}
                <div
                  id="dinoedu-surat-preview-shell"
                  className="dino-glass rounded-[32px] p-5 sm:p-7"
                >
                  <div
                    id="dinoedu-surat-print"
                    className="min-h-[760px] rounded-2xl bg-white p-8 text-black shadow-xl sm:p-10"
                    style={{
                      fontFamily: '"Times New Roman", Times, serif',
                      fontSize: "12pt",
                    }}
                  >
                    <div>
                      <div className="text-right leading-6 text-zinc-700">
                        {new Date().toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </div>
                      {isEditingResult && letterResult ? (
                        <div className="dino-no-print mt-6 space-y-4 rounded-2xl border border-[#EF629F]/20 bg-[#EF629F]/5 p-5">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-[14px] font-semibold">Edit hasil AI</p>
                              <p className="mt-1 text-[12px] text-muted-foreground">
                                Perubahan hanya berlaku pada hasil surat ini
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={handleEditToggle}
                              className="rounded-full p-2 text-muted-foreground transition hover:bg-white/70"
                              aria-label="Tutup edit"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                          <input
                            value={letterResult.greeting}
                            onChange={(event) =>
                              updateResultField("greeting", event.target.value)
                            }
                            className="w-full rounded-xl border border-border/70 bg-white px-3 py-2.5 text-[13px] outline-none focus:border-[#EF629F]/50"
                            placeholder="Salam pembuka"
                          />
                          <textarea
                            value={letterResult.opening}
                            onChange={(event) =>
                              updateResultField("opening", event.target.value)
                            }
                            rows={4}
                            className="w-full resize-none rounded-xl border border-border/70 bg-white px-3 py-2.5 text-[13px] leading-6 outline-none focus:border-[#EF629F]/50"
                            placeholder="Paragraf pembuka"
                          />
                          {letterResult.body.map((paragraph, index) => (
                            <div key={index} className="relative">
                              <textarea
                                value={paragraph}
                                onChange={(event) =>
                                  updateBody(index, event.target.value)
                                }
                                rows={5}
                                className="w-full resize-none rounded-xl border border-border/70 bg-white px-3 py-2.5 pr-10 text-[13px] leading-6 outline-none focus:border-[#EF629F]/50"
                                placeholder={`Paragraf isi ${index + 1}`}
                              />
                              <button
                                type="button"
                                onClick={() => removeBodyParagraph(index)}
                                className="absolute right-2 top-2 rounded-lg p-1.5 text-muted-foreground transition hover:bg-zinc-100 hover:text-red-500"
                                aria-label={`Hapus paragraf ${index + 1}`}
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={addBodyParagraph}
                            className="rounded-xl border border-border/70 px-3 py-2 text-[12px] font-semibold transition hover:border-[#EF629F]/40 hover:text-[#EF629F]"
                          >
                            + Tambah paragraf
                          </button>
                          <textarea
                            value={letterResult.closing}
                            onChange={(event) =>
                              updateResultField("closing", event.target.value)
                            }
                            rows={4}
                            className="w-full resize-none rounded-xl border border-border/70 bg-white px-3 py-2.5 text-[13px] leading-6 outline-none focus:border-[#EF629F]/50"
                            placeholder="Penutup surat"
                          />
                          <input
                            value={letterResult.signature}
                            onChange={(event) =>
                              updateResultField("signature", event.target.value)
                            }
                            className="w-full rounded-xl border border-border/70 bg-white px-3 py-2.5 text-[13px] outline-none focus:border-[#EF629F]/50"
                            placeholder="Nama penanda tangan"
                          />
                        </div>
                      ) : letterResult ? (
                        <div className="mt-6 space-y-6 leading-[1.5] text-zinc-800">
                          <p>{letterResult.greeting}</p>
                          <p
                            className="text-justify"
                            style={{ textIndent: "1cm" }}
                          >
                            {letterResult.opening}
                          </p>
                          {letterResult.body.map((paragraph, index) => (
                            <p
                              key={index}
                              className="text-justify"
                              style={{ textIndent: "1cm" }}
                            >
                              {paragraph}
                            </p>
                          ))}
                          <p style={{ textIndent: "1cm" }}>
                            {letterResult.closing}
                          </p>
                          <div className="pt-3 text-right">
                            <p>Hormat saya,</p>
                            <p className="mt-10 font-semibold">
                              {letterResult.signature || name}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-10 flex min-h-[520px] items-center justify-center rounded-2xl border border-dashed border-zinc-200 px-8 text-center">
                          <div className="max-w-sm">
                            <img
                              src="/logodino.PNG"
                              alt=""
                              className="mx-auto h-7 w-7 object-contain"
                            />
                            <p className="mt-4 text-[14px] font-semibold text-zinc-700">
                              Hasil surat akan tampil di sini
                            </p>
                            <p className="mt-2 text-[12px] leading-6 text-zinc-400">
                              Isi data pelamar dan detail lowongan lalu buat surat dengan AI
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="dino-no-print mt-4 text-center text-[12px] text-muted-foreground">
                  Periksa isi surat sebelum dikirim ke perusahaan atau instansi
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </>
  )
}
