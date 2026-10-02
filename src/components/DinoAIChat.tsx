import { useEffect, useRef, useState } from "react";

import {
  ArrowLeft,
  Clock3,
  HeartHandshake,
  Loader2,
  MessageSquare,
  PanelLeft,
  Plus,
  Send,
  Sparkles,
  Trash2,
  UsersRound,
  X,
} from "lucide-react";

import ReactMarkdown from "react-markdown";

import remarkGfm from "remark-gfm";

import remarkMath from "remark-math";

import rehypeKatex from "rehype-katex";

import "katex/dist/katex.min.css";

import { supabase } from "../lib/supabase";

interface DinoAIChatProps {
  email?: string | null;

  onClose: () => void;
}

interface ChatMessage {
  id: string;

  role: "user" | "assistant";

  content: string;
}

interface ChatConversation {
  id: string;

  title: string;

  updatedAt: number;

  messages: ChatMessage[];
}

interface DinoAIQuota {
  plan: "free" | "community" | "paid" | string;

  dailyLimit: number;

  creditsUsed: number;

  creditsRemaining: number;

  requestsToday: number;

  globalRequestsToday: number;

  globalRequestsRemaining: number;

  resetAt: string;
}

const welcomeMessage =
  "Halo, saya DinoAI. Saya siap membantu kamu belajar, bekerja, dan menyelesaikan berbagai kebutuhan";

const witaOffsetMs = 8 * 60 * 60 * 1000;

function getNextWitaResetAt(nowMs = Date.now()) {
  const witaNow = new Date(nowMs + witaOffsetMs);

  return new Date(
    Date.UTC(
      witaNow.getUTCFullYear(),
      witaNow.getUTCMonth(),
      witaNow.getUTCDate() + 1,
    ) - witaOffsetMs,
  ).toISOString();
}

function formatResetTime(resetAt: string) {
  const date = new Date(resetAt);

  if (Number.isNaN(date.getTime())) {
    return "Waktu reset belum tersedia";
  }

  return (
    new Intl.DateTimeFormat(
      "id-ID",

      {
        day: "2-digit",

        month: "short",

        year: "numeric",

        hour: "2-digit",

        minute: "2-digit",

        hour12: false,

        timeZone: "Asia/Makassar",
      },
    ).format(date) + " WITA"
  );
}

function formatResetCountdown(
  resetAt: string,

  nowMs: number,
) {
  const target = new Date(resetAt).getTime();

  if (!Number.isFinite(target)) {
    return "";
  }

  const remaining = Math.max(
    0,

    target - nowMs,
  );

  if (remaining <= 0) {
    return "sebentar lagi";
  }

  const totalMinutes = Math.ceil(remaining / 60000);

  const hours = Math.floor(totalMinutes / 60);

  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return `${hours} jam ${minutes} menit lagi`;
  }

  return `${minutes} menit lagi`;
}

function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

function createConversation(): ChatConversation {
  return {
    id: createId(),

    title: "Percakapan baru",

    updatedAt: Date.now(),

    messages: [
      {
        id: createId(),

        role: "assistant",

        content: welcomeMessage,
      },
    ],
  };
}

function isChatMessage(value: unknown): value is ChatMessage {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const message = value as Record<string, unknown>;

  return (
    typeof message.id === "string" &&
    (message.role === "user" || message.role === "assistant") &&
    typeof message.content === "string"
  );
}

function isChatConversation(value: unknown): value is ChatConversation {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const conversation = value as Record<string, unknown>;

  return (
    typeof conversation.id === "string" &&
    typeof conversation.title === "string" &&
    typeof conversation.updatedAt === "number" &&
    Array.isArray(conversation.messages) &&
    conversation.messages.every(isChatMessage)
  );
}

function loadConversations(storageKey: string): ChatConversation[] {
  try {
    const saved: unknown = JSON.parse(
      window.localStorage.getItem(storageKey) ?? "null",
    );

    if (Array.isArray(saved)) {
      const conversations = saved.filter(isChatConversation);

      if (conversations.length > 0) {
        return conversations;
      }
    }
  } catch {
    return [createConversation()];
  }

  return [createConversation()];
}

function saveConversations(
  storageKey: string,

  conversations: ChatConversation[],
) {
  try {
    window.localStorage.setItem(
      storageKey,

      JSON.stringify(conversations),
    );
  } catch {
    return;
  }
}

/* DINOAI QUOTA NORMALIZER */

function normalizeQuota(value: any): DinoAIQuota | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const dailyLimit = Number(value.dailyLimit ?? value.daily_limit ?? 0);

  const creditsUsed = Number(value.creditsUsed ?? value.credits_used ?? 0);

  const creditsRemaining = Number(
    value.creditsRemaining ?? value.credits_remaining ?? 0,
  );

  const requestsToday = Number(
    value.requestsToday ?? value.requests_today ?? 0,
  );

  const globalRequestsToday = Number(
    value.globalRequestsToday ?? value.global_requests_today ?? 0,
  );

  const globalRequestsRemaining = Number(
    value.globalRequestsRemaining ?? value.global_requests_remaining ?? 0,
  );

  const rawResetAt =
    typeof value.resetAt === "string"
      ? value.resetAt
      : typeof value.reset_at === "string"
        ? value.reset_at
        : null;

  const resetAt =
    rawResetAt && Number.isFinite(new Date(rawResetAt).getTime())
      ? rawResetAt
      : getNextWitaResetAt();

  return {
    plan: typeof value.plan === "string" ? value.plan : "free",

    dailyLimit,

    creditsUsed,

    creditsRemaining,

    requestsToday,

    globalRequestsToday,

    globalRequestsRemaining,

    resetAt,
  };
}

/* DINOAI FUNCTION ERROR */

async function getFunctionErrorMessage(error: unknown) {
  if (typeof error === "object" && error !== null && "context" in error) {
    const context = (error as { context?: unknown }).context;

    if (context instanceof Response) {
      const body: unknown = await context

        .clone()

        .json()

        .catch(() => null);

      if (
        typeof body === "object" &&
        body !== null &&
        "error" in body &&
        typeof body.error === "string"
      ) {
        if (
          /sedang padat|high demand|sementara tidak tersedia/i.test(body.error)
        ) {
          return "DinoAI sedang padat atau sementara tidak tersedia. Silakan coba lagi beberapa saat. Credit kamu tidak terpotong";
        }

        return body.error;
      }
    }
  }

  return "DinoAI belum terhubung. Pastikan Edge Function dinoai-chat sudah di-deploy dan secret GEMINI_API_KEY_DINO_AI sudah diatur di Supabase.";
}

/* DINOAI PLAN LABEL */

function getPlanLabel(plan: string) {
  switch (plan) {
    case "community":
      return "Anggota NUMEA EDU";

    case "paid":
      return "Berbayar";

    default:
      return "Gratis";
  }
}

export default function DinoAIChat({
  email,

  onClose,
}: DinoAIChatProps) {
  const storageKey = `dinoedu-chat-history:${
    email?.trim().toLowerCase() || "guest"
  }`;

  const [input, setInput] = useState("");

  const [historyOpen, setHistoryOpen] = useState(false);

  const [loadingConversationIds, setLoadingConversationIds] = useState<
    string[]
  >([]);

  const [conversations, setConversations] = useState(() =>
    loadConversations(storageKey),
  );

  const [activeConversationId, setActiveConversationId] = useState(
    () => conversations[0].id,
  );

  /* DINOAI QUOTA */

  const [quota, setQuota] = useState<DinoAIQuota | null>(null);

  const [quotaLoading, setQuotaLoading] = useState(true);

  const [resetNow, setResetNow] = useState(() => Date.now());

  const activeConversation =
    conversations.find(
      (conversation) => conversation.id === activeConversationId,
    ) ?? conversations[0];

  const messages = activeConversation.messages;

  const loading = loadingConversationIds.includes(activeConversation.id);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  /* DINOAI LOAD QUOTA */

  const loadQuota = async () => {
    setQuotaLoading(true);

    try {
      const {
        data,

        error,
      } = await supabase.rpc("get_dino_ai_quota");

      if (error) {
        console.error(
          "Gagal mengambil quota DinoAI:",

          error,
        );

        setQuota(null);

        return;
      }

      const rawQuota = Array.isArray(data) ? data[0] : data;

      setQuota(normalizeQuota(rawQuota));
    } catch (error) {
      console.error(
        "Quota DinoAI error:",

        error,
      );

      setQuota(null);
    } finally {
      setQuotaLoading(false);
    }
  };

  /* DINOAI AUTO SCROLL */

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",

      block: "end",
    });
  }, [activeConversationId, messages, loading]);

  /* DINOAI SAVE HISTORY */

  useEffect(() => {
    saveConversations(
      storageKey,

      conversations,
    );
  }, [storageKey, conversations]);

  /* DINOAI INITIAL QUOTA */

  useEffect(() => {
    void loadQuota();
  }, [email]);

  /* DINOAI RESET CLOCK */

  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = Date.now();

      setResetNow(now);

      if (quota?.resetAt && now >= new Date(quota.resetAt).getTime()) {
        void loadQuota();
      }
    }, 30000);

    return () => {
      window.clearInterval(timer);
    };
  }, [quota?.resetAt]);

  /* DINOAI NEW CHAT */

  const startConversation = () => {
    const conversation = createConversation();

    setConversations((current) => [conversation, ...current]);

    setActiveConversationId(conversation.id);

    setInput("");

    setHistoryOpen(false);
  };

  /* DINOAI SELECT CHAT */

  const selectConversation = (conversationId: string) => {
    setActiveConversationId(conversationId);

    setInput("");

    setHistoryOpen(false);
  };

  /* DINOAI DELETE CHAT */

  const deleteConversation = (conversationId: string) => {
    if (conversations.length <= 1) {
      return;
    }

    const remaining = conversations.filter(
      (conversation) => conversation.id !== conversationId,
    );

    setConversations(remaining);

    if (activeConversationId === conversationId) {
      setActiveConversationId(remaining[0].id);
    }
  };

  /* DINOAI SEND */

  const handleSend = async (prompt?: string) => {
    const text = (prompt ?? input).trim();

    if (!text || loading) {
      return;
    }

    /* FRONTEND CREDIT CHECK */

    if (quota && quota.creditsRemaining < 1) {
      return;
    }

    const conversationId = activeConversation.id;

    const userMessage: ChatMessage = {
      id: createId(),

      role: "user",

      content: text,
    };

    const history = activeConversation.messages

      .filter(
        (message, index) =>
          !(
            index === 0 &&
            message.role === "assistant" &&
            message.content === welcomeMessage
          ),
      )

      .map((message) => ({
        role: message.role === "assistant" ? "model" : "user",

        text: message.content,
      }));

    setConversations((current) =>
      current.map((conversation) => {
        if (conversation.id !== conversationId) {
          return conversation;
        }

        const hasUserMessages = conversation.messages.some(
          (message) => message.role === "user",
        );

        return {
          ...conversation,

          title: hasUserMessages
            ? conversation.title
            : text.length > 42
              ? `${text.slice(0, 42)}...`
              : text,

          updatedAt: Date.now(),

          messages: [...conversation.messages, userMessage],
        };
      }),
    );

    setInput("");

    setLoadingConversationIds((current) => [...current, conversationId]);

    try {
      const {
        data,

        error,
      } = await supabase.functions.invoke(
        "dinoai-chat",

        {
          body: {
            message: text,

            history,
          },
        },
      );

      if (error) {
        throw error;
      }

      const reply = typeof data?.reply === "string" ? data.reply.trim() : "";

      if (!reply) {
        throw new Error("DinoAI tidak memberikan respons");
      }

      /* UPDATE QUOTA */

      if (data?.quota) {
        setQuota(normalizeQuota(data.quota));
      } else {
        void loadQuota();
      }

      const assistantMessage: ChatMessage = {
        id: createId(),

        role: "assistant",

        content: reply,
      };

      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === conversationId
            ? {
                ...conversation,

                updatedAt: Date.now(),

                messages: [...conversation.messages, assistantMessage],
              }
            : conversation,
        ),
      );
    } catch (error) {
      console.error(
        "DinoAI error:",

        error,
      );

      /* REFRESH QUOTA AFTER ERROR */

      void loadQuota();

      const assistantMessage: ChatMessage = {
        id: createId(),

        role: "assistant",

        content: await getFunctionErrorMessage(error),
      };

      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === conversationId
            ? {
                ...conversation,

                updatedAt: Date.now(),

                messages: [...conversation.messages, assistantMessage],
              }
            : conversation,
        ),
      );
    } finally {
      setLoadingConversationIds((current) =>
        current.filter((id) => id !== conversationId),
      );
    }
  };

  /* DINOAI QUOTA VALUES */

  const creditsRemaining = quota?.creditsRemaining ?? 0;

  const dailyLimit = quota?.dailyLimit ?? 0;

  const creditPercentage =
    dailyLimit > 0
      ? Math.min(
          100,

          Math.max(
            0,

            Math.round((creditsRemaining / dailyLimit) * 100),
          ),
        )
      : 0;

  const quotaEmpty = !!quota && quota.creditsRemaining <= 0;

  const quotaResetLabel = quota?.resetAt
    ? formatResetTime(quota.resetAt)
    : "Waktu reset belum tersedia";

  const quotaResetCountdown = quota?.resetAt
    ? formatResetCountdown(quota.resetAt, resetNow)
    : null;

  /* DINOAI QUOTA CARD */

  const renderQuota = () => (
    <div className="mb-4 rounded-2xl border border-border/60 bg-white/40 p-3.5 backdrop-blur-xl dark:bg-white/5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Paket
          </div>

          <div className="mt-1 truncate text-[13px] font-semibold">
            {quotaLoading
              ? "Memuat..."
              : quota
                ? getPlanLabel(quota.plan)
                : "Quota belum tersedia"}
          </div>
        </div>

        {quota && (
          <div className="shrink-0 text-right">
            <div className="text-sm font-bold">{creditsRemaining}</div>

            <div className="text-[11px] text-muted-foreground">
              dari {dailyLimit}
            </div>
          </div>
        )}
      </div>

      {quota && (
        <>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#EECDA3] to-[#EF629F] transition-all duration-300"

              style={{
                width: `${creditPercentage}%`,
              }}
            />
          </div>

          <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
            <span>{creditsRemaining} credit tersisa hari ini</span>

            <span>{quota.creditsUsed} dipakai</span>
          </div>

          <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-1.5 text-[10px] text-muted-foreground">
            <Clock3 className="h-3 w-3 shrink-0" />

            <span className="truncate">
              {quota.resetAt ? `Reset ${quotaResetLabel}` : quotaResetLabel}
            </span>
            {quotaResetCountdown && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-medium">{quotaResetCountdown}</span>
              </>
            )}
          </div>

          {quotaEmpty && (
            <div className="mt-2 text-[11px] font-medium text-[#EF629F]">
              Credit harian kamu sudah habis
            </div>
          )}
        </>
      )}
    </div>
  );

  /* DINOAI QUOTA EMPTY */

  const renderQuotaEmpty = () => (
    <div className="dino-glass rounded-[28px] p-5 shadow-xl shadow-black/5 sm:p-6">
      <div className="mx-auto max-w-xl text-center">
        <div className="dino-gradient mx-auto flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-lg shadow-pink-500/10">
          <Sparkles className="h-5 w-5" />
        </div>

        <h3 className="mt-4 text-base font-semibold">
          Credit harianmu sudah digunakan
        </h3>

        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Terima kasih sudah belajar bersama DinoAI. Credit akan tersedia lagi
          setelah reset harian.
        </p>

        <p className="mt-2 text-xs font-medium text-muted-foreground">
          {quota?.resetAt ? (
            <>
              Reset {quotaResetLabel}
              {quotaResetCountdown && (
                <span className="ml-1 font-normal">
                  · {quotaResetCountdown}
                </span>
              )}
            </>
          ) : (
            "Waktu reset belum tersedia"
          )}
        </p>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <a
            href="/numea"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border/70 bg-white/50 px-4 py-3 text-sm font-semibold transition-colors hover:border-[#EF629F]/40 hover:bg-white/80 dark:bg-white/5 dark:hover:bg-white/10"
          >
            <UsersRound className="h-4 w-4 text-[#EF629F]" />
            Gabung NUMEA EDU
          </a>

          <a
            href="/numea#paket"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#EF629F]/25 bg-[#EF629F]/5 px-4 py-3 text-sm font-semibold transition-colors hover:border-[#EF629F]/40 hover:bg-[#EF629F]/10 dark:bg-[#EF629F]/5 dark:hover:bg-[#EF629F]/10"
          >
            <HeartHandshake className="h-4 w-4 text-[#EF629F]" />
            <span className="flex flex-col items-center gap-0.5">
              <span>Dukung DinoEdu</span>
              <span className="text-[10px] font-normal text-muted-foreground">
                Lihat paket credit berbayar
              </span>
            </span>
          </a>
        </div>
      </div>
    </div>
  );

  /* DINOAI HISTORY */

  const renderHistory = (mobile = false) => (
    <div className="flex h-full flex-col p-4">
      <div className="mb-5 flex items-center justify-between px-1">
        <div className="flex items-center gap-3">
          <div className="dino-gradient flex h-10 w-10 items-center justify-center rounded-2xl text-white shadow-sm">
            <Sparkles className="h-5 w-5" />
          </div>

          <div>
            <div className="font-semibold">DinoAI</div>

            <div className="text-xs text-muted-foreground">
              Ruang percakapan
            </div>
          </div>
        </div>

        {mobile && (
          <button
            type="button"

            onClick={() => setHistoryOpen(false)}

            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted"

            aria-label="Tutup riwayat chat"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <button
        type="button"

        onClick={startConversation}

        className="mb-4 flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-border/70 bg-white/50 text-sm font-semibold transition-colors hover:border-[#EF629F]/40 hover:bg-white/80 dark:bg-white/5 dark:hover:bg-white/10"
      >
        <Plus className="h-4 w-4" />
        Chat baru
      </button>

      {renderQuota()}

      <div className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Riwayat
      </div>

      <div className="chat-scrollbar min-h-0 flex-1 space-y-1 overflow-y-auto">
        {[...conversations]

          .sort((first, second) => second.updatedAt - first.updatedAt)

          .map((conversation) => {
            const active = conversation.id === activeConversation.id;

            return (
              <div
                key={conversation.id}

                className={`group flex items-center rounded-xl ${
                  active ? "bg-[#EF629F]/10" : "hover:bg-muted/70"
                }`}
              >
                <button
                  type="button"

                  onClick={() => selectConversation(conversation.id)}

                  aria-current={active ? "page" : undefined}

                  className="flex min-w-0 flex-1 items-center gap-3 px-3 py-3 text-left"
                >
                  <MessageSquare className="h-4 w-4 shrink-0 text-[#EF629F]" />

                  <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
                    {conversation.title}
                  </span>
                </button>

                {conversations.length > 1 && (
                  <button
                    type="button"

                    onClick={() => deleteConversation(conversation.id)}

                    aria-label={`Hapus ${conversation.title}`}

                    title="Hapus percakapan"

                    className="mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground opacity-0 transition-opacity hover:bg-background hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            );
          })}
      </div>

      <div className="mt-4 truncate border-t border-border/60 px-2 pt-4 text-xs text-muted-foreground">
        {email}
      </div>
    </div>
  );

  return (
    <div className="flex h-dvh overflow-hidden bg-background text-foreground">
      <aside className="hidden h-full w-72 shrink-0 border-r border-border/60 bg-background/70 lg:block">
        {renderHistory()}
      </aside>

      {historyOpen && (
        <div className="fixed inset-0 z-[60] flex lg:hidden">
          <button
            type="button"

            onClick={() => setHistoryOpen(false)}

            className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"

            aria-label="Tutup riwayat chat"
          />

          <aside className="relative z-10 h-full w-[min(84vw,20rem)] border-r border-border/60 bg-background shadow-2xl">
            {renderHistory(true)}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="z-50 shrink-0 border-b border-border/50 bg-background/70 backdrop-blur-xl">
          <div className="flex h-20 w-full items-center justify-between px-3 sm:px-4">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"

                onClick={onClose}

                className="dino-button flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border/60 bg-white/40 backdrop-blur-xl dark:bg-white/5"

                aria-label="Kembali ke dashboard"

                title="Kembali ke dashboard"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>

              <button
                type="button"

                onClick={() => setHistoryOpen(true)}

                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border/60 bg-white/40 transition-colors hover:bg-muted lg:hidden"

                aria-label="Buka riwayat chat"

                title="Riwayat chat"
              >
                <PanelLeft className="h-5 w-5" />
              </button>

              <div className="dino-gradient flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl shadow-lg shadow-pink-500/10">
                <Sparkles className="h-5 w-5 text-white" />
              </div>

              <div className="min-w-0">
                <div className="text-base font-semibold">DinoAI Chat</div>

                <div className="truncate text-[13px] text-muted-foreground">
                  {activeConversation.title === "Percakapan baru"
                    ? "Teman AI DinoEdu Space"
                    : activeConversation.title}
                </div>
              </div>
            </div>

            <div className="hidden max-w-[14rem] truncate text-[13px] text-muted-foreground sm:block lg:hidden">
              {email}
            </div>
          </div>
        </header>

        <main className="flex min-h-0 w-full flex-1 flex-col px-2">
          <div className="chat-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <div className="flex min-h-full flex-col justify-end gap-5 py-6 sm:py-8">
              {messages.map((message) => (
                <div
                  key={message.id}

                  className={`flex min-w-0 items-end gap-3 ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {message.role === "assistant" && (
                    <div className="dino-gradient mb-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white shadow-sm">
                      <Sparkles className="h-4 w-4" />
                    </div>
                  )}

                  <div
                    className={
                      message.role === "user"
                        ? "min-w-0 max-w-[85%] break-words rounded-[24px] rounded-br-md bg-gradient-to-r from-[#EECDA3] to-[#EF629F] px-5 py-4 text-[16px] leading-7 text-white shadow-lg shadow-pink-500/10 sm:max-w-[75%]"
                        : "dino-glass min-w-0 max-w-[85%] break-words rounded-[24px] rounded-bl-md px-5 py-4 text-[16px] leading-7 sm:max-w-[75%]"
                    }
                  >
                    {message.role === "assistant" ? (
                      <div className="chat-answer">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm, remarkMath]}

                          rehypePlugins={[rehypeKatex]}

                          components={{
                            div: ({
                              className,

                              children,

                              ...props
                            }) =>
                              className?.includes("math-display") ? (
                                <div
                                  {...props}

                                  className="my-4 overflow-x-auto py-1 text-center text-[1.08em]"
                                >
                                  {children}
                                </div>
                              ) : (
                                <div
                                  {...props}

                                  className={className}
                                >
                                  {children}
                                </div>
                              ),

                            span: ({
                              className,

                              children,

                              ...props
                            }) =>
                              className?.includes("math-inline") ? (
                                <span
                                  {...props}

                                  className="text-[1.03em]"
                                >
                                  {children}
                                </span>
                              ) : (
                                <span
                                  {...props}

                                  className={className}
                                >
                                  {children}
                                </span>
                              ),

                            p: ({ children }) => (
                              <p className="mb-3 last:mb-0">{children}</p>
                            ),

                            h1: ({ children }) => (
                              <h1 className="mb-3 text-xl font-bold">
                                {children}
                              </h1>
                            ),

                            h2: ({ children }) => (
                              <h2 className="mb-3 text-lg font-bold">
                                {children}
                              </h2>
                            ),

                            h3: ({ children }) => (
                              <h3 className="mb-2 text-base font-semibold">
                                {children}
                              </h3>
                            ),

                            ul: ({ children }) => (
                              <ul className="mb-3 list-disc space-y-1 pl-5">
                                {children}
                              </ul>
                            ),

                            ol: ({ children }) => (
                              <ol className="mb-3 list-decimal space-y-1 pl-5">
                                {children}
                              </ol>
                            ),

                            li: ({ children }) => <li>{children}</li>,

                            blockquote: ({ children }) => (
                              <blockquote className="mb-3 border-l-2 border-[#EF629F]/50 pl-4 text-muted-foreground">
                                {children}
                              </blockquote>
                            ),

                            hr: () => <hr className="my-4 border-border/60" />,

                            a: ({
                              children,

                              href,
                            }) => (
                              <a
                                href={href}

                                target="_blank"

                                rel="noreferrer"

                                className="font-medium text-[#EF629F] underline underline-offset-2"
                              >
                                {children}
                              </a>
                            ),

                            table: ({ children }) => (
                              <div className="mb-3 overflow-x-auto">
                                <table className="w-full min-w-[420px] border-collapse text-[14px]">
                                  {children}
                                </table>
                              </div>
                            ),

                            thead: ({ children }) => (
                              <thead className="bg-black/5 dark:bg-white/5">
                                {children}
                              </thead>
                            ),

                            th: ({ children }) => (
                              <th className="border border-border/60 px-3 py-2 text-left font-semibold">
                                {children}
                              </th>
                            ),

                            td: ({ children }) => (
                              <td className="border border-border/60 px-3 py-2 align-top">
                                {children}
                              </td>
                            ),

                            pre: ({ children }) => (
                              <pre className="mb-3 overflow-x-auto rounded-xl bg-black/5 p-4 text-[14px] dark:bg-white/5">
                                {children}
                              </pre>
                            ),

                            code: ({
                              children,

                              className,
                            }) => (
                              <code
                                className={`rounded-md ${
                                  className
                                    ? className
                                    : "bg-black/5 px-1.5 py-0.5 dark:bg-white/10"
                                }`}
                              >
                                {children}
                              </code>
                            ),
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      message.content
                    )}
                  </div>
                </div>
              ))}

              {messages.length === 1 && !loading && !quotaEmpty && (
                <div className="ml-12 flex flex-wrap gap-2">
                  {[
                    "Jelaskan materi dengan sederhana",

                    "Bantu susun rencana belajar",

                    "Buat ringkasan sebuah topik",
                  ].map((prompt) => (
                    <button
                      key={prompt}

                      type="button"

                      onClick={() => setInput(prompt)}

                      disabled={quotaEmpty}

                      className="rounded-full border border-border/70 bg-white/50 px-4 py-2 text-left text-[13px] text-muted-foreground transition-colors hover:border-[#EF629F]/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/5"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              )}

              {loading && (
                <div className="flex items-end gap-3">
                  <div className="dino-gradient mb-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white shadow-sm">
                    <Sparkles className="h-4 w-4" />
                  </div>

                  <div className="dino-glass flex items-center gap-2 rounded-[24px] rounded-bl-md px-5 py-4 text-[14px] text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    DinoAI sedang berpikir...
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          <div className="shrink-0 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:pb-7">
            {quotaEmpty ? (
              <>{renderQuotaEmpty()}</>
            ) : (
              <>
                <div className="dino-glass flex items-end gap-3 rounded-[28px] p-3 shadow-xl shadow-black/5">
                  <textarea
                    value={input}

                    onChange={(event) => setInput(event.target.value)}

                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();

                        void handleSend();
                      }
                    }}

                    rows={1}

                    placeholder="Tanyakan sesuatu kepada DinoAI..."

                    className="min-h-12 flex-1 resize-none bg-transparent px-3 py-3 text-[17px] leading-6 outline-none placeholder:text-muted-foreground"

                    disabled={loading}
                  />

                  <button
                    type="button"

                    onClick={() => void handleSend()}

                    disabled={!input.trim() || loading}

                    className="dino-gradient flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg shadow-pink-500/10 transition duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"

                    aria-label="Kirim pesan"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </div>

                <p className="mt-2 text-center text-[12px] text-muted-foreground">
                  DinoAI masih dalam tahap pengembangan
                </p>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
