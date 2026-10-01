import { useEffect, useState } from "react"
import {
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Smartphone,
  X,
} from "lucide-react"
import { supabase } from "../lib/supabase"

type MFASetupProps = {
  onClose?: () => void
  onEnabled?: () => void
}

type SetupStep = "ready" | "setup" | "enabled"

export default function MFASetup({
  onClose,
  onEnabled,
}: MFASetupProps) {
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [verifying, setVerifying] = useState(false)

  const [step, setStep] = useState<SetupStep>("ready")

  const [qrCode, setQrCode] = useState("")
  const [secret, setSecret] = useState("")
  const [factorId, setFactorId] = useState("")
  const [code, setCode] = useState("")

  const [error, setError] = useState("")

  useEffect(() => {
    const checkMFA = async () => {
      setError("")

      const { data, error: factorError } =
        await supabase.auth.mfa.listFactors()

      if (factorError) {
        setError(factorError.message)
        setLoading(false)
        return
      }

      const verifiedTotp = data.totp.find(
        (factor) => factor.status === "verified"
      )

      if (verifiedTotp) {
        setStep("enabled")
      }

      setLoading(false)
    }

    checkMFA()
  }, [])

  const handleStartSetup = async () => {
    setError("")
    setStarting(true)

    try {
      const { data, error: enrollError } =
        await supabase.auth.mfa.enroll({
          factorType: "totp",
          friendlyName: "DinoEdu Space 2FA",
        })

      if (enrollError) {
        throw enrollError
      }

      setFactorId(data.id)
      setQrCode(data.totp.qr_code)
      setSecret(data.totp.secret)
      setStep("setup")
    } catch (authError) {
      const errorMessage =
        authError instanceof Error
          ? authError.message
          : "Gagal menyiapkan 2FA"

      setError(errorMessage)
    } finally {
      setStarting(false)
    }
  }

  const handleVerify = async () => {
    setError("")

    if (!code.trim()) {
      setError("Masukkan kode 6 digit dari aplikasi authenticator")
      return
    }

    if (code.trim().length !== 6) {
      setError("Kode authenticator harus terdiri dari 6 digit")
      return
    }

    if (!factorId) {
      setError("Faktor 2FA belum siap")
      return
    }

    setVerifying(true)

    try {
      const { data: challengeData, error: challengeError } =
        await supabase.auth.mfa.challenge({
          factorId,
        })

      if (challengeError) {
        throw challengeError
      }

      const { error: verifyError } =
        await supabase.auth.mfa.verify({
          factorId,
          challengeId: challengeData.id,
          code: code.trim(),
        })

      if (verifyError) {
        throw verifyError
      }

      setCode("")
      setStep("enabled")
      onEnabled?.()
    } catch (authError) {
      const errorMessage =
        authError instanceof Error
          ? authError.message
          : "Kode 2FA tidak valid"

      setError(errorMessage)
    } finally {
      setVerifying(false)
    }
  }

  const qrSource = qrCode.startsWith("data:")
    ? qrCode
    : `data:image/svg+xml;charset=utf-8,${encodeURIComponent(qrCode)}`

  if (loading) {
    return (
      <div className="flex min-h-[280px] w-full items-center justify-center">
        <div className="dino-glass flex w-full max-w-xl items-center justify-center rounded-3xl p-6 shadow-2xl shadow-black/10 sm:p-8">
          <div className="text-center">
            <Loader2 className="mx-auto h-7 w-7 animate-spin text-[#EF629F]" />

            <p className="mt-3 text-[13px] text-muted-foreground">
              Memeriksa keamanan akun
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="dino-glass relative w-full max-w-2xl overflow-hidden rounded-3xl p-4 shadow-2xl shadow-black/10 sm:p-6">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup pengaturan 2FA"
            className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/70 text-black/50 shadow-sm transition hover:scale-105 hover:bg-white hover:text-black dark:bg-black/30 dark:text-white/60 dark:hover:bg-black/50 dark:hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        <div className="mb-4 pr-8 text-center sm:mb-5">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-r from-[#EECDA3] to-[#EF629F] text-white shadow-lg">
            {step === "enabled" ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : (
              <ShieldCheck className="h-5 w-5" />
            )}
          </div>

          <h2 className="text-xl font-bold sm:text-2xl">
            {step === "enabled"
              ? "2FA sudah aktif"
              : "Aktifkan 2FA"}
          </h2>

          <p className="mx-auto mt-2 max-w-lg text-[12px] leading-5 text-black/60 dark:text-white/60 sm:text-[13px]">
            {step === "enabled"
              ? "Akun DinoEdu Space kamu sudah memiliki lapisan keamanan tambahan"
              : "Tambahkan lapisan keamanan ekstra pada akun DinoEdu Space"}
          </p>
        </div>

        {step === "enabled" ? (
          <div className="rounded-3xl border border-[#EF629F]/20 bg-[#EF629F]/10 p-4 text-center sm:p-5">
            <CheckCircle2 className="mx-auto h-10 w-10 text-[#EF629F]" />

            <p className="mt-3 text-[15px] font-semibold">
              Authenticator berhasil terhubung
            </p>

            <p className="mt-1 text-[12px] leading-5 text-muted-foreground">
              Gunakan kode dari aplikasi authenticator saat DinoEdu meminta verifikasi tambahan
            </p>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="mt-5 rounded-full bg-gradient-to-r from-[#EECDA3] to-[#EF629F] px-6 py-3 text-[14px] font-semibold text-white shadow-lg shadow-[#EF629F]/20 transition hover:scale-[1.01]"
              >
                Selesai
              </button>
            )}
          </div>
        ) : step === "ready" ? (
          <div className="rounded-3xl border border-black/10 bg-white/40 p-4 text-center dark:border-white/10 dark:bg-white/5 sm:p-6">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EF629F]/10">
              <Smartphone className="h-6 w-6 text-[#EF629F]" />
            </div>

            <h3 className="mt-4 text-lg font-semibold">
              Lindungi akunmu dengan authenticator
            </h3>

            <p className="mx-auto mt-2 max-w-md text-[13px] leading-6 text-muted-foreground">
              Gunakan Google Authenticator atau aplikasi authenticator lain untuk membuat kode keamanan 6 digit
            </p>

            {error && (
              <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-left text-[12px] leading-5 text-red-600 dark:text-red-300">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={handleStartSetup}
              disabled={starting}
              className="mt-5 flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#EECDA3] to-[#EF629F] px-5 text-[15px] font-semibold text-white shadow-lg shadow-[#EF629F]/20 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {starting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Menyiapkan 2FA
                </>
              ) : (
                "Mulai Aktifkan 2FA"
              )}
            </button>
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-[minmax(170px,210px)_minmax(0,1fr)] sm:items-stretch sm:gap-5">
              <div className="rounded-3xl border border-black/10 bg-white/40 p-3 text-center dark:border-white/10 dark:bg-white/5 sm:p-4">
                <p className="text-[13px] font-semibold">
                  Scan QR Code
                </p>

                <div className="mx-auto mt-3 flex w-fit items-center justify-center rounded-2xl bg-white p-3 shadow-sm">
                  <img
                    src={qrSource}
                    alt="QR Code untuk autentikasi dua faktor"
                    className="h-[140px] w-[140px] sm:h-[160px] sm:w-[160px]"
                  />
                </div>

                <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
                  Gunakan Google Authenticator atau aplikasi authenticator lain
                </p>

                <details className="mt-2 text-left">
                  <summary className="cursor-pointer text-[11px] font-medium text-[#EF629F]">
                    Tampilkan kunci manual
                  </summary>

                  <div className="mt-2 rounded-xl bg-black/5 p-3 dark:bg-white/5">
                    <p className="break-all font-mono text-[10px] leading-4">
                      {secret}
                    </p>
                  </div>
                </details>
              </div>

              <div className="flex rounded-3xl border border-black/10 bg-white/40 p-4 dark:border-white/10 dark:bg-white/5 sm:p-5">
                <div className="flex w-full flex-col justify-center">
                  <div>
                    <p className="text-[14px] font-semibold">
                      Masukkan kode verifikasi
                    </p>

                    <p className="mt-1 text-[12px] leading-5 text-muted-foreground">
                      Buka aplikasi authenticator lalu masukkan kode 6 digit
                    </p>
                  </div>

                  <input
                    id="mfa-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={code}
                    onChange={(event) =>
                      setCode(event.target.value.replace(/\D/g, ""))
                    }
                    placeholder="000000"
                    className="mt-4 h-13 w-full rounded-2xl border border-black/10 bg-white/80 px-4 text-center text-lg font-semibold tracking-[0.35em] outline-none transition focus:border-[#EF629F] focus:ring-2 focus:ring-[#EF629F]/20 dark:border-white/10 dark:bg-white/5"
                  />

                  {error && (
                    <div className="mt-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-[11px] leading-5 text-red-600 dark:text-red-300">
                      {error}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleVerify}
                    disabled={verifying}
                    className="mt-4 flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#EECDA3] to-[#EF629F] px-5 text-[14px] font-semibold text-white shadow-lg shadow-[#EF629F]/20 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {verifying ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Memverifikasi
                      </>
                    ) : (
                      "Aktifkan 2FA"
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4 text-center">
              <p className="text-[10px] leading-4 text-muted-foreground">
                Setelah kode berhasil diverifikasi, 2FA akan langsung aktif pada akun ini
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}