import { forwardRef, useEffect, useRef, useState, type FormEvent } from "react";

import HTMLFlipBook from "react-pageflip";

import {

  getDocument,

  GlobalWorkerOptions,

  type PDFDocumentProxy,

} from "pdfjs-dist";

import {

  ArrowLeft,

  ChevronLeft,

  ChevronRight,

  LoaderCircle,

  Maximize,

  MessageSquareText,

  Send,

  ExternalLink,

} from "lucide-react";

import { supabase } from "../lib/supabase";

GlobalWorkerOptions.workerSrc = new URL(

  "pdfjs-dist/build/pdf.worker.min.mjs",

  import.meta.url,

).toString();

// Endpoint pengujian Google Drive.

// Jika CORS atau akses parsial gagal, gunakan penyimpanan PDF

// yang mendukung permintaan byte-range dan akses dari browser.

// PDF disimpan di Cloudflare R2 agar file besar tidak perlu masuk repository Git.
const PDF_URL =
  import.meta.env.VITE_DINOMATH_PDF_URL ||
  "https://pub-3e140b6227144bf794a37eb64c45641a.r2.dev/dinomath-komik.pdf";

type ComicSeries = {

  id: string;

  title: string;

  subtitle: string;

  url: string;

  available: boolean;

};

// Tambahkan seri lanjutan melalui variabel VITE_DINOMATH_SERIES_2_URL,

// VITE_DINOMATH_SERIES_3_URL, dan seterusnya.

const SERIES: ComicSeries[] = [

  {

    id: "series-1",

    title: " DinoMath Seri 1",

    subtitle: "Serunya Belajar Pecahan",

    url: PDF_URL,

    available: true,

  },

  ...[

    {

      id: "series-2",

      title: import.meta.env.VITE_DINOMATH_SERIES_2_TITLE || "Seri 2",

      subtitle: "Petualangan berikutnya",

      url: import.meta.env.VITE_DINOMATH_SERIES_2_URL || "",

    },

    {

      id: "series-3",

      title: import.meta.env.VITE_DINOMATH_SERIES_3_TITLE || "Seri 3",

      subtitle: "Lanjutkan petualangan matematika",

      url: import.meta.env.VITE_DINOMATH_SERIES_3_URL || "",

    },

    {

      id: "series-4",

      title: import.meta.env.VITE_DINOMATH_SERIES_4_TITLE || "Seri 4",

      subtitle: "Kisah DinoMath berikutnya",

      url: import.meta.env.VITE_DINOMATH_SERIES_4_URL || "",

    },

  ].map((series) => ({ ...series, available: Boolean(series.url) })),

];

const PAGE_WIDTH = 420;

const PAGE_HEIGHT = 594;

interface ComicPageProps {

  pdf: PDFDocumentProxy;

  pageNumber: number;

  shouldRender: boolean;

}

const ComicPage = forwardRef<HTMLDivElement, ComicPageProps>(

  function ComicPage({ pdf, pageNumber, shouldRender }, ref) {

    const canvasRef = useRef<HTMLCanvasElement>(null);

    const [error, setError] = useState(false);

    useEffect(() => {

      if (!shouldRender || !canvasRef.current) return;

      let cancelled = false;

      let renderTask: { cancel: () => void; promise: Promise<void> } | null =

        null;

      async function renderPage() {

        try {

          const page = await pdf.getPage(pageNumber);

          if (cancelled || !canvasRef.current) return;

          const baseViewport = page.getViewport({ scale: 1 });

          const scale = Math.min(

            PAGE_WIDTH / baseViewport.width,

            PAGE_HEIGHT / baseViewport.height,

          );

          const viewport = page.getViewport({ scale });

          const canvas = canvasRef.current;

          const context = canvas.getContext("2d");

          if (!context) throw new Error("Canvas tidak tersedia");

          const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);

          canvas.width = Math.floor(viewport.width * pixelRatio);

          canvas.height = Math.floor(viewport.height * pixelRatio);

          canvas.style.width = `${viewport.width}px`;

          canvas.style.height = `${viewport.height}px`;

          renderTask = page.render({

            canvas,

            canvasContext: context,

            viewport,

            transform: [pixelRatio, 0, 0, pixelRatio, 0, 0],

          });

          await renderTask.promise;

        } catch {

          if (!cancelled) setError(true);

        }

      }

      void renderPage();

      return () => {

        cancelled = true;

        renderTask?.cancel();

      };

    }, [pdf, pageNumber, shouldRender]);

    return (

      <div

        ref={ref}

        className="relative flex h-full w-full items-center justify-center overflow-hidden border border-[#e8dfcf] bg-[#fffdf7] text-stone-900 shadow-[inset_-3px_0_5px_rgba(95,72,40,0.06),inset_3px_0_5px_rgba(95,72,40,0.035),2px_0_4px_rgba(55,40,20,0.08)] dark:border-[#e8dfcf] dark:bg-[#fffdf7] dark:text-stone-900"

      >

        {shouldRender && !error ? (

          <canvas

            ref={canvasRef}

            className="relative z-10 block max-h-full max-w-full object-contain drop-shadow-[0_1px_1px_rgba(80,60,30,0.06)]"

            aria-label={`Halaman ${pageNumber}`}

          />

        ) : (

          <div className="flex flex-col items-center gap-3 p-6 text-center text-stone-500">

            {error ? (

              <p className="text-sm">Halaman gagal dimuat. Periksa akses PDF.</p>

            ) : (

              <LoaderCircle className="h-6 w-6 animate-spin" />

            )}

            <span className="text-xs">Halaman {pageNumber}</span>

          </div>

        )}

      </div>

    );

  },

);

ComicPage.displayName = "ComicPage";

interface FlipBookApi {

  flipPrev: () => void;

  flipNext: () => void;

  turnToPage: (page: number) => void;

}

interface FlipBookRef {

  pageFlip: () => FlipBookApi;

}

interface DinoMathFlipbookProps {

  onBack: () => void;

}

function BackButton({ onBack }: DinoMathFlipbookProps) {

  return (

    <button

      type="button"

      onClick={onBack}

      className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white px-4 py-2 text-sm font-semibold text-orange-700 transition hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 dark:border-orange-400/40 dark:bg-stone-900 dark:text-orange-300 dark:hover:bg-stone-800"

    >

      <ArrowLeft className="h-4 w-4" />

      Kembali ke Dashboard

    </button>

  );

}

function ReaderFeedback() {

  const [name, setName] = useState("");

  const [kind, setKind] = useState("Saran");

  const [message, setMessage] = useState("");

  const [sending, setSending] = useState(false);

  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

  async function submitFeedback(event: FormEvent<HTMLFormElement>) {

    event.preventDefault();

    if (!message.trim()) return;

    setSending(true);

    setStatus(null);

    try {

      const { error } = await supabase.from("dinomath_feedback").insert({

        name: name.trim() || "Pembaca DinoMath",

        feedback_type: kind,

        message: message.trim(),

      });

      if (error) throw error;

      setMessage("");

      setStatus({ ok: true, text: "Terima kasih! Masukanmu berhasil dikirim." });

    } catch {

      setStatus({

        ok: false,

        text: "Masukan belum terkirim. Pastikan tabel feedback DinoMath sudah dibuat di Supabase, lalu coba lagi.",

      });

    } finally {

      setSending(false);

    }

  }

  return (

    <section className="w-full rounded-3xl border border-orange-100 bg-white p-5 shadow-sm sm:p-7 dark:border-stone-700 dark:bg-stone-900">

      <div className="flex items-start gap-3">

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-100 text-orange-700">

          <MessageSquareText className="h-5 w-5" />

        </div>

        <div>

          <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">Saran dan komentar pembaca</h3>

          <p className="mt-1 text-sm leading-relaxed text-stone-600 dark:text-stone-300">Bantu kami membuat komik DinoMath lebih seru dan mudah dipahami.</p>

        </div>

      </div>

      <form onSubmit={submitFeedback} className="mt-5 grid gap-4 sm:grid-cols-2">

        <label className="grid gap-1.5 text-sm font-medium text-stone-700 dark:text-stone-200">

          Nama (opsional)

          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Nama" className="min-w-0 rounded-xl border border-orange-200 bg-white px-3 py-2.5 text-stone-900 outline-none focus:ring-2 focus:ring-orange-300 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100" />

        </label>

        <label className="grid gap-1.5 text-sm font-medium text-stone-700 dark:text-stone-200">

          Jenis masukan

          <select value={kind} onChange={(e) => setKind(e.target.value)} className="min-w-0 rounded-xl border border-orange-200 bg-white px-3 py-2.5 text-stone-900 outline-none focus:ring-2 focus:ring-orange-300 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100">

            <option>Saran</option><option>Komentar</option><option>Laporan masalah</option><option>Ide cerita</option>

          </select>

        </label>

        <label className="grid gap-1.5 text-sm font-medium text-stone-700 sm:col-span-2">

          Pesan

          <textarea required value={message} onChange={(e) => setMessage(e.target.value)} maxLength={2000} rows={4} placeholder="Apa yang kamu sukai atau ingin diperbaiki dari komik ini?" className="min-w-0 resize-y rounded-xl border border-orange-200 bg-white px-3 py-2.5 font-normal text-stone-900 outline-none focus:ring-2 focus:ring-orange-300 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100" />

          <span className="text-right text-xs font-normal text-stone-500 dark:text-stone-400">{message.length}/2000</span>

        </label>

        <div className="flex flex-col items-start gap-3 sm:col-span-2">

          <button disabled={sending || !message.trim()} type="submit" className="inline-flex items-center gap-2 rounded-full bg-orange-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50">

            {sending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}

            {sending ? "Mengirim..." : "Kirim masukan"}

          </button>

          {status && <p role="status" className={`text-sm ${status.ok ? "text-green-700" : "text-red-700"}`}>{status.text}</p>}

        </div>

      </form>

    </section>

  );

}

export default function DinoMathFlipbook({ onBack }: DinoMathFlipbookProps) {

  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);

  const [pageCount, setPageCount] = useState(0);

  const [currentPage, setCurrentPage] = useState(0);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [selectedSeriesId, setSelectedSeriesId] = useState("series-1");

  const bookRef = useRef<FlipBookRef | null>(null);

  const selectedSeries = SERIES.find((series) => series.id === selectedSeriesId) ?? SERIES[0];

  useEffect(() => {

    let cancelled = false;

    setLoading(true);

    setError("");

    setPdf(null);

    setPageCount(0);

    setCurrentPage(0);

    const loadingTask = getDocument({

      url: selectedSeries.url,

      rangeChunkSize: 64 * 1024,

      disableAutoFetch: true,

      disableStream: true,

    });

    loadingTask.promise

      .then((pdfDocument) => {

        // Jika komponen sudah dilepas, abaikan hasil pemuatan.

        // Pembersihan loading task ditangani oleh cleanup useEffect.

        if (cancelled) return;

        setPdf(pdfDocument);

        setPageCount(pdfDocument.numPages);

        setLoading(false);

      })

      .catch(() => {

        if (cancelled) return;

        setError("Komik sedang tidak dapat dimuat. Silakan coba lagi beberapa saat lagi.");

        setLoading(false);

      });

    return () => {

      cancelled = true;

      void loadingTask.destroy();

    };

  }, [selectedSeries.url]);

  const chooseSeries = (series: ComicSeries) => {

    if (!series.available) return;

    setSelectedSeriesId(series.id);

  };

  const flip = (direction: "prev" | "next") => {

    const book = bookRef.current?.pageFlip();

    if (!book) return;

    if (direction === "prev") book.flipPrev();

    else book.flipNext();

  };

  const toggleFullscreen = () => {

    if (document.fullscreenElement) {

      void document.exitFullscreen();

    } else {

      void document.documentElement.requestFullscreen?.();

    }

  };

  if (loading) {

    return (

      <section className="mx-auto min-h-screen w-full max-w-7xl px-4 py-5 text-stone-900 transition-colors sm:px-6 lg:px-8 dark:text-stone-100">

        <div className="mb-5"><BackButton onBack={onBack} /></div>

        <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)]">

          <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start"><ReaderFeedback /></aside>

          <div className="flex min-h-[520px] min-w-0 flex-col items-center justify-center gap-3 rounded-3xl border border-orange-100 bg-white p-8">

            <LoaderCircle className="h-8 w-8 animate-spin text-orange-500" />

            <p className="text-sm text-stone-600">Membuka komik DinoMath...</p>

          </div>

        </div>

      </section>

    );

  }

  if (error || !pdf) {

    return (

      <section className="mx-auto min-h-screen w-full max-w-7xl px-4 py-5 text-stone-900 transition-colors sm:px-6 lg:px-8 dark:text-stone-100">

        <div className="mb-5"><BackButton onBack={onBack} /></div>

        <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)]">

          <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start"><ReaderFeedback /></aside>

          <div className="flex min-w-0 flex-col justify-center rounded-3xl border border-orange-100 bg-white p-4 sm:p-7 dark:border-stone-700 dark:bg-stone-900">

            <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5 text-center sm:p-8 dark:border-orange-400/30 dark:bg-stone-800">

              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100 text-orange-700"><ExternalLink className="h-7 w-7" /></div>

              <h2 className="mt-4 text-xl font-bold text-stone-900 dark:text-stone-100">Komik belum dapat dibuka</h2>

              <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-stone-600 dark:text-stone-300">

                Maaf, komik belum bisa ditampilkan saat ini. Kamu dapat mencoba membuka file komik secara langsung atau kembali lagi beberapa saat nanti.

              </p>

              <div className="mt-5 flex flex-wrap justify-center gap-3">

                <a href={selectedSeries.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-orange-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-orange-700">Buka komik <ExternalLink className="h-4 w-4" /></a>

              </div>

            </div>

          </div>

        </div>

      </section>

    );

  }

  return (

    <section className="mx-auto min-h-screen w-full max-w-7xl px-4 py-5 text-stone-900 transition-colors sm:px-6 lg:px-8 dark:text-stone-100">

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">

        <div className="flex min-w-0 flex-wrap items-center gap-3">

          <BackButton onBack={onBack} />

          <div><p className="text-xs font-semibold uppercase tracking-widest text-orange-600 dark:text-orange-400">DINOMATH · {selectedSeries.title}</p><h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">{selectedSeries.subtitle}</h2></div>

        </div>

        <button type="button" onClick={toggleFullscreen} className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white px-4 py-2 text-sm font-medium transition hover:bg-orange-50 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100 dark:hover:bg-stone-800"><Maximize className="h-4 w-4" />Layar penuh</button>

      </div>

      <div className="grid min-w-0 grid-cols-1 items-start gap-5 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)]">

        <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start"><ReaderFeedback /></aside>

        <div className="min-w-0 space-y-4">

          <div className="relative flex min-h-[440px] w-full min-w-0 justify-center overflow-x-auto rounded-2xl border border-[#e8ddc9] bg-[radial-gradient(ellipse_at_center,_#f8f1e5_0%,_#eee3d2_68%,_#e5d8c4_100%)] p-3 shadow-[inset_0_2px_8px_rgba(91,65,35,0.10),0_8px_24px_rgba(71,48,23,0.08)] sm:min-h-[620px] sm:p-5 lg:p-7 dark:border-stone-700 dark:bg-[radial-gradient(ellipse_at_center,_#39332b_0%,_#292621_72%,_#211f1c_100%)]">

            <HTMLFlipBook ref={bookRef} width={PAGE_WIDTH} height={PAGE_HEIGHT} size="stretch" minWidth={280} maxWidth={PAGE_WIDTH} minHeight={396} maxHeight={PAGE_HEIGHT} showCover usePortrait mobileScrollSupport drawShadow flippingTime={850} maxShadowOpacity={0.42} onFlip={(event) => setCurrentPage(event.data)} className="mx-auto" style={{}} startPage={0} autoSize clickEventForward useMouseEvents swipeDistance={30} showPageCorners disableFlipByClick={false} startZIndex={0}>

              {Array.from({ length: pageCount }, (_, index) => {

                const pageNumber = index + 1;

                return <ComicPage key={pageNumber} pdf={pdf} pageNumber={pageNumber} shouldRender={Math.abs(index - currentPage) <= 2} />;

              })}

            </HTMLFlipBook>

          </div>

          <div className="flex items-center justify-between gap-2 rounded-2xl border border-orange-100 bg-white p-3 sm:p-4 dark:border-stone-700 dark:bg-stone-900">

            <button type="button" onClick={() => flip("prev")} disabled={currentPage === 0} className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-white px-3 py-2 text-sm font-medium transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-40 sm:gap-2 sm:px-4 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100 dark:hover:bg-stone-800"><ChevronLeft className="h-4 w-4" />Sebelumnya</button>

            <span className="text-center text-xs text-stone-600 sm:text-sm dark:text-stone-300">Halaman {pageCount === 0 ? 0 : currentPage + 1} dari {pageCount}</span>

            <button type="button" onClick={() => flip("next")} disabled={currentPage >= pageCount - 1} className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-white px-3 py-2 text-sm font-medium transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-40 sm:gap-2 sm:px-4 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100 dark:hover:bg-stone-800">Berikutnya<ChevronRight className="h-4 w-4" /></button>

          </div>

        </div>

      </div>

                <section className="mt-6 w-full min-w-0 rounded-3xl border border-orange-100 bg-white p-4 shadow-sm sm:p-6 dark:border-stone-700 dark:bg-stone-900">

            <div className="mb-4">

              <p className="text-xs font-bold uppercase tracking-widest text-orange-600">Lanjutkan petualangan</p>

              <h3 className="mt-1 text-lg font-bold text-stone-900 dark:text-stone-100">Seri komik DinoMath</h3>

              <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">Pilih seri yang ingin dibaca. Nantikan seri berikutnya ya!</p>

            </div>

            <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-3 [scrollbar-width:thin]">

              {SERIES.map((series) => {

                const active = series.id === selectedSeriesId;

                return (

                  <button

                    key={series.id}

                    type="button"

                    disabled={!series.available || active}

                    onClick={() => chooseSeries(series)}

                    className={`min-h-44 w-[260px] min-w-[260px] snap-start rounded-2xl border p-4 text-left transition sm:w-[280px] sm:min-w-[280px] ${

                      active

                        ? "border-orange-500 bg-orange-50 ring-1 ring-orange-300 dark:bg-orange-950/40 dark:ring-orange-700"

                        : series.available

                          ? "border-orange-100 bg-white hover:border-orange-300 hover:bg-orange-50 dark:border-stone-700 dark:bg-stone-800 dark:hover:border-orange-700 dark:hover:bg-stone-700"

                          : "cursor-not-allowed border-dashed border-stone-200 bg-stone-50 opacity-75 dark:border-stone-700 dark:bg-stone-800"

                    }`}

                  >

                    <span className="text-xs font-bold uppercase tracking-wider text-orange-600">

                      {active ? "Sedang dibaca" : series.available ? "Baca seri" : "Segera hadir"}

                    </span>

                    <span className="mt-1 block font-bold text-stone-900 dark:text-stone-100">{series.title}</span>

                    <span className="mt-1 block text-sm text-stone-600 dark:text-stone-300">{series.subtitle}</span>

                    {series.available && !active && (

                      <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-orange-700">

                        Baca sekarang <ChevronRight className="h-4 w-4" />

                      </span>

                    )}

                  </button>

                );

              })}

            </div>

          </section>

    </section>

  );

}
