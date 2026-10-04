import { useState } from "react"
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
} from "lucide-react"

import { supabase } from "../lib/supabase"

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

export default function AISuratLamaran({
  onBack,
}: AISuratLamaranProps) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [location, setLocation] = useState("")

  const [company, setCompany] = useState("")
  const [position, setPosition] = useState("")
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

  const isBasicDataComplete =
    name.trim() !== "" &&
    email.trim() !== "" &&
    phone.trim() !== "" &&
    location.trim() !== "" &&
    company.trim() !== "" &&
    position.trim() !== ""

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

  async function handleGenerateAI() {
    if (!isBasicDataComplete) {
      setMessage(
        "Lengkapi nama, email, nomor HP, lokasi, nama perusahaan, dan posisi terlebih dahulu",
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
      } = await supabase.functions.invoke("dinoai-surat", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: {
          name,
          email,
          phone,
          location,
          company,
          position,
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
            "AI Surat Lamaran gagal memproses data",
        )
      }

      if (!data?.success || !data?.letter) {
        throw new Error(
          "Respons dinoai-surat tidak sesuai. Silakan coba lagi.",
        )
      }

      const rawBody = Array.isArray(data.letter.body)
        ? data.letter.body.filter(
            (item: unknown): item is string =>
              typeof item === "string",
          )
        : []

      setLetterResult({
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
      })

      setMessage(
        "Surat lamaran berhasil dibuat dengan bantuan AI. Periksa dan edit hasilnya sebelum disimpan sebagai PDF",
      )
    } catch (error) {
      console.error("AI Surat Lamaran error:", error)
      setLetterResult(null)
      setAiError(
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat membuat surat lamaran dengan AI",
      )
    } finally {
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

  function handleEditToggle() {
    setIsEditingResult((current) => !current)
    setMessage("")
  }

  return (
    <>
      <style>{`
        @page {
          size: A4;
          margin: 16mm;
        }

        @media print {
          html,
          body,
          #root,
          #root > div,
          .modal-scrollbar-hidden.h-dvh {
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

      <div className="modal-scrollbar-hidden h-dvh overflow-x-hidden overflow-y-auto bg-background text-foreground">
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

                <h1 className="mt-4 text-3xl font-bold tracking-normal sm:text-5xl">
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

                {/* AI BUTTON */}
                <button
                  type="button"
                  onClick={handleGenerateAI}
                  disabled={!isBasicDataComplete || aiLoading}
                  className={`dino-gradient mt-10 flex w-full items-center justify-center rounded-2xl px-5 py-4 text-[15px] font-semibold text-white shadow-lg shadow-pink-500/10 transition-all duration-200 ${
                    isBasicDataComplete && !aiLoading
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

                <div
                  id="dinoedu-surat-preview-shell"
                  className="dino-glass rounded-[32px] p-5 sm:p-7"
                >
                  <div
                    id="dinoedu-surat-print"
                    className="min-h-[760px] rounded-2xl bg-white p-8 text-black shadow-xl sm:p-10"
                  >
                    <div>
                      <div className="text-right text-[13px] leading-6 text-zinc-700">
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
                            value={letterResult.subject}
                            onChange={(event) =>
                              updateResultField("subject", event.target.value)
                            }
                            className="w-full rounded-xl border border-border/70 bg-white px-3 py-2.5 text-[13px] outline-none focus:border-[#EF629F]/50"
                            placeholder="Subjek surat"
                          />

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
                        <div className="mt-6 space-y-6 text-[13px] leading-7 text-zinc-800">
                          <div>
                            <p className="font-semibold">Subjek: {letterResult.subject}</p>
                          </div>

                          <p>{letterResult.greeting}</p>

                          <p>{letterResult.opening}</p>

                          {letterResult.body.map((paragraph, index) => (
                            <p key={index}>{paragraph}</p>
                          ))}

                          <p>{letterResult.closing}</p>

                          <div className="pt-3">
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

                  {letterResult && (
                    <div className="dino-no-print mt-4 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={handleEditToggle}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-border/70 px-4 py-3 text-[13px] font-semibold transition hover:border-[#EF629F]/40 hover:text-[#EF629F]"
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
                        onClick={handlePrintPDF}
                        className="dino-gradient inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-[13px] font-semibold text-white shadow-lg shadow-pink-500/10 transition-all duration-200 dino-button"
                      >
                        <Download className="h-4 w-4" />
                        Cetak / Simpan PDF
                      </button>
                    </div>
                  )}
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
