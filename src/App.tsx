import { useEffect, useState } from "react";

import Auth from "./components/Auth";

import MFASetup from "./components/MFASetup";

import MFADisable from "./components/MFADisable";

import MFAChallenge from "./components/MFAChallenge";

import Dashboard from "./components/Dashboard";

import type { Session, User } from "@supabase/supabase-js";

import { supabase } from "./lib/supabase";

import DinoAIChat from "./components/DinoAIChat";

import NumeaPage from "./components/NumeaPage";

import AICVMaker from "./components/AICVMaker";

import AISuratLamaran from "./components/AISuratLamaran";

import {
  ArrowRight,
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  FileText,
  Home,
  Info,
  Layers3,
  Mail,
  Menu,
  MessageCircle,
  Moon,
  PenLine,
  ShieldCheck,
  Sun,
  X,
} from "lucide-react";

const features = [
  {
    title: "DinoAI Chat",

    description:
      "Teman AI untuk membantu belajar, bekerja, dan menyelesaikan berbagai kebutuhan",

    icon: MessageCircle,
  },

  {
    title: "AI CV Maker",

    description:
      "Buat CV profesional dengan lebih cepat berdasarkan informasi yang kamu masukkan",

    icon: FileText,
  },

  {
    title: "AI Surat Lamaran",

    description:
      "Susun surat lamaran yang rapi dan sesuai dengan posisi yang kamu tuju",

    icon: Mail,
  },

  {
    title: "AI Pembuat Soal",

    description:
      "Buat soal pembelajaran berdasarkan kelas, mata pelajaran, dan materi",

    icon: ClipboardList,
  },

  {
    title: "AI Modul Ajar",

    description:
      "Bantu menyusun rancangan modul ajar secara lebih praktis dan terstruktur",

    icon: BookOpen,
  },
];

function App() {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem("dinoedu-theme");

    if (saved === "dark") return true;

    if (saved === "light") return false;

    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  const [mobileMenu, setMobileMenu] = useState(false);

  const [showAuth, setShowAuth] = useState(false);

  const [showMFA, setShowMFA] = useState(false);

  const [mfaEnabled, setMfaEnabled] = useState(false);

  const [mfaRequired, setMfaRequired] = useState(false);

  const [showDashboard, setShowDashboard] = useState(
    () =>
      window.location.pathname === "/app" ||
      window.location.pathname === "/app/dinoai" ||
      window.location.pathname === "/app/cv" ||
      window.location.pathname === "/app/surat",
  );

  const [showDinoAI, setShowDinoAI] = useState(
    () => window.location.pathname === "/app/dinoai",
  );

  const [showAICV, setShowAICV] = useState(
    () => window.location.pathname === "/app/cv",
  );

  const [showAISurat, setShowAISurat] = useState(
    () => window.location.pathname === "/app/surat",
  );

  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const root = document.documentElement;

    if (darkMode) {
      root.classList.add("dark");

      localStorage.setItem("dinoedu-theme", "dark");
    } else {
      root.classList.remove("dark");

      localStorage.setItem("dinoedu-theme", "light");
    }
  }, [darkMode]);

  useEffect(() => {
    const modalOpen = showAuth || (Boolean(user) && (showMFA || mfaRequired));

    if (!modalOpen) return;

    const previousBodyOverflow = document.body.style.overflow;

    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";

    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;

      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [showAuth, showMFA, mfaRequired, user]);

  useEffect(() => {
    let mounted = true;

    let assuranceCheckId = 0;

    const syncSession = (session: Session | null) => {
      const checkId = ++assuranceCheckId;

      setUser(session?.user ?? null);

      if (!session) {
        setMfaRequired(false);

        return;
      }

      window.setTimeout(() => {
        void (async () => {
          try {
            const {
              data: { session: activeSession },
            } = await supabase.auth.getSession();

            if (
              !mounted ||
              checkId !== assuranceCheckId ||
              activeSession?.user.id !== session.user.id
            ) {
              return;
            }

            const { data, error } =
              await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

            if (!mounted || checkId !== assuranceCheckId) {
              return;
            }

            if (error) {
              throw error;
            }

            setMfaRequired(
              data.nextLevel === "aal2" && data.currentLevel !== "aal2",
            );
          } catch (error) {
            if (mounted && checkId === assuranceCheckId) {
              console.error("Gagal memeriksa level autentikasi MFA", error);

              setMfaRequired(true);
            }
          }
        })();
      }, 0);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      syncSession(session);

      if (event === "SIGNED_IN" && session) {
        const path = window.location.pathname;
        const isDinoAIPath = path === "/app/dinoai";
        const isAICVPath = path === "/app/cv";
        const isAISuratPath = path === "/app/surat";

        setShowDashboard(
          path === "/app" || isDinoAIPath || isAICVPath || isAISuratPath,
        );
        setShowDinoAI(isDinoAIPath);
        setShowAICV(isAICVPath);
        setShowAISurat(isAISuratPath);

        if (path !== "/app" && !isDinoAIPath && !isAICVPath && !isAISuratPath) {
          window.history.replaceState({}, "", "/app");
        }
      }
    });

    return () => {
      mounted = false;

      assuranceCheckId += 1;

      subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error(error);

      return;
    }

    setShowMFA(false);

    setShowAuth(false);

    setMobileMenu(false);
  };

  const openSecurity = async () => {
    const { data, error } = await supabase.auth.mfa.listFactors();

    const enabled =
      !error && data.totp?.some((factor) => factor.status === "verified");

    setMfaEnabled(Boolean(enabled));

    setShowMFA(true);
  };

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;

      setShowDashboard(
        path === "/app" ||
          path === "/app/dinoai" ||
          path === "/app/cv" ||
          path === "/app/surat",
      );
      setShowDinoAI(path === "/app/dinoai");
      setShowAICV(path === "/app/cv");
      setShowAISurat(path === "/app/surat");
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  const openDashboard = () => {
    setMobileMenu(false);
    setShowAuth(false);
    setShowDashboard(true);
    setShowDinoAI(false);
    setShowAICV(false);
    setShowAISurat(false);

    if (window.location.pathname !== "/app") {
      window.history.pushState({}, "", "/app");
    }
  };

  const backHome = () => {
    setShowDashboard(false);
    setShowDinoAI(false);
    setShowAICV(false);
    setShowAISurat(false);
    window.history.pushState({}, "", "/");
  };

  const openDinoAI = () => {
    setMobileMenu(false);
    setShowDashboard(false);
    setShowDinoAI(true);
    setShowAICV(false);
    setShowAISurat(false);
    window.history.pushState({}, "", "/app/dinoai");
  };

  const openAICV = () => {
    setMobileMenu(false);
    setShowDashboard(false);
    setShowDinoAI(false);
    setShowAICV(true);
    setShowAISurat(false);
    window.history.pushState({}, "", "/app/cv");
  };

  const openAISurat = () => {
    setMobileMenu(false);
    setShowDashboard(false);
    setShowDinoAI(false);
    setShowAICV(false);
    setShowAISurat(true);
    window.history.pushState({}, "", "/app/surat");
  };

  const closeDinoAI = () => {
    setShowDinoAI(false);
    setShowDashboard(true);
    setShowAICV(false);
    setShowAISurat(false);
    window.history.pushState({}, "", "/app");
  };

  const closeAICV = () => {
    setShowAICV(false);
    setShowDashboard(true);
    setShowDinoAI(false);
    setShowAISurat(false);
    window.history.pushState({}, "", "/app");
  };

  const closeAISurat = () => {
    setShowAISurat(false);
    setShowDashboard(true);
    setShowDinoAI(false);
    setShowAICV(false);
    window.history.pushState({}, "", "/app");
  };

  return window.location.pathname === "/numea" ? (
    <NumeaPage
      onBack={() => {
        window.location.href = "/";
      }}
    />
  ) : (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="dino-float absolute left-[-140px] top-[80px] h-[320px] w-[320px] rounded-full bg-[#EECDA3]/35 blur-3xl" />

        <div className="dino-float-slow absolute right-[-120px] top-[180px] h-[360px] w-[360px] rounded-full bg-[#EF629F]/20 blur-3xl" />

        <div className="dino-pulse-soft absolute bottom-[-180px] left-[35%] h-[400px] w-[400px] rounded-full bg-[#EECDA3]/15 blur-3xl" />
      </div>

      {!((showDashboard || showAICV || showAISurat) && user) && (
        <header className="sticky top-0 z-50 border-b border-border/50 bg-background/70 backdrop-blur-xl">
          <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-8">
            <a
              href="#beranda"

              className="dino-interactive flex items-center gap-3"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-lg shadow-pink-500/10">
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

                <div className="text-[14px] text-muted-foreground">
                  Education • Creative • Digital
                </div>
              </div>
            </a>

            <nav className="hidden items-center gap-7 md:flex">
              <a
                href="#beranda"

                className="text-[14px] font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground"
              >
                Beranda
              </a>

              <a
                href="#fitur"

                className="text-[14px] font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground"
              >
                Fitur AI
              </a>

              <a
                href="#tentang"

                className="text-[14px] font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground"
              >
                Tentang
              </a>
            </nav>

            <div className="flex items-center gap-2">
              <button
                type="button"

                onClick={() => setDarkMode((value) => !value)}

                className="dino-button flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border/60 bg-white/40 backdrop-blur-xl dark:bg-white/5"

                aria-label="Ubah mode tampilan"
              >
                {darkMode ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </button>

              <button
                type="button"

                onClick={() => setMobileMenu((value) => !value)}

                className="dino-button flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border/60 bg-white/40 backdrop-blur-xl md:hidden dark:bg-white/5"

                aria-label="Buka menu"
              >
                {mobileMenu ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </button>

              {user ? (
                <div className="hidden items-center gap-2 md:flex">
                  <button
                    type="button"

                    onClick={openDashboard}

                    className="dino-button inline-flex items-center gap-2 rounded-full border border-border/60 bg-white/40 px-5 py-3 text-[14px] font-semibold backdrop-blur-xl dark:bg-white/5"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                  </button>

                  <button
                    type="button"

                    onClick={openSecurity}

                    className="dino-button inline-flex items-center gap-2 rounded-full border border-border/60 bg-white/40 px-5 py-3 text-[14px] font-semibold backdrop-blur-xl dark:bg-white/5"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Keamanan
                  </button>

                  <button
                    type="button"

                    onClick={handleSignOut}

                    className="dino-gradient dino-button rounded-full px-5 py-3 text-[14px] font-semibold text-white shadow-lg shadow-pink-500/10"
                  >
                    Keluar
                  </button>
                </div>
              ) : (
                <button
                  type="button"

                  onClick={() => setShowAuth(true)}

                  className="dino-gradient dino-button hidden rounded-full px-5 py-3 text-[14px] font-semibold text-white shadow-lg shadow-pink-500/10 md:inline-flex"
                >
                  Mulai Sekarang
                </button>
              )}
            </div>
          </div>

          {mobileMenu && (
            <div className="dino-enter border-t border-border/50 px-6 py-5 md:hidden">
              <div className="mx-auto flex max-w-7xl flex-col gap-4">
                <a
                  href="#beranda"

                  onClick={() => setMobileMenu(false)}

                  className="text-[14px] font-medium transition-colors duration-200 hover:text-[#EF629F]"
                >
                  Beranda
                </a>

                <a
                  href="#fitur"

                  onClick={() => setMobileMenu(false)}

                  className="text-[14px] font-medium transition-colors duration-200 hover:text-[#EF629F]"
                >
                  Fitur AI
                </a>

                <a
                  href="#tentang"

                  onClick={() => setMobileMenu(false)}

                  className="text-[14px] font-medium transition-colors duration-200 hover:text-[#EF629F]"
                >
                  Tentang
                </a>

                {user ? (
                  <>
                    <button
                      type="button"

                      onClick={() => {
                        setMobileMenu(false);

                        openDashboard();
                      }}

                      className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-white/40 px-5 py-3 text-left text-[14px] font-semibold backdrop-blur-xl dark:bg-white/5"
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      Dashboard
                    </button>

                    <button
                      type="button"

                      onClick={() => {
                        setMobileMenu(false);

                        openSecurity();
                      }}

                      className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-white/40 px-5 py-3 text-left text-[14px] font-semibold backdrop-blur-xl dark:bg-white/5"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      Keamanan
                    </button>

                    <button
                      type="button"

                      onClick={handleSignOut}

                      className="dino-gradient rounded-full px-5 py-3 text-left text-[14px] font-semibold text-white"
                    >
                      Keluar
                    </button>
                  </>
                ) : (
                  <button
                    type="button"

                    onClick={() => {
                      setMobileMenu(false);

                      setShowAuth(true);
                    }}

                    className="dino-gradient rounded-full px-5 py-3 text-left text-[14px] font-semibold text-white"
                  >
                    Mulai Sekarang
                  </button>
                )}
              </div>
            </div>
          )}
        </header>
      )}

      {showAISurat && user ? (
        <AISuratLamaran onBack={closeAISurat} />
      ) : showAICV && user ? (
        <AICVMaker onBack={closeAICV} />
      ) : showDinoAI && user ? (
        <DinoAIChat
          email={user.email}

          userId={user.id}

          onClose={closeDinoAI}
        />
      ) : showDashboard && user ? (
        <Dashboard
          email={user.email}

          darkMode={darkMode}

          onToggleTheme={() => setDarkMode((value) => !value)}

          onSecurity={openSecurity}

          onSignOut={handleSignOut}

          onBackHome={backHome}

          onOpenDinoAI={openDinoAI}

          onOpenAICV={openAICV}

          onOpenAISuratLamaran={openAISurat}
        />
      ) : (
        <>
          <main>
            <section
              id="beranda"

              className="mx-auto max-w-7xl px-5 pb-32 pt-16 sm:px-6 sm:pb-24 sm:pt-20 lg:px-8 lg:pb-32 lg:pt-28"
            >
              <div className="mx-auto max-w-6xl text-center">
                <div
                  className="dino-glass dino-enter mx-auto inline-flex items-center gap-2 rounded-full px-4 py-2 text-[14px] font-medium"

                  style={{ animationDelay: "80ms" }}
                >
                  <img
                    src="/logodino.PNG"

                    alt=""

                    className="h-4 w-4 scale-125 object-contain"
                  />
                  AI untuk Belajar, Bekerja, dan Berkarya
                </div>

                <h1
                  className="dino-enter mx-auto mt-8 max-w-5xl text-3xl font-bold leading-[1.25] tracking-normal sm:text-6xl sm:leading-[1.12] lg:text-7xl lg:leading-[1.08]"

                  style={{ animationDelay: "160ms" }}
                >
                  Satu ruang untuk
                  <span className="block bg-gradient-to-r from-[#EECDA3] to-[#EF629F] bg-clip-text pb-1 text-transparent">
                    berbagai kebutuhanmu
                  </span>
                </h1>

                <p
                  className="dino-enter mx-auto mt-7 max-w-3xl text-[20px] leading-relaxed text-muted-foreground"

                  style={{ animationDelay: "240ms" }}
                >
                  DinoEdu Space menghadirkan tools AI sederhana untuk
                  pendidikan, karier, dan kebutuhan digital dalam satu ruang
                  yang mudah digunakan
                </p>

                <div
                  className="dino-enter mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"

                  style={{ animationDelay: "320ms" }}
                >
                  <button
                    type="button"

                    onClick={() => setShowAuth(true)}

                    className="dino-gradient dino-button group inline-flex items-center gap-2 rounded-full px-7 py-4 text-[17px] font-semibold text-white shadow-xl shadow-pink-500/15"
                  >
                    Jelajahi DinoAI
                    <ArrowRight className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-1" />
                  </button>

                  <a
                    href="#tentang"

                    className="dino-button inline-flex items-center gap-2 rounded-full border border-border bg-white/40 px-7 py-4 text-[17px] font-medium backdrop-blur-xl dark:bg-white/5"
                  >
                    Pelajari DinoEdu
                  </a>
                </div>
              </div>
            </section>

            <section
              id="fitur"

              className="mx-auto max-w-7xl px-6 pb-28 lg:px-8"
            >
              <div className="dino-enter mb-12 max-w-2xl">
                <p className="text-[14px] font-semibold uppercase tracking-[0.18em] text-[#EF629F]">
                  DinoEdu AI
                </p>

                <h2 className="mt-3 text-4xl font-bold tracking-normal sm:text-5xl">
                  Tools utama
                </h2>

                <p className="mt-5 text-[20px] leading-relaxed text-muted-foreground">
                  Dibangun untuk membuat pekerjaan yang berulang menjadi lebih
                  cepat, sederhana, dan terarah
                </p>
              </div>

              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {features.map((feature, index) => {
                  const Icon = feature.icon;

                  return (
                    <div
                      key={feature.title}

                      className={`dino-glass dino-interactive dino-enter group relative overflow-hidden rounded-[28px] p-7 ${
                        index === 0 ? "lg:col-span-2" : ""
                      }`}

                      style={{
                        animationDelay: `${360 + index * 80}ms`,
                      }}
                    >
                      <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[#EF629F]/10 blur-2xl transition-all duration-500 group-hover:scale-125 group-hover:bg-[#EF629F]/20" />

                      <div className="relative">
                        <div className="dino-gradient flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg transition-transform duration-300 group-hover:scale-105">
                          <Icon className="h-6 w-6 text-white" />
                        </div>

                        <h3 className="mt-6 text-2xl font-semibold">
                          {feature.title}
                        </h3>

                        <p className="mt-3 text-[14px] leading-7 text-muted-foreground">
                          {feature.description}
                        </p>

                        <button
                          type="button"

                          onClick={() => setShowAuth(true)}

                          className="mt-6 inline-flex items-center gap-2 text-[14px] font-semibold text-[#EF629F] transition-all duration-200 hover:gap-3"
                        >
                          Coba fitur
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section
              id="tentang"

              className="mx-auto max-w-7xl px-6 pb-28 lg:px-8"
            >
              <div
                className="dino-glass dino-enter relative overflow-hidden rounded-[36px] p-8 sm:p-12 lg:p-16"

                style={{ animationDelay: "760ms" }}
              >
                <div className="dino-float-slow absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#EF629F]/15 blur-3xl" />

                <div className="dino-float absolute -bottom-28 -left-24 h-72 w-72 rounded-full bg-[#EECDA3]/20 blur-3xl" />

                <div className="relative max-w-3xl">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EF629F]/10">
                    <PenLine className="h-6 w-6 text-[#EF629F]" />
                  </div>

                  <h2 className="mt-7 text-4xl font-bold tracking-normal sm:text-5xl">
                    Bukan sekadar website
                    <span className="block text-[#EF629F]">
                      Ini ruang digitalmu
                    </span>
                  </h2>

                  <p className="mt-5 text-[20px] leading-relaxed text-muted-foreground">
                    DinoEdu Space akan berkembang menjadi ruang digital yang
                    menggabungkan AI, pendidikan, karier, dan kreativitas
                  </p>
                </div>
              </div>
            </section>
          </main>

          <div className="fixed inset-x-0 bottom-5 z-50 flex justify-center px-4 md:hidden">
            <nav className="dino-mobile-nav dino-glass grid h-16 w-full max-w-[320px] grid-cols-4 items-center gap-1 rounded-full p-2 shadow-2xl shadow-black/10">
              <a
                href="#beranda"

                className="dino-button flex h-12 w-full items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"

                aria-label="Beranda"
              >
                <Home className="h-5 w-5" />
              </a>

              <button
                type="button"

                onClick={() => setShowAuth(true)}

                className="dino-button dino-gradient flex h-12 w-full items-center justify-center rounded-full text-white shadow-lg"

                aria-label="DinoAI"
              >
                <img
                  src="/logodino.PNG"

                  alt=""

                  className="h-8 w-8 rounded-lg bg-white p-0.5 object-contain"
                />
              </button>

              <a
                href="#fitur"

                className="dino-button flex h-12 w-full items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"

                aria-label="Fitur AI"
              >
                <Layers3 className="h-5 w-5" />
              </a>

              <a
                href="#tentang"

                className="dino-button flex h-12 w-full items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"

                aria-label="Tentang"
              >
                <Info className="h-5 w-5" />
              </a>
            </nav>
          </div>

          <footer className="border-t border-border/50 pb-24 md:pb-0">
            <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-8 lg:flex-row lg:items-center lg:justify-between lg:px-8">
              <div className="text-[14px] text-muted-foreground">
                © 2026 DinoEdu Space
              </div>

              <div className="text-[14px] text-muted-foreground">
                Education • Creative • Digital
              </div>
            </div>
          </footer>
        </>
      )}

      {showAuth && (
        <div className="modal-scrollbar-hidden fixed inset-0 z-[100] min-h-[100dvh] overflow-y-auto bg-black/30 backdrop-blur-sm">
          <div className="flex min-h-[100dvh] items-center justify-center p-3 sm:p-4">
            <div className="w-full max-w-xl">
              <Auth
                onSuccess={() => {
                  setShowAuth(false);

                  openDashboard();
                }}

                onClose={() => setShowAuth(false)}
              />
            </div>
          </div>
        </div>
      )}

      {showMFA && user && (
        <div className="modal-scrollbar-hidden fixed inset-0 z-[100] min-h-[100dvh] overflow-y-auto bg-black/30 backdrop-blur-sm">
          <div className="flex min-h-[100dvh] items-center justify-center p-3 sm:p-4">
            <div className="w-full max-w-2xl">
              {mfaEnabled ? (
                <MFADisable
                  onClose={() => setShowMFA(false)}

                  onDisabled={() => {
                    setMfaEnabled(false);

                    setShowMFA(false);
                  }}
                />
              ) : (
                <MFASetup
                  onClose={() => setShowMFA(false)}

                  onEnabled={() => {
                    setMfaEnabled(true);

                    setShowMFA(false);
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {mfaRequired && user && (
        <div className="modal-scrollbar-hidden fixed inset-0 z-[110] flex min-h-[100dvh] items-center justify-center overflow-y-auto bg-black/40 p-3 backdrop-blur-sm sm:p-4">
          <div className="w-full max-w-md">
            <MFAChallenge onVerified={() => setMfaRequired(false)} />

            <button
              type="button"

              onClick={handleSignOut}

              className="mt-3 w-full py-2 text-sm font-medium text-white/80 transition hover:text-white"
            >
              Keluar dari akun
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
