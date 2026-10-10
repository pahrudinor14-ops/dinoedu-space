import { useEffect, useState } from "react"

import {

  ArrowLeft,

  ArrowRight,

  BookOpen,

  CalendarDays,

  Compass,

  FileText,

  GraduationCap,

  Lightbulb,

  MessageCircle,

  Moon,

  PenLine,

  Search,

  Settings2,

  ShieldCheck,

  Sparkles,

  Sun,

  Users,

  WandSparkles,

} from "lucide-react"

import { supabase } from "../lib/supabase"

import NumeaAdmin from "./NumeaAdmin"

import NumeaLearn from "./numea/pages/NumeaLearn"

import NumeaCommunity from "./numea/pages/NumeaCommunity"

import NumeaCertificates from "./numea/pages/NumeaCertificates"

import NumeaConsultation from "./numea/pages/NumeaConsultation"

import NumeaEvents from "./numea/pages/NumeaEvents"

import NumeaStudio from "./numea/pages/NumeaStudio"

interface NumeaPageProps {

  onBack: () => void

  darkMode?: boolean

  onToggleTheme?: () => void

  onOpenDinoAI?: () => void

  onOpenAICV?: () => void

  onOpenAISurat?: () => void

  onOpenAISoal?: () => void

  onOpenAIModulAjar?: () => void

}

const navItems = [

  { label: "Beranda", icon: Compass },

  { label: "Learn", icon: GraduationCap },

  { label: "Studio", icon: Sparkles },

  { label: "Community", icon: Users },

  { label: "Events", icon: CalendarDays },

  { label: "Konsultasi", icon: MessageCircle },

  { label: "Sertifikat", icon: ShieldCheck },

]

const aiTools = [

  {

    title: "DinoAI Chat",

    description: "Teman AI untuk belajar, berdiskusi, dan menyelesaikan berbagai kebutuhan",

    icon: MessageCircle,

    action: "chat",

  },

  {

    title: "AI CV Maker",

    description: "Buat CV profesional dengan lebih cepat dan terarah",

    icon: FileText,

    action: "cv",

  },

  {

    title: "AI Surat Lamaran",

    description: "Susun surat lamaran yang rapi sesuai posisi yang kamu tuju",

    icon: PenLine,

    action: "surat",

  },

  {

    title: "AI Pembuat Soal",

    description: "Buat soal pembelajaran berdasarkan kebutuhan kelas dan materi",

    icon: BookOpen,

    action: "soal",

  },

  {

    title: "AI Modul Ajar",

    description: "Susun rancangan modul ajar secara praktis dan terstruktur",

    icon: GraduationCap,

    action: "modul",

  },

]

function getToolAction(

  action: string,

  props: NumeaPageProps,

): (() => void) | undefined {

  if (action === "chat") return props.onOpenDinoAI

  if (action === "cv") return props.onOpenAICV

  if (action === "surat") return props.onOpenAISurat

  if (action === "soal") return props.onOpenAISoal

  if (action === "modul") return props.onOpenAIModulAjar

  return undefined

}

export default function NumeaPage(props: NumeaPageProps) {

  const {

    onBack,

    darkMode = false,

    onToggleTheme,

  } = props

  const [activeTab, setActiveTab] = useState(() => {

    const hash = window.location.hash.replace("#", "")

    const matched = navItems.find((item) => item.label.toLowerCase().replace(" ", "-") === hash)

    return matched?.label ?? "Beranda"

  })

  const [isAdmin, setIsAdmin] = useState(false)

  const [showAdmin, setShowAdmin] = useState(false)

  const [menuSearch, setMenuSearch] = useState("")

  useEffect(() => {

    const checkAdmin = async () => {

      const { data } = await supabase.rpc("is_numea_admin")

      setIsAdmin(Boolean(data))

    }

    void checkAdmin()

  }, [])

  if (showAdmin) {

    return <NumeaAdmin onBack={() => setShowAdmin(false)} darkMode={darkMode} />

  }

  if (activeTab === "Learn") {

    return <NumeaLearn onBack={() => { setActiveTab("Beranda"); window.history.replaceState({}, "", "/numea#beranda") }} darkMode={darkMode} onToggleTheme={props.onToggleTheme} />

  }

  if (activeTab === "Studio") {

  return (

    <NumeaStudio

      onBack={() => {

        setActiveTab("Beranda")

        window.history.replaceState({}, "", "/numea#beranda")

      }}

      onOpenLearn={() => {

        setActiveTab("Learn")

        window.history.replaceState({}, "", "/numea#learn")

      }}

      onOpenEvents={() => {

        setActiveTab("Events")

        window.history.replaceState({}, "", "/numea#events")

      }}

      onOpenCommunity={() => {

        setActiveTab("Community")

        window.history.replaceState({}, "", "/numea#community")

      }}

      onOpenConsultation={() => {

        setActiveTab("Konsultasi")

        window.history.replaceState({}, "", "/numea#konsultasi")

      }}

      onOpenDinoAI={props.onOpenDinoAI}

      onOpenAICV={props.onOpenAICV}

      onOpenAISurat={props.onOpenAISurat}

      onOpenAISoal={props.onOpenAISoal}

      onOpenAIModulAjar={props.onOpenAIModulAjar}

    />

  )

}

  if (activeTab === "Community") {

    return <NumeaCommunity onBack={() => { setActiveTab("Beranda"); window.history.replaceState({}, "", "/numea#beranda") }} darkMode={darkMode} onToggleTheme={props.onToggleTheme} />

  }

  if (activeTab === "Events") {

  return (

    <NumeaEvents

      onBack={() => {

        setActiveTab("Beranda")

        window.history.replaceState({}, "", "/numea#beranda")

      }}

      darkMode={darkMode}

      onToggleTheme={props.onToggleTheme}

    />

  )

}

  if (activeTab === "Konsultasi") {

    return <NumeaConsultation onBack={() => { setActiveTab("Beranda"); window.history.replaceState({}, "", "/numea#beranda") }} darkMode={darkMode} onToggleTheme={props.onToggleTheme} />

  }

  if (activeTab === "Sertifikat") {

    return <NumeaCertificates onBack={() => { setActiveTab("Beranda"); window.history.replaceState({}, "", "/numea#beranda") }} darkMode={darkMode} onToggleTheme={props.onToggleTheme} />

  }

  const handleNavClick = (label: string) => {

    const targetId = label.toLowerCase().replace(" ", "-")

    setActiveTab(label)

    window.history.replaceState({}, "", `/numea#${targetId}`)

    document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" })

  }

  return (

    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">

      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">

        <div className="absolute -left-40 top-20 h-96 w-96 rounded-full bg-[#F6C64F]/20 blur-3xl" />

        <div className="absolute right-[-120px] top-32 h-[420px] w-[420px] rounded-full bg-[#E95C9E]/15 blur-3xl" />

        <div className="absolute bottom-[-180px] left-[30%] h-[420px] w-[420px] rounded-full bg-[#FF7411]/10 blur-3xl" />

      </div>

      <aside className="fixed inset-y-0 left-0 z-50 hidden w-[250px] border-r border-border/60 bg-background/75 px-5 py-6 backdrop-blur-2xl lg:block">

        <div className="flex h-full flex-col">

          <button type="button" onClick={onBack} className="flex items-center gap-3 text-left">

            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden">

              <img src="/numeaedu.PNG" alt="Logo NUMEA EDU" className="h-full w-full object-contain" />

            </div>

            <div>

              <div className="text-[18px] font-bold tracking-tight">NUMEA EDU</div>

              <div className="text-[11px] text-muted-foreground">A Space to Learn, Create & Explore</div>

            </div>

          </button>

          {isAdmin && (

            <button type="button" onClick={() => setShowAdmin(true)} className="dino-button mt-7 flex w-full items-center gap-3 rounded-2xl border border-[#E95C9E]/25 bg-gradient-to-r from-[#F6C64F]/10 via-[#FF7411]/5 to-[#E95C9E]/10 px-3.5 py-3 text-left transition-all hover:border-[#E95C9E]/40">

              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#E95C9E]/10">

                <Settings2 className="h-4 w-4 text-[#E95C9E]" />

              </div>

              <div className="min-w-0">

                <div className="text-[12px] font-semibold">Membership Management</div>

              </div>

            </button>

          )}

          <nav className="mt-5 flex-1 space-y-1.5 overflow-y-auto pr-1">

            {navItems.map((item) => {

              const Icon = item.icon

              return (

                <button

                  key={item.label}

                  type="button"

                  onClick={() => handleNavClick(item.label)}

                  className={`group flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left text-[13px] font-medium transition-all duration-200 ${

                    activeTab === item.label

                      ? "bg-gradient-to-r from-[#F6C64F]/20 via-[#FF7411]/10 to-[#E95C9E]/10 text-foreground shadow-sm"

                      : "text-muted-foreground hover:bg-white/45 hover:text-foreground dark:hover:bg-white/5"

                  }`}

                >

                  <Icon className={`h-4 w-4 ${activeTab === item.label ? "text-[#E95C9E]" : "text-muted-foreground group-hover:text-[#E95C9E]"}`} />

                  {item.label}

                </button>

              )

            })}

          </nav>

          <div className="rounded-2xl border border-border/60 bg-white/35 p-3 backdrop-blur-xl dark:bg-white/5">

            <div className="flex items-center gap-2">

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F6C64F]/20">

                <Lightbulb className="h-4 w-4 text-[#FF7411]" />

              </div>

              <div>

                <div className="text-[12px] font-semibold">Ruang berkembang</div>

                <div className="text-[10px] text-muted-foreground">Belajar • Berkarya • Berbagi</div>

              </div>

            </div>

          </div>

        </div>

      </aside>

      <div className="lg:pl-[250px]">

        <header className="sticky top-0 z-40 border-b border-border/50 bg-background/70 backdrop-blur-xl">

          <div className="mx-auto flex h-[72px] max-w-[1500px] items-center gap-3 px-4 sm:px-6 lg:px-8">

            <button

              type="button"

              onClick={onBack}

              className="dino-button flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border/60 bg-white/40 backdrop-blur-xl dark:bg-white/5 lg:hidden"

              aria-label="Kembali"

            >

              <ArrowLeft className="h-4 w-4" />

            </button>

            <div className="hidden min-w-0 items-center gap-2 text-[12px] text-muted-foreground sm:flex">

              <span>NUMEA EDU</span>

              <span>/</span>

              <span className="font-medium text-foreground">Beranda</span>

            </div>

            <div className="ml-auto flex items-center gap-2">

              <form
                  className="hidden h-10 w-[260px] items-center gap-2 rounded-full border border-border/60 bg-white/40 px-4 backdrop-blur-xl dark:bg-white/5 md:flex"
                  onSubmit={(event) => {
                    event.preventDefault()
                    const query = menuSearch.trim().toLowerCase()
                    const match = navItems.find((item) => item.label.toLowerCase().includes(query))
                    if (match && query) {
                      handleNavClick(match.label)
                      setMenuSearch("")
                    }
                  }}
                >
                  <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <input
                    aria-label="Cari menu NUMEA EDU"
                    value={menuSearch}
                    onChange={(event) => setMenuSearch(event.target.value)}
                    placeholder="Cari menu NUMEA..."
                    className="min-w-0 flex-1 bg-transparent text-[12px] outline-none placeholder:text-muted-foreground"
                  />
                </form>

              {onToggleTheme && (

                <button

                  type="button"

                  onClick={onToggleTheme}

                  className="dino-button flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-white/40 backdrop-blur-xl dark:bg-white/5"

                  aria-label={darkMode ? "Aktifkan mode terang" : "Aktifkan mode gelap"}

                  title={darkMode ? "Mode terang" : "Mode gelap"}

                >

                  {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}

                </button>

              )}

              

              

            </div>

          </div>

        </header>

        <nav aria-label="Navigasi NUMEA EDU" className="sticky top-[72px] z-30 flex gap-2 overflow-x-auto border-b border-border/50 bg-background/85 px-4 py-3 backdrop-blur-xl lg:hidden">

          {navItems.map((item) => {

            const Icon = item.icon

            return (

              <button

                key={item.label}

                type="button"

                onClick={() => handleNavClick(item.label)}

                aria-current={activeTab === item.label ? "page" : undefined}

                className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-[12px] font-medium transition-colors ${

                  activeTab === item.label

                    ? "bg-gradient-to-r from-[#F6C64F]/25 via-[#FF7411]/15 to-[#E95C9E]/15 text-foreground"

                    : "text-muted-foreground hover:bg-white/50 dark:hover:bg-white/5"

                }`}

              >

                <Icon className="h-3.5 w-3.5" />

                {item.label}

              </button>

            )

          })}

        </nav>

        <main className="mx-auto max-w-[1500px] px-4 pb-20 pt-7 sm:px-6 lg:px-8">

          <section id="beranda" className="relative scroll-mt-24 overflow-hidden rounded-[32px] border border-border/60 bg-white/45 p-7 shadow-[0_20px_70px_rgba(87,78,82,0.08)] backdrop-blur-2xl dark:bg-white/5 sm:p-10 lg:p-14">

            <div className="absolute -right-20 -top-28 h-72 w-72 rounded-full bg-[#E95C9E]/15 blur-3xl" />

            <div className="absolute -bottom-32 left-20 h-72 w-72 rounded-full bg-[#F6C64F]/15 blur-3xl" />

            <div className="relative grid gap-10 lg:grid-cols-[1.25fr_0.75fr] lg:items-center">

              <div>

                <div className="inline-flex items-center gap-2 rounded-full border border-[#F6C64F]/30 bg-[#F6C64F]/10 px-3.5 py-2 text-[11px] font-semibold">

                  <Sparkles className="h-3.5 w-3.5 text-[#FF7411]" />

                  NUMEA EDU

                </div>

                <h1 className="mt-6 max-w-4xl text-4xl font-bold leading-[1.08] tracking-tight sm:text-6xl lg:text-7xl">

                  A Space to{" "}

                  <span className="bg-gradient-to-r from-[#F6C64F] via-[#FF7411] to-[#E95C9E] bg-clip-text text-transparent">

                    Learn, Create & Explore

                  </span>

                </h1>

                <p className="mt-6 max-w-2xl text-[17px] leading-relaxed text-muted-foreground sm:text-[19px]">

                  Ruang pendidikan digital untuk belajar, membuat karya, menemukan inspirasi, membangun komunitas, dan terus berkembang

                </p>

                <div className="mt-8 flex flex-wrap gap-3">

                  <button

                    type="button"

                    onClick={() => handleNavClick("Learn")}

                    className="dino-button inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#F6C64F] via-[#FF7411] to-[#E95C9E] px-6 py-3.5 text-[14px] font-semibold text-white shadow-lg shadow-[#E95C9E]/15"

                  >

                    Mulai Belajar

                    <ArrowRight className="h-4 w-4" />

                  </button>

                  <button type="button" onClick={() => handleNavClick("Studio")} className="dino-button inline-flex items-center gap-2 rounded-full border border-border/70 bg-white/45 px-6 py-3.5 text-[14px] font-semibold backdrop-blur-xl dark:bg-white/5">

                    Jelajahi NUMEA

                    <Compass className="h-4 w-4" />

                  </button>

                </div>

              </div>

              <div className="relative mx-auto w-full max-w-[390px]">

                <div className="rounded-[30px] border border-white/50 bg-white/55 p-4 shadow-2xl shadow-[#E95C9E]/10 backdrop-blur-2xl dark:border-white/10 dark:bg-white/5">

                  <div className="rounded-[24px] bg-gradient-to-br from-[#F6C64F]/30 via-[#FF7411]/15 to-[#E95C9E]/20 p-5">

                    <div className="flex items-center justify-between">

                      <div>

                        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Your space</div>

                        <div className="mt-1 text-xl font-bold">Explore & Grow</div>

                      </div>

                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/70 dark:bg-white/10">

                        <Compass className="h-5 w-5 text-[#FF7411]" />

                      </div>

                    </div>

                    <div className="mt-6 grid grid-cols-2 gap-3">

                      <div className="rounded-2xl bg-white/70 p-4 dark:bg-black/10">

                        <GraduationCap className="h-5 w-5 text-[#E95C9E]" />

                        <div className="mt-3 text-[12px] font-semibold">Learn</div>

                      </div>

                      <div className="rounded-2xl bg-white/70 p-4 dark:bg-black/10">

                        <PenLine className="h-5 w-5 text-[#FF7411]" />

                        <div className="mt-3 text-[12px] font-semibold">Studio</div>

                      </div>

                      <div className="rounded-2xl bg-white/70 p-4 dark:bg-black/10">

                        <Users className="h-5 w-5 text-[#F6A91A]" />

                        <div className="mt-3 text-[12px] font-semibold">Community</div>

                      </div>

                      <div className="rounded-2xl bg-white/70 p-4 dark:bg-black/10">

                        <Sparkles className="h-5 w-5 text-[#E95C9E]" />

                        <div className="mt-3 text-[12px] font-semibold">Events</div>

                      </div>

                    </div>

                  </div>

                </div>

              </div>

            </div>

          </section>

          <section className="mt-12">

            <div className="mb-6 flex items-end justify-between gap-4">

              <div>

                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#E95C9E]">Core Space</p>

                <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Belajar, berkarya, dan menemukan</h2>

              </div>

            </div>

            <div className="grid gap-5 md:grid-cols-2">

              {[

                ["Learn", "Materi, wawasan, dan pengalaman belajar yang membantu kamu berkembang", GraduationCap, "from-[#F6C64F]/25 to-[#FF7411]/10"],

                ["Studio", "Temukan inspirasi dan wujudkan karya pendidikan dalam satu ruang", Sparkles, "from-[#E95C9E]/20 to-[#F6C64F]/10"],

              ].map(([title, description, Icon, gradient]) => (

                <div key={title as string} id={(title as string) === "Learn" ? "core-learn" : (title as string).toLowerCase()} className={`group scroll-mt-24 rounded-[28px] border border-border/60 bg-gradient-to-br ${gradient as string} p-6 transition-transform duration-300 hover:-translate-y-1`}>

                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/70 dark:bg-white/10">

                    <Icon className="h-5 w-5 text-[#FF7411]" />

                  </div>

                  <h3 className="mt-6 text-2xl font-bold">{title as string}</h3>

                  <p className="mt-3 text-[14px] leading-7 text-muted-foreground">{description as string}</p>

                  <button type="button" onClick={() => handleNavClick(title as string)} className="mt-5 inline-flex items-center gap-2 text-[12px] font-semibold text-[#E95C9E]">

                    Jelajahi

                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />

                  </button>

                </div>

              ))}

            </div>

          </section>

          <section className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">

            {[

              ["Community", "Belajar dan berbagi bersama komunitas yang tumbuh", Users],

              ["Events", "Webinar, pelatihan, dan agenda pengembangan diri", CalendarDays],

              ["Konsultasi", "Ruang untuk bertanya dan mendapatkan pendampingan", MessageCircle],

              ["Sertifikat", "Dokumentasikan pengalaman belajar dan kegiatanmu", ShieldCheck],

            ].map(([title, description, Icon]) => (

              <div id={(title as string).toLowerCase()} key={title as string} className="dino-glass scroll-mt-24 rounded-[24px] p-6 transition-transform duration-300 hover:-translate-y-1">

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#E95C9E]/10">

                  <Icon className="h-5 w-5 text-[#E95C9E]" />

                </div>

                <h3 className="mt-5 text-lg font-bold">{title as string}</h3>

                <p className="mt-2 text-[13px] leading-6 text-muted-foreground">{description as string}</p>

              </div>

            ))}

          </section>

          <section className="mt-12">

            <div className="rounded-[30px] border border-border/60 bg-white/40 p-7 backdrop-blur-2xl dark:bg-white/5 sm:p-9">

              <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">

                <div>

                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#FF7411]">AI & Education Tools</p>

                  <h2 className="mt-2 text-3xl font-bold tracking-tight">Buat lebih banyak dengan AI</h2>

                  <p className="mt-3 max-w-2xl text-[14px] leading-6 text-muted-foreground">Tools DinoEdu Space yang terhubung dengan pengalaman belajar dan kebutuhan digital NUMEA</p>

                </div>

                <WandSparkles className="hidden h-8 w-8 text-[#E95C9E] sm:block" />

              </div>

              <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">

                {aiTools.map((tool) => {

                  const Icon = tool.icon

                  const action = getToolAction(tool.action, props)

                  return (

                    <div key={tool.title} className="group rounded-2xl border border-border/60 bg-white/45 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[#E95C9E]/30 dark:bg-white/5">

                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#F6C64F]/20 to-[#E95C9E]/15">

                        <Icon className="h-4.5 w-4.5 text-[#E95C9E]" />

                      </div>

                      <h3 className="mt-4 text-[14px] font-bold">{tool.title}</h3>

                      <p className="mt-2 text-[11px] leading-5 text-muted-foreground">{tool.description}</p>

                      {action ? (

                        <button type="button" onClick={action} className="mt-4 inline-flex items-center gap-1 text-[11px] font-semibold text-[#E95C9E]">

                          Pakai sekarang

                          <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />

                        </button>

                      ) : (

                        <span className="mt-4 inline-flex text-[11px] font-semibold text-muted-foreground/60">Segera hadir</span>

                      )}

                    </div>

                  )

                })}

              </div>

            </div>

          </section>

          <section className="mt-12 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">

            <div className="dino-glass rounded-[28px] p-7 sm:p-8">

              <div className="flex items-center gap-3">

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F6C64F]/15">

                  <BookOpen className="h-5 w-5 text-[#FF7411]" />

                </div>

                <div>

                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#FF7411]">Materi & Inspirasi</p>

                  <h2 className="mt-1 text-2xl font-bold">Ruang untuk terus belajar</h2>

                </div>

              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">

                {["Strategi belajar yang lebih efektif", "Ide aktivitas pembelajaran kreatif", "Inspirasi karya dan proyek digital", "Wawasan pendidikan dan teknologi"].map((item) => (

                  <button key={item} type="button" onClick={() => handleNavClick("Learn")} className="flex items-center justify-between rounded-2xl border border-border/60 bg-white/40 px-4 py-4 text-left text-[12px] font-medium transition-colors hover:border-[#E95C9E]/30 hover:bg-white/60 dark:bg-white/5 dark:hover:bg-white/10">

                    <span>{item}</span>

                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />

                  </button>

                ))}

              </div>

            </div>

            <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#F6C64F] via-[#FF7411] to-[#E95C9E] p-7 text-white shadow-xl shadow-[#E95C9E]/15 sm:p-8">

              <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-white/15 blur-2xl" />

              <div className="relative">

                <Sparkles className="h-6 w-6" />

                <h2 className="mt-6 text-2xl font-bold">Tumbuh bersama NUMEA</h2>

                <p className="mt-3 text-[13px] leading-6 text-white/85">Satu ruang untuk belajar, mencipta, mengeksplorasi, dan membangun koneksi yang bermakna</p>

                <button type="button" onClick={() => handleNavClick("Community")} className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-[12px] font-bold text-[#E95C9E]">

                  Jelajahi ruang

                  <ArrowRight className="h-3.5 w-3.5" />

                </button>

              </div>

            </div>

          </section>

          <footer className="mt-14 border-t border-border/50 py-8">

            <div className="flex flex-col gap-2 text-[11px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">

              <div>© 2026 NUMEA EDU · A Space to Learn, Create & Explore</div>

              <div>Bagian dari DinoEdu Space</div>

            </div>

          </footer>

        </main>

      </div>

    </div>

  )

}
