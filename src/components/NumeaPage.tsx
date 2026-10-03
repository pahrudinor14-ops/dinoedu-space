import {
  ArrowLeft,
  BookOpen,
  Check,
  Coins,
  Crown,
  Heart,
  Sparkles,
  Users,
} from "lucide-react"

interface NumeaPageProps {
  onBack: () => void
}

export default function NumeaPage({
  onBack,
}: NumeaPageProps) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      {/* NUMEA EDU BACKGROUND */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="dino-float absolute left-[-140px] top-[100px] h-[320px] w-[320px] rounded-full bg-[#EECDA3]/25 blur-3xl" />

        <div className="dino-float-slow absolute right-[-120px] top-[220px] h-[360px] w-[360px] rounded-full bg-[#EF629F]/15 blur-3xl" />

        <div className="dino-pulse-soft absolute bottom-[-180px] left-[35%] h-[400px] w-[400px] rounded-full bg-[#EECDA3]/15 blur-3xl" />
      </div>

      {/* NUMEA EDU HEADER */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-8">
          <button
            type="button"
            onClick={onBack}
            className="dino-button inline-flex items-center gap-2 rounded-full border border-border/60 bg-white/40 px-4 py-3 text-[14px] font-semibold backdrop-blur-xl dark:bg-white/5"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </button>

          <div className="flex items-center gap-2 text-[14px] font-semibold">
            <Sparkles className="h-4 w-4 text-[#EF629F]" />
            NUMEA EDU
          </div>
        </div>
      </header>

      <main>
        {/* NUMEA HERO */}
        <section className="mx-auto max-w-7xl px-6 pb-24 pt-20 lg:px-8 lg:pb-28 lg:pt-28">
          <div className="mx-auto max-w-4xl text-center">
            <div className="dino-glass dino-enter mx-auto inline-flex items-center gap-2 rounded-full px-4 py-2 text-[14px] font-medium">
              <Users className="h-4 w-4 text-[#EF629F]" />
              Komunitas Numerasi
            </div>

            <h1 className="dino-enter mt-8 text-4xl font-bold tracking-normal sm:text-6xl lg:text-7xl">
              NUMEA EDU
              <span className="block bg-gradient-to-r from-[#EECDA3] to-[#EF629F] bg-clip-text pb-1 text-transparent">
                Belajar numerasi bersama
              </span>
            </h1>

            <p className="dino-enter mx-auto mt-6 max-w-2xl text-[20px] leading-relaxed text-muted-foreground">
              Ruang komunitas untuk belajar, berbagi, dan berkembang bersama
              melalui numerasi dan pendidikan
            </p>

            <div className="dino-enter mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                href="#paket"
                className="dino-gradient dino-button inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-[15px] font-semibold text-white shadow-lg shadow-pink-500/10"
              >
                Lihat pilihan akses
              </a>

              <a
                href="#dukungan"
                className="dino-button inline-flex items-center gap-2 rounded-full border border-border/70 bg-white/40 px-6 py-3.5 text-[15px] font-medium backdrop-blur-xl dark:bg-white/5"
              >
                Dukung NUMEA EDU
              </a>
            </div>
          </div>
        </section>

        {/* BENEFIT NUMEA */}
        <section className="mx-auto max-w-7xl px-6 pb-24 lg:px-8">
          <div className="mb-12 max-w-2xl">
            <p className="text-[14px] font-semibold uppercase tracking-[0.18em] text-[#EF629F]">
              Tentang NUMEA EDU
            </p>

            <h2 className="mt-3 text-3xl font-bold tracking-normal sm:text-5xl">
              Belajar tidak harus sendiri
            </h2>

            <p className="mt-5 text-[20px] leading-relaxed text-muted-foreground">
              NUMEA EDU dibangun sebagai ruang untuk mempertemukan pembelajaran,
              berbagi pengetahuan, dan pengembangan diri
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <div className="dino-glass dino-interactive rounded-[28px] p-7">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EF629F]/10">
                <Users className="h-5 w-5 text-[#EF629F]" />
              </div>

              <h3 className="mt-6 text-xl font-semibold">
                Komunitas
              </h3>

              <p className="mt-3 text-[14px] leading-7 text-muted-foreground">
                Terhubung dengan orang-orang yang memiliki minat pada numerasi
                dan pendidikan
              </p>
            </div>

            <div className="dino-glass dino-interactive rounded-[28px] p-7">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EF629F]/10">
                <BookOpen className="h-5 w-5 text-[#EF629F]" />
              </div>

              <h3 className="mt-6 text-xl font-semibold">
                Belajar
              </h3>

              <p className="mt-3 text-[14px] leading-7 text-muted-foreground">
                Mendapatkan ruang untuk berbagi pengetahuan, materi, dan
                pengalaman belajar
              </p>
            </div>

            <div className="dino-glass dino-interactive rounded-[28px] p-7">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EF629F]/10">
                <Heart className="h-5 w-5 text-[#EF629F]" />
              </div>

              <h3 className="mt-6 text-xl font-semibold">
                Berkembang
              </h3>

              <p className="mt-3 text-[14px] leading-7 text-muted-foreground">
                Mendukung perkembangan NUMEA EDU dan ekosistem DinoEdu Space
              </p>
            </div>
          </div>
        </section>

        {/* PAKET */}
        <section
          id="paket"
          className="mx-auto max-w-7xl scroll-mt-28 px-6 pb-24 lg:px-8"
        >
          <div className="mb-12 max-w-2xl">
            <p className="text-[14px] font-semibold uppercase tracking-[0.18em] text-[#EF629F]">
              Pilihan akses
            </p>

            <h2 className="mt-3 text-3xl font-bold tracking-normal sm:text-5xl">
              Pilih cara kamu berkembang
            </h2>

            <p className="mt-5 text-[20px] leading-relaxed text-muted-foreground">
              Mulai gratis, bergabung bersama NUMEA EDU, atau gunakan fitur
              premium DinoEdu sesuai kebutuhanmu
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {/* GRATIS */}
            <div className="dino-glass dino-interactive rounded-[28px] p-7">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black/5 dark:bg-white/10">
                <BookOpen className="h-5 w-5" />
              </div>

              <h3 className="mt-6 text-xl font-semibold">
                Gratis
              </h3>

              <div className="mt-3 text-3xl font-bold">
                Rp0
                <span className="text-sm font-medium text-muted-foreground">
                  {" "}
                  / selamanya
                </span>
              </div>

              <p className="mt-3 text-[14px] leading-7 text-muted-foreground">
                Untuk mencoba DinoAI dan mengenal ekosistem DinoEdu
              </p>

              <div className="mt-6 space-y-3 text-[14px]">
                <div className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#EF629F]" />
                  <span>5 kredit AI per hari</span>
                </div>

                <div className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#EF629F]" />
                  <span>Akses fitur dasar</span>
                </div>
              </div>
            </div>

            {/* NUMEA EDU */}
            <div className="dino-glass dino-interactive rounded-[28px] p-7">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EF629F]/10">
                <Users className="h-5 w-5 text-[#EF629F]" />
              </div>

              <h3 className="mt-6 text-xl font-semibold">
                NUMEA EDU
              </h3>

              <div className="mt-3 text-3xl font-bold">
                Gratis
              </div>

              <p className="mt-3 text-[14px] leading-7 text-muted-foreground">
                Ruang komunitas untuk belajar dan berkembang bersama
              </p>

              <div className="mt-6 space-y-3 text-[14px]">
                <div className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#EF629F]" />
                  <span>15 kredit AI per hari</span>
                </div>

                <div className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#EF629F]" />
                  <span>Benefit komunitas NUMEA EDU</span>
                </div>

                <div className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#EF629F]" />
                  <span>Bagian dari ekosistem DinoEdu</span>
                </div>
              </div>

              <button
                type="button"
                disabled
                className="mt-7 w-full rounded-xl border border-border/70 px-4 py-3 text-[14px] font-semibold text-muted-foreground opacity-70"
              >
                Segera tersedia
              </button>
            </div>

            {/* DINOEDU PRO */}
            <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#EECDA3] to-[#EF629F] p-[1px] shadow-xl shadow-pink-500/10">
              <div className="h-full rounded-[27px] bg-background/90 p-7 backdrop-blur-xl dark:bg-background/80">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-[#EECDA3] to-[#EF629F] text-white shadow-lg">
                  <Crown className="h-5 w-5" />
                </div>

                <div className="mt-4 inline-flex rounded-full bg-[#EF629F]/10 px-3 py-1 text-[11px] font-semibold text-[#EF629F]">
                  Premium
                </div>

                <h3 className="mt-4 text-xl font-semibold">
                  DinoEdu Pro
                </h3>

                <div className="mt-3 text-3xl font-bold">
                  Rp29.000
                  <span className="text-sm font-medium text-muted-foreground">
                    {" "}
                    / bulan
                  </span>
                </div>

                <p className="mt-3 text-[14px] leading-7 text-muted-foreground">
                  Akses fitur AI Pro dengan batas penggunaan yang lebih tinggi
                </p>

                <div className="mt-6 space-y-3 text-[14px]">
                  <div className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#EF629F]" />
                    <span>50 kredit AI per hari</span>
                  </div>

                  <div className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#EF629F]" />
                    <span>Fitur AI Pro</span>
                  </div>

                  <div className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#EF629F]" />
                    <span>Output dan fitur premium</span>
                  </div>
                </div>

                <button
                  type="button"
                  disabled
                  className="mt-7 w-full rounded-xl bg-gradient-to-r from-[#EECDA3] to-[#EF629F] px-4 py-3 text-[14px] font-semibold text-white opacity-70"
                >
                  Segera tersedia
                </button>
              </div>
            </div>

            {/* TOP UP */}
            <div className="dino-glass dino-interactive rounded-[28px] p-7">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EECDA3]/20">
                <Coins className="h-5 w-5 text-[#EF629F]" />
              </div>

              <h3 className="mt-6 text-xl font-semibold">
                Top Up Credit
              </h3>

              <div className="mt-3 text-3xl font-bold">
                Rp5.000
              </div>

              <p className="mt-3 text-[14px] leading-7 text-muted-foreground">
                Tambahkan credit tanpa harus berlangganan paket Pro
              </p>

              <div className="mt-6 space-y-3 text-[14px]">
                <div className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#EF629F]" />
                  <span>10 kredit AI</span>
                </div>

                <div className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#EF629F]" />
                  <span>Pembelian sekali pakai</span>
                </div>
              </div>

              <button
                type="button"
                disabled
                className="mt-7 w-full rounded-xl border border-border/70 px-4 py-3 text-[14px] font-semibold text-muted-foreground opacity-70"
              >
                Segera tersedia
              </button>
            </div>
          </div>

          {/* INFO HARGA */}
          <div className="mt-6 text-center text-[13px] text-muted-foreground">
            Sistem pembayaran dan pengaktifan paket akan tersedia pada tahap
            berikutnya
          </div>
        </section>

        {/* DUKUNGAN */}
        <section
          id="dukungan"
          className="mx-auto max-w-7xl scroll-mt-28 px-6 pb-28 lg:px-8"
        >
          <div className="dino-glass relative overflow-hidden rounded-[32px] p-8 text-center sm:p-12 lg:p-16">
            <div className="dino-float-slow absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#EF629F]/10 blur-3xl" />

            <div className="dino-float absolute -bottom-28 -left-24 h-72 w-72 rounded-full bg-[#EECDA3]/15 blur-3xl" />

            <div className="relative">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EF629F]/10">
                <Heart className="h-6 w-6 text-[#EF629F]" />
              </div>

              <h2 className="mt-6 text-3xl font-bold tracking-normal sm:text-4xl">
                Dukung pengembangan DinoEdu
              </h2>

              <p className="mx-auto mt-4 max-w-2xl text-[16px] leading-7 text-muted-foreground">
                Dukungan pengguna akan membantu pengembangan fitur pendidikan,
                komunitas, dan layanan digital DinoEdu Space
              </p>

              <div className="mt-7">
                <button
                  type="button"
                  disabled
                  className="dino-gradient rounded-xl px-6 py-3 text-[14px] font-semibold text-white opacity-70"
                >
                  Dukungan segera tersedia
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-border/50">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-8 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="text-[14px] text-muted-foreground">
            © 2026 DinoEdu Space
          </div>

          <div className="text-[14px] text-muted-foreground">
            NUMEA EDU • Komunitas Numerasi
          </div>
        </div>
      </footer>
    </div>
  )
}