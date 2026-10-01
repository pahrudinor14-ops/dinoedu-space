import { useState } from "react"
import {
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  Sparkles,
  X,
} from "lucide-react"
import { supabase } from "../lib/supabase"

type AuthMode = "login" | "register"

type AuthProps = {
  onSuccess?: () => void
  onClose?: () => void
}

export default function Auth({ onSuccess, onClose }: AuthProps) {
  const [mode, setMode] = useState<AuthMode>("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const resetFeedback = () => {
    setMessage("")
    setError("")
  }

  const handleModeChange = (nextMode: AuthMode) => {
    resetFeedback()
    setMode(nextMode)
  }

  const handleGoogleLogin = async () => {
    resetFeedback()
    setGoogleLoading(true)

    try {
      const { error: googleError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
        },
      })

      if (googleError) {
        throw googleError
      }
    } catch (authError) {
      const errorMessage =
        authError instanceof Error
          ? authError.message
          : "Terjadi kesalahan saat masuk dengan Google"

      setError(errorMessage)
      setGoogleLoading(false)
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    resetFeedback()

    if (!email.trim()) {
      setError("Masukkan email terlebih dahulu")
      return
    }

    if (!password) {
      setError("Masukkan password terlebih dahulu")
      return
    }

    if (mode === "register" && password !== confirmPassword) {
      setError("Konfirmasi password belum sesuai")
      return
    }

    setLoading(true)

    try {
      if (mode === "register") {
        const { error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: window.location.origin,
          },
        })

        if (signUpError) {
          throw signUpError
        }

        setMessage(
          "Akun berhasil dibuat, silakan cek email untuk melakukan verifikasi"
        )

        setPassword("")
        setConfirmPassword("")
      } else {
        const { error: signInError } =
          await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          })

        if (signInError) {
          throw signInError
        }

        setMessage("Login berhasil")
        onSuccess?.()
      }
    } catch (authError) {
      const errorMessage =
        authError instanceof Error
          ? authError.message
          : "Terjadi kesalahan saat autentikasi"

      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="mx-auto flex w-full items-center justify-center px-1 py-1 sm:px-2 sm:py-2">
      <div className="w-full max-w-lg">
        <div className="dino-glass relative overflow-hidden rounded-3xl p-4 shadow-2xl shadow-black/10 sm:p-6">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup autentikasi"
              className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-xl text-black/50 transition hover:bg-black/5 hover:text-black dark:text-white/50 dark:hover:bg-white/5 dark:hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          )}

          <div className="mb-5 pr-10 text-center sm:mb-6">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-[#EECDA3] to-[#EF629F] text-white shadow-lg">
              <Sparkles className="h-5 w-5" />
            </div>

            <h2 className="text-xl font-bold sm:text-2xl">
              {mode === "login"
                ? "Selamat datang kembali"
                : "Buat akun DinoEdu"}
            </h2>

            <p className="mt-2 text-[13px] leading-5 text-black/60 dark:text-white/60 sm:text-sm">
              {mode === "login"
                ? "Masuk untuk melanjutkan perjalanan digitalmu"
                : "Buat akun untuk mengakses berbagai fitur DinoEdu Space"}
            </p>
          </div>

          <div className="mb-5 grid grid-cols-2 rounded-full bg-black/5 p-1 dark:bg-white/5">
            <button
              type="button"
              onClick={() => handleModeChange("login")}
              disabled={loading || googleLoading}
              className={`h-11 rounded-full px-4 text-sm font-semibold transition ${
                mode === "login"
                  ? "bg-white text-[#EF629F] shadow-sm dark:bg-white/10"
                  : "text-black/50 dark:text-white/50"
              }`}
            >
              Masuk
            </button>

            <button
              type="button"
              onClick={() => handleModeChange("register")}
              disabled={loading || googleLoading}
              className={`h-11 rounded-full px-4 text-sm font-semibold transition ${
                mode === "register"
                  ? "bg-white text-[#EF629F] shadow-sm dark:bg-white/10"
                  : "text-black/50 dark:text-white/50"
              }`}
            >
              Daftar
            </button>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading || googleLoading}
            className="flex h-12 w-full items-center justify-center gap-3 rounded-2xl border border-black/10 bg-white/80 px-4 text-sm font-semibold text-black/70 shadow-sm transition hover:bg-white hover:shadow-md disabled:cursor-not-allowed disabled:opacity-70 dark:border-white/10 dark:bg-white/5 dark:text-white/80 dark:hover:bg-white/10 sm:h-14 sm:px-5"
          >
            {googleLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-sm dark:bg-white">
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  <path
                    fill="#4285F4"
                    d="M21.35 12.23c0-.78-.07-1.53-.22-2.25H12v4.26h5.23a4.47 4.47 0 0 1-1.94 2.94v2.44h3.14c1.84-1.69 2.92-4.18 2.92-7.39Z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 21.75c2.63 0 4.84-.87 6.45-2.37l-3.14-2.44c-.87.58-1.98.92-3.31.92-2.54 0-4.69-1.72-5.46-4.03H3.3v2.52A9.75 9.75 0 0 0 12 21.75Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M6.54 13.83A5.86 5.86 0 0 1 6.22 12c0-.64.11-1.26.32-1.83V7.65H3.3A9.75 9.75 0 0 0 2.25 12c0 1.57.38 3.06 1.05 4.35l3.24-2.52Z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 6.14c1.43 0 2.72.49 3.73 1.45l2.8-2.8C16.84 3.24 14.63 2.25 12 2.25a9.75 9.75 0 0 0-8.7 5.4l3.24 2.52C7.31 7.86 9.46 6.14 12 6.14Z"
                  />
                </svg>
              </span>
            )}

            {googleLoading
              ? "Menghubungkan ke Google"
              : "Masuk dengan Google"}
          </button>

          <div className="my-4 flex items-center gap-3 sm:my-5">
            <div className="h-px flex-1 bg-black/10 dark:bg-white/10" />

            <span className="text-[13px] text-black/40 dark:text-white/40">
              atau lanjut dengan email
            </span>

            <div className="h-px flex-1 bg-black/10 dark:bg-white/10" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            <div>
              <label
                htmlFor="auth-email"
                className="mb-2 block text-sm font-medium"
              >
                Email
              </label>

              <div className="relative">
                <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-black/40 dark:text-white/40" />

                <input
                  id="auth-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="nama@email.com"
                  autoComplete="email"
                  className="h-12 w-full rounded-2xl border border-black/10 bg-white/70 pl-12 pr-4 text-sm outline-none transition focus:border-[#EF629F] focus:ring-2 focus:ring-[#EF629F]/20 dark:border-white/10 dark:bg-white/5 sm:h-14 sm:text-base"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="auth-password"
                className="mb-2 block text-sm font-medium"
              >
                Password
              </label>

              <div className="relative">
                <LockKeyhole className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-black/40 dark:text-white/40" />

                <input
                  id="auth-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Masukkan password"
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  className="h-12 w-full rounded-2xl border border-black/10 bg-white/70 pl-12 pr-12 text-sm outline-none transition focus:border-[#EF629F] focus:ring-2 focus:ring-[#EF629F]/20 dark:border-white/10 dark:bg-white/5 sm:h-14 sm:text-base"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl text-black/40 transition hover:bg-black/5 hover:text-black dark:text-white/40 dark:hover:bg-white/5 dark:hover:text-white"
                  aria-label={
                    showPassword
                      ? "Sembunyikan password"
                      : "Tampilkan password"
                  }
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {mode === "register" && (
              <div>
                <label
                  htmlFor="auth-confirm-password"
                  className="mb-2 block text-sm font-medium"
                >
                  Konfirmasi Password
                </label>

                <div className="relative">
                  <LockKeyhole className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-black/40 dark:text-white/40" />

                  <input
                    id="auth-confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(event) =>
                      setConfirmPassword(event.target.value)
                    }
                    placeholder="Ulangi password"
                    autoComplete="new-password"
                    className="h-12 w-full rounded-2xl border border-black/10 bg-white/70 pl-12 pr-12 text-sm outline-none transition focus:border-[#EF629F] focus:ring-2 focus:ring-[#EF629F]/20 dark:border-white/10 dark:bg-white/5 sm:h-14 sm:text-base"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword((value) => !value)
                    }
                    className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl text-black/40 transition hover:bg-black/5 hover:text-black dark:text-white/40 dark:hover:bg-white/5 dark:hover:text-white"
                    aria-label={
                      showConfirmPassword
                        ? "Sembunyikan konfirmasi password"
                        : "Tampilkan konfirmasi password"
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300">
                {error}
              </div>
            )}

            {message && (
              <div className="rounded-2xl border border-[#EF629F]/20 bg-[#EF629F]/10 px-4 py-3 text-sm text-[#D94C87] dark:text-[#F49BC0]">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#EECDA3] to-[#EF629F] px-5 text-sm font-semibold text-white shadow-lg shadow-[#EF629F]/20 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70 sm:h-14 sm:text-base"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Memproses
                </>
              ) : mode === "login" ? (
                "Masuk ke DinoEdu"
              ) : (
                "Buat Akun"
              )}
            </button>
          </form>
        </div>
      </div>
    </section>
  )
}