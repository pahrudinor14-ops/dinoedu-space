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
import PublicLegalDialog, {
  type PublicLegalDocument,
} from "./components/PublicLegalDialog";
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
  ChevronDown,
  Menu,
  Moon,
  AtSign,
  ShieldCheck,
  Sun,
  X,
} from "lucide-react";
const APP_ROUTES = [
  "/",
  "/numea",
  "/app",
  "/app/dinoai",
  "/app/cv",
  "/app/surat",
  "/app/soal",
  "/app/dinomath",
  "/app/modul-ajar",
  "/app/admin/saran-kritik",
] as const;
type AppRoute = (typeof APP_ROUTES)[number];
const normalizeAppRoute = (pathname: string): AppRoute => {
  const normalizedPath = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return APP_ROUTES.includes(normalizedPath as AppRoute)
    ? (normalizedPath as AppRoute)
    : "/";
};
function App() {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem("dinoedu-theme");
    if (saved === "dark") return true;
    if (saved === "light") return false;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  const [mobileMenu, setMobileMenu] = useState(false);
  const [productMenuOpen, setProductMenuOpen] = useState(false);
  const [legalDocument, setLegalDocument] = useState<PublicLegalDocument>(null);
  const productNavItems = [
    { label: "Fitur AI", href: "#fitur" },
    { label: "DinoMath", href: "#dinomath" },
    { label: "NUMEA EDU", href: "#numea" },
  ];
  const [showAuth, setShowAuth] = useState(false);
  const [showMFA, setShowMFA] = useState(false);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [currentRoute, setCurrentRoute] = useState<AppRoute>(() =>
    normalizeAppRoute(window.location.pathname),
  );
  const showDashboard = currentRoute.startsWith("/app");
  const showDinoAI = currentRoute === "/app/dinoai";
  const showAICV = currentRoute === "/app/cv";
  const showAISurat = currentRoute === "/app/surat";
  const showAIPembuatSoal = currentRoute === "/app/soal";
  const showAIModulAjar = currentRoute === "/app/modul-ajar";
  const showDinoMath = currentRoute === "/app/dinomath";
  const showFeedbackAdmin = currentRoute === "/app/admin/saran-kritik";
  const navigateTo = (path: string, replace = false) => {
    const nextRoute = normalizeAppRoute(path);
    const currentPath = window.location.pathname;
    if (currentPath !== nextRoute) {
      const currentRouteFromUrl = normalizeAppRoute(currentPath);
      const nextState = {
        ...(window.history.state ?? {}),
        dinoeduRoute: nextRoute,
        dinoeduPreviousRoute: currentRouteFromUrl,
      };
      if (replace) {
        window.history.replaceState(nextState, "", nextRoute);
      } else {
        window.history.pushState(nextState, "", nextRoute);
      }
    }
    setCurrentRoute(nextRoute);
  };
  const returnToPreviousRoute = () => {
    const state = window.history.state as {
      dinoeduRoute?: string;
      dinoeduPreviousRoute?: string;
    } | null;
    const currentPath = normalizeAppRoute(window.location.pathname);
    const previousPath = state?.dinoeduPreviousRoute;
    if (
      state?.dinoeduRoute === currentPath &&
      previousPath &&
      previousPath !== currentPath &&
      APP_ROUTES.includes(previousPath as AppRoute)
    ) {
      window.history.back();
      return;
    }
    navigateTo("/app", true);
  };
  useEffect(() => {
    const syncRouteFromUrl = () => {
      const currentPath = window.location.pathname;
      const nextRoute = normalizeAppRoute(currentPath);
      if (currentPath !== nextRoute) {
        window.history.replaceState(
          {
            ...(window.history.state ?? {}),
            dinoeduRoute: nextRoute,
          },
          "",
          `${nextRoute}${window.location.search}${window.location.hash}`,
        );
      }
      setCurrentRoute(nextRoute);
    };
    syncRouteFromUrl();
    window.addEventListener("popstate", syncRouteFromUrl);
    window.addEventListener("pageshow", syncRouteFromUrl);
    return () => {
      window.removeEventListener("popstate", syncRouteFromUrl);
      window.removeEventListener("pageshow", syncRouteFromUrl);
    };
  }, []);
  const [user, setUser] = useState<User | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [supporterPaymentLoading, setSupporterPaymentLoading] = useState(false);
  const [supporterQrUrl, setSupporterQrUrl] = useState<string | null>(null);
  const [tokenPaymentLoading, setTokenPaymentLoading] = useState(false);
  const [tokenQrUrl, setTokenQrUrl] = useState<string | null>(null);
  const [tokenOrderId, setTokenOrderId] = useState<string | null>(null);
  const [tokenPaymentStatus, setTokenPaymentStatus] = useState<"pending" | "paid" | "failed" | "expired" | null>(null);
  // Paket Gratis merupakan paket dasar akun.
  const handleStartFree = () => {
    window.alert("Paket Gratis aktif sebagai paket dasar akun DinoEdu Space.");
  };
  // Pembelian token menggunakan alur pembayaran terpisah dari Supporter.
  const handleBuyTokens = async () => {
    if (!user) {
      setShowAuth(true);
      return;
    }
    if (tokenPaymentLoading) return;
    setTokenPaymentLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "midtrans-create-token-payment",
        { body: { idempotencyKey: crypto.randomUUID() } },
      );
      if (error) throw error;
      const payment = data as {
        orderId?: unknown;
        qrUrl?: unknown;
        status?: unknown;
        error?: unknown;
        message?: unknown;
      } | null;
      if (payment?.error) throw new Error(String(payment.error));
      if (
        typeof payment?.orderId !== "string" ||
        !/^DINO-TOK-[0-9a-f-]{36}$/i.test(payment.orderId) ||
        typeof payment.qrUrl !== "string" ||
        !/^https:\/\/api\.sandbox\.midtrans\.com\//i.test(payment.qrUrl)
      ) {
        throw new Error(
          typeof payment?.message === "string"
            ? payment.message
            : "Respons pembayaran token tidak valid.",
        );
      }
      setTokenOrderId(payment.orderId);
      setTokenQrUrl(payment.qrUrl);
      setTokenPaymentStatus(payment.status === "paid" ? "paid" : "pending");
    } catch (error) {
      console.error("Gagal membuat pembayaran token:", error);
      window.alert(
        error instanceof Error
          ? `Pembayaran token gagal dibuat: ${error.message}`
          : "Pembayaran token gagal dibuat. Periksa Console.",
      );
    } finally {
      setTokenPaymentLoading(false);
    }
  };
  // Transaksi Supporter dibuat melalui Edge Function; Server Key tidak dikirim ke browser.
  const handleSupportDinoAI = async () => {
    if (!user) {
      setShowAuth(true);
      return;
    }
    if (supporterPaymentLoading) return;
    setSupporterPaymentLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "midtrans-create-payment",
        {
          body: {
            idempotencyKey: crypto.randomUUID(),
          },
        },
      );
      if (error) {
        console.error("Gagal membuat pembayaran DinoAI Supporter:", error);
        const response = (error as { context?: Response }).context;
        if (response instanceof Response) {
          try {
            const responseBody = await response.clone().text();
            console.error("Status respons Edge Function:", response.status);
            console.error(
              "Detail respons Edge Function:",
              responseBody || "(body respons kosong)",
            );
            window.alert(
              responseBody
                ? `Pembayaran gagal (HTTP ${response.status}): ${responseBody}`
                : `Pembayaran gagal. HTTP ${response.status} ${response.statusText}`,
            );
          } catch (diagnosticError) {
            console.error("Gagal membaca respons Edge Function:", diagnosticError);
            window.alert(
              `Pembayaran gagal. HTTP ${response.status} ${response.statusText}`,
            );
          }
        } else {
          window.alert(
            "Pembayaran belum berhasil dibuat. Buka Console untuk melihat detail error.",
          );
        }
        return;
      }
      const paymentData = data as {
        qr_url?: unknown;
        redirect_url?: unknown;
        error?: unknown;
        message?: unknown;
      } | null;
      if (paymentData?.error) {
        window.alert(String(paymentData.error));
        return;
      }
      const paymentUrl =
        typeof paymentData?.qr_url === "string"
          ? paymentData.qr_url
          : typeof paymentData?.redirect_url === "string"
            ? paymentData.redirect_url
            : null;
      if (!paymentUrl || !/^https:\/\//i.test(paymentUrl)) {
        console.error("Respons pembayaran tidak berisi URL HTTPS:", data);
        window.alert(
          "Transaksi belum mengembalikan URL QRIS yang valid. Periksa respons Edge Function midtrans-create-payment.",
        );
        return;
      }
      if (typeof paymentData?.qr_url !== "string") {
        window.alert(
          "QRIS belum tersedia. Silakan coba lagi atau periksa respons pembayaran.",
        );
        return;
      }
      setSupporterQrUrl(paymentData.qr_url);
    } catch (error: unknown) {
      console.error("Kesalahan saat membuat pembayaran Supporter:", error);
      const response = (error as { context?: Response })?.context;
      if (response instanceof Response) {
        try {
          const responseBody = await response.clone().text();
          console.error("Status respons Edge Function:", response.status);
          console.error(
            "Detail respons Edge Function:",
            responseBody || "(body respons kosong)",
          );
        } catch (diagnosticError) {
          console.error("Gagal membaca respons Edge Function:", diagnosticError);
        }
      }
      window.alert(
        "Terjadi kesalahan saat membuat pembayaran Supporter. Buka Console untuk melihat detail.",
      );
    } finally {
      setSupporterPaymentLoading(false);
    }
  };
useEffect(() => {
  if (!user || !tokenOrderId || tokenPaymentStatus !== "pending") {
    return;
  }
  let active = true;
  let checking = false;
  const checkPayment = async () => {
    if (checking) return;
    checking = true;
    try {
      const { data, error } = await supabase.functions.invoke(
        "midtrans-token-payment-status",
        {
          body: { orderId: tokenOrderId },
        },
      );
      if (error) {
        const response = (
          error as { context?: Response }
        ).context;
        const detail = response
          ? await response.clone().text().catch(() => "")
          : "";
        console.error("Pemeriksaan status token gagal:", {
          message: error.message,
          detail,
        });
        return;
      }
      if (!active) return;
      const result = data as {
        status?: unknown;
        orderId?: unknown;
      } | null;
      if (result?.orderId !== tokenOrderId) {
        console.error("Order ID respons status tidak cocok.");
        return;
      }
      if (
        result.status === "paid" ||
        result.status === "failed" ||
        result.status === "expired"
      ) {
        setTokenPaymentStatus(result.status);
      }
    } catch (error) {
      console.error(
        "Gagal memeriksa status pembayaran token:",
        error,
      );
    } finally {
      checking = false;
    }
  };
  void checkPayment();
  const timer = window.setInterval(() => {
    void checkPayment();
  }, 5000);
  return () => {
    active = false;
    window.clearInterval(timer);
  };
}, [user, tokenOrderId, tokenPaymentStatus]);
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
      setAuthInitialized(true);
      if (event === "SIGNED_OUT") {
        navigateTo("/", true);
      }
      if (
        event === "INITIAL_SESSION" &&
        !session &&
        normalizeAppRoute(window.location.pathname).startsWith("/app")
      ) {
        navigateTo("/", true);
      }
      if (event === "SIGNED_IN" && session) {
        const routeFromUrl = normalizeAppRoute(window.location.pathname);
        if (routeFromUrl === "/" && window.location.pathname === "/") {
          navigateTo("/app", true);
        } else {
          navigateTo(routeFromUrl, true);
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
    navigateTo("/", true);
  };
  const openSecurity = async () => {
    const { data, error } = await supabase.auth.mfa.listFactors();
    const enabled =
      !error && data.totp?.some((factor) => factor.status === "verified");
    setMfaEnabled(Boolean(enabled));
    setShowMFA(true);
  };
  const openDashboard = () => {
    setMobileMenu(false);
    setShowAuth(false);
    navigateTo("/app");
  };
  const backHome = () => {
    navigateTo("/");
  };
  const openDinoAI = () => {
    setMobileMenu(false);
    navigateTo("/app/dinoai");
  };
  const openAICV = () => {
    setMobileMenu(false);
    navigateTo("/app/cv");
  };
  const openAISurat = () => {
    setMobileMenu(false);
    navigateTo("/app/surat");
  };
  const openAIPembuatSoal = () => {
    setMobileMenu(false);
    navigateTo("/app/soal");
  };
  const openAIModulAjar = () => {
    setMobileMenu(false);
    navigateTo("/app/modul-ajar");
  };
  const closeAIModulAjar = returnToPreviousRoute;
  const closeDinoAI = returnToPreviousRoute;
  const closeAICV = returnToPreviousRoute;
  const closeAISurat = returnToPreviousRoute;
  const closeAIPembuatSoal = returnToPreviousRoute;
  const openDinoMath = () => {
    setMobileMenu(false);
    navigateTo("/app/dinomath");
  };
  const closeDinoMath = returnToPreviousRoute;
  const openFeedbackAdmin = () => {
    setMobileMenu(false);
    navigateTo("/app/admin/saran-kritik");
  };
  const closeFeedbackAdmin = returnToPreviousRoute;
  if (currentRoute.startsWith("/app") && !authInitialized) {
    return (
      <main
        className="flex min-h-dvh items-center justify-center bg-background px-6 text-sm text-muted-foreground"
        aria-live="polite"
        aria-busy="true"
      >
        Memuat halaman DinoEdu Space…
      </main>
    );
  }
  return currentRoute === "/numea" ? (
    <NumeaAccessGate
      darkMode={darkMode}
      onToggleTheme={() => setDarkMode((value) => !value)}
      onBack={() => {
        navigateTo("/")
      }}
      onOpenDinoAI={openDinoAI}
      onOpenAICV={openAICV}
      onOpenAISurat={openAISurat}
      onOpenAISoal={openAIPembuatSoal}
      onOpenAIModulAjar={openAIModulAjar}
    />
  ) : (
    <div className="min-h-dvh overflow-x-hidden bg-background text-foreground">
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
              <div className="flex h-11 w-11 shrink-0 items-center justify-center">
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
            <nav className="hidden items-center gap-4 xl:gap-7 lg:flex">
              <a
                href="#beranda"
                className="inline-flex h-10 items-center leading-none text-[14px] font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF629F]"
              >
                Beranda
              </a>
              <div
                className="relative"
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                    setProductMenuOpen(false);
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.preventDefault();
                    setProductMenuOpen(false);
                    event.currentTarget.querySelector("button")?.focus();
                  }
                }}
              >
                <button
                  type="button"
                  aria-expanded={productMenuOpen}
                  aria-controls="desktop-product-menu"
                  onClick={() => setProductMenuOpen((value) => !value)}
                  className="inline-flex h-10 items-center gap-1 leading-none text-[14px] font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF629F] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  Produk
                  <ChevronDown className={`h-4 w-4 transition-transform ${productMenuOpen ? "rotate-180" : ""}`} />
                </button>
                <div
                  id="desktop-product-menu"
                  className={`${productMenuOpen ? "block" : "hidden"} absolute left-0 top-full z-50 mt-3 min-w-48 rounded-2xl border border-border/60 bg-background/95 p-2 shadow-xl backdrop-blur-xl`}
                >
                  {productNavItems.map((item) => (
                    <a
                      key={item.href}
                      href={item.href}
                      onClick={() => setProductMenuOpen(false)}
                      className="block rounded-xl px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF629F]"
                    >
                      {item.label}
                    </a>
                  ))}
                </div>
              </div>
              <a
                href="#tentang"
                className="inline-flex h-10 items-center leading-none text-[14px] font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF629F]"
              >
                Tentang
              </a>
              <a
                href="#bantuan"
                className="inline-flex h-10 items-center leading-none text-[14px] font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF629F]"
              >
                Bantuan
              </a>
            </nav>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDarkMode((value) => !value)}
                className="dino-button flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border/60 bg-white/40 backdrop-blur-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF629F] dark:bg-white/5"
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
                onClick={() => {
                  setProductMenuOpen(false);
                  setMobileMenu((value) => !value);
                }}
                className="dino-button flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border/60 bg-white/40 backdrop-blur-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF629F] lg:hidden dark:bg-white/5"
                aria-label={mobileMenu ? "Tutup menu utama" : "Buka menu utama"}
                aria-expanded={mobileMenu}
              >
                {mobileMenu ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </button>
              {user ? (
                <div className="hidden items-center gap-2 lg:flex">
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
                  className="dino-gradient dino-button hidden rounded-full px-5 py-3 text-[14px] font-semibold text-white shadow-lg shadow-pink-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF629F] lg:inline-flex"
                >
                  Mulai Sekarang
                </button>
              )}
            </div>
          </div>
          {mobileMenu && (
            <div className="dino-enter border-t border-border/50 px-6 py-5 lg:hidden">
              <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-4 text-center">
                <a
                  href="#beranda"
                  onClick={() => setMobileMenu(false)}
                  className="w-full text-center text-[14px] font-medium transition-colors duration-200 hover:text-[#EF629F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF629F]"
                >
                  Beranda
                </a>
                <div
                  className="w-full"
                  onBlur={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                      setProductMenuOpen(false);
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      event.preventDefault();
                      setProductMenuOpen(false);
                      event.currentTarget.querySelector("button")?.focus();
                    }
                  }}
                >
                  <button
                    type="button"
                    aria-expanded={productMenuOpen}
                    aria-controls="mobile-product-menu"
                    onClick={() => setProductMenuOpen((value) => !value)}
                    className="inline-flex w-full items-center justify-center gap-2 text-center text-[14px] font-medium transition-colors duration-200 hover:text-[#EF629F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF629F]"
                  >
                    Produk
                    <ChevronDown className={`h-4 w-4 transition-transform ${productMenuOpen ? "rotate-180" : ""}`} />
                  </button>
                  <div id="mobile-product-menu" className={`${productMenuOpen ? "flex" : "hidden"} mt-3 w-full flex-col items-center gap-3 rounded-2xl border border-border/50 bg-background/50 px-4 py-3`}>
                    {productNavItems.map((item) => (
                      <a
                        key={item.href}
                        href={item.href}
                        onClick={() => {
                          setProductMenuOpen(false);
                          setMobileMenu(false);
                        }}
                        className="w-full text-center text-[14px] font-medium text-muted-foreground transition-colors hover:text-[#EF629F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF629F]"
                      >
                        {item.label}
                      </a>
                    ))}
                  </div>
                </div>
                <a
                  href="#tentang"
                  onClick={() => setMobileMenu(false)}
                  className="w-full text-center text-[14px] font-medium transition-colors duration-200 hover:text-[#EF629F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF629F]"
                >
                  Tentang
                </a>
                <a
                  href="#bantuan"
                  onClick={() => setMobileMenu(false)}
                  className="w-full text-center text-[14px] font-medium transition-colors duration-200 hover:text-[#EF629F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF629F]"
                >
                  Bantuan
                </a>
                {user ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenu(false);
                        openDashboard();
                      }}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-border/60 bg-white/40 px-5 py-3 text-center text-[14px] font-semibold backdrop-blur-xl dark:bg-white/5"
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
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-border/60 bg-white/40 px-5 py-3 text-center text-[14px] font-semibold backdrop-blur-xl dark:bg-white/5"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      Keamanan
                    </button>
                    <button
                      type="button"
                      onClick={handleSignOut}
                  className="dino-gradient w-full rounded-full px-5 py-3 text-center text-[14px] font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF629F]"
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
                    className="dino-gradient w-full rounded-full px-5 py-3 text-center text-[14px] font-semibold text-white"
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
          onStartFree={handleStartFree}
          onBuyTokens={handleBuyTokens}
          onSupportDinoAI={handleSupportDinoAI}
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
                  className="dino-enter dino-hero-title mx-auto mt-8 max-w-5xl text-3xl font-bold sm:text-6xl lg:text-7xl"
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
              className="mx-auto max-w-7xl scroll-mt-28 px-6 pb-24 lg:px-8"
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
                  id="dinomath"
                  className="dino-glass dino-interactive dino-enter group relative isolate flex h-full scroll-mt-28 flex-col overflow-hidden rounded-[32px] border border-orange-300/30 p-7 sm:p-9"
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
                        <span className="mt-0.5 shrink-0 text-orange-500">
                          ✦
                        </span>
                        <span>Belajar matematika melalui cerita bergambar</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-0.5 shrink-0 text-orange-500">
                          ✦
                        </span>
                        <span>Pengalaman membaca komik secara interaktif</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-0.5 shrink-0 text-orange-500">
                          ✦
                        </span>
                        <span>Menjelajahi matematika dengan cara yang berbeda</span>
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
                  id="numea"
                  className="dino-glass dino-interactive dino-enter group relative isolate flex h-full scroll-mt-28 flex-col overflow-hidden rounded-[32px] border border-[#EF629F]/25 p-7 sm:p-9"
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
                          <span className="mt-0.5 shrink-0 text-[#EF629F]">✦</span>
                          <span>Terhubung dengan komunitas pendidikan</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="mt-0.5 shrink-0 text-[#EF629F]">✦</span>
                          <span>Berbagi inspirasi dan pengalaman mengajar</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="mt-0.5 shrink-0 text-[#EF629F]">✦</span>
                          <span>Bertumbuh melalui kolaborasi dan kreativitas</span>
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
            <section
              id="tentang"
              aria-labelledby="about-heading"
              className="mx-auto max-w-7xl scroll-mt-28 px-6 pb-24 lg:px-8"
            >
              <div className="dino-enter mb-10 max-w-3xl">
                <p className="text-[14px] font-semibold uppercase tracking-[0.18em] text-[#EF629F]">
                  Tentang DinoEdu Space
                </p>
                <h2 id="about-heading" className="mt-3 text-4xl font-bold tracking-normal sm:text-5xl">
                  Belajar, berkarya, dan <span className="text-[#EF629F]">bertumbuh</span>
                </h2>
                <p className="mt-5 text-[17px] leading-7 text-muted-foreground">
                  DinoEdu Space adalah platform digital yang menggabungkan alat bantu AI untuk pendidikan,
                  karier, dan kebutuhan digital; DinoMath untuk belajar matematika melalui komik; serta
                  NUMEA EDU sebagai ruang komunitas bagi pendidik dan pegiat pendidikan.
                </p>
              </div>
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                <article className="dino-glass rounded-[28px] p-6 sm:p-7">
                  <h3 className="text-xl font-semibold">Visi</h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    Menjadi ruang digital yang memudahkan pengguna untuk belajar, berkarya, dan terhubung
                    dengan ekosistem pendidikan.
                  </p>
                </article>
                <article className="dino-glass rounded-[28px] p-6 sm:p-7">
                  <h3 className="text-xl font-semibold">Misi</h3>
                  <ul className="mt-3 space-y-2 text-sm leading-7 text-muted-foreground">
                    <li>Menyediakan alat bantu AI untuk kebutuhan pendidikan, karier, dan digital.</li>
                    <li>Menghadirkan pengalaman belajar matematika melalui komik DinoMath.</li>
                    <li>Menyediakan ruang berbagi dan bertumbuh bagi komunitas pendidikan melalui NUMEA EDU.</li>
                  </ul>
                </article>
                <article className="dino-glass rounded-[28px] p-6 sm:p-7">
                  <h3 className="text-xl font-semibold">Tujuan pengembangan</h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    Menghubungkan alat bantu digital, pengalaman belajar matematika, dan komunitas pendidikan
                    dalam satu platform agar layanan yang sesuai kebutuhan mudah ditemukan.
                  </p>
                </article>
              </div>
            </section>
            <section
              id="bantuan"
              aria-labelledby="help-heading"
              className="mx-auto max-w-7xl scroll-mt-28 px-6 pb-28 lg:px-8"
            >
              <div className="dino-enter mb-10 max-w-3xl">
                <p className="text-[14px] font-semibold uppercase tracking-[0.18em] text-[#EF629F]">
                  Pusat bantuan
                </p>
                <h2 id="help-heading" className="mt-3 text-4xl font-bold tracking-normal sm:text-5xl">
                  Bantuan untuk <span className="text-[#EF629F]">memulai</span>
                </h2>
                <p className="mt-5 text-[17px] leading-7 text-muted-foreground">
                  Ikuti panduan singkat ini untuk menggunakan akun dan menemukan fitur yang tersedia.
                </p>
              </div>
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                <article className="dino-glass rounded-[28px] p-6 sm:p-7">
                  <h3 className="text-lg font-semibold">1. Buat akun atau masuk</h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    Pilih <span className="font-semibold text-foreground">Mulai Sekarang</span>, lalu masuk
                    atau daftar dengan email dan kata sandi. Akun baru perlu memverifikasi email sebelum digunakan.
                  </p>
                </article>
                <article className="dino-glass rounded-[28px] p-6 sm:p-7">
                  <h3 className="text-lg font-semibold">2. Gunakan fitur AI atau DinoMath</h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    Setelah masuk, pilih alat AI dari dashboard, isi informasi yang diminta, lalu tinjau hasilnya.
                    Untuk DinoMath, buka kartunya di dashboard dan pilih seri komik yang tersedia.
                  </p>
                </article>
                <article className="dino-glass rounded-[28px] p-6 sm:p-7">
                  <h3 className="text-lg font-semibold">3. Ajukan akses NUMEA EDU</h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    Buka NUMEA EDU dan lengkapi formulir bergabung. Pengajuan ditinjau admin sebelum akses
                    komunitas diberikan.
                  </p>
                </article>
              </div>
              <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)]">
                <div>
                  <h3 className="mb-4 text-2xl font-bold">Pertanyaan umum</h3>
                  <div className="space-y-3">
                    <details className="dino-glass group rounded-2xl p-5">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF629F]">
                        Bagaimana cara mulai menggunakan DinoEdu Space?
                        <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" />
                      </summary>
                      <p className="mt-3 text-sm leading-7 text-muted-foreground">
                        Pilih Mulai Sekarang untuk masuk atau membuat akun. Jika mendaftar dengan email,
                        ikuti tautan verifikasi yang dikirim ke email tersebut.
                      </p>
                    </details>
                    <details className="dino-glass group rounded-2xl p-5">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF629F]">
                        Bagaimana menggunakan alat bantu AI?
                        <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" />
                      </summary>
                      <p className="mt-3 text-sm leading-7 text-muted-foreground">
                        Masuk ke akun, buka alat yang dibutuhkan dari dashboard—DinoAI Chat, AI CV Maker,
                        AI Surat Lamaran, AI Pembuat Soal, atau AI Modul Ajar—lalu isi konteks yang diminta.
                        Periksa dan sesuaikan hasil sebelum digunakan.
                      </p>
                    </details>
                    <details className="dino-glass group rounded-2xl p-5">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF629F]">
                        Bagaimana cara bergabung dengan NUMEA EDU?
                        <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" />
                      </summary>
                      <p className="mt-3 text-sm leading-7 text-muted-foreground">
                        Buka NUMEA EDU, lengkapi data dan formulir pengajuan, lalu tunggu peninjauan admin.
                        Halaman akan menampilkan status pengajuan.
                      </p>
                    </details>
                    <details className="dino-glass group rounded-2xl p-5">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF629F]">
                        Bagaimana melaporkan kendala?
                        <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" />
                      </summary>
                      <p className="mt-3 text-sm leading-7 text-muted-foreground">
                        Masuk ke dashboard, pilih Aduan di navigasi atas, lalu pilih fitur dan jelaskan
                        kendalanya. Aduan akan diteruskan ke admin DinoEdu Space. Email dan WhatsApp juga
                        tersedia di bagian Kanal dukungan.
                      </p>
                    </details>
                  </div>
                </div>
                <aside className="dino-glass h-fit rounded-[28px] p-6 sm:p-7" aria-labelledby="support-heading">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EF629F]/10 text-[#EF629F]">
                    <MessageCircle className="h-5 w-5" />
                  </div>
                  <h3 id="support-heading" className="mt-4 text-xl font-semibold">Kanal dukungan</h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    Setelah masuk ke dashboard, pilih Aduan di navigasi atas, pilih fitur yang bermasalah,
                    lalu kirim penjelasannya. Aduan akan diteruskan ke admin DinoEdu Space.
                  </p>
                  <div className="mt-5 flex items-center gap-3">
                    <a
                      href="mailto:dinoedu.space@gmail.com"
                      aria-label="Kirim email ke dinoedu.space@gmail.com"
                      title="Email dukungan"
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border/70 text-muted-foreground transition-colors hover:border-[#EF629F]/50 hover:text-[#EF629F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF629F]"
                    >
                      <Mail aria-hidden="true" className="h-5 w-5" />
                    </a>
                    <a
                      href="https://wa.me/6283159608714"
                      target="_blank"
                      rel="noreferrer noopener"
                      aria-label="Hubungi dukungan melalui WhatsApp 083159608714"
                      title="WhatsApp dukungan"
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border/70 text-muted-foreground transition-colors hover:border-[#EF629F]/50 hover:text-[#EF629F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF629F]"
                    >
                      <MessageCircle aria-hidden="true" className="h-5 w-5" />
                    </a>
                    <a
                      href="https://www.instagram.com/dinoedu.space?xtok=OHRnOTlib3Fpa2Jj"
                      target="_blank"
                      rel="noreferrer noopener"
                      aria-label="Kunjungi Instagram @dinoedu.space"
                      title="Instagram DinoEdu Space"
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border/70 text-muted-foreground transition-colors hover:border-[#EF629F]/50 hover:text-[#EF629F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF629F]"
                    >
                      <AtSign aria-hidden="true" className="h-5 w-5" />
                    </a>
                  </div>
                </aside>
              </div>
            </section>
          </main>
          <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+1rem)] z-50 flex justify-center px-4 md:hidden">
            <nav className="dino-mobile-nav dino-glass grid h-16 w-full max-w-[320px] grid-cols-4 items-center gap-1 rounded-full p-2 shadow-2xl shadow-black/10">
              <a
                href="#beranda"
                className="dino-button flex h-12 w-full items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF629F]"
                aria-label="Beranda"
              >
                <Home className="h-5 w-5" />
              </a>
              <button
                type="button"
                onClick={() => setShowAuth(true)}
                className="dino-button dino-gradient flex h-12 w-full items-center justify-center rounded-full text-white shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF629F]"
                aria-label="DinoAI"
              >
                <img
                  src="/logodino.PNG"
                  alt=""
                  className="h-8 w-8 object-contain"
                />
              </button>
              <a
                href="#fitur"
                className="dino-button flex h-12 w-full items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF629F]"
                aria-label="Fitur AI"
              >
                <Layers3 className="h-5 w-5" />
              </a>
              <a
                href="#tentang"
                className="dino-button flex h-12 w-full items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF629F]"
                aria-label="Tentang"
              >
                <Info className="h-5 w-5" />
              </a>
            </nav>
          </div>
          <footer className="dino-mobile-footer-space border-t border-border/50 pb-6">
            <div className="mx-auto grid max-w-7xl gap-7 px-5 py-8 sm:grid-cols-2 sm:px-6 lg:grid-cols-3 lg:gap-10 lg:px-8">
              <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-1">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden">
                  <img src="/logodino.PNG" alt="Logo DinoEdu" className="h-full w-full scale-110 object-contain" />
                </div>
                <div>
                  <div className="text-[14px] font-semibold">DinoEdu Space</div>
                  <div className="text-[13px] text-muted-foreground">Education • Creative • Digital</div>
                </div>
              </div>
              <section aria-labelledby="footer-legal-heading">
                <h2 id="footer-legal-heading" className="text-sm font-semibold">Privasi &amp; Ketentuan</h2>
                <div className="mt-3 flex flex-col items-start gap-2.5 text-[13px]">
                  <button
                    type="button"
                    onClick={() => setLegalDocument("privacy")}
                    className="text-left text-muted-foreground transition-colors hover:text-[#EF629F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF629F]"
                  >
                    Kebijakan Privasi
                  </button>
                  <button
                    type="button"
                    onClick={() => setLegalDocument("terms")}
                    className="text-left text-muted-foreground transition-colors hover:text-[#EF629F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF629F]"
                  >
                    Syarat dan Ketentuan
                  </button>
                  <a
                    href="/#bantuan"
                    className="text-muted-foreground transition-colors hover:text-[#EF629F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF629F]"
                  >
                    Pusat Bantuan
                  </a>
                </div>
              </section>
              <section aria-labelledby="footer-contact-heading">
                <h2 id="footer-contact-heading" className="text-sm font-semibold">Kontak resmi</h2>
                <div className="mt-3 flex flex-col items-start gap-3 text-[13px]">
                  <a
                    href="mailto:dinoedu.space@gmail.com"
                    className="inline-flex items-center gap-2.5 text-muted-foreground transition-colors hover:text-[#EF629F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF629F]"
                  >
                    <Mail aria-hidden="true" className="h-4 w-4 shrink-0 text-[#EF629F]" />
                    dinoedu.space@gmail.com
                  </a>
                  <a
                    href="https://www.instagram.com/dinoedu.space?xtok=OHRnOTlib3Fpa2Jj"
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-2.5 text-muted-foreground transition-colors hover:text-[#EF629F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF629F]"
                  >
                    <AtSign aria-hidden="true" className="h-4 w-4 shrink-0 text-[#EF629F]" />
                    Instagram @dinoedu.space
                  </a>
                  <a
                    href="https://wa.me/6283159608714"
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-2.5 text-muted-foreground transition-colors hover:text-[#EF629F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF629F]"
                  >
                    <MessageCircle aria-hidden="true" className="h-4 w-4 shrink-0 text-[#EF629F]" />
                    WhatsApp 083159608714
                  </a>
                </div>
              </section>
              <div className="border-t border-border/50 pt-4 text-[13px] text-muted-foreground sm:col-span-2 lg:col-span-3">
                © {new Date().getFullYear()} DinoEdu Space
              </div>
            </div>
          </footer>
          <PublicLegalDialog
            documentType={legalDocument}
            onClose={() => setLegalDocument(null)}
          />
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
            {tokenQrUrl && (
        <div
          className="fixed inset-0 z-[121] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setTokenQrUrl(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="token-qr-title"
            className="w-full max-w-sm rounded-3xl border border-border bg-background p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4">
              <h2 id="token-qr-title" className="text-lg font-bold">
                Pembelian 10 Token DinoAI
              </h2>
              <button
                type="button"
                onClick={() => setTokenQrUrl(null)}
                className="rounded-full p-2 hover:bg-muted"
                aria-label="Tutup QRIS token"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Total pembayaran: <strong>Rp5.000</strong>
            </p>
            <div className="mt-5 flex justify-center rounded-2xl bg-white p-4">
              <img
                src={tokenQrUrl}
                alt="QRIS pembayaran 10 token DinoAI"
                className="h-auto w-full max-w-[280px] object-contain"
              />
            </div>
            <p className="mt-4 text-center text-sm" aria-live="polite">
              {tokenPaymentStatus === "paid"
                ? "Pembayaran terverifikasi oleh server."
                : tokenPaymentStatus === "failed"
                  ? "Pembayaran gagal."
                  : tokenPaymentStatus === "expired"
                    ? "Pembayaran kedaluwarsa."
                    : "Menunggu pembayaran. Status diperiksa otomatis."}
            </p>
            <button
              type="button"
              onClick={() => setTokenQrUrl(null)}
              className="mt-5 w-full rounded-xl border border-border px-4 py-3 font-semibold transition hover:bg-muted"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
      {supporterQrUrl && (
  <div
    className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    onClick={() => setSupporterQrUrl(null)}
  >
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="supporter-qr-title"
      className="w-full max-w-sm rounded-3xl border border-border bg-background p-6 shadow-2xl"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex items-center justify-between gap-4">
        <h2 id="supporter-qr-title" className="text-lg font-bold">
          Pembayaran DinoAI Supporter
        </h2>
        <button
          type="button"
          onClick={() => setSupporterQrUrl(null)}
          className="rounded-full p-2 hover:bg-muted"
          aria-label="Tutup QRIS"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Pindai kode QRIS berikut untuk menyelesaikan pembayaran.
      </p>
      <div className="mt-5 flex justify-center rounded-2xl bg-white p-4">
        <img
          src={supporterQrUrl}
          alt="Kode QRIS pembayaran DinoAI Supporter"
          className="h-auto w-full max-w-[280px] object-contain"
        />
      </div>
      <p className="mt-4 text-center text-xs text-muted-foreground">
        Paket Supporter aktif setelah pembayaran terverifikasi.
      </p>
      <button
        type="button"
        onClick={() => setSupporterQrUrl(null)}
        className="mt-5 w-full rounded-xl border border-border px-4 py-3 font-semibold transition hover:bg-muted"
      >
        Tutup
      </button>
    </div>
  </div>
)}
    </div>
  );
}
export default App;
