import { useEffect, useState } from "react";
import DinoMathFlipbook from "./components/DinoMathFlipbook";
import Auth from "./components/Auth";
import MFASetup from "./components/MFASetup";
import MFADisable from "./components/MFADisable";
import MFAChallenge from "./components/MFAChallenge";
import Dashboard from "./components/Dashboard";
import FeedbackAdmin from "./components/FeedbackAdmin";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";
import DinoAIChat from "./components/DinoAIChat";
import NumeaAccessGate from "./components/NumeaAccessGate";
import AICVMaker from "./components/AICVMaker";
import AISuratLamaran from "./components/AISuratLamaran";
import AIPembuatSoal from "./components/AIPembuatSoal";
import AIModulAjar from "./components/AIModulAjar";
import {
  ArrowRight,
  LayoutDashboard,
  Home,
  Info,
  Layers3,
  MessageCircle,
  FileText,
  Mail,
  ClipboardList,
  BookOpen,
  Menu,
  Moon,
  ShieldCheck,
  Sun,
  X,
} from "lucide-react";
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
      window.location.pathname === "/app/surat" ||
      window.location.pathname === "/app/soal" ||
      window.location.pathname === "/app/dinomath" ||
      window.location.pathname === "/app/modul-ajar" ||
      window.location.pathname === "/app/admin/saran-kritik",
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
  const [showAIPembuatSoal, setShowAIPembuatSoal] = useState(
    () => window.location.pathname === "/app/soal",
  );
  const [showAIModulAjar, setShowAIModulAjar] = useState(
    () => window.location.pathname === "/app/modul-ajar",
  );
  const [showDinoMath, setShowDinoMath] = useState(
    () => window.location.pathname === "/app/dinomath",
  );
  const [showFeedbackAdmin, setShowFeedbackAdmin] = useState(
    () => window.location.pathname === "/app/admin/saran-kritik",
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
          const isNumeaPath = path === "/numea";
        const isDinoAIPath = path === "/app/dinoai";
        const isAICVPath = path === "/app/cv";
        const isAISuratPath = path === "/app/surat";
          const isAIPembuatSoalPath = path === "/app/soal";
          const isAIModulAjarPath = path === "/app/modul-ajar";
          const isDinoMathPath = path === "/app/dinomath";
        const isFeedbackAdminPath = path === "/app/admin/saran-kritik";
        setShowDashboard(
          path === "/app" ||
            isDinoAIPath ||
            isAICVPath ||
            isAISuratPath ||
            isAIPembuatSoalPath ||
            isAIModulAjarPath ||
            isDinoMathPath ||
            isFeedbackAdminPath,
        );
        setShowFeedbackAdmin(isFeedbackAdminPath);
        setShowDinoAI(isDinoAIPath);
        setShowAICV(isAICVPath);
        setShowAISurat(isAISuratPath);
          setShowAIPembuatSoal(isAIPembuatSoalPath);
          setShowAIModulAjar(isAIModulAjarPath);
          setShowDinoMath(isDinoMathPath);
        if (
          path !== "/app" &&
          !isNumeaPath &&
          !isDinoAIPath &&
          !isAICVPath &&
          !isAISuratPath &&
          !isAIPembuatSoalPath &&
          !isAIModulAjarPath &&
          !isDinoMathPath &&
          !isFeedbackAdminPath
        ) {
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
      const isNumeaPath = path === "/numea";
      setShowDashboard(
        !isNumeaPath &&
        (
          path === "/app" ||
          path === "/app/dinoai" ||
          path === "/app/cv" ||
          path === "/app/surat" ||
          path === "/app/soal" ||
          path === "/app/modul-ajar" ||
          path === "/app/dinomath" ||
          path === "/app/admin/saran-kritik"
        )
      );
      setShowFeedbackAdmin(path === "/app/admin/saran-kritik");
      setShowDinoAI(path === "/app/dinoai");
      setShowAICV(path === "/app/cv");
      setShowAISurat(path === "/app/surat");
      setShowAIPembuatSoal(path === "/app/soal");
      setShowAIModulAjar(path === "/app/modul-ajar");
      setShowDinoMath(path === "/app/dinomath");
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
    setShowAIPembuatSoal(false);
    setShowAIModulAjar(false);
    setShowDinoMath(false);
    setShowFeedbackAdmin(false);
    if (window.location.pathname !== "/app") {
      window.history.pushState({}, "", "/app");
    }
  };
  const backHome = () => {
    setShowDashboard(false);
    setShowDinoMath(false);
    setShowDinoAI(false);
    setShowAICV(false);
    setShowAISurat(false);
    setShowAIPembuatSoal(false);
    setShowAIModulAjar(false);
    setShowFeedbackAdmin(false);
    window.history.pushState({}, "", "/");
  };
  const openDinoAI = () => {
    setShowDinoMath(false);
    setMobileMenu(false);
    setShowDashboard(false);
    setShowDinoAI(true);
    setShowAICV(false);
    setShowAISurat(false);
    setShowAIPembuatSoal(false);
    setShowAIModulAjar(false);
    setShowFeedbackAdmin(false);
    window.history.pushState({}, "", "/app/dinoai");
  };
  const openAICV = () => {
    setShowDinoMath(false);
    setMobileMenu(false);
    setShowDashboard(false);
    setShowDinoAI(false);
    setShowAICV(true);
    setShowAISurat(false);
    setShowAIPembuatSoal(false);
    setShowAIModulAjar(false);
    setShowFeedbackAdmin(false);
    window.history.pushState({}, "", "/app/cv");
  };
  const openAISurat = () => {
    setShowDinoMath(false);
    setMobileMenu(false);
    setShowDashboard(false);
    setShowDinoAI(false);
    setShowAICV(false);
    setShowAISurat(true);
    setShowAIPembuatSoal(false);
    setShowAIModulAjar(false);
    setShowFeedbackAdmin(false);
    window.history.pushState({}, "", "/app/surat");
  };
  const openAIPembuatSoal = () => {
    setShowDinoMath(false);
    setMobileMenu(false);
    setShowDashboard(false);
    setShowDinoAI(false);
    setShowAICV(false);
    setShowAISurat(false);
    setShowAIPembuatSoal(true);
    setShowFeedbackAdmin(false);
    window.history.pushState({}, "", "/app/soal");
  };
  const openAIModulAjar = () => {
    setShowDinoMath(false);
    setMobileMenu(false);
    setShowDashboard(false);
    setShowDinoAI(false);
    setShowAICV(false);
    setShowAISurat(false);
    setShowAIPembuatSoal(false);
    setShowAIModulAjar(true);
    setShowFeedbackAdmin(false);
    window.history.pushState({}, "", "/app/modul-ajar");
  };
  const closeAIModulAjar = () => {
    setShowAIModulAjar(false);
    setShowDashboard(true);
    setShowDinoAI(false);
    setShowAICV(false);
    setShowAISurat(false);
    setShowAIPembuatSoal(false);
    window.history.pushState({}, "", "/app");
  };
  const closeDinoAI = () => {
    setShowDinoAI(false);
    setShowDashboard(true);
    setShowAIPembuatSoal(false);
    setShowAIModulAjar(false);
    setShowAICV(false);
    setShowAISurat(false);
    window.history.pushState({}, "", "/app");
  };
  const closeAICV = () => {
    setShowAICV(false);
    setShowDashboard(true);
    setShowAIPembuatSoal(false);
    setShowAIModulAjar(false);
    setShowDinoAI(false);
    setShowAISurat(false);
    window.history.pushState({}, "", "/app");
  };
  const closeAISurat = () => {
    setShowAISurat(false);
    setShowDashboard(true);
    setShowAIPembuatSoal(false);
    setShowAIModulAjar(false);
    setShowDinoAI(false);
    setShowAICV(false);
    window.history.pushState({}, "", "/app");
  };
  const closeAIPembuatSoal = () => {
    setShowAIPembuatSoal(false);
    setShowAIModulAjar(false);
    setShowDashboard(true);
    setShowDinoAI(false);
    setShowAICV(false);
    setShowAISurat(false);
    window.history.pushState({}, "", "/app");
  };
  const openDinoMath = () => {
    setMobileMenu(false);
  setShowDashboard(false);
  setShowDinoAI(false);
  setShowAICV(false);
  setShowAISurat(false);
  setShowAIPembuatSoal(false);
  setShowAIModulAjar(false);
  setShowDinoMath(true);
  setShowFeedbackAdmin(false);
    window.history.pushState({}, "", "/app/dinomath");
};
const closeDinoMath = () => {
  setShowDinoMath(false);
  setShowDashboard(true);
  setShowDinoAI(false);
  setShowAICV(false);
  setShowAISurat(false);
  setShowAIPembuatSoal(false);
  setShowAIModulAjar(false);
  setShowFeedbackAdmin(false);
    window.history.pushState({}, "", "/app");
};
  const openFeedbackAdmin = () => {
    setMobileMenu(false);
    setShowDashboard(false);
    setShowDinoAI(false);
    setShowAICV(false);
    setShowAISurat(false);
    setShowAIPembuatSoal(false);
    setShowAIModulAjar(false);
    setShowDinoMath(false);
    setShowFeedbackAdmin(true);
    window.history.pushState({}, "", "/app/admin/saran-kritik");
  };
  const closeFeedbackAdmin = () => {
    setShowFeedbackAdmin(false);
    setShowDashboard(true);
    window.history.pushState({}, "", "/app");
  };
  return window.location.pathname === "/numea" ? (
    <NumeaAccessGate
      darkMode={darkMode}
      onToggleTheme={() => setDarkMode((value) => !value)}
      onBack={() => {
        window.location.href = "/"
      }}
      onOpenDinoAI={openDinoAI}
      onOpenAICV={openAICV}
      onOpenAISurat={openAISurat}
      onOpenAISoal={openAIPembuatSoal}
      onOpenAIModulAjar={openAIModulAjar}
    />
  ) : (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="dino-float absolute left-[-140px] top-[80px] h-[320px] w-[320px] rounded-full bg-[#EECDA3]/35 blur-3xl" />
        <div className="dino-float-slow absolute right-[-120px] top-[180px] h-[360px] w-[360px] rounded-full bg-[#EF629F]/20 blur-3xl" />
        <div className="dino-pulse-soft absolute bottom-[-180px] left-[35%] h-[400px] w-[400px] rounded-full bg-[#EECDA3]/15 blur-3xl" />
      </div>
      {!((showDashboard || showDinoAI || showAICV || showAISurat || showAIPembuatSoal || showAIModulAjar || showDinoMath || showFeedbackAdmin) && user) && (
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
      {showAIModulAjar && user ? (
        <AIModulAjar onBack={closeAIModulAjar} />
      ) : showAIPembuatSoal && user ? (
        <AIPembuatSoal onBack={closeAIPembuatSoal} />
      ) : showAISurat && user ? (
        <AISuratLamaran onBack={closeAISurat} />
      ) : showAICV && user ? (
        <AICVMaker onBack={closeAICV} />
      ) : showDinoAI && user ? (
        <DinoAIChat
          email={user.email}
          userId={user.id}
          onClose={closeDinoAI}
        />
      ) : showDinoMath && user ? (
        <DinoMathFlipbook onBack={closeDinoMath} />
      ) : showFeedbackAdmin && user ? (
        user.app_metadata?.role === "admin" ? (
          <FeedbackAdmin onBack={closeFeedbackAdmin} />
        ) : (
          <div className="mx-auto max-w-3xl px-6 py-20 text-center">
            <h1 className="text-2xl font-bold">Akses Ditolak</h1>
            <p className="mt-3 text-muted-foreground">
              Halaman saran dan kritik hanya dapat diakses oleh administrator.
            </p>
            <button
              type="button"
              onClick={closeFeedbackAdmin}
              className="dino-gradient mt-6 rounded-full px-5 py-3 font-semibold text-white"
            >
              Kembali ke Dashboard
            </button>
          </div>
        )
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
          onOpenAISurat={openAISurat}
          onOpenAISoal={openAIPembuatSoal}
          onOpenAIModulAjar={openAIModulAjar}
          onOpenDinoMath={openDinoMath}
          isAdmin={user.app_metadata?.role === "admin"}
          onOpenFeedbackAdmin={openFeedbackAdmin}
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

            {/* FITUR DINOEDU SPACE */}
            <section
              id="fitur"
              className="mx-auto max-w-7xl px-6 pb-24 lg:px-8"
            >
              <div className="dino-enter mb-10 max-w-3xl">
                <p className="text-[14px] font-semibold uppercase tracking-[0.18em] text-[#EF629F]">
                  Fitur DinoEdu Space
                </p>
                <h2 className="mt-3 text-4xl font-bold tracking-normal sm:text-5xl">
                  Satu ruang, <span className="text-[#EF629F]">banyak solusi</span>
                </h2>
                <p className="mt-5 text-[18px] leading-relaxed text-muted-foreground">
                  Selain DinoMath dan NUMEA EDU, kamu juga bisa menggunakan berbagai
                  tools AI untuk belajar, menyiapkan kebutuhan karier, dan mendukung
                  pekerjaan pendidikan.
                </p>
              </div>

              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  {
                    title: "DinoAI Chat",
                    description: "Teman AI untuk mencari ide, memahami materi, dan membantu menyelesaikan berbagai kebutuhan.",
                    icon: MessageCircle,
                  },
                  {
                    title: "AI CV Maker",
                    description: "Susun CV profesional berdasarkan informasi, pengalaman, dan keterampilan yang kamu miliki.",
                    icon: FileText,
                  },
                  {
                    title: "AI Surat Lamaran",
                    description: "Bantu menulis surat lamaran yang rapi dan disesuaikan dengan posisi yang dituju.",
                    icon: Mail,
                  },
                  {
                    title: "AI Pembuat Soal",
                    description: "Buat rancangan soal pembelajaran berdasarkan kelas, materi, dan kebutuhan evaluasi.",
                    icon: ClipboardList,
                  },
                  {
                    title: "AI Modul Ajar",
                    description: "Bantu menyusun modul ajar secara praktis dan terstruktur untuk mendukung pembelajaran.",
                    icon: BookOpen,
                  },
                ].map((feature, index) => {
                  const Icon = feature.icon;
                  return (
                    <article
                      key={feature.title}
                      className="dino-glass dino-interactive dino-enter group rounded-[28px] p-6"
                      style={{ animationDelay: `${100 + index * 70}ms` }}
                    >
                      <div className="dino-gradient flex h-12 w-12 items-center justify-center rounded-2xl shadow-lg">
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <h3 className="mt-5 text-xl font-semibold">{feature.title}</h3>
                      <p className="mt-2 text-sm leading-7 text-muted-foreground">
                        {feature.description}
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowAuth(true)}
                        className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#EF629F] transition-all duration-200 hover:gap-3"
                      >
                        Mulai gunakan
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </article>
                  );
                })}
              </div>
            </section>

            {/* PROMOSI DINOMATH & NUMEA EDU */}
            <section
              id="eksplorasi"
              className="mx-auto max-w-7xl px-6 pb-28 lg:px-8"
            >
              <div className="dino-enter mb-12 max-w-2xl">
                <p className="text-[14px] font-semibold uppercase tracking-[0.18em] text-[#EF629F]">
                  Jelajahi DinoEdu Space
                </p>
                <h2 className="mt-3 text-4xl font-bold tracking-normal sm:text-5xl">
                  Lebih banyak hal untuk{" "}
                  <span className="text-[#EF629F]">kamu jelajahi</span>
                </h2>
                <p className="mt-5 text-[20px] leading-relaxed text-muted-foreground">
                  Belajar dengan cara yang menyenangkan dan tumbuh bersama
                  komunitas pendidikan dalam satu ruang digital.
                </p>
              </div>
              <div className="grid items-stretch gap-6 lg:grid-cols-2">
                {/* PROMOSI DINOMATH */}
                <article
                  className="dino-glass dino-interactive dino-enter group relative isolate flex h-full flex-col overflow-hidden rounded-[32px] border border-orange-300/30 p-7 sm:p-9"
                  style={{ animationDelay: "180ms" }}
                >
                  <div className="absolute -right-16 -top-16 -z-10 h-56 w-56 rounded-full bg-orange-400/20 blur-3xl transition-transform duration-500 group-hover:scale-125" />
                  <div className="absolute -bottom-16 -left-12 -z-10 h-48 w-48 rounded-full bg-amber-300/15 blur-3xl" />
                  <div className="relative flex flex-1 flex-col">
                    <div className="flex h-16 shrink-0 items-center justify-between gap-3">
                      <span className="inline-flex items-center rounded-full border border-orange-400/30 bg-orange-400/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-orange-500">
                        Belajar Jadi Seru
                      </span>
                      <img
                        src="/dinomath.PNG"
                        alt="Logo DinoMath"
                        className="h-16 w-16 shrink-0 object-contain animate-pulse"
                      />
                    </div>
                    <h3 className="mt-7 text-3xl font-bold tracking-tight sm:text-4xl">
                      DinoMath
                    </h3>
                    <p className="mt-2 text-sm font-semibold text-orange-500">
                      Serunya Belajar Matematika
                    </p>
                    <p className="mt-5 text-[15px] leading-7 text-muted-foreground">
                      Temukan pengalaman belajar matematika melalui komik
                      edukatif yang seru, cerita yang menarik, dan petualangan
                      bersama karakter DinoMath.
                    </p>
                    <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <span className="mt-0.5 text-orange-500">✦</span>
                        Belajar matematika melalui cerita bergambar
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-0.5 text-orange-500">✦</span>
                        Pengalaman membaca komik secara interaktif
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-0.5 text-orange-500">✦</span>
                        Menjelajahi matematika dengan cara yang berbeda
                      </li>
                    </ul>
                    <div className="mt-auto pt-8">
                      <button
                        type="button"
                        onClick={() => setShowAuth(true)}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-4 text-sm font-bold text-white shadow-lg shadow-orange-500/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-orange-500/30 sm:w-auto"
                      >
                        Jelajahi DinoMath
                        <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                      </button>
                      <p className="mt-3 text-xs leading-5 text-muted-foreground">
                        Buat akun atau masuk untuk melanjutkan ke DinoEdu Space.
                      </p>
                    </div>
                  </div>
                </article>
                {/* PROMOSI NUMEA EDU */}
                <article
                  className="dino-glass dino-interactive dino-enter group relative isolate flex h-full flex-col overflow-hidden rounded-[32px] border border-[#EF629F]/25 p-7 sm:p-9"
                  style={{ animationDelay: "260ms" }}
                >
                  <div className="absolute -right-16 -top-16 -z-10 h-56 w-56 rounded-full bg-[#EF629F]/15 blur-3xl transition-transform duration-500 group-hover:scale-125" />
                  <div className="absolute -bottom-16 -left-12 -z-10 h-48 w-48 rounded-full bg-purple-400/15 blur-3xl" />
                  <div className="relative flex flex-1 flex-col">
                    <div className="flex h-16 shrink-0 items-center justify-between gap-3">
                      <span className="inline-flex items-center rounded-full border border-[#EF629F]/30 bg-[#EF629F]/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-[#EF629F]">
                        Komunitas Pendidikan
                      </span>
                      <img
                        src="/numeaedu.PNG"
                        alt="Logo NUMEA EDU"
                        className="h-16 w-16 shrink-0 object-contain animate-pulse"
                      />
                    </div>
                    <h3 className="mt-7 text-3xl font-bold tracking-tight sm:text-4xl">
                      NUMEA EDU
                    </h3>
                    <p className="mt-2 text-sm font-semibold text-[#EF629F]">
                      Bertumbuh, Berbagi, Berdampak
                    </p>
                    <p className="mt-5 text-[15px] leading-7 text-muted-foreground">
                      Ruang untuk pendidik dan pegiat pendidikan saling
                      terhubung, berbagi gagasan, bertukar pengalaman, serta
                      mengembangkan potensi bersama.
                    </p>
                    <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <span className="mt-0.5 text-[#EF629F]">✦</span>
                        Terhubung dengan komunitas pendidikan
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-0.5 text-[#EF629F]">✦</span>
                        Berbagi inspirasi dan pengalaman mengajar
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-0.5 text-[#EF629F]">✦</span>
                        Bertumbuh melalui kolaborasi dan kreativitas
                      </li>
                    </ul>
                    <div className="mt-auto pt-8">
                      <button
                        type="button"
                        onClick={() => setShowAuth(true)}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#EF629F] to-purple-500 px-6 py-4 text-sm font-bold text-white shadow-lg shadow-pink-500/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-pink-500/30 sm:w-auto"
                      >
                        Kenali NUMEA EDU
                        <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                      </button>
                      <p className="mt-3 text-xs leading-5 text-muted-foreground">
                        Bergabunglah dengan membuat akun atau masuk ke DinoEdu Space.
                      </p>
                    </div>
                  </div>
                </article>
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
