import { useEffect, useRef } from "react";
import { X } from "lucide-react";
export type PublicLegalDocument = "privacy" | "terms" | null;
type PublicLegalDialogProps = {
  documentType: PublicLegalDocument;
  onClose: () => void;
};
const officialEmail = "dinoedu.space@gmail.com";
function PrivacyPolicy() {
  return (
    <div className="space-y-5 text-sm leading-7 text-muted-foreground">
      <p>
        Kami menggunakan data yang diperlukan untuk menjalankan fitur DinoEdu
        Space yang Anda pilih.
      </p>
      <section aria-labelledby="privacy-data-heading">
        <h3 id="privacy-data-heading" className="text-base font-semibold text-foreground">
          Data yang digunakan
        </h3>
        <p className="mt-2">
          Data dapat mencakup email dan profil yang Anda isi, teks atau file
          yang Anda kirim ke fitur, konten yang Anda simpan atau bagikan, serta
          status transaksi jika Anda melakukan pembayaran.
        </p>
      </section>
      <section aria-labelledby="privacy-use-heading">
        <h3 id="privacy-use-heading" className="text-base font-semibold text-foreground">
          Cara data digunakan dan dibagikan
        </h3>
        <p className="mt-2">
          Data dipakai untuk mengelola akun, menjalankan fitur, menyimpan
          pilihan Anda, dan membantu transaksi. Teks yang dikirim ke fitur AI
          diproses oleh layanan AI. Konten yang dibagikan di NUMEA EDU dapat
          dilihat oleh anggota yang memiliki akses ke bagian tersebut.
        </p>
      </section>
      <section aria-labelledby="privacy-retention-heading">
        <h3 id="privacy-retention-heading" className="text-base font-semibold text-foreground">
          Riwayat dan permintaan terkait data
        </h3>
        <p className="mt-2">
          Preferensi tema dan riwayat DinoAI Chat tersimpan di browser Anda.
          Untuk menanyakan, memperbarui, atau meminta penghapusan data, hubungi{" "}
          <a className="font-medium text-[#EF629F] underline underline-offset-4" href={`mailto:${officialEmail}`}>
            {officialEmail}
          </a>
          . Kami akan meninjau permintaan berdasarkan data dan fitur terkait.
        </p>
      </section>
      <p className="border-t border-border/60 pt-4 text-xs">
        Terakhir diperbarui: 15 Oktober 2026.
      </p>
    </div>
  );
}
function TermsAndConditions() {
  return (
    <div className="space-y-5 text-sm leading-7 text-muted-foreground">
      <p>
        Dengan menggunakan DinoEdu Space, Anda setuju untuk memakai layanan
        secara bertanggung jawab.
      </p>
      <section aria-labelledby="terms-account-heading">
        <h3 id="terms-account-heading" className="text-base font-semibold text-foreground">
          Akun dan konten
        </h3>
        <p className="mt-2">
          Jaga akses akun Anda. Anda bertanggung jawab atas konten yang dikirim
          dan harus memiliki izin untuk membagikan materi milik pihak lain.
          Konten komunitas dapat dilihat oleh anggota yang memiliki akses.
        </p>
      </section>
      <section aria-labelledby="terms-ai-heading">
        <h3 id="terms-ai-heading" className="text-base font-semibold text-foreground">
          Hasil AI dan pembayaran
        </h3>
        <p className="mt-2">
          Hasil AI dapat keliru, jadi periksa sebelum digunakan. Jika membayar,
          pastikan rincian pesanan sudah benar sebelum melanjutkan.
        </p>
      </section>
      <p>
        Fitur dapat berubah atau diperbarui. Versi terbaru ketentuan ini
        ditampilkan di halaman ini.
      </p>
      <p className="border-t border-border/60 pt-4 text-xs">
        Terakhir diperbarui: 15 Oktober 2026.
      </p>
    </div>
  );
}
export default function PublicLegalDialog({
  documentType,
  onClose,
}: PublicLegalDialogProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    if (!documentType || !dialogRef.current) return;
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusableElements = () =>
      Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
    focusableElements()[0]?.focus({ preventScroll: true });
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = focusableElements();
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) {
        event.preventDefault();
        dialog.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousBodyOverflow;
      previousFocus?.focus({ preventScroll: true });
    };
  }, [documentType]);
  if (!documentType) return null;
  const isPrivacyPolicy = documentType === "privacy";
  const title = isPrivacyPolicy ? "Kebijakan Privasi" : "Syarat dan Ketentuan";
  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto bg-black/45 p-3 backdrop-blur-sm sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <article
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="public-legal-title"
        tabIndex={-1}
        className="my-auto flex max-h-[min(92dvh,56rem)] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-border/70 bg-background text-foreground shadow-2xl"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-border/60 px-5 py-4 sm:px-8 sm:py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#EF629F]">
              DinoEdu Space
            </p>
            <h2 id="public-legal-title" className="mt-1 text-xl font-bold sm:text-2xl">
              {title}
            </h2>
          </div>
          <button
            type="button"
            autoFocus
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF629F]"
            aria-label="Tutup dokumen"
          >
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="overflow-y-auto px-5 py-5 sm:px-8 sm:py-7">
          {isPrivacyPolicy ? <PrivacyPolicy /> : <TermsAndConditions />}
        </div>
      </article>
    </div>
  );
}
