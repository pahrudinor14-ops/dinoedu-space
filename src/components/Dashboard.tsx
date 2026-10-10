import {

  ArrowRight,

  BookOpen,
  ClipboardList,

  FileText,

  LogOut,

  Mail,

  MessageCircle,

  Moon,

  ShieldCheck,

  Sun,

} from "lucide-react";

interface DashboardProps {

  email?: string | null;

  darkMode: boolean;

  onToggleTheme: () => void;

  onSecurity: () => void;

  onSignOut: () => void;

  onBackHome: () => void;

  onOpenDinoAI: () => void;

  onOpenAICV: () => void;

  onOpenAISurat: () => void;

  onOpenAISoal: () => void;

  onOpenAIModulAjar: () => void;

  onOpenDinoMath: () => void;

}

const tools = [

  {

    title: "DinoAI Chat",

    description:

      "Teman AI untuk belajar, bekerja, dan menyelesaikan berbagai kebutuhan",

    icon: MessageCircle,

  },

  {

    title: "AI CV Maker",

    description: "Buat CV profesional berdasarkan informasi yang kamu masukkan",

    icon: FileText,

  },

  {

    title: "AI Surat Lamaran",

    description:

      "Susun surat lamaran yang rapi dan sesuai posisi yang kamu tuju",

    icon: Mail,

  },

  {

    title: "AI Pembuat Soal",

    description: "Buat soal pembelajaran berdasarkan kelas dan materi",

    icon: ClipboardList,

  },

  {

    title: "AI Modul Ajar",

    description: "Bantu menyusun modul ajar secara praktis dan terstruktur",

    icon: BookOpen,

  },

];

export default function Dashboard({

  email,

  darkMode,

  onToggleTheme,

  onSecurity,

  onSignOut,

  onBackHome,

  onOpenDinoAI,

  onOpenAICV,

  onOpenAISurat,

  onOpenAISoal,

  onOpenAIModulAjar,

  onOpenDinoMath,

}: DashboardProps) {

  return (

    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">

      {/* DINOEDU SPACE DASHBOARD BACKGROUND */}

      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">

        <div className="dino-float absolute left-[-140px] top-[100px] h-[320px] w-[320px] rounded-full bg-[#EECDA3]/30 blur-3xl" />

        <div className="dino-float-slow absolute right-[-120px] top-[180px] h-[360px] w-[360px] rounded-full bg-[#EF629F]/20 blur-3xl" />

      </div>

      {/* DINOEDU SPACE DASHBOARD HEADER */}

      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/70 backdrop-blur-xl dark:bg-background/80">

        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">

          <button

            type="button"

            onClick={onBackHome}

            className="dino-interactive flex items-center gap-3 text-left"

          >

            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border/60 bg-white/70 shadow-lg shadow-pink-500/10 backdrop-blur-xl dark:bg-white/10">

              <img

                src="/logodino.PNG"

                alt="Logo DinoEdu"

                className="h-full w-full scale-110 object-contain"

              />

            </div>

            <div>

              <div className="text-lg font-semibold tracking-tight">

                DinoEdu Space

              </div>

              <div className="text-[14px] text-muted-foreground">Dashboard</div>

            </div>

          </button>

          <div className="flex items-center gap-2">

            <button

              type="button"

              onClick={onToggleTheme}

              aria-label={

                darkMode ? "Aktifkan mode terang" : "Aktifkan mode gelap"

              }

              title={darkMode ? "Mode terang" : "Mode gelap"}

              className="dino-button flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border/60 bg-white/40 backdrop-blur-xl dark:bg-white/5"

            >

              {darkMode ? (

                <Sun className="h-5 w-5" />

              ) : (

                <Moon className="h-5 w-5" />

              )}

            </button>

            <button

              type="button"

              onClick={onSecurity}

              className="dino-button inline-flex items-center gap-2 rounded-full border border-border/60 bg-white/40 px-4 py-3 text-[14px] font-semibold backdrop-blur-xl dark:bg-white/5 sm:px-5"

            >

              <ShieldCheck className="h-4 w-4" />

              <span className="hidden sm:inline">Keamanan</span>

            </button>

            <button

              type="button"

              onClick={onSignOut}

              className="dino-gradient dino-button inline-flex items-center gap-2 rounded-full px-4 py-3 text-[14px] font-semibold text-white shadow-lg shadow-pink-500/10 sm:px-5"

            >

              <LogOut className="h-4 w-4" />

              <span className="hidden sm:inline">Keluar</span>

            </button>

          </div>

        </div>

      </header>

      <main className="mx-auto max-w-7xl px-5 pb-20 pt-10 sm:px-6 sm:pt-14 lg:px-8">

        {/* DINOEDU SPACE WELCOME */}

        <section className="dino-enter">

          <div className="dino-glass relative overflow-hidden rounded-[32px] p-7 sm:p-10">

            <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[#EF629F]/10 blur-3xl" />

            <div className="relative">

              <div className="flex items-center gap-2 text-[14px] font-semibold text-[#EF629F]">

                <img

                  src="/logodino.PNG"

                  alt=""

                  className="h-5 w-5 scale-110 object-contain"

                />

                DinoEdu Space

              </div>

              <h1 className="mt-4 max-w-3xl text-3xl font-bold tracking-normal sm:text-5xl">

                Selamat datang di ruang belajarmu

              </h1>

              <p className="mt-4 max-w-2xl text-[18px] leading-relaxed text-muted-foreground">

                Pilih tools yang ingin kamu gunakan untuk belajar, bekerja, dan

                berkarya

              </p>

              {email && (

                <p className="mt-4 text-[14px] text-muted-foreground">

                  Masuk sebagai{" "}

                  <span className="font-medium text-foreground">{email}</span>

                </p>

              )}

            </div>

          </div>

        </section>

        {/* DINOEDU SPACE AI TOOLS */}

        <section className="mt-10">

          <div className="mb-6">

            <p className="text-[14px] font-semibold uppercase tracking-[0.18em] text-[#EF629F]">

              DinoAI

            </p>

            <h2 className="mt-2 text-3xl font-bold tracking-normal sm:text-4xl">

              Tools utama

            </h2>

          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">

            {tools.map((tool) => {

              const Icon = tool.icon;

              return (

                <div

                  key={tool.title}

                  className="dino-glass dino-interactive group relative overflow-hidden rounded-[28px] p-6"

                >

                  <div className="absolute -right-10 -top-10 h-24 w-24 rounded-full bg-[#EF629F]/10 blur-2xl transition-all duration-500 group-hover:scale-125" />

                  <div className="relative">

                    <div className="dino-gradient flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg">

                      <Icon className="h-6 w-6 text-white" />

                    </div>

                    <h3 className="mt-5 text-xl font-semibold">{tool.title}</h3>

                    <p className="mt-2 text-[14px] leading-7 text-muted-foreground">

                      {tool.description}

                    </p>

                    {tool.title === "DinoAI Chat" ||

                    tool.title === "AI CV Maker" ||

                    tool.title === "AI Surat Lamaran" ||

                      tool.title === "AI Pembuat Soal" ||

                      tool.title === "AI Modul Ajar" ? (

                      <button

                        type="button"

                        onClick={

                          tool.title === "DinoAI Chat"

                            ? onOpenDinoAI

                            : tool.title === "AI CV Maker"

                              ? onOpenAICV

                              : tool.title === "AI Surat Lamaran"

                                ? onOpenAISurat

                                : tool.title === "AI Pembuat Soal"

                                  ? onOpenAISoal

                                  : onOpenAIModulAjar

                        }

                        className="mt-5 inline-flex items-center gap-2 text-[14px] font-semibold text-[#EF629F] transition-all duration-200 hover:gap-3"

                      >

                        Pakai Sekarang

                        <ArrowRight className="h-4 w-4" />

                      </button>

                    ) : (

                      <button

                        type="button"

                        disabled

                        className="mt-5 inline-flex items-center gap-2 text-[14px] font-semibold text-muted-foreground/60"

                      >

                        Segera hadir

                      </button>

                    )}

                  </div>

                </div>

              );

            })}

          </div>

        </section>

        {/* DINOMATH COMIC PROMO */}

        <section className="mt-10">

          <div className="group relative isolate overflow-hidden rounded-[32px] border border-orange-300/30 bg-gradient-to-br from-orange-500 via-orange-600 to-amber-500 p-6 text-white shadow-xl shadow-orange-900/10 sm:p-9 lg:p-10">

            {/* Siluet karakter dinosaurus */}

            <img

              src="/dino.PNG"

              alt=""

              aria-hidden="true"

              className="pointer-events-none absolute right-[18%] top-1/2 z-0 h-44 w-44 -translate-y-1/2 object-contain opacity-[0.10] transition-transform duration-700 group-hover:scale-[1.03] sm:right-[22%] sm:h-60 sm:w-60 lg:right-[25%] lg:h-72 lg:w-72"

            />

            <div className="pointer-events-none absolute -right-20 -bottom-28 z-0 h-72 w-72 rounded-full bg-amber-200/20 blur-3xl" />

            <div className="relative z-10 flex min-w-0 flex-col gap-7 sm:gap-8 lg:flex-row lg:items-center lg:justify-between">

              <div className="min-w-0 max-w-2xl">

                <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-orange-50 backdrop-blur-sm">

                  <span className="h-2 w-2 rounded-full bg-amber-200" />

                  Komik Edukasi

                </div>

                <h2 className="mt-4 max-w-2xl text-2xl font-bold tracking-normal sm:text-5xl">

                  Petualangan Seru di Dunia DinoMath

                </h2>

                <p className="mt-4 max-w-xl text-base leading-7 text-orange-50/95 sm:text-lg">

                  Belajar matematika jadi lebih menyenangkan lewat komik interaktif.

                  Buka halaman demi halaman dan temukan serunya belajar bersama Dino!

                </p>

                <button

                  type="button"

                  onClick={onOpenDinoMath}

                  className="mt-7 inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-bold text-orange-700 shadow-lg shadow-orange-950/15 transition-all duration-200 hover:-translate-y-0.5 hover:bg-orange-50 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-orange-600"

                >

                  <BookOpen className="h-5 w-5" />

                  Baca Komik Sekarang

                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />

                </button>

              </div>

              <div className="relative mx-auto flex w-full max-w-[180px] shrink-0 items-center justify-center rounded-[28px] border border-white/30 bg-white/15 p-3 shadow-2xl shadow-orange-950/15 backdrop-blur-md sm:max-w-[210px] sm:p-4 lg:mr-2 lg:max-w-[230px]">

                <div className="absolute -right-3 -top-3 rounded-full bg-amber-200 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-orange-900 shadow-md">

                  Yuk, baca!

                </div>

                <img

                  src="/dinomath.PNG"

                  alt="Logo DinoMath"

                  className="aspect-[4/3] max-h-[190px] w-full object-contain drop-shadow-xl sm:max-h-[220px]"

                />

              </div>

            </div>

          </div>

        </section>

        {/* NUMEA EDU COMMUNITY PROMO */}

        <section className="mt-10">

          <div className="group relative isolate overflow-hidden rounded-[32px] border border-pink-300/30 bg-gradient-to-br from-[#EF629F] via-pink-500 to-purple-500 p-6 text-white shadow-xl shadow-pink-900/10 sm:p-9 lg:p-10">

            {/* Siluet logo NUMEA EDU */}

            <img

              src="/numeaedu.PNG"

              alt=""

              aria-hidden="true"

              className="pointer-events-none absolute right-[18%] top-1/2 z-0 h-44 w-44 -translate-y-1/2 object-contain opacity-[0.10] transition-transform duration-700 group-hover:scale-[1.03] sm:right-[22%] sm:h-60 sm:w-60 lg:right-[25%] lg:h-72 lg:w-72"

            />

            {/* Dekorasi latar */}

            <div className="pointer-events-none absolute -bottom-28 -right-20 z-0 h-72 w-72 rounded-full bg-purple-200/20 blur-3xl" />

            <div className="pointer-events-none absolute -left-20 -top-24 z-0 h-64 w-64 rounded-full bg-pink-200/15 blur-3xl" />

            <div className="relative z-10 flex min-w-0 flex-col gap-7 sm:gap-8 lg:flex-row lg:items-center lg:justify-between">

              {/* Informasi NUMEA EDU */}

              <div className="min-w-0 max-w-2xl">

                <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-pink-50 backdrop-blur-sm">

                  <span className="h-2 w-2 rounded-full bg-pink-100" />

                  Komunitas Pendidikan

                </div>

                <h2 className="mt-4 max-w-2xl text-2xl font-bold tracking-normal sm:text-5xl">

                  Bertumbuh Bersama NUMEA EDU

                </h2>

                <p className="mt-4 max-w-xl text-base leading-7 text-pink-50/95 sm:text-lg">

                  Ruang bagi pendidik dan pegiat pendidikan untuk saling terhubung,

                  berbagi inspirasi, bertukar pengalaman, dan tumbuh bersama melalui

                  kolaborasi yang bermakna.

                </p>

                <button

                  type="button"

                  onClick={() => {

                    window.location.href = "/numea";

                  }}

                  className="mt-7 inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-bold text-pink-700 shadow-lg shadow-pink-950/15 transition-all duration-200 hover:-translate-y-0.5 hover:bg-pink-50 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-pink-500"

                >

                  Jelajahi NUMEA EDU

                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />

                </button>

              </div>

              {/* Logo utama NUMEA EDU */}

              <div className="relative mx-auto flex w-full max-w-[180px] shrink-0 items-center justify-center rounded-[28px] border border-white/30 bg-white/15 p-3 shadow-2xl shadow-pink-950/15 backdrop-blur-md sm:max-w-[210px] sm:p-4 lg:mr-2 lg:max-w-[230px]">

                <div className="absolute -right-3 -top-3 rounded-full bg-pink-100 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-pink-800 shadow-md">

                  Mari bergabung!

                </div>

                <img

                  src="/numeaedu.PNG"

                  alt="Logo NUMEA EDU"

                  className="aspect-[4/3] max-h-[190px] w-full object-contain drop-shadow-xl sm:max-h-[220px]"

                />

              </div>

            </div>

          </div>

        </section>

      </main>

          <footer className="border-t border-border/50 pb-6">

        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-7 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">

          <div className="flex items-center gap-3">

            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden">

              <img src="/logodino.PNG" alt="Logo DinoEdu" className="h-full w-full scale-110 object-contain" />

            </div>

            <div>

              <div className="text-[14px] font-semibold">DinoEdu Space</div>

              <div className="text-[13px] text-muted-foreground">Education • Creative • Digital</div>

            </div>

          </div>

          <div className="text-[13px] text-muted-foreground">© 2026 DinoEdu Space</div>

        </div>

      </footer>

</div>

  );

}
