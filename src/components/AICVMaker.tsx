import { useState } from "react"
import {
  ArrowLeft,
  BriefcaseBusiness,
  Check,
  Download,
  GraduationCap,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
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

export default function AICVMaker({ onBack }: AICVMakerProps) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [location, setLocation] = useState("")
  const [summary, setSummary] = useState("")

  const [institution, setInstitution] = useState("")
  const [studyProgram, setStudyProgram] = useState("")
  const [educationYear, setEducationYear] = useState("")

  const [experiences, setExperiences] = useState<Experience[]>([
    {
      id: 1,
      position: "",
      company: "",
      description: "",
    },
  ])

  const [message, setMessage] = useState("")
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState("")
  const [aiResult, setAiResult] = useState<AIResult | null>(null)
  const [isEditingResult, setIsEditingResult] = useState(false)

  const isBasicDataComplete =
    name.trim() !== "" &&
    email.trim() !== "" &&
    phone.trim() !== "" &&
    location.trim() !== ""

  const filledExperiences = experiences.filter(
    (item) =>
      item.position.trim() !== "" ||
      item.company.trim() !== "" ||
      item.description.trim() !== "",
  )

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
    if (!isBasicDataComplete) {
      setMessage(
        "Lengkapi nama, email, nomor HP, dan lokasi terlebih dahulu",
      )
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
          name,
          email,
          phone,
          location,
          summary,
          education: {
            institution,
            studyProgram,
            year: educationYear,
          },
          experiences,
        },
      })

      if (error) {
        let backendMessage = ""

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
          }
        }

        throw new Error(
          backendMessage ||
            error.message ||
            "AI CV Maker gagal memproses data",
        )
      }

      if (!data?.success || !data?.cv) {
        throw new Error(
          "Respons dinoai-cv tidak sesuai. Silakan coba lagi.",
        )
      }

      setAiResult({
        professionalSummary:
          typeof data.cv.professionalSummary === "string"
            ? data.cv.professionalSummary
            : "",
        skills: Array.isArray(data.cv.skills)
          ? data.cv.skills.filter(
              (item: unknown): item is string =>
                typeof item === "string",
            )
          : [],
        experiences: Array.isArray(data.cv.experiences)
          ? data.cv.experiences.map(
              (item: {
                position?: unknown
                company?: unknown
                description?: unknown
              }) => ({
                position:
                  typeof item?.position === "string"
                    ? item.position
                    : "",
                company:
                  typeof item?.company === "string"
                    ? item.company
                    : "",
                description: Array.isArray(item?.description)
                  ? item.description.filter(
                      (value: unknown): value is string =>
                        typeof value === "string",
                    )
                  : [],
              }),
            )
          : [],
      })

      setMessage(
        "CV berhasil dibuat dengan bantuan AI. Periksa dan edit hasilnya sebelum disimpan sebagai PDF",
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

    setMessage("")
    setIsEditingResult(false)
    window.print()
  }

  return (
    <>
      <style>{`
        @page {
          size: A4;
          margin: 12mm;
        }

        @media print {
          body {
            background: #ffffff !important;
          }

          body * {
            visibility: hidden !important;
          }

          #dinoedu-cv-print,
          #dinoedu-cv-print * {
            visibility: visible !important;
          }

          #dinoedu-cv-print {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
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

                <h1 className="mt-4 text-3xl font-bold tracking-normal sm:text-5xl">
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

                <div className="space-y-5">
                  {/* INSTITUSI */}
                  <div>
                    <label className="mb-2 block text-[14px] font-medium">
                      Institusi
                    </label>

                    <div className="relative">
                      <GraduationCap className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                      <input
                        type="text"
                        value={institution}
                        onChange={(event) =>
                          setInstitution(event.target.value)
                        }
                        placeholder="Nama universitas / sekolah"
                        className="w-full rounded-2xl border border-border/70 bg-white/40 py-3.5 pl-11 pr-4 text-[17px] outline-none backdrop-blur-xl transition focus:border-[#EF629F]/50 dark:bg-white/5"
                      />
                    </div>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    {/* PROGRAM STUDI */}
                    <div>
                      <label className="mb-2 block text-[14px] font-medium">
                        Program studi
                      </label>

                      <input
                        type="text"
                        value={studyProgram}
                        onChange={(event) =>
                          setStudyProgram(event.target.value)
                        }
                        placeholder="Program studi"
                        className="w-full rounded-2xl border border-border/70 bg-white/40 px-4 py-3.5 text-[17px] outline-none backdrop-blur-xl transition focus:border-[#EF629F]/50 dark:bg-white/5"
                      />
                    </div>

                    {/* TAHUN */}
                    <div>
                      <label className="mb-2 block text-[14px] font-medium">
                        Tahun
                      </label>

                      <input
                        type="text"
                        value={educationYear}
                        onChange={(event) =>
                          setEducationYear(event.target.value)
                        }
                        placeholder="2022 - 2026"
                        className="w-full rounded-2xl border border-border/70 bg-white/40 px-4 py-3.5 text-[17px] outline-none backdrop-blur-xl transition focus:border-[#EF629F]/50 dark:bg-white/5"
                      />
                    </div>
                  </div>
                </div>

                <div className="my-10 border-t border-border/60" />

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

                {/* AI BUTTON */}
                <button
                  type="button"
                  onClick={handleGenerateAI}
                  disabled={!isBasicDataComplete || aiLoading}
                  className={`dino-gradient mt-10 w-full rounded-2xl px-5 py-4 text-[15px] font-semibold text-white shadow-lg shadow-pink-500/10 transition-all duration-200 ${
                    isBasicDataComplete && !aiLoading
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

                {!isBasicDataComplete && (
                  <p className="mt-3 text-center text-[12px] text-muted-foreground">
                    Lengkapi data wajib untuk menggunakan AI
                  </p>
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
                      onClick={handlePrintPDF}
                      className="dino-gradient inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold text-white shadow-lg shadow-pink-500/10 transition-all duration-200 dino-button"
                    >
                      <Download className="h-4 w-4" />
                      Cetak / Simpan PDF
                    </button>
                  </div>
                )}

                <div className="dino-glass rounded-[32px] p-5 sm:p-7">
                  <div
                    id="dinoedu-cv-print"
                    className="min-h-[600px] rounded-2xl bg-white p-7 text-black shadow-xl sm:p-9"
                  >
                    {/* CV HEADER */}
                    <div className="border-b-2 border-zinc-900 pb-5">
                      <h3 className="text-3xl font-bold tracking-tight">
                        {name || "Nama Lengkap"}
                      </h3>

                      <p className="mt-2 text-[14px] font-medium text-zinc-600">
                        {studyProgram || "Program Studi"}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[12px] text-zinc-600">
                        {email && (
                          <span className="inline-flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5" />
                            {email}
                          </span>
                        )}

                        {phone && (
                          <span className="inline-flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5" />
                            {phone}
                          </span>
                        )}

                        {location && (
                          <span className="inline-flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5" />
                            {location}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* PROFILE */}
                    <div className="mt-7">
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
                        <p className="mt-3 text-[13px] leading-6 text-zinc-700">
                          {aiResult?.professionalSummary ||
                            summary ||
                            "Deskripsi singkat tentang profil profesional akan tampil di bagian ini"}
                        </p>
                      )}
                    </div>

                    {/* EDUCATION */}
                    <div className="mt-7">
                      <h4 className="border-b border-zinc-200 pb-2 text-[12px] font-bold uppercase tracking-[0.16em]">
                        Pendidikan
                      </h4>

                      <div className="mt-4">
                        <p className="text-[13px] font-semibold">
                          {institution || "Nama institusi"}
                        </p>

                        <p className="mt-1 text-[12px] text-zinc-600">
                          {studyProgram || "Program studi"}
                          {educationYear
                            ? ` • ${educationYear}`
                            : ""}
                        </p>
                      </div>
                    </div>

                    {/* EXPERIENCE */}
                    <div className="mt-7">
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
                                className="relative"
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
                                      <ul className="mt-2 space-y-1.5 text-[12px] leading-5 text-zinc-700">
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
                            <div key={experience.id}>
                              <p className="text-[13px] font-semibold">
                                {experience.position || "Posisi"}
                              </p>

                              <p className="mt-1 text-[12px] font-medium text-zinc-600">
                                {experience.company ||
                                  "Nama instansi / perusahaan"}
                              </p>

                              {experience.description && (
                                <p className="mt-2 text-[12px] leading-5 text-zinc-700">
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

                    {/* SKILLS */}
                    <div className="mt-7">
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

                    <div className="mt-9 border-t border-zinc-200 pt-4 text-[10px] text-zinc-400">
                      CV dibuat menggunakan DinoEdu Space
                    </div>
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
