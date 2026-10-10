import { useState } from "react"
import {
  ArrowLeft, ArrowRight, BookOpen, Compass, FileText, GraduationCap,
  Lightbulb, MessageCircle, PenLine, Sparkles, Users, CalendarDays,
} from "lucide-react"

interface NumeaStudioProps {
  onBack: () => void
  onOpenLearn: () => void
  onOpenEvents: () => void
  onOpenCommunity: () => void
  onOpenConsultation: () => void
  onOpenDinoAI?: () => void
  onOpenAICV?: () => void
  onOpenAISurat?: () => void
  onOpenAISoal?: () => void
  onOpenAIModulAjar?: () => void
  darkMode?: boolean
  onToggleTheme?: () => void
}

type StudioMode = "Temukan" | "Berkarya"

export default function NumeaStudio({
  onBack,
  onOpenLearn,
  onOpenEvents,
  onOpenCommunity,
  onOpenConsultation,
  onOpenDinoAI,
  onOpenAICV,
  onOpenAISurat,
  onOpenAISoal,
  onOpenAIModulAjar,
}: NumeaStudioProps) {
  const [mode, setMode] = useState<StudioMode>("Temukan")

  const discoverItems = [
    {
      title: "Sumber belajar",
      description: "Jelajahi materi, panduan praktik, dan referensi pendidikan.",
      icon: BookOpen,
      action: onOpenLearn,
      label: "Jelajahi Learn",
    },
    {
      title: "Event & kegiatan",
      description: "Temukan agenda, webinar, dan kegiatan NUMEA yang tersedia.",
      icon: CalendarDays,
      action: onOpenEvents,
      label: "Lihat Events",
    },
    {
      title: "Community",
      description: "Terhubung dan bertukar gagasan dengan komunitas NUMEA.",
      icon: Users,
      action: onOpenCommunity,
      label: "Buka Community",
    },
    {
      title: "Mentor & konsultasi",
      description: "Temukan ruang pendampingan untuk kebutuhan pendidikan.",
      icon: MessageCircle,
      action: onOpenConsultation,
      label: "Cari pendampingan",
    },
  ]

  const createItems = [
    {
      title: "DinoAI Chat",
      description: "Kembangkan gagasan, berdiskusi, dan mencari inspirasi.",
      icon: MessageCircle,
      action: onOpenDinoAI,
    },
    {
      title: "AI CV Maker",
      description: "Susun CV profesional untuk kebutuhan karier.",
      icon: FileText,
      action: onOpenAICV,
    },
    {
      title: "AI Surat Lamaran",
      description: "Buat draf surat lamaran yang terarah dan rapi.",
      icon: PenLine,
      action: onOpenAISurat,
    },
    {
      title: "AI Pembuat Soal",
      description: "Susun latihan soal sesuai materi dan kebutuhan kelas.",
      icon: GraduationCap,
      action: onOpenAISoal,
    },
    {
      title: "AI Modul Ajar",
      description: "Bantu merancang modul ajar secara terstruktur.",
      icon: BookOpen,
      action: onOpenAIModulAjar,
    },
  ]

  const cards = mode === "Temukan" ? discoverItems : createItems

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-40 top-20 h-96 w-96 rounded-full bg-[#F6C64F]/20 blur-3xl" />
        <div className="absolute right-[-120px] top-32 h-[420px] w-[420px] rounded-full bg-[#E95C9E]/15 blur-3xl" />
      </div>

      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-full border border-border/60 px-4 py-2.5 text-xs font-semibold hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" /> Kembali ke NUMEA
          </button>
          <span className="inline-flex items-center gap-2 rounded-full bg-[#E95C9E]/10 px-3 py-2 text-xs font-semibold text-[#E95C9E]">
            <Sparkles className="h-4 w-4" /> NUMEA Studio
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <section className="relative overflow-hidden rounded-[30px] border border-border/60 bg-white/45 p-7 shadow-[0_20px_70px_rgba(87,78,82,0.08)] backdrop-blur-2xl dark:bg-white/5 sm:p-10 lg:p-12">
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[#E95C9E]/15 blur-3xl" />
          <div className="relative max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#F6C64F]/30 bg-[#F6C64F]/10 px-3.5 py-2 text-[11px] font-semibold">
              <Lightbulb className="h-3.5 w-3.5 text-[#FF7411]" />
              SATU RUANG UNTUK BERTUMBUH
            </div>
            <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">
              NUMEA <span className="bg-gradient-to-r from-[#F6C64F] via-[#FF7411] to-[#E95C9E] bg-clip-text text-transparent">Studio</span>
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
              Temukan pengetahuan dan inspirasi, lalu ubah ide menjadi karya.
              Semua dalam satu ruang yang terhubung dengan ekosistem NUMEA EDU.
            </p>

            <div className="mt-7 inline-flex rounded-2xl border border-border/60 bg-background/70 p-1.5">
              {(["Temukan", "Berkarya"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setMode(item)}
                  aria-pressed={mode === item}
                  className={`rounded-xl px-5 py-3 text-sm font-semibold transition-all ${
                    mode === item
                      ? "bg-gradient-to-r from-[#FF7411] to-[#E95C9E] text-white shadow-md"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item === "Temukan" ? <Compass className="mr-2 inline h-4 w-4" /> : <PenLine className="mr-2 inline h-4 w-4" />}
                  {item}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-9">
          <div className="mb-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#E95C9E]">
              {mode === "Temukan" ? "EXPLORE" : "CREATE"}
            </p>
            <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
              {mode === "Temukan" ? "Apa yang ingin kamu temukan?" : "Mulai wujudkan idemu"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {mode === "Temukan"
                ? "Akses langsung ke materi, kegiatan, komunitas, dan pendampingan yang sudah tersedia."
                : "Gunakan alat yang sudah terhubung dengan DinoEdu Space. Fitur yang belum tersedia tidak ditampilkan sebagai tombol aktif."}
            </p>
          </div>

          <div className={`grid gap-4 ${mode === "Temukan" ? "sm:grid-cols-2 xl:grid-cols-4" : "sm:grid-cols-2 xl:grid-cols-3"}`}>
            {cards.map((item) => {
              const Icon = item.icon
              const action = item.action
              return (
                <article key={item.title} className="group flex min-w-0 flex-col rounded-[24px] border border-border/60 bg-white/45 p-5 transition-all hover:-translate-y-1 hover:border-[#E95C9E]/30 hover:shadow-lg hover:shadow-[#E95C9E]/5 dark:bg-white/5 sm:p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#F6C64F]/25 to-[#E95C9E]/15">
                    <Icon className="h-5 w-5 text-[#E95C9E]" />
                  </div>
                  <h3 className="mt-5 text-lg font-bold">{item.title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">{item.description}</p>
                  {action ? (
                    <button type="button" onClick={action} className="mt-5 inline-flex items-center gap-2 self-start text-xs font-bold text-[#E95C9E]">
                      {"label" in item && typeof item.label === "string" ? item.label : "Mulai membuat"}
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </button>
                  ) : (
                    <span className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground/70">
                      Segera hadir
                    </span>
                  )}
                </article>
              )
            })}
          </div>
        </section>

        <footer className="mt-14 border-t border-border/50 py-8 text-[11px] text-muted-foreground">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span>© 2026 NUMEA EDU · A Space to Learn, Create & Explore</span>
            <span>Bagian dari DinoEdu Space</span>
          </div>
        </footer>
      </main>
    </div>
  )
}
