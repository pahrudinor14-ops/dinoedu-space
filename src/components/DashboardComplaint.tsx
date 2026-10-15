import { useEffect, useState, type FormEvent } from "react";
import {
  LoaderCircle,
  MessageSquareText,
  Send,
  X,
} from "lucide-react";
import { supabase } from "../lib/supabase";
type DashboardComplaintProps = {
  email?: string | null;
  onClose: () => void;
  open: boolean;
};
type ComplaintStatus = {
  ok: boolean;
  text: string;
} | null;
const complaintFeatures = [
  "DinoEdu Space",
  "Fitur AI",
  "DinoMath",
  "NUMEA EDU",
  "Akun atau pembayaran",
];
export function DashboardComplaintButton({
  onClick,
}: {
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Kirim aduan"
      title="Kirim aduan"
      className="dino-button inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border/60 bg-white/40 text-[#EF629F] backdrop-blur-xl transition-colors hover:bg-[#EF629F]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF629F] sm:h-11 sm:w-auto sm:gap-2 sm:px-4 sm:text-[14px] sm:font-semibold sm:text-foreground dark:bg-white/5"
    >
      <MessageSquareText aria-hidden="true" className="h-4 w-4" />
      <span className="hidden md:inline">Aduan</span>
    </button>
  );
}
export function DashboardComplaintDialog({
  email,
  onClose,
  open,
}: DashboardComplaintProps) {
  const [feature, setFeature] = useState(complaintFeatures[0]);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<ComplaintStatus>(null);
  useEffect(() => {
    if (!open) return;
    setStatus(null);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);
  if (!open) return null;
  async function submitComplaint(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedMessage = message.trim();
    if (!trimmedMessage || sending) return;
    setSending(true);
    setStatus(null);
    try {
      const { error } = await supabase.from("dinomath_feedback").insert({
        name: email?.trim() || "Pengguna DinoEdu",
        feedback_type: "Laporan masalah",
        message: `[Aduan dashboard] Fitur: ${feature}\n\n${trimmedMessage}`,
      });
      if (error) throw error;
      setMessage("");
      setStatus({
        ok: true,
        text: "Aduan terkirim dan dapat dilihat admin pada daftar Laporan masalah.",
      });
    } catch (error) {
      console.error("Aduan dashboard gagal dikirim:", error);
      setStatus({
        ok: false,
        text: "Aduan belum terkirim. Silakan coba lagi beberapa saat lagi.",
      });
    } finally {
      setSending(false);
    }
  }
  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/40 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-sm sm:items-center sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="dashboard-complaint-heading"
        onKeyDown={(event) => {
          if (event.key === "Escape") onClose();
        }}
        className="my-auto w-full max-w-xl rounded-3xl border border-border/70 bg-background p-5 text-foreground shadow-2xl sm:p-7"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#EF629F]/10 text-[#EF629F]">
              <MessageSquareText aria-hidden="true" className="h-5 w-5" />
            </div>
            <div>
              <h2 id="dashboard-complaint-heading" className="text-xl font-bold">
                Kirim aduan
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Aduan akan diteruskan ke admin DinoEdu Space.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup formulir aduan"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF629F]"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={submitComplaint} className="mt-6 space-y-4">
          <label className="grid gap-1.5 text-sm font-medium">
            Fitur terkait
            <select
              value={feature}
              onChange={(event) => setFeature(event.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-foreground outline-none focus:ring-2 focus:ring-[#EF629F]"
            >
              {complaintFeatures.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Ceritakan kendala
            <textarea
              autoFocus
              required
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              maxLength={2000}
              rows={5}
              placeholder="Jelaskan apa yang terjadi dan langkah yang Anda lakukan."
              className="w-full resize-y rounded-xl border border-border bg-background px-3 py-2.5 font-normal text-foreground outline-none focus:ring-2 focus:ring-[#EF629F]"
            />
            <span className="text-right text-xs font-normal text-muted-foreground">
              {message.length}/2000
            </span>
          </label>
          <p className="text-xs leading-5 text-muted-foreground">
            Email akun Anda ikut dicantumkan agar admin dapat mengenali pengirim.
          </p>
          {status && (
            <p
              role={status.ok ? "status" : "alert"}
              className={`rounded-xl px-3 py-2.5 text-sm ${status.ok ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-red-500/10 text-red-700 dark:text-red-300"}`}
            >
              {status.text}
            </p>
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF629F]"
            >
              Tutup
            </button>
            <button
              type="submit"
              disabled={sending || !message.trim()}
              className="dino-gradient inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-pink-500/10 transition-opacity disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF629F]"
            >
              {sending ? (
                <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
              ) : (
                <Send aria-hidden="true" className="h-4 w-4" />
              )}
              {sending ? "Mengirim..." : "Kirim aduan"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
