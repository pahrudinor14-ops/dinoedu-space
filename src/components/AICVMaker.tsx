import { useEffect, useState, type ChangeEvent } from "react"
import { flushSync } from "react-dom"
import {
  ArrowLeft,
  BriefcaseBusiness,
  Check,
  Download,
  GraduationCap,
  ShieldCheck,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Save,
  Trash2,
  UserRound,
} from "lucide-react"
import { supabase } from "../lib/supabase"
interface AICVMakerProps {
  onBack: () => void
}
interface Experience {
  id: number
  position: string
  company: string
  description: string
}
interface Education {
  id: number
  institution: string
  studyProgram: string
  year: string
}
interface PortfolioItem {
  id: number
  title: string
  description: string
  url: string
}
interface LanguageScore {
  id: number
  language: string
  test: string
  score: string
}
interface AIExperience {
  position: string
  company: string
  description: string[]
}
interface AIResult {
  professionalSummary: string
  skills: string[]
  experiences: AIExperience[]
}
interface FaceBounds {
  x: number
  y: number
  width: number
  height: number
}
interface DetectedFace {
  boundingBox: FaceBounds
}
interface NativeFaceDetector {
  detect(image: HTMLImageElement): Promise<DetectedFace[]>
}
type NativeFaceDetectorConstructor = new (options: {
  fastMode: boolean
  maxDetectedFaces: number
}) => NativeFaceDetector
interface SavedCVContent {
  name: string
  email: string
  phone: string
  location: string
  summary: string
  educations: Education[]
  institution?: string
  studyProgram?: string
  educationYear?: string
  experiences: Experience[]
  portfolioItems: PortfolioItem[]
  languageScores: LanguageScore[]
  aiResult: AIResult | null
  template: CVTemplate
  photoDataUrl: string
}
type CVTemplate =
  | "ats-classic"
  | "ats-compact"
  | "modern-sidebar"
  | "modern-header"
  | "creative-editorial"
  | "creative-timeline"
const cvTemplates: { id: CVTemplate; group: string; name: string; description: string }[] = [
  { id: "ats-classic", group: "ATS Minimalis", name: "Klasik", description: "Satu kolom, rapi, mudah dipindai" },
  { id: "ats-compact", group: "ATS Minimalis", name: "Ringkas", description: "Satu kolom padat dengan header terpusat" },
  { id: "modern-sidebar", group: "Profesional Modern", name: "Sidebar", description: "Informasi pendukung di sisi kiri" },
  { id: "modern-header", group: "Profesional Modern", name: "Header", description: "Header beraksen dengan ruang lega" },
  { id: "creative-editorial", group: "Kreatif", name: "Editorial", description: "Warna tegas dan tipografi ekspresif" },
  { id: "creative-timeline", group: "Kreatif", name: "Timeline", description: "Pengalaman ditonjolkan sebagai alur" },
]
function getSafePortfolioUrl(value: string) {
  try {
    const url = new URL(value.trim())
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : ""
  } catch {
    return ""
  }
}
export default function AICVMaker({ onBack }: AICVMakerProps) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [location, setLocation] = useState("")
  const [summary, setSummary] = useState("")
  const [educations, setEducations] = useState<Education[]>([
    { id: 1, institution: "", studyProgram: "", year: "" },
  ])
  const [template, setTemplate] = useState<CVTemplate>("ats-classic")
  const [photoDataUrl, setPhotoDataUrl] = useState("")
  const [experiences, setExperiences] = useState<Experience[]>([
    {
      id: 1,
      position: "",
      company: "",
      description: "",
    },
  ])
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([
    { id: 1, title: "", description: "", url: "" },
  ])
  const [languageScores, setLanguageScores] = useState<LanguageScore[]>([
    { id: 1, language: "", test: "", score: "" },
  ])
  const [message, setMessage] = useState("")
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState("")
  const [aiResult, setAiResult] = useState<AIResult | null>(null)
  const [isEditingResult, setIsEditingResult] = useState(false)
  const [documentId, setDocumentId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingSaved, setIsLoadingSaved] = useState(true)
  const getDocumentContent = (): SavedCVContent => ({
    name,
    email,
    phone,
    location,
    summary,
    educations,
    experiences,
    portfolioItems,
    languageScores,
    aiResult,
    template,
    photoDataUrl,
  })
  function applySavedContent(content: Partial<SavedCVContent>) {
    if (typeof content.name === "string") setName(content.name)
    if (typeof content.email === "string") setEmail(content.email)
    if (typeof content.phone === "string") setPhone(content.phone)
    if (typeof content.location === "string") setLocation(content.location)
    if (typeof content.summary === "string") setSummary(content.summary)
    if (Array.isArray(content.educations)) {
      const restoredEducations = content.educations.flatMap((item, index) => {
        if (!item || typeof item !== "object") return []
        return [{
          id: typeof item.id === "number" ? item.id : Date.now() + index,
          institution: typeof item.institution === "string" ? item.institution : "",
          studyProgram: typeof item.studyProgram === "string" ? item.studyProgram : "",
          year: typeof item.year === "string" ? item.year : "",
        }]
      })
      setEducations(restoredEducations.length > 0
        ? restoredEducations
        : [{ id: Date.now(), institution: "", studyProgram: "", year: "" }])
    } else if (
      typeof content.institution === "string" ||
      typeof content.studyProgram === "string" ||
      typeof content.educationYear === "string"
    ) {
      setEducations([{
        id: Date.now(),
        institution: typeof content.institution === "string" ? content.institution : "",
        studyProgram: typeof content.studyProgram === "string" ? content.studyProgram : "",
        year: typeof content.educationYear === "string" ? content.educationYear : "",
      }])
    }
    if (Array.isArray(content.experiences)) setExperiences(content.experiences)
    if (Array.isArray(content.portfolioItems)) {
      const restoredPortfolioItems = content.portfolioItems.flatMap((item, index) => {
        if (!item || typeof item !== "object") return []
        return [{
          id: typeof item.id === "number" ? item.id : Date.now() + index,
          title: typeof item.title === "string" ? item.title : "",
          description: typeof item.description === "string" ? item.description : "",
          url: typeof item.url === "string" ? item.url : "",
        }]
      })
      setPortfolioItems(restoredPortfolioItems.length > 0
        ? restoredPortfolioItems
        : [{ id: Date.now(), title: "", description: "", url: "" }])
    }
    if (Array.isArray(content.languageScores)) {
      const restoredLanguageScores = content.languageScores.flatMap((item, index) => {
        if (!item || typeof item !== "object") return []
        return [{
          id: typeof item.id === "number" ? item.id : Date.now() + index,
          language: typeof item.language === "string" ? item.language : "",
          test: typeof item.test === "string" ? item.test : "",
          score: typeof item.score === "string" ? item.score : "",
        }]
      })
      setLanguageScores(restoredLanguageScores.length > 0
        ? restoredLanguageScores
        : [{ id: Date.now(), language: "", test: "", score: "" }])
    }
    if (content.aiResult && typeof content.aiResult === "object") setAiResult(content.aiResult)
    if (typeof content.template === "string" && cvTemplates.some((item) => item.id === content.template)) setTemplate(content.template)
    if (typeof content.photoDataUrl === "string") setPhotoDataUrl(content.photoDataUrl)
  }
  async function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ""
    if (!file) return
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setMessage("Gunakan foto berformat JPG, PNG, atau WebP")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage("Ukuran foto maksimal 5 MB")
      return
    }
    const objectUrl = URL.createObjectURL(file)
    try {
      const image = new Image()
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve()
        image.onerror = () => reject(new Error("Foto tidak dapat dibaca"))
        image.src = objectUrl
      })
      let faceBounds: FaceBounds | null = null
      const FaceDetector = (window as Window & {
        FaceDetector?: NativeFaceDetectorConstructor
      }).FaceDetector
      if (FaceDetector) {
        try {
          const detectedFaces = await new FaceDetector({
            fastMode: true,
            maxDetectedFaces: 5,
          }).detect(image)
          faceBounds = detectedFaces
            .map((face) => face.boundingBox)
            .filter((face) => face.width > 0 && face.height > 0)
            .sort((a, b) => b.width * b.height - a.width * a.height)[0] ?? null
        } catch {
          faceBounds = null
        }
      }
      const width = 480
      const height = 480
      const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight)
      const sourceWidth = width / scale
      const sourceHeight = height / scale
      const maxSourceLeft = image.naturalWidth - sourceWidth
      const maxSourceTop = image.naturalHeight - sourceHeight
      let sourceLeft = maxSourceLeft / 2
      let sourceTop = Math.min(maxSourceTop, Math.max(0, image.naturalHeight * 0.08))
      if (faceBounds) {
        const faceCenterX = faceBounds.x + faceBounds.width / 2
        const faceCenterY = faceBounds.y + faceBounds.height / 2
        sourceLeft = Math.min(maxSourceLeft, Math.max(0, faceCenterX - sourceWidth / 2))
        sourceTop = Math.min(maxSourceTop, Math.max(0, faceCenterY - sourceHeight * 0.36))
      }
      const canvas = document.createElement("canvas")
      canvas.width = width
      canvas.height = height
      const context = canvas.getContext("2d")
      if (!context) throw new Error("Foto tidak dapat diproses")
      context.fillStyle = "#ffffff"
      context.fillRect(0, 0, width, height)
      context.drawImage(
        image,
        sourceLeft,
        sourceTop,
        sourceWidth,
        sourceHeight,
        0,
        0,
        width,
        height,
      )
      setPhotoDataUrl(canvas.toDataURL("image/jpeg", 0.82))
      setMessage("Foto berhasil ditambahkan ke CV")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Foto gagal diproses")
    } finally {
      URL.revokeObjectURL(objectUrl)
    }
  }
  async function saveCV(showMessage = true, overrideContent?: SavedCVContent) {
    if (!aiResult && !overrideContent?.aiResult) {
      setMessage("Buat CV dengan AI terlebih dahulu sebelum menyimpan")
      return false
    }
    setIsSaving(true)
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !sessionData.session?.user) throw new Error("Session login tidak ditemukan. Silakan login kembali.")
      const userId = sessionData.session.user.id
      const content = overrideContent ?? getDocumentContent()
      const title = name.trim() ? `CV - ${name.trim()}` : "CV Tanpa Judul"
      if (documentId) {
        const { error } = await supabase.from("ai_documents").update({ title, content }).eq("id", documentId).eq("user_id", userId)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from("ai_documents").insert({ user_id: userId, document_type: "cv", title, content }).select("id").single()
        if (error) throw error
        setDocumentId(data.id)
      }
      if (showMessage) setMessage("CV berhasil disimpan. Perubahan tidak menggunakan kredit AI")
      return true
    } catch (error) {
      console.error("Save CV error:", error)
      setMessage(error instanceof Error ? `Gagal menyimpan CV: ${error.message}` : "Gagal menyimpan CV")
      return false
    } finally {
      setIsSaving(false)
    }
  }
  useEffect(() => {
    let isMounted = true
    void supabase.auth.getSession()
      .then(async ({ data: sessionData, error: sessionError }) => {
        if (sessionError || !sessionData.session?.user) return
        const { data, error } = await supabase
          .from("ai_documents")
          .select("id,title,content,updated_at")
          .eq("document_type", "cv")
          .eq("user_id", sessionData.session.user.id)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle()
        if (error) throw error
        if (!isMounted || !data) return
        setDocumentId(data.id)
        if (data.content && typeof data.content === "object") applySavedContent(data.content as Partial<SavedCVContent>)
        setMessage("CV terakhir berhasil dimuat dari penyimpanan")
      })
      .catch((error: unknown) => {
        console.error("Load saved CV error:", error)
      })
      .finally(() => {
        if (isMounted) setIsLoadingSaved(false)
      })
    return () => {
      isMounted = false
    }
  }, [])
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  const showLocationIcon = location.trim().length <= 40
  const missingRequiredFields = [
    name.trim() ? "" : "nama",
    email.trim() ? "" : "email",
    phone.trim() ? "" : "nomor HP",
    location.trim() ? "" : "lokasi",
  ].filter(Boolean)
  const areRequiredFieldsComplete = missingRequiredFields.length === 0
  const filledEducations = educations.filter(
    (item) =>
      item.institution.trim() !== "" ||
      item.studyProgram.trim() !== "" ||
      item.year.trim() !== "",
  )
  const filledExperiences = experiences.filter(
    (item) =>
      item.position.trim() !== "" ||
      item.company.trim() !== "" ||
      item.description.trim() !== "",
  )
  const filledPortfolioItems = portfolioItems.filter(
    (item) =>
      item.title.trim() !== "" ||
      item.description.trim() !== "" ||
      item.url.trim() !== "",
  )
  const filledLanguageScores = languageScores.filter(
    (item) =>
      item.language.trim() !== "" ||
      item.test.trim() !== "" ||
      item.score.trim() !== "",
  )
  function updateEducation(id: number, field: keyof Omit<Education, "id">, value: string) {
    setEducations((current) =>
      current.map((item) => item.id === id ? { ...item, [field]: value } : item),
    )
  }
  function addEducation() {
    setEducations((current) => {
      if (current.length >= 15) return current
      return [
        ...current,
        {
          id: Math.max(0, ...current.map((item) => item.id)) + 1,
          institution: "",
          studyProgram: "",
          year: "",
        },
      ]
    })
  }
  function removeEducation(id: number) {
    setEducations((current) => {
      if (current.length === 1) {
        return [{ id: current[0].id, institution: "", studyProgram: "", year: "" }]
      }
      return current.filter((item) => item.id !== id)
    })
  }
  function updatePortfolioItem(
    id: number,
    field: keyof Omit<PortfolioItem, "id">,
    value: string,
  ) {
    setPortfolioItems((current) =>
      current.map((item) => item.id === id ? { ...item, [field]: value } : item),
    )
  }
  function addPortfolioItem() {
    setPortfolioItems((current) => [
      ...current,
      { id: Math.max(0, ...current.map((item) => item.id)) + 1, title: "", description: "", url: "" },
    ])
  }
  function removePortfolioItem(id: number) {
    setPortfolioItems((current) => current.length === 1
      ? [{ id: current[0].id, title: "", description: "", url: "" }]
      : current.filter((item) => item.id !== id))
  }
  function updateLanguageScore(
    id: number,
    field: keyof Omit<LanguageScore, "id">,
    value: string,
  ) {
    setLanguageScores((current) =>
      current.map((item) => item.id === id ? { ...item, [field]: value } : item),
    )
  }
  function addLanguageScore() {
    setLanguageScores((current) => [
      ...current,
      { id: Math.max(0, ...current.map((item) => item.id)) + 1, language: "", test: "", score: "" },
    ])
  }
  function removeLanguageScore(id: number) {
    setLanguageScores((current) => current.length === 1
      ? [{ id: current[0].id, language: "", test: "", score: "" }]
      : current.filter((item) => item.id !== id))
  }
  function updateExperience(
    id: number,
    field: keyof Experience,
    value: string,
  ) {
    setExperiences((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]: value,
            }
          : item,
      ),
    )
  }
  function addExperience() {
    setExperiences((current) => [
      ...current,
      {
        id: Date.now(),
        position: "",
        company: "",
        description: "",
      },
    ])
  }
  function removeExperience(id: number) {
    setExperiences((current) => {
      if (current.length === 1) {
        return [
          {
            id: current[0].id,
            position: "",
            company: "",
            description: "",
          },
        ]
      }
      return current.filter((item) => item.id !== id)
    })
  }
  function updateAIExperience(
    index: number,
    field: "position" | "company",
    value: string,
  ) {
    setAiResult((current) => {
      if (!current) return current
      return {
        ...current,
        experiences: current.experiences.map((item, itemIndex) =>
          itemIndex === index
            ? {
                ...item,
                [field]: value,
              }
            : item,
        ),
      }
    })
  }
  function updateAIDescription(index: number, value: string) {
    setAiResult((current) => {
      if (!current) return current
      return {
        ...current,
        experiences: current.experiences.map((item, itemIndex) =>
          itemIndex === index
            ? {
                ...item,
                description: value
                  .split("\n")
                  .map((line) => line.trim())
                  .filter(Boolean),
              }
            : item,
        ),
      }
    })
  }
  function addAIExperience() {
    setAiResult((current) => {
      if (!current) return current
      return {
        ...current,
        experiences: [
          ...current.experiences,
          {
            position: "",
            company: "",
            description: [],
          },
        ],
      }
    })
  }
  function removeAIExperience(index: number) {
    setAiResult((current) => {
      if (!current) return current
      return {
        ...current,
        experiences: current.experiences.filter(
          (_, itemIndex) => itemIndex !== index,
        ),
      }
    })
  }
  function updateAISkills(value: string) {
    setAiResult((current) => {
      if (!current) return current
      return {
        ...current,
        skills: value
          .split(",")
          .map((skill) => skill.trim())
          .filter(Boolean),
      }
    })
  }
  async function handleGenerateAI() {
    if (!areRequiredFieldsComplete) {
      setMessage(`Kolom wajib yang belum diisi: ${missingRequiredFields.join(", ")}`)
      return
    }
    setAiLoading(true)
    setAiError("")
    setMessage("")
    setIsEditingResult(false)
    try {
      const {
        data: sessionData,
        error: sessionError,
      } = await supabase.auth.getSession()
      if (
        sessionError ||
        !sessionData.session?.access_token
      ) {
        throw new Error(
          "Session login tidak ditemukan. Silakan login kembali.",
        )
      }
      const accessToken = sessionData.session.access_token
      const {
        data,
        error,
      } = await supabase.functions.invoke("dinoai-cv", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: {
          idempotencyKey: crypto.randomUUID(),
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          location: location.trim(),
          summary,
          educations: filledEducations.map(({ institution, studyProgram, year }) => ({
            institution,
            studyProgram,
            year,
          })),
          experiences: experiences.map(({ position, company, description }) => ({
            position,
            company,
            description,
          })),
        },
      })
      if (error) {
        let backendMessage = ""
        let creditNotice = ""
        if (
          typeof error === "object" &&
          error !== null &&
          "context" in error
        ) {
          const context = (
            error as {
              context?: unknown
            }
          ).context
          if (context instanceof Response) {
            const body: unknown = await context
              .clone()
              .json()
              .catch(() => null)
            if (
              typeof body === "object" &&
              body !== null &&
              "error" in body &&
              typeof body.error === "string"
            ) {
              backendMessage = body.error
            }
            if (
              typeof body === "object" &&
              body !== null &&
              "creditsRestored" in body &&
              typeof body.creditsRestored === "boolean"
            ) {
              creditNotice = body.creditsRestored
                ? " Kredit AI untuk permintaan ini sudah dikembalikan."
                : " Periksa saldo kredit sebelum mencoba kembali."
            }
          }
        }
        throw new Error(
          `${backendMessage ||
            error.message ||
            "AI CV Maker gagal memproses data"}${creditNotice}`,
        )
      }
      if (!data?.success || !data?.cv) {
        throw new Error(
          "Respons dinoai-cv tidak sesuai. Silakan coba lagi.",
        )
      }
      const generatedResult: AIResult = {
        professionalSummary: typeof data.cv.professionalSummary === "string" ? data.cv.professionalSummary : "",
        skills: Array.isArray(data.cv.skills) ? data.cv.skills.filter((item: unknown): item is string => typeof item === "string") : [],
        experiences: Array.isArray(data.cv.experiences)
          ? data.cv.experiences.map((item: { position?: unknown; company?: unknown; description?: unknown }) => ({
              position: typeof item?.position === "string" ? item.position : "",
              company: typeof item?.company === "string" ? item.company : "",
              description: Array.isArray(item?.description) ? item.description.filter((value: unknown): value is string => typeof value === "string") : [],
            }))
          : [],
      }
      setAiResult(generatedResult)
      const generatedContent: SavedCVContent = {
        name,
        email,
        phone,
        location,
        summary,
        educations,
        experiences,
        portfolioItems,
        languageScores,
        aiResult: generatedResult,
        template,
        photoDataUrl,
      }
      const wasSaved = await saveCV(false, generatedContent)
      const quotaWarning = typeof data.quotaWarning === "string" ? data.quotaWarning : ""
      setMessage(
        `${wasSaved
          ? "CV berhasil dibuat dan disimpan. Periksa serta edit hasilnya jika diperlukan"
          : "CV berhasil dibuat, tetapi belum tersimpan. Hasil tetap tersedia; coba simpan kembali."}${quotaWarning ? ` ${quotaWarning}` : ""}`,
      )
    } catch (error) {
      console.error("AI CV Maker error:", error)
      setAiResult(null)
      setAiError(
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat membuat CV dengan AI",
      )
    } finally {
      setAiLoading(false)
    }
  }
  function handlePrintPDF() {
    if (!aiResult) {
      setMessage("Buat CV dengan AI terlebih dahulu sebelum menyimpan PDF")
      return
    }
    flushSync(() => {
      setMessage("")
      setIsEditingResult(false)
    })
    const source = document.getElementById("dinoedu-cv-print")
    if (!source) return
    const sourceId = source.id
    const printRoot = document.createElement("div")
    printRoot.id = "dinoedu-cv-print-root"
    const printCopy = source.cloneNode(true) as HTMLElement
    source.removeAttribute("id")
    printRoot.appendChild(printCopy)
    document.body.classList.add("dinoedu-cv-printing")
    document.body.appendChild(printRoot)
    let cleaned = false
    const cleanup = () => {
      if (cleaned) return
      cleaned = true
      printRoot.remove()
      source.id = sourceId
      document.body.classList.remove("dinoedu-cv-printing")
      window.removeEventListener("afterprint", cleanup)
      window.removeEventListener("focus", cleanup)
    }
    window.addEventListener("afterprint", cleanup, { once: true })
    window.addEventListener("focus", cleanup, { once: true })
    try {
      window.print()
    } catch {
      cleanup()
      setMessage("Jendela cetak tidak dapat dibuka. Izinkan pop-up lalu coba lagi.")
    }
  }
  return (
    <>
      <style>{`
        @page {
          size: A4;
          margin: 10mm;
        }
        .cv-preview-shell { container-type: inline-size; }
        #dinoedu-cv-print {
          box-sizing: border-box;
          width: 100%;
          max-width: 210mm;
          min-width: 0;
          aspect-ratio: 210 / 297;
          display: flex;
          flex-direction: column;
          margin-inline: auto;
          overflow-wrap: anywhere;
        }
        #dinoedu-cv-print .cv-watermark-footer {
          flex: 0 0 auto;
          margin-top: auto;
          border-top: 1px solid #e4e4e7;
          padding: 4mm 2mm 0;
          color: #a1a1aa;
          font-size: 9px;
          line-height: 1.3;
          text-align: center;
          user-select: none;
          -webkit-user-select: none;
          pointer-events: none;
          break-inside: avoid-page;
          page-break-inside: avoid;
        }
        @supports (min-height: 1cqw) {
          #dinoedu-cv-print {
            min-height: 141.428571cqw;
            aspect-ratio: auto;
          }
        }
        #dinoedu-cv-print .cv-header {

          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }
        #dinoedu-cv-print .cv-header-copy { min-width: 0; flex: 1; }
        #dinoedu-cv-print .cv-photo {
          width: 92px;
          height: 92px;
          flex: 0 0 auto;
          border: 1px solid #e4e4e7;
          border-radius: 10px;
          object-fit: cover;
        }
        #dinoedu-cv-print[data-template="ats-classic"] .cv-photo,
        #dinoedu-cv-print[data-template="modern-sidebar"] .cv-photo,
        #dinoedu-cv-print[data-template="creative-editorial"] .cv-photo { border-radius: 50%; }
        #dinoedu-cv-print .cv-sections {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 18px;
          flex: 1 0 auto;
          align-content: space-evenly;
          margin-top: 20px;
        }
        #dinoedu-cv-print .cv-section { min-width: 0; margin-top: 0 !important; }
        #dinoedu-cv-print .cv-section h4 {
          border-color: #d4d4d8;
          break-after: avoid-page;
          page-break-after: avoid;
        }
        #dinoedu-cv-print .cv-justified {
          text-align: justify;
          text-justify: inter-word;
          overflow-wrap: anywhere;
          hyphens: auto;
          orphans: 3;
          widows: 3;
        }
        #dinoedu-cv-print .cv-education-item,
        #dinoedu-cv-print .cv-experience-item,
        #dinoedu-cv-print .cv-portfolio-item,
        #dinoedu-cv-print .cv-language-item {
          min-width: 0;
          break-inside: avoid-page;
          page-break-inside: avoid;
        }
        #dinoedu-cv-print[data-template="ats-compact"] .cv-header {
          flex-direction: column-reverse;
          justify-content: center;
          text-align: center;
        }
        #dinoedu-cv-print[data-template="ats-compact"] .cv-header-copy { flex: initial; }
        #dinoedu-cv-print[data-template="ats-compact"] .cv-header-copy > div { justify-content: center; }
        #dinoedu-cv-print[data-template="ats-compact"] .cv-photo { width: 68px; height: 68px; }
        #dinoedu-cv-print[data-template="ats-compact"] .cv-sections { gap: 17px; }
        #dinoedu-cv-print[data-template="ats-compact"] .cv-section h4 { font-size: 11px; }
        #dinoedu-cv-print[data-template="modern-sidebar"] { padding: 0 !important; }
        #dinoedu-cv-print[data-template="modern-sidebar"] .cv-header {
          padding: 26px 30px;
          color: white;
          background: #172554;
          border-bottom: 0;
        }
        #dinoedu-cv-print[data-template="modern-sidebar"] .cv-header-copy > p,
        #dinoedu-cv-print[data-template="modern-sidebar"] .cv-header-copy > div { color: #dbeafe !important; }
        #dinoedu-cv-print[data-template="modern-sidebar"] .cv-photo { border: 1px solid rgba(255,255,255,.8); }
        #dinoedu-cv-print[data-template="modern-sidebar"] .cv-sections {
          grid-template-columns: minmax(0, 0.72fr) minmax(0, 1.5fr);
          grid-auto-flow: row dense;
          gap: 22px 26px;
          padding: 26px 30px;
          margin-top: 0;
        }
        #dinoedu-cv-print[data-template="modern-sidebar"] .cv-profile-section { grid-column: 2; }
        #dinoedu-cv-print[data-template="modern-sidebar"] .cv-education-section { grid-column: 1; }
        #dinoedu-cv-print[data-template="modern-sidebar"] .cv-experience-section { grid-column: 2; }
        #dinoedu-cv-print[data-template="modern-sidebar"] .cv-portfolio-section { grid-column: 2; }
        #dinoedu-cv-print[data-template="modern-sidebar"] .cv-language-section { grid-column: 1; }
        #dinoedu-cv-print[data-template="modern-sidebar"] .cv-skills-section {
          grid-column: 1;
          padding: 14px;
          background: #eff6ff;
          border-radius: 12px;
        }
        #dinoedu-cv-print[data-template="modern-sidebar"] .cv-section h4 { color: #1d4ed8; }
        #dinoedu-cv-print[data-template="modern-header"] .cv-header {
          padding: 20px;
          background: #eff6ff;
          border: 0;
          border-left: 6px solid #2563eb;
          border-radius: 0 14px 14px 0;
        }
        #dinoedu-cv-print[data-template="modern-header"] .cv-sections { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 22px 26px; }
        #dinoedu-cv-print[data-template="modern-header"] .cv-profile-section,
        #dinoedu-cv-print[data-template="modern-header"] .cv-experience-section { grid-column: 1 / -1; }
        #dinoedu-cv-print[data-template="modern-header"] .cv-section h4 { color: #1d4ed8; }
        #dinoedu-cv-print[data-template="creative-editorial"] .cv-header {
          padding: 24px;
          color: white;
          background: #5b21b6;
          border: 0;
          border-radius: 14px;
        }
        #dinoedu-cv-print[data-template="creative-editorial"] .cv-header h3 { font-family: Georgia, serif; font-size: 34px; }
        #dinoedu-cv-print[data-template="creative-editorial"] .cv-header-copy > p,
        #dinoedu-cv-print[data-template="creative-editorial"] .cv-header-copy > div { color: #ede9fe !important; }
        #dinoedu-cv-print[data-template="creative-editorial"] .cv-photo { border: 1px solid white; }
        #dinoedu-cv-print[data-template="creative-editorial"] .cv-sections { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 22px 26px; }
        #dinoedu-cv-print[data-template="creative-editorial"] .cv-profile-section,
        #dinoedu-cv-print[data-template="creative-editorial"] .cv-experience-section { grid-column: 1 / -1; }
        #dinoedu-cv-print[data-template="creative-editorial"] .cv-section h4 { color: #6d28d9; border-color: #c4b5fd; }
        #dinoedu-cv-print[data-template="creative-editorial"] .cv-skills-section span { color: #5b21b6; background: #ede9fe; }
        #dinoedu-cv-print[data-template="creative-timeline"] .cv-header {
          padding-bottom: 18px;
          border-bottom: 4px solid #0f766e;
        }
        #dinoedu-cv-print[data-template="creative-timeline"] .cv-header h3 { color: #115e59; }
        #dinoedu-cv-print[data-template="creative-timeline"] .cv-sections {
          grid-template-columns: minmax(0, 0.75fr) minmax(0, 1.35fr);
          grid-auto-flow: row dense;
          gap: 22px 28px;
        }
        #dinoedu-cv-print[data-template="creative-timeline"] .cv-profile-section { grid-column: 1; }
        #dinoedu-cv-print[data-template="creative-timeline"] .cv-education-section { grid-column: 2; }
        #dinoedu-cv-print[data-template="creative-timeline"] .cv-skills-section { grid-column: 1; }
        #dinoedu-cv-print[data-template="creative-timeline"] .cv-experience-section { grid-column: 2; }
        #dinoedu-cv-print[data-template="creative-timeline"] .cv-portfolio-section { grid-column: 2; }
        #dinoedu-cv-print[data-template="creative-timeline"] .cv-language-section { grid-column: 1; }
        #dinoedu-cv-print[data-template="creative-timeline"] .cv-section h4 { color: #0f766e; border-color: #99f6e4; }
        #dinoedu-cv-print[data-template="creative-timeline"] .cv-experience-item { border-left: 2px solid #5eead4; padding-left: 14px; }
        body.dinoedu-cv-printing > *:not(#dinoedu-cv-print-root) {
          display: none !important;
        }
        body.dinoedu-cv-printing > #dinoedu-cv-print-root {
          display: block !important;
          width: 190mm;
          max-width: 100%;
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          background: #ffffff;
        }
        @media print {
          html,
          body {
            width: auto !important;
            height: auto !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          body * {
            visibility: hidden !important;
          }
          #dinoedu-cv-print-root,
          #dinoedu-cv-print-root * {
            visibility: visible !important;
          }
          #dinoedu-cv-print-root {
            position: static !important;
            display: block !important;
            width: 190mm !important;
            max-width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          #dinoedu-cv-print {
            position: static !important;
            display: flex !important;
            flex-direction: column !important;
            width: 100% !important;
            max-width: none !important;
            min-width: 0 !important;
            min-height: 277mm !important;
            height: auto !important;
            aspect-ratio: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }
          #dinoedu-cv-print .cv-sections {
            flex: initial !important;
            min-height: 215mm;
            margin-top: 7mm !important;
            gap: 5mm !important;
            align-content: space-evenly;
          }
          #dinoedu-cv-print .cv-header,
          #dinoedu-cv-print .cv-education-item,
          #dinoedu-cv-print .cv-experience-item,
          #dinoedu-cv-print .cv-portfolio-item,
          #dinoedu-cv-print .cv-language-item {
            break-inside: avoid-page;
            page-break-inside: avoid;
          }
          #dinoedu-cv-print .cv-section h4 {
            break-after: avoid-page;
            page-break-after: avoid;
          }
          #dinoedu-cv-print * {
            box-sizing: border-box;
            max-width: 100%;
          }
          #dinoedu-cv-print .cv-header-copy,
          #dinoedu-cv-print .cv-section,
          #dinoedu-cv-print .cv-education-item,
          #dinoedu-cv-print .cv-experience-item {
            overflow-wrap: anywhere;
            word-break: normal;
          }
          .dino-no-print {
            display: none !important;
          }
        }
      `}</style>
      <div className="modal-scrollbar-hidden h-dvh overflow-x-hidden overflow-y-auto bg-background text-foreground">
        {/* DINOEDU SPACE BACKGROUND */}
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="dino-float absolute left-[-140px] top-[100px] h-[320px] w-[320px] rounded-full bg-[#EECDA3]/25 blur-3xl" />
          <div className="dino-float-slow absolute right-[-120px] top-[180px] h-[360px] w-[360px] rounded-full bg-[#EF629F]/15 blur-3xl" />
        </div>
        {/* HEADER */}
        <header className="sticky top-0 z-50 border-b border-border/50 bg-background/70 backdrop-blur-xl">
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
                className="h-5 w-5 scale-110 object-contain"
              />
              AI CV Maker
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-5 pb-20 pt-10 sm:px-6 sm:pt-14 lg:px-8">
          {/* HERO */}
          <section className="dino-enter mb-10 dino-no-print">
            <div className="dino-glass relative overflow-hidden rounded-[32px] p-7 sm:p-10">
              <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[#EF629F]/10 blur-3xl" />
              <div className="relative max-w-3xl">
                <div className="flex items-center gap-2 text-[14px] font-semibold text-[#EF629F]">
                  <img
                    src="/logodino.PNG"
                    alt=""
                    className="h-4 w-4 scale-125 object-contain"
                  />
                  DinoEdu AI
                </div>
                <h1 className="dino-hero-title mt-4 text-3xl font-bold sm:text-5xl">
                  Buat CV profesional
                  <span className="block bg-gradient-to-r from-[#EECDA3] to-[#EF629F] bg-clip-text pb-1 text-transparent">
                    dengan bantuan AI
                  </span>
                </h1>
                <p className="mt-4 max-w-2xl text-[18px] leading-relaxed text-muted-foreground">
                  Masukkan informasi dasar kamu lalu DinoAI akan membantu
                  menyusun CV yang rapi dan profesional
                </p>
              </div>
            </div>
          </section>
          <section>
            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              {/* LEFT FORM */}
              <div className="dino-glass rounded-[32px] p-6 sm:p-8 dino-no-print">
                <div className="mb-9">
                  <p className="text-[14px] font-semibold uppercase tracking-[0.18em] text-[#EF629F]">
                    Pilih desain
                  </p>
                  <h2 className="mt-2 text-2xl font-bold">6 model CV</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Pilih tampilan yang paling sesuai. Pilihan ini hanya mengubah layout CV.
                  </p>
                  <div className="mt-5 space-y-5">
                    {["ATS Minimalis", "Profesional Modern", "Kreatif"].map((group) => (
                      <div key={group}>
                        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">{group}</p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {cvTemplates.filter((item) => item.group === group).map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              aria-pressed={template === item.id}
                              onClick={() => setTemplate(item.id)}
                              className={`rounded-2xl border p-4 text-left transition ${template === item.id ? "border-[#EF629F]/60 bg-[#EF629F]/10 ring-1 ring-[#EF629F]/30" : "border-border/70 bg-white/30 hover:border-[#EF629F]/30 dark:bg-white/5"}`}
                            >
                              <span className="flex items-center justify-between gap-2 text-sm font-semibold">
                                {item.name}
                                {template === item.id && <Check className="h-4 w-4 text-[#EF629F]" />}
                              </span>
                              <span className="mt-1 block text-xs leading-5 text-muted-foreground">{item.description}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* DATA DIRI */}
                <div className="mb-8">
                  <p className="text-[14px] font-semibold uppercase tracking-[0.18em] text-[#EF629F]">
                    Data diri
                  </p>
                  <h2 className="mt-2 text-2xl font-bold">
                    Informasi pribadi
                  </h2>
                </div>
                <div className="space-y-5">
                  {/* NAMA */}
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
                  {/* EMAIL */}
                  <div>
                    <label className="mb-2 block text-[14px] font-medium">
                      Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="nama@email.com"
                        className="w-full rounded-2xl border border-border/70 bg-white/40 py-3.5 pl-11 pr-4 text-[17px] outline-none backdrop-blur-xl transition focus:border-[#EF629F]/50 dark:bg-white/5"
                      />
                    </div>
                  </div>
                  {/* NOMOR HP */}
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
                  {/* LOKASI */}
                  <div>
                    <label className="mb-2 block text-[14px] font-medium">
                      Lokasi
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        value={location}
                        onChange={(event) =>
                          setLocation(event.target.value)
                        }
                        placeholder="Kota, Provinsi"
                        className="w-full rounded-2xl border border-border/70 bg-white/40 py-3.5 pl-11 pr-4 text-[17px] outline-none backdrop-blur-xl transition focus:border-[#EF629F]/50 dark:bg-white/5"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-2 block text-[14px] font-medium">Foto profil <span className="font-normal text-muted-foreground">(opsional)</span></label>
                    <div className="flex items-center gap-4 rounded-2xl border border-border/70 bg-white/30 p-4 dark:bg-white/5">
                      {photoDataUrl ? (
                        <img src={photoDataUrl} alt="Pratinjau foto profil" className="h-20 w-16 rounded-xl object-cover" />
                      ) : (
                        <div className="flex h-20 w-16 items-center justify-center rounded-xl bg-muted text-muted-foreground"><UserRound className="h-7 w-7" /></div>
                      )}
                      <div className="min-w-0 flex-1">
                        <label htmlFor="cv-profile-photo" className="inline-flex cursor-pointer items-center rounded-xl border border-border/70 px-3 py-2 text-sm font-semibold transition hover:border-[#EF629F]/40 hover:text-[#EF629F]">
                          {photoDataUrl ? "Ganti foto" : "Pilih foto"}
                        </label>
                        <input id="cv-profile-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoChange} className="sr-only" />
                        <p className="mt-2 text-xs leading-5 text-muted-foreground">JPG, PNG, atau WebP · maksimal 5 MB. Foto akan dipotong proporsional.</p>
                        {photoDataUrl && <button type="button" onClick={() => { setPhotoDataUrl(""); setMessage("Foto profil dihapus") }} className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-red-500"><Trash2 className="h-3 w-3" />Hapus foto</button>}
                      </div>
                    </div>
                  </div>
                  {/* DESKRIPSI */}
                  <div>
                    <label className="mb-2 block text-[14px] font-medium">
                      Deskripsi singkat
                    </label>
                    <textarea
                      rows={4}
                      value={summary}
                      onChange={(event) => setSummary(event.target.value)}
                      placeholder="Contoh: Lulusan S1 Pendidikan Guru Sekolah Dasar dengan pengalaman..."
                      className="modal-scrollbar-hidden w-full resize-none rounded-2xl border border-border/70 bg-white/40 px-4 py-3.5 text-[17px] leading-7 outline-none backdrop-blur-xl transition focus:border-[#EF629F]/50 dark:bg-white/5"
                    />
                  </div>
                </div>
                <div className="my-10 border-t border-border/60" />
                {/* PENDIDIKAN */}
                <div className="mb-8">
                  <p className="text-[14px] font-semibold uppercase tracking-[0.18em] text-[#EF629F]">
                    Pendidikan
                  </p>
                  <h2 className="mt-2 text-2xl font-bold">
                    Riwayat pendidikan
                  </h2>
                </div>
                <p className="mb-4 text-sm text-muted-foreground">
                  Tambahkan semua jenjang pendidikan yang relevan. Setiap entri akan tampil di preview dan PDF.
                </p>
                <div className="space-y-5">
                  {educations.map((education, index) => (
                    <div key={education.id} className="rounded-2xl border border-border/60 bg-white/20 p-5 dark:bg-white/[0.03]">
                      <div className="mb-5 flex items-center justify-between gap-3">
                        <p className="text-[14px] font-semibold text-muted-foreground">Pendidikan {index + 1}</p>
                        {educations.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeEducation(education.id)}
                            aria-label={`Hapus pendidikan ${index + 1}`}
                            className="inline-flex items-center gap-2 text-[13px] font-semibold text-red-500 transition hover:opacity-80"
                          >
                            <Trash2 className="h-4 w-4" />
                            Hapus
                          </button>
                        )}
                      </div>
                      <div className="space-y-5">
                        <div>
                          <label className="mb-2 block text-[14px] font-medium">Institusi</label>
                          <div className="relative">
                            <GraduationCap className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                              type="text"
                              value={education.institution}
                              onChange={(event) => updateEducation(education.id, "institution", event.target.value)}
                              placeholder="Nama universitas / sekolah"
                              className="w-full rounded-2xl border border-border/70 bg-white/40 py-3.5 pl-11 pr-4 text-[17px] outline-none backdrop-blur-xl transition focus:border-[#EF629F]/50 dark:bg-white/5"
                            />
                          </div>
                        </div>
                        <div className="grid gap-5 sm:grid-cols-2">
                          <div>
                            <label className="mb-2 block text-[14px] font-medium">Program studi / gelar</label>
                            <input
                              type="text"
                              value={education.studyProgram}
                              onChange={(event) => updateEducation(education.id, "studyProgram", event.target.value)}
                              placeholder="Program studi atau gelar"
                              className="w-full rounded-2xl border border-border/70 bg-white/40 px-4 py-3.5 text-[17px] outline-none backdrop-blur-xl transition focus:border-[#EF629F]/50 dark:bg-white/5"
                            />
                          </div>
                          <div>
                            <label className="mb-2 block text-[14px] font-medium">Tahun</label>
                            <input
                              type="text"
                              value={education.year}
                              onChange={(event) => updateEducation(education.id, "year", event.target.value)}
                              placeholder="2022 - 2026"
                              className="w-full rounded-2xl border border-border/70 bg-white/40 px-4 py-3.5 text-[17px] outline-none backdrop-blur-xl transition focus:border-[#EF629F]/50 dark:bg-white/5"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addEducation}
                    disabled={educations.length >= 15}
                    className="inline-flex items-center gap-2 rounded-xl border border-border/70 bg-white/30 px-4 py-3 text-[14px] font-semibold transition hover:border-[#EF629F]/50 hover:text-[#EF629F] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/5"
                  >
                    <Plus className="h-4 w-4" />
                    {educations.length >= 15 ? "Maksimal 15 pendidikan" : "Tambah pendidikan"}
                  </button>
                </div>                <div className="my-10 border-t border-border/60" />
                {/* PENGALAMAN */}
                <div className="mb-8">
                  <p className="text-[14px] font-semibold uppercase tracking-[0.18em] text-[#EF629F]">
                    Pengalaman
                  </p>
                  <h2 className="mt-2 text-2xl font-bold">
                    Pengalaman kerja
                  </h2>
                </div>
                <div className="space-y-6">
                  {experiences.map((experience, index) => (
                    <div
                      key={experience.id}
                      className="rounded-2xl border border-border/60 bg-white/20 p-5 dark:bg-white/[0.03]"
                    >
                      {experiences.length > 1 && (
                        <div className="mb-5 flex items-center justify-between">
                          <p className="text-[14px] font-semibold text-muted-foreground">
                            Pengalaman {index + 1}
                          </p>
                          <button
                            type="button"
                            onClick={() =>
                              removeExperience(experience.id)
                            }
                            className="inline-flex items-center gap-2 text-[13px] font-semibold text-red-500 transition hover:opacity-80"
                          >
                            <Trash2 className="h-4 w-4" />
                            Hapus
                          </button>
                        </div>
                      )}
                      <div className="space-y-5">
                        {/* POSISI */}
                        <div>
                          <label className="mb-2 block text-[14px] font-medium">
                            Posisi
                          </label>
                          <div className="relative">
                            <BriefcaseBusiness className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                              type="text"
                              value={experience.position}
                              onChange={(event) =>
                                updateExperience(
                                  experience.id,
                                  "position",
                                  event.target.value,
                                )
                              }
                              placeholder="Contoh: Guru / Editor / Staff"
                              className="w-full rounded-2xl border border-border/70 bg-white/40 py-3.5 pl-11 pr-4 text-[17px] outline-none backdrop-blur-xl transition focus:border-[#EF629F]/50 dark:bg-white/5"
                            />
                          </div>
                        </div>
                        {/* PERUSAHAAN */}
                        <div>
                          <label className="mb-2 block text-[14px] font-medium">
                            Instansi / perusahaan
                          </label>
                          <input
                            type="text"
                            value={experience.company}
                            onChange={(event) =>
                              updateExperience(
                                experience.id,
                                "company",
                                event.target.value,
                              )
                            }
                            placeholder="Nama instansi atau perusahaan"
                            className="w-full rounded-2xl border border-border/70 bg-white/40 px-4 py-3.5 text-[17px] outline-none backdrop-blur-xl transition focus:border-[#EF629F]/50 dark:bg-white/5"
                          />
                        </div>
                        {/* DESKRIPSI PENGALAMAN */}
                        <div>
                          <label className="mb-2 block text-[14px] font-medium">
                            Deskripsi pengalaman
                          </label>
                          <textarea
                            rows={5}
                            value={experience.description}
                            onChange={(event) =>
                              updateExperience(
                                experience.id,
                                "description",
                                event.target.value,
                              )
                            }
                            placeholder="Tuliskan tugas, tanggung jawab, dan pencapaian"
                            className="modal-scrollbar-hidden w-full resize-none rounded-2xl border border-border/70 bg-white/40 px-4 py-3.5 text-[17px] leading-7 outline-none backdrop-blur-xl transition focus:border-[#EF629F]/50 dark:bg-white/5"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  {/* TAMBAH PENGALAMAN */}
                  <button
                    type="button"
                    onClick={addExperience}
                    className="inline-flex items-center gap-2 rounded-xl border border-border/70 px-4 py-3 text-[14px] font-semibold transition hover:border-[#EF629F]/40 hover:text-[#EF629F]"
                  >
                    <Plus className="h-4 w-4" />
                    Tambah pengalaman
                  </button>
                </div>
                <div className="my-10 border-t border-border/60" />
                {/* KARYA & PORTOFOLIO */}
                <div className="mb-8">
                  <p className="text-[14px] font-semibold uppercase tracking-[0.18em] text-[#EF629F]">
                    Karya
                  </p>
                  <h2 className="mt-2 text-2xl font-bold">Karya &amp; portofolio <span className="text-base font-normal text-muted-foreground">(opsional)</span></h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Tambahkan proyek, publikasi, desain, atau karya lain beserta tautannya jika ada.
                  </p>
                </div>
                <div className="space-y-5">
                  {portfolioItems.map((item, index) => (
                    <div key={item.id} className="rounded-2xl border border-border/60 bg-white/20 p-5 dark:bg-white/[0.03]">
                      <div className="mb-5 flex items-center justify-between gap-3">
                        <p className="text-[14px] font-semibold text-muted-foreground">Karya {index + 1}</p>
                        {portfolioItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removePortfolioItem(item.id)}
                            aria-label={`Hapus karya ${index + 1}`}
                            className="inline-flex items-center gap-2 text-[13px] font-semibold text-red-500 transition hover:opacity-80"
                          >
                            <Trash2 className="h-4 w-4" />
                            Hapus
                          </button>
                        )}
                      </div>
                      <div className="space-y-5">
                        <div>
                          <label className="mb-2 block text-[14px] font-medium">Nama karya / proyek</label>
                          <input
                            type="text"
                            value={item.title}
                            onChange={(event) => updatePortfolioItem(item.id, "title", event.target.value)}
                            placeholder="Contoh: Aplikasi belajar interaktif"
                            className="w-full rounded-2xl border border-border/70 bg-white/40 px-4 py-3.5 text-[17px] outline-none backdrop-blur-xl transition focus:border-[#EF629F]/50 dark:bg-white/5"
                          />
                        </div>
                        <div>
                          <label className="mb-2 block text-[14px] font-medium">Tautan karya <span className="font-normal text-muted-foreground">(opsional)</span></label>
                          <input
                            type="url"
                            value={item.url}
                            onChange={(event) => updatePortfolioItem(item.id, "url", event.target.value)}
                            placeholder="https://..."
                            className="w-full rounded-2xl border border-border/70 bg-white/40 px-4 py-3.5 text-[17px] outline-none backdrop-blur-xl transition focus:border-[#EF629F]/50 dark:bg-white/5"
                          />
                        </div>
                        <div>
                          <label className="mb-2 block text-[14px] font-medium">Deskripsi / kontribusi</label>
                          <textarea
                            rows={3}
                            value={item.description}
                            onChange={(event) => updatePortfolioItem(item.id, "description", event.target.value)}
                            placeholder="Jelaskan karya atau kontribusi kamu secara singkat"
                            className="modal-scrollbar-hidden w-full resize-none rounded-2xl border border-border/70 bg-white/40 px-4 py-3.5 text-[17px] leading-7 outline-none backdrop-blur-xl transition focus:border-[#EF629F]/50 dark:bg-white/5"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addPortfolioItem}
                    className="inline-flex items-center gap-2 rounded-xl border border-border/70 px-4 py-3 text-[14px] font-semibold transition hover:border-[#EF629F]/40 hover:text-[#EF629F]"
                  >
                    <Plus className="h-4 w-4" />
                    Tambah karya
                  </button>
                </div>
                <div className="my-10 border-t border-border/60" />
                {/* SKOR BAHASA */}
                <div className="mb-8">
                  <p className="text-[14px] font-semibold uppercase tracking-[0.18em] text-[#EF629F]">
                    Kemampuan bahasa
                  </p>
                  <h2 className="mt-2 text-2xl font-bold">Skor bahasa <span className="text-base font-normal text-muted-foreground">(opsional)</span></h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Isi hasil tes seperti TOEFL atau IELTS jika tersedia.
                  </p>
                </div>
                <div className="space-y-5">
                  {languageScores.map((item, index) => (
                    <div key={item.id} className="rounded-2xl border border-border/60 bg-white/20 p-5 dark:bg-white/[0.03]">
                      <div className="mb-5 flex items-center justify-between gap-3">
                        <p className="text-[14px] font-semibold text-muted-foreground">Skor bahasa {index + 1}</p>
                        {languageScores.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeLanguageScore(item.id)}
                            aria-label={`Hapus skor bahasa ${index + 1}`}
                            className="inline-flex items-center gap-2 text-[13px] font-semibold text-red-500 transition hover:opacity-80"
                          >
                            <Trash2 className="h-4 w-4" />
                            Hapus
                          </button>
                        )}
                      </div>
                      <div className="grid gap-5 sm:grid-cols-3">
                        <div>
                          <label className="mb-2 block text-[14px] font-medium">Bahasa</label>
                          <input
                            type="text"
                            value={item.language}
                            onChange={(event) => updateLanguageScore(item.id, "language", event.target.value)}
                            placeholder="Bahasa Inggris"
                            className="w-full rounded-2xl border border-border/70 bg-white/40 px-4 py-3.5 text-[17px] outline-none backdrop-blur-xl transition focus:border-[#EF629F]/50 dark:bg-white/5"
                          />
                        </div>
                        <div>
                          <label className="mb-2 block text-[14px] font-medium">Tes / sertifikat</label>
                          <input
                            type="text"
                            value={item.test}
                            onChange={(event) => updateLanguageScore(item.id, "test", event.target.value)}
                            placeholder="TOEFL / IELTS"
                            className="w-full rounded-2xl border border-border/70 bg-white/40 px-4 py-3.5 text-[17px] outline-none backdrop-blur-xl transition focus:border-[#EF629F]/50 dark:bg-white/5"
                          />
                        </div>
                        <div>
                          <label className="mb-2 block text-[14px] font-medium">Skor</label>
                          <input
                            type="text"
                            value={item.score}
                            onChange={(event) => updateLanguageScore(item.id, "score", event.target.value)}
                            placeholder="Contoh: 550 atau 7.5"
                            className="w-full rounded-2xl border border-border/70 bg-white/40 px-4 py-3.5 text-[17px] outline-none backdrop-blur-xl transition focus:border-[#EF629F]/50 dark:bg-white/5"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addLanguageScore}
                    className="inline-flex items-center gap-2 rounded-xl border border-border/70 px-4 py-3 text-[14px] font-semibold transition hover:border-[#EF629F]/40 hover:text-[#EF629F]"
                  >
                    <Plus className="h-4 w-4" />
                    Tambah skor bahasa
                  </button>
                </div>
                {/* AI BUTTON */}
                <button
                  type="button"
                  onClick={handleGenerateAI}
                  disabled={!areRequiredFieldsComplete || aiLoading}
                  className={`dino-gradient mt-10 w-full rounded-2xl px-5 py-4 text-[15px] font-semibold text-white shadow-lg shadow-pink-500/10 transition-all duration-200 ${
                    areRequiredFieldsComplete && !aiLoading
                      ? "dino-button"
                      : "cursor-not-allowed opacity-50"
                  }`}
                >
                  <img
                    src="/logodino.PNG"
                    alt=""
                    className="mr-2 inline-block h-4 w-4 scale-125 object-contain"
                  />
                  {aiLoading
                    ? "Sedang menyusun CV..."
                    : aiResult
                      ? "Buat Ulang dengan AI · 2 Kredit"
                      : "Buat CV dengan AI · 2 Kredit"}
                </button>
                <div className="mt-4 flex items-start gap-3 rounded-2xl border border-[#EF629F]/15 bg-[#EF629F]/[0.04] px-4 py-3.5 text-left">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#EF629F]/10 text-[#EF629F]">
                    <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold text-foreground">
                      Privasi data Anda
                    </p>
                    <p className="mt-1 text-[12px] leading-5 text-muted-foreground">
                      Nama, email, nomor HP, dan lokasi diproses oleh server DinoEdu untuk validasi dan penyusunan CV. Data tersebut tidak diteruskan ke model AI.
                    </p>
                  </div>
                </div>
                {!areRequiredFieldsComplete && (
                  <p className="mt-3 text-center text-[12px] text-muted-foreground">
                    Masih perlu diisi: {missingRequiredFields.join(", ")}
                  </p>
                )}
                {areRequiredFieldsComplete && !isEmailValid && (
                  <p className="mt-3 text-center text-[12px] text-amber-600">
                    Periksa format email agar informasi kontak pada CV benar.
                  </p>
                )}
                {isLoadingSaved && (
          <div className="dino-no-print mb-4 rounded-2xl border border-border/60 bg-white/30 px-4 py-3 text-center text-[12px] text-muted-foreground backdrop-blur-xl dark:bg-white/5">
            Memuat CV tersimpan...
          </div>
        )}
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
              </div>
              {/* PREVIEW */}
              <div className="lg:sticky lg:top-28 lg:self-start">
                <div className="mb-4 flex items-end justify-between gap-4 dino-no-print">
                  <div>
                    <p className="text-[14px] font-semibold uppercase tracking-[0.18em] text-[#EF629F]">
                      Preview
                    </p>
                    <h2 className="mt-2 text-2xl font-bold">
                      Pratinjau CV
                    </h2>
                  </div>
                  {aiResult && (
                    <div className="hidden items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-[12px] font-semibold text-emerald-600 sm:inline-flex">
                      <Check className="h-3.5 w-3.5" />
                      CV siap
                    </div>
                  )}
                </div>
                {aiResult && (
                  <div className="mb-4 flex flex-wrap gap-2 dino-no-print">
                    <button
                      type="button"
                      onClick={() =>
                        setIsEditingResult((current) => !current)
                      }
                      className="dino-button inline-flex items-center gap-2 rounded-xl border border-border/70 bg-white/40 px-4 py-2.5 text-[13px] font-semibold backdrop-blur-xl dark:bg-white/5"
                    >
                      {isEditingResult ? (
                        <>
                          <Check className="h-4 w-4" />
                          Selesai edit
                        </>
                      ) : (
                        <>
                          <Pencil className="h-4 w-4" />
                          Edit hasil
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => void saveCV()}
                      disabled={isSaving}
                      className="dino-button inline-flex items-center gap-2 rounded-xl border border-border/70 bg-white/40 px-4 py-2.5 text-[13px] font-semibold backdrop-blur-xl disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/5"
                    >
                      <Save className="h-4 w-4" />
                      {isSaving ? "Menyimpan..." : "Simpan"}
                    </button>
                    <button
                      type="button"
                      onClick={handlePrintPDF}
                      className="dino-gradient inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold text-white shadow-lg shadow-pink-500/10 transition-all duration-200 dino-button"
                    >
                      <Download className="h-4 w-4" />
                      Cetak / Simpan PDF
                    </button>
                  </div>
                )}
                <div className="cv-preview-shell dino-glass rounded-[32px] p-5 sm:p-7">
                  <div
                    id="dinoedu-cv-print"
                    data-template={template}
                    className="w-full min-w-0 rounded-2xl bg-white p-6 text-black shadow-xl sm:p-8"
                  >
                    {/* CV HEADER */}
                    <div className="cv-header border-b-2 border-zinc-900 pb-5">
                      <div className="cv-header-copy">
                        <h3 className="text-3xl font-bold tracking-tight">
                          {name || "Nama Lengkap"}
                        </h3>
                        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[12px] text-zinc-600">
                          {email && (
                            <span className="inline-flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5 shrink-0" />
                              {email}
                            </span>
                          )}
                          {phone && (
                            <span className="inline-flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5 shrink-0" />
                              {phone}
                            </span>
                          )}
                          {location && (
                          <span className="inline-flex min-w-0 max-w-full items-start gap-1.5 break-words">
                            {showLocationIcon && <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
                            <span className="min-w-0 break-words">{location}</span>
                            </span>
                          )}
                        </div>
                      </div>
                      {photoDataUrl && <img src={photoDataUrl} alt={`Foto ${name || "profil"}`} className="cv-photo" />}
                    </div>
                    <div className="cv-sections">
                    {/* PROFILE */}
                    {(aiResult?.professionalSummary || summary || isEditingResult || !aiResult) && (

                    <div className="cv-section cv-profile-section mt-7">
                      <h4 className="border-b border-zinc-200 pb-2 text-[12px] font-bold uppercase tracking-[0.16em]">
                        Profil Profesional
                      </h4>
                      {isEditingResult && aiResult ? (
                        <textarea
                          rows={6}
                          value={aiResult.professionalSummary}
                          onChange={(event) =>
                            setAiResult((current) =>
                              current
                                ? {
                                    ...current,
                                    professionalSummary:
                                      event.target.value,
                                  }
                                : current,
                            )
                          }
                          className="mt-3 w-full resize-none rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2.5 text-[13px] leading-6 text-zinc-700 outline-none focus:border-zinc-500"
                        />
                      ) : (
                        <p className="cv-justified mt-3 text-[13px] leading-6 text-zinc-700">
                          {aiResult?.professionalSummary ||
                            summary ||
                            "Deskripsi singkat tentang profil profesional akan tampil di bagian ini"}
                        </p>
                      )}
                    </div>
                    )}
                    {/* EDUCATION */}
                    {(filledEducations.length > 0 || !aiResult) && (
                      <div className="cv-section cv-education-section mt-7">
                        <h4 className="border-b border-zinc-200 pb-2 text-[12px] font-bold uppercase tracking-[0.16em]">
                          Pendidikan
                        </h4>
                        {filledEducations.length > 0 ? (
                          <div className="mt-4 space-y-3">
                            {filledEducations.map((education) => (
                              <div key={education.id} className="cv-education-item min-w-0">
                                <div className="flex min-w-0 items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="break-words text-[13px] font-semibold">
                                      {education.institution || education.studyProgram}
                                    </p>
                                    {education.institution && education.studyProgram && (
                                      <p className="mt-1 break-words text-[12px] text-zinc-600">
                                        {education.studyProgram}
                                      </p>
                                    )}
                                  </div>
                                  {education.year && (
                                    <p className="max-w-[40%] min-w-0 break-words text-right text-[12px] text-zinc-600">
                                      {education.year}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-4 text-[12px] text-zinc-400">
                            Riwayat pendidikan yang diisi akan tampil di sini
                          </p>
                        )}
                      </div>
                    )}
                    {/* EXPERIENCE */}
                    {Boolean(aiResult?.experiences?.length || filledExperiences.length || !aiResult) && (

                    <div className="cv-section cv-experience-section mt-7">
                      <div className="flex items-center justify-between gap-3">
                        <h4 className="border-b border-zinc-200 pb-2 text-[12px] font-bold uppercase tracking-[0.16em]">
                          Pengalaman
                        </h4>
                        {isEditingResult && aiResult && (
                          <button
                            type="button"
                            onClick={addAIExperience}
                            className="dino-no-print inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 px-2.5 py-1.5 text-[11px] font-semibold text-zinc-700 transition hover:border-zinc-500"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Tambah
                          </button>
                        )}
                      </div>
                      {aiResult?.experiences?.length ? (
                        <div className="mt-4 space-y-5">
                          {aiResult.experiences.map(
                            (experience, index) => (
                              <div
                                key={index}
                                className="cv-experience-item relative"
                              >
                                {isEditingResult ? (
                                  <div className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="grid flex-1 gap-3 sm:grid-cols-2">
                                        <input
                                          type="text"
                                          value={experience.position}
                                          onChange={(event) =>
                                            updateAIExperience(
                                              index,
                                              "position",
                                              event.target.value,
                                            )
                                          }
                                          placeholder="Posisi"
                                          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-[12px] font-semibold text-zinc-800 outline-none focus:border-zinc-500"
                                        />
                                        <input
                                          type="text"
                                          value={experience.company}
                                          onChange={(event) =>
                                            updateAIExperience(
                                              index,
                                              "company",
                                              event.target.value,
                                            )
                                          }
                                          placeholder="Instansi / perusahaan"
                                          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-[12px] text-zinc-700 outline-none focus:border-zinc-500"
                                        />
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          removeAIExperience(index)
                                        }
                                        className="dino-no-print inline-flex rounded-lg p-2 text-red-500 transition hover:bg-red-50"
                                        aria-label={`Hapus pengalaman ${index + 1}`}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    </div>
                                    <textarea
                                      rows={5}
                                      value={experience.description.join(
                                        "\n",
                                      )}
                                      onChange={(event) =>
                                        updateAIDescription(
                                          index,
                                          event.target.value,
                                        )
                                      }
                                      placeholder="Satu poin pengalaman per baris"
                                      className="w-full resize-none rounded-lg border border-zinc-300 bg-white px-3 py-2 text-[12px] leading-5 text-zinc-700 outline-none focus:border-zinc-500"
                                    />
                                  </div>
                                ) : (
                                  <>
                                    <p className="text-[13px] font-semibold">
                                      {experience.position || "Posisi"}
                                    </p>
                                    <p className="mt-1 text-[12px] font-medium text-zinc-600">
                                      {experience.company ||
                                        "Nama instansi / perusahaan"}
                                    </p>
                                    {experience.description.length > 0 && (
                                      <ul className="cv-justified mt-2 space-y-1.5 text-[12px] leading-5 text-zinc-700">
                                        {experience.description.map(
                                          (item, itemIndex) => (
                                            <li
                                              key={itemIndex}
                                              className="list-disc pl-4"
                                            >
                                              {item}
                                            </li>
                                          ),
                                        )}
                                      </ul>
                                    )}
                                  </>
                                )}
                              </div>
                            ),
                          )}
                        </div>
                      ) : filledExperiences.length > 0 ? (
                        <div className="mt-4 space-y-5">
                          {filledExperiences.map((experience) => (
                            <div key={experience.id} className="cv-experience-item">
                              <p className="text-[13px] font-semibold">
                                {experience.position || "Posisi"}
                              </p>
                              <p className="mt-1 text-[12px] font-medium text-zinc-600">
                                {experience.company ||
                                  "Nama instansi / perusahaan"}
                              </p>
                              {experience.description && (
                                <p className="cv-justified mt-2 text-[12px] leading-5 text-zinc-700">
                                  {experience.description}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-4 text-[12px] text-zinc-400">
                          Pengalaman kerja akan tampil di bagian ini
                        </p>
                      )}
                    </div>
                    )}
                    {/* PORTFOLIO */}
                    {filledPortfolioItems.length > 0 && (
                      <div className="cv-section cv-portfolio-section mt-7">
                        <h4 className="border-b border-zinc-200 pb-2 text-[12px] font-bold uppercase tracking-[0.16em]">
                          Karya &amp; Portofolio
                        </h4>
                        <div className="mt-4 space-y-4">
                          {filledPortfolioItems.map((item) => {
                            const safeUrl = getSafePortfolioUrl(item.url)
                            return (
                              <div key={item.id} className="cv-portfolio-item min-w-0">
                                {item.title && (
                                  <p className="break-words text-[13px] font-semibold text-zinc-800">
                                    {item.title}
                                  </p>
                                )}
                                {item.url && (
                                  safeUrl ? (
                                    <a href={safeUrl} target="_blank" rel="noreferrer" className="mt-1 block break-all text-[11px] text-blue-700 underline underline-offset-2">
                                      {item.url}
                                    </a>
                                  ) : (
                                    <p className="mt-1 break-all text-[11px] text-zinc-600">{item.url}</p>
                                  )
                                )}
                                {item.description && (
                                  <p className="cv-justified mt-2 text-[12px] leading-5 text-zinc-700">
                                    {item.description}
                                  </p>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                    {/* LANGUAGE SCORES */}
                    {filledLanguageScores.length > 0 && (
                      <div className="cv-section cv-language-section mt-7">
                        <h4 className="border-b border-zinc-200 pb-2 text-[12px] font-bold uppercase tracking-[0.16em]">
                          Skor Bahasa
                        </h4>
                        <div className="mt-4 space-y-3">
                          {filledLanguageScores.map((item) => (
                            <div key={item.id} className="cv-language-item flex min-w-0 items-start justify-between gap-3">
                              <div className="min-w-0">
                                {item.language && (
                                  <p className="break-words text-[13px] font-semibold text-zinc-800">
                                    {item.language}
                                  </p>
                                )}
                                {item.test && (
                                  <p className="mt-1 break-words text-[12px] text-zinc-600">
                                    {item.test}
                                  </p>
                                )}
                              </div>
                              {item.score && (
                                <p className="max-w-[40%] min-w-0 break-words text-right text-[12px] font-semibold text-zinc-700">
                                  Skor {item.score}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* SKILLS */}
                    {Boolean(aiResult?.skills?.length || isEditingResult || !aiResult) && (

                    <div className="cv-section cv-skills-section mt-7">
                      <h4 className="border-b border-zinc-200 pb-2 text-[12px] font-bold uppercase tracking-[0.16em]">
                        Keahlian
                      </h4>
                      {isEditingResult && aiResult ? (
                        <div className="mt-3">
                          <input
                            type="text"
                            value={aiResult.skills.join(", ")}
                            onChange={(event) =>
                              updateAISkills(event.target.value)
                            }
                            placeholder="Pisahkan keahlian dengan koma"
                            className="w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2.5 text-[12px] text-zinc-700 outline-none focus:border-zinc-500"
                          />
                          <p className="mt-2 text-[11px] text-zinc-400">
                            Contoh: Komunikasi, Microsoft Office, Canva,
                            Public Speaking
                          </p>
                        </div>
                      ) : aiResult?.skills?.length ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {aiResult.skills.map((skill, index) => (
                            <span
                              key={index}
                              className="rounded-full bg-zinc-100 px-3 py-1.5 text-[11px] font-medium text-zinc-700"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-3 text-[12px] text-zinc-400">
                          Keahlian akan disusun oleh AI setelah CV dibuat
                        </p>
                      )}
                    </div>
                    )}
                    </div>
                    <footer
                      className="cv-watermark-footer"
                      draggable={false}
                      aria-label="Watermark DinoEdu Space"
                    >
                      CV dibuat menggunakan DinoEdu Space
                    </footer>
                  </div>
                </div>
                <div className="mt-4 text-center text-[12px] text-muted-foreground dino-no-print">
                  {aiResult
                    ? "Periksa hasil, edit seperlunya, lalu simpan sebagai PDF"
                    : "Preview akan terisi otomatis setelah data dimasukkan"}
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </>
  )
}
