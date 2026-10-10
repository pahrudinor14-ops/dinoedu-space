import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Inbox,
  LoaderCircle,
  MessageSquareText,
  RefreshCw,
  Search,
  ShieldAlert,
} from "lucide-react";
import { supabase } from "../lib/supabase";

type FeedbackStatus = "Baru" | "Diproses" | "Selesai";
type FeedbackType = "Saran" | "Komentar" | "Laporan masalah" | "Ide cerita";

interface FeedbackItem {
  id: number;
  name: string;
  feedback_type: FeedbackType;
  message: string;
  created_at: string;
  status: FeedbackStatus;
}

interface FeedbackAdminProps {
  onBack: () => void;
}

const statuses: FeedbackStatus[] = ["Baru", "Diproses", "Selesai"];
const categories = ["Semua kategori", "Saran", "Komentar", "Laporan masalah", "Ide cerita"];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusClasses(status: FeedbackStatus) {
  if (status === "Selesai") return "bg-emerald-500/10 text-emerald-600";
  if (status === "Diproses") return "bg-amber-500/10 text-amber-600";
  return "bg-pink-500/10 text-pink-600";
}

export default function FeedbackAdmin({ onBack }: FeedbackAdminProps) {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Semua kategori");
  const [statusFilter, setStatusFilter] = useState("Semua status");
  const [errorMessage, setErrorMessage] = useState("");

  const loadFeedback = useCallback(async (isRefresh = false) => {
    setErrorMessage("");
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const { data, error } = await supabase
      .from("dinomath_feedback")
      .select("id, name, feedback_type, message, created_at, status")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Gagal memuat saran dan kritik:", error);
      setErrorMessage(
        "Masukan belum dapat dimuat. Pastikan migrasi SQL sudah dijalankan dan akun ini memiliki akses admin."
      );
    } else {
      setItems((data ?? []) as FeedbackItem[]);
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    void loadFeedback();
  }, [loadFeedback]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("id-ID");
    return items.filter((item) => {
      const matchesQuery =
        !query ||
        item.name.toLocaleLowerCase("id-ID").includes(query) ||
        item.message.toLocaleLowerCase("id-ID").includes(query);
      const matchesCategory =
        category === "Semua kategori" || item.feedback_type === category;
      const matchesStatus =
        statusFilter === "Semua status" || item.status === statusFilter;
      return matchesQuery && matchesCategory && matchesStatus;
    });
  }, [items, search, category, statusFilter]);

  const counts = useMemo(
    () => ({
      total: items.length,
      new: items.filter((item) => item.status === "Baru").length,
      processing: items.filter((item) => item.status === "Diproses").length,
      done: items.filter((item) => item.status === "Selesai").length,
    }),
    [items]
  );

  const updateStatus = async (item: FeedbackItem, status: FeedbackStatus) => {
    if (item.status === status) return;
    setUpdatingId(item.id);
    setErrorMessage("");

    const { error } = await supabase
      .from("dinomath_feedback")
      .update({ status })
      .eq("id", item.id);

    if (error) {
      console.error("Gagal memperbarui status masukan:", error);
      setErrorMessage(
        "Status belum berhasil diperbarui. Periksa kebijakan akses admin di Supabase."
      );
    } else {
      setItems((current) =>
        current.map((entry) =>
          entry.id === item.id ? { ...entry, status } : entry
        )
      );
    }
    setUpdatingId(null);
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onBack}
          className="mb-7 inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold transition hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke dashboard
        </button>

        <section className="dino-glass overflow-hidden rounded-[30px] p-6 sm:p-9">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-pink-500/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-[#EF629F]">
                <ShieldAlert className="h-4 w-4" />
                Panel admin
              </div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Saran &amp; Kritik
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                Baca masukan pengguna, cari laporan tertentu, dan perbarui
                status tindak lanjutnya.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadFeedback(true)}
              disabled={refreshing || loading}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm font-semibold transition hover:bg-muted disabled:opacity-50"
            >
              {refreshing ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Muat ulang
            </button>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Total masukan", value: counts.total, icon: Inbox },
            { label: "Masukan baru", value: counts.new, icon: MessageSquareText },
            { label: "Sedang diproses", value: counts.processing, icon: Clock3 },
            { label: "Selesai ditindaklanjuti", value: counts.done, icon: CheckCircle2 },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="dino-glass rounded-2xl p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">{label}</p>
                <Icon className="h-5 w-5 text-[#EF629F]" />
              </div>
              <p className="mt-3 text-3xl font-bold tabular-nums">{value}</p>
            </div>
          ))}
        </section>

        <section className="dino-glass mt-6 rounded-[26px] p-4 sm:p-6">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_190px]">
            <label className="relative block">
              <span className="sr-only">Cari masukan</span>
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari nama atau isi pesan..."
                className="w-full rounded-xl border border-border bg-background py-3 pl-11 pr-4 text-sm outline-none transition focus:border-[#EF629F]"
              />
            </label>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="rounded-xl border border-border bg-background px-3 py-3 text-sm outline-none focus:border-[#EF629F]"
              aria-label="Filter kategori"
            >
              {categories.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-xl border border-border bg-background px-3 py-3 text-sm outline-none focus:border-[#EF629F]"
              aria-label="Filter status"
            >
              {["Semua status", ...statuses].map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </div>

          {errorMessage && (
            <div role="alert" className="mt-5 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm leading-6 text-red-600">
              {errorMessage}
            </div>
          )}

          <div className="mt-5 flex items-center justify-between gap-3 text-sm text-muted-foreground">
            <span>{filteredItems.length} masukan ditampilkan</span>
          </div>

          {loading ? (
            <div className="flex min-h-56 items-center justify-center gap-3 text-sm text-muted-foreground">
              <LoaderCircle className="h-5 w-5 animate-spin" />
              Memuat saran dan kritik...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center px-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-pink-500/10 text-[#EF629F]">
                <Inbox className="h-7 w-7" />
              </div>
              <h2 className="mt-4 text-lg font-semibold">
                {items.length === 0 ? "Belum ada masukan" : "Masukan tidak ditemukan"}
              </h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                {items.length === 0
                  ? "Masukan yang dikirim melalui formulir DinoMath akan muncul di halaman ini."
                  : "Coba ubah kata kunci atau filter kategori dan status."}
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {filteredItems.map((item) => (
                <article key={item.id} className="rounded-2xl border border-border/80 bg-background/60 p-4 sm:p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-semibold">{item.name || "Pembaca DinoMath"}</h2>
                        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">{item.feedback_type}</span>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses(item.status)}`}>
                          {item.status}
                        </span>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7">{item.message}</p>
                      <p className="mt-3 text-xs text-muted-foreground">{formatDate(item.created_at)}</p>
                    </div>
                    <div className="w-full shrink-0 sm:w-44">
                      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                        Status tindak lanjut
                      </label>
                      <select
                        value={item.status}
                        disabled={updatingId === item.id}
                        onChange={(event) => void updateStatus(item, event.target.value as FeedbackStatus)}
                        className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-[#EF629F] disabled:opacity-50"
                        aria-label={`Status untuk masukan dari ${item.name}`}
                      >
                        {statuses.map((value) => (
                          <option key={value} value={value}>{value}</option>
                        ))}
                      </select>
                      {updatingId === item.id && (
                        <p className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
                          <LoaderCircle className="h-3 w-3 animate-spin" />
                          Menyimpan...
                        </p>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
