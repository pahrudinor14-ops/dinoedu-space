import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  Clock3,
  FileText,
  HeartHandshake,
  Image,
  Loader2,
  Mic,
  MessageSquare,
  PanelLeft,
  Paperclip,
  Pencil,
  Plus,
  Send,
  Square,
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
import { DINO_AI_USAGE_CHANGED_EVENT } from "../lib/invokeDinoAI";
interface DinoAIChatProps {
  email?: string | null;
  userId: string;
  onClose: () => void;
}
interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachment?: ChatAttachmentMeta;
  incomplete?: boolean;
}
type ChatAttachmentKind = "image" | "document" | "audio";
interface ChatAttachmentMeta {
  kind: ChatAttachmentKind;
  name: string;
  mimeType: string;
}
interface PendingChatAttachment extends ChatAttachmentMeta {
  data: string;
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
const maxRequestHistoryItems = 12;
const maxRequestHistoryCharacters = 3_000;
const maxRequestHistoryItemCharacters = 1_000;
const maxAttachmentBytes = 1_000_000;
const maxRecordingDurationMs = 30_000;

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

function getAttachmentKind(file: File): ChatAttachmentKind | null {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (
    file.type === "image/jpeg" ||
    file.type === "image/png" ||
    extension === "jpg" ||
    extension === "jpeg" ||
    extension === "png"
  ) return "image";
  if (file.type === "application/pdf" || extension === "pdf") return "document";
  if (
    file.type === "text/plain" ||
    file.type === "text/markdown" ||
    file.type === "text/csv" ||
    ["txt", "md", "csv"].includes(extension ?? "")
  ) return "document";
  if (
    ["audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/aac", "audio/mp4"].includes(file.type) ||
    ["mp3", "wav", "ogg", "aac", "m4a"].includes(extension ?? "")
  ) return "audio";
  return null;
}

function getAttachmentMimeType(file: File, kind: ChatAttachmentKind): string {
  if (kind === "image") {
    return file.type === "image/png" || file.name.toLowerCase().endsWith(".png")
      ? "image/png"
      : "image/jpeg";
  }
  if (kind === "document") {
    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      return "application/pdf";
    }
    if (file.name.toLowerCase().endsWith(".md")) return "text/markdown";
    if (file.name.toLowerCase().endsWith(".csv")) return "text/csv";
    return "text/plain";
  }
  if (file.type === "audio/mp4" || file.name.toLowerCase().endsWith(".m4a")) {
    return "audio/mp4";
  }
  if (file.type === "audio/ogg" || file.name.toLowerCase().endsWith(".ogg")) {
    return "audio/ogg";
  }
  if (file.type === "audio/aac" || file.name.toLowerCase().endsWith(".aac")) {
    return "audio/aac";
  }
  if (file.type === "audio/wav" || file.name.toLowerCase().endsWith(".wav")) {
    return "audio/wav";
  }
  return "audio/mpeg";
}

function encodeMonoWav(audioBuffer: AudioBuffer, outputSampleRate = 16_000) {
  const frameCount = Math.ceil(audioBuffer.length * outputSampleRate / audioBuffer.sampleRate);
  const wav = new ArrayBuffer(44 + frameCount * 2);
  const view = new DataView(wav);
  const channels = Array.from({ length: audioBuffer.numberOfChannels }, (_, index) =>
    audioBuffer.getChannelData(index),
  );
  const writeText = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index));
    }
  };
  writeText(0, "RIFF");
  view.setUint32(4, 36 + frameCount * 2, true);
  writeText(8, "WAVE");
  writeText(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, outputSampleRate, true);
  view.setUint32(28, outputSampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeText(36, "data");
  view.setUint32(40, frameCount * 2, true);
  for (let index = 0; index < frameCount; index += 1) {
    const sourcePosition = index * audioBuffer.sampleRate / outputSampleRate;
    const leftIndex = Math.floor(sourcePosition);
    const blend = sourcePosition - leftIndex;
    let sample = 0;
    for (const channel of channels) {
      const left = channel[Math.min(leftIndex, channel.length - 1)] ?? 0;
      const right = channel[Math.min(leftIndex + 1, channel.length - 1)] ?? left;
      sample += left + (right - left) * blend;
    }
    sample /= channels.length;
    const pcm = Math.max(-1, Math.min(1, sample));
    view.setInt16(44 + index * 2, pcm < 0 ? pcm * 0x8000 : pcm * 0x7fff, true);
  }
  return new Uint8Array(wav);
}

function buildRequestHistory(messages: ChatMessage[]) {
  const previousMessages = messages.filter(
    (message, index) =>
      !(index === 0 && message.role === "assistant" && message.content === welcomeMessage),
  ).slice(-maxRequestHistoryItems);
  const recentHistory: Array<{ role: "user" | "model"; text: string }> = [];
  let remainingCharacters = maxRequestHistoryCharacters;
  for (let index = previousMessages.length - 1; index >= 0; index -= 1) {
    if (remainingCharacters <= 0) break;
    const message = previousMessages[index];
    const text = message.content.trim().slice(
      -Math.min(maxRequestHistoryItemCharacters, remainingCharacters),
    );
    if (!text) continue;
    recentHistory.unshift({
      role: message.role === "assistant" ? "model" : "user",
      text,
    });
    remainingCharacters -= text.length;
  }
  return recentHistory;
}
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
  const attachment = message.attachment;
  const validAttachment = attachment === undefined ||
    (typeof attachment === "object" &&
      attachment !== null &&
      typeof (attachment as Record<string, unknown>).name === "string" &&
      typeof (attachment as Record<string, unknown>).mimeType === "string" &&
      ["image", "document", "audio"].includes(
        String((attachment as Record<string, unknown>).kind),
      ));
  return (
    typeof message.id === "string" &&
    (message.role === "user" || message.role === "assistant") &&
    typeof message.content === "string" &&
    validAttachment
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
function parseStoredConversation(value: unknown): ChatConversation | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const row = value as Record<string, unknown>;
  const updatedAt =
    typeof row.updated_at === "string"
      ? Date.parse(row.updated_at)
      : Number.NaN;
  const conversation = {
    id: row.id,
    title: row.title,
    updatedAt,
    messages: row.messages,
  };
  return isChatConversation(conversation) ? conversation : null;
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
        const creditsRestored = "creditsRestored" in body && body.creditsRestored === true;
        const creditNotice = creditsRestored
          ? " Kredit untuk permintaan ini telah dikembalikan."
          : "";
        if (
          /sedang padat|sedang sibuk|high demand|sementara tidak tersedia/i.test(
            body.error,
          )
        ) {
          return `DinoAI sedang sibuk atau sementara tidak tersedia. Silakan coba lagi beberapa saat.${creditNotice}`;
        }
        return `${body.error}${creditNotice}`;
      }
    }
  }
  if (
    error instanceof Error &&
    /network|fetch|timeout|aborted/i.test(error.message)
  ) {
    return "Koneksi ke DinoAI terputus. Periksa koneksi internet lalu coba kirim kembali.";
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
  userId,
  onClose,
}: DinoAIChatProps) {
  const legacyStorageKey = `dinoedu-chat-history:${
    email?.trim().toLowerCase() || "guest"
  }`;
  const storageKey = `dinoedu-chat-history:${userId}`;
  const [input, setInput] = useState("");
  const [pendingAttachment, setPendingAttachment] =
    useState<PendingChatAttachment | null>(null);
  const [attachmentError, setAttachmentError] = useState("");
  const [isRecording, setIsRecording] = useState(false);
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
  const [historyOwnerId, setHistoryOwnerId] = useState<string | null>(null);
  const [historySyncNotice, setHistorySyncNotice] = useState("");
  const [editingConversationId, setEditingConversationId] = useState<
    string | null
  >(null);
  const [editingConversationTitle, setEditingConversationTitle] = useState("");
  /* DINOAI QUOTA */
  const [quota, setQuota] = useState<DinoAIQuota | null>(null);
  const [quotaLoading, setQuotaLoading] = useState(true);
  const [walletCredits, setWalletCredits] = useState(0);
  const [resetNow, setResetNow] = useState(() => Date.now());
  const activeConversation =
    conversations.find(
      (conversation) => conversation.id === activeConversationId,
    ) ?? conversations[0];
  const messages = activeConversation.messages;
  const loading = loadingConversationIds.includes(activeConversation.id);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  /* DINOAI LOAD QUOTA */
  const loadQuota = useCallback(async () => {
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
  }, []);
  const loadWalletCredits = useCallback(async () => {
    const { data, error } = await supabase.rpc("get_dino_ai_wallet_balance");
    if (error) {
      console.error("Gagal mengambil saldo token DinoAI:", error);
      return;
    }
    const balance = Array.isArray(data) ? data[0] : data;
    const value = typeof balance === "number" || typeof balance === "string" ? balance : balance && typeof balance === "object" ? (balance as Record<string, unknown>).credits_remaining ?? (balance as Record<string, unknown>).wallet_balance ?? (balance as Record<string, unknown>).get_dino_ai_wallet_balance : 0;
    setWalletCredits(Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0);
  }, []);
  const handleAttachmentSelect = async (file?: File) => {
    if (!file) return;
    if (file.size > maxAttachmentBytes) {
      setAttachmentError("Ukuran file maksimal 1 MB.");
      return;
    }
    const kind = getAttachmentKind(file);
    if (!kind) {
      setAttachmentError("Format didukung: JPG, PNG, PDF, TXT, MD, CSV, MP3, WAV, OGG, AAC, atau M4A.");
      return;
    }
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      setPendingAttachment({
        kind,
        name: file.name.slice(0, 180),
        mimeType: getAttachmentMimeType(file, kind),
        data: bytesToBase64(bytes),
      });
      setAttachmentError("");
    } catch (error) {
      console.error("Gagal membaca lampiran DinoAI:", error);
      setAttachmentError("File tidak dapat dibaca. Coba pilih file lain.");
    }
  };
  const startVoiceRecording = async () => {
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setAttachmentError("Perekaman suara tidak didukung di browser ini.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordingStreamRef.current = stream;
      recordingChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) recordingChunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        if (recordingTimerRef.current !== null) {
          window.clearTimeout(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }
        recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
        recordingStreamRef.current = null;
        recorderRef.current = null;
        setIsRecording(false);
        const recording = new Blob(recordingChunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        recordingChunksRef.current = [];
        let audioContext: AudioContext | null = null;
        try {
          audioContext = new AudioContext();
          const decoded = await audioContext.decodeAudioData(await recording.arrayBuffer());
          const wavBytes = encodeMonoWav(decoded);
          if (wavBytes.byteLength > maxAttachmentBytes) {
            setAttachmentError("Rekaman terlalu besar. Coba rekam dengan durasi lebih singkat.");
            return;
          }
          setPendingAttachment({
            kind: "audio",
            name: "Pesan suara.wav",
            mimeType: "audio/wav",
            data: bytesToBase64(wavBytes),
          });
          setAttachmentError("");
        } catch (error) {
          console.error("Gagal memproses rekaman DinoAI:", error);
          setAttachmentError("Rekaman tidak dapat diproses. Coba rekam ulang.");
        } finally {
          await audioContext?.close();
        }
      };
      recorder.start();
      setAttachmentError("");
      setIsRecording(true);
      recordingTimerRef.current = window.setTimeout(
        () => recorder.state === "recording" && recorder.stop(),
        maxRecordingDurationMs,
      );
    } catch (error) {
      console.error("Tidak dapat memulai rekaman suara:", error);
      setAttachmentError("Akses mikrofon gagal. Izinkan mikrofon lalu coba lagi.");
    }
  };
  const stopVoiceRecording = () => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  };
  const removePendingAttachment = () => {
    setPendingAttachment(null);
    setAttachmentError("");
  };
  useEffect(() => () => {
    if (recordingTimerRef.current !== null) {
      window.clearTimeout(recordingTimerRef.current);
    }
    if (recorderRef.current) {
      recorderRef.current.onstop = null;
      if (recorderRef.current.state === "recording") recorderRef.current.stop();
    }
    recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);
  /* DINOAI AUTO SCROLL */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [activeConversationId, messages, loading]);
  /* DINOAI LOAD ACCOUNT HISTORY */
  useEffect(() => {
    let cancelled = false;
    setHistoryOwnerId(null);
    const loadAccountHistory = async () => {
      const { data, error } = await supabase
        .from("dinoai_chat_conversations")
        .select("id, title, messages, updated_at")
        .order("updated_at", { ascending: false });
      if (cancelled) {
        return;
      }
      if (error) {
        console.error("Gagal memuat riwayat chat:", error);
        return;
      }
      const accountConversations = (data ?? [])
        .map(parseStoredConversation)
        .filter((conversation): conversation is ChatConversation =>
          Boolean(conversation),
        );
      if (accountConversations.length > 0) {
        setConversations(accountConversations);
        setActiveConversationId(accountConversations[0].id);
      } else {
        const localKey = window.localStorage.getItem(storageKey)
          ? storageKey
          : legacyStorageKey;
        const localConversations = loadConversations(localKey);
        setConversations(localConversations);
        setActiveConversationId(localConversations[0].id);
      }
      setHistorySyncNotice("");
      setHistoryOwnerId(userId);
    };
    void loadAccountHistory();
    return () => {
      cancelled = true;
    };
  }, [legacyStorageKey, storageKey, userId]);
  /* DINOAI SAVE HISTORY */
  useEffect(() => {
    saveConversations(
      storageKey,
      conversations,
    );
  }, [storageKey, conversations]);
  /* DINOAI SYNC ACCOUNT HISTORY */
  useEffect(() => {
    if (historyOwnerId !== userId || conversations.length === 0) {
      return;
    }
    let cancelled = false;
    const syncAccountHistory = async () => {
      const rows = conversations.map((conversation) => ({
        id: conversation.id,
        user_id: userId,
        title: conversation.title,
        messages: conversation.messages,
        updated_at: new Date(conversation.updatedAt).toISOString(),
      }));
      const { error } = await supabase
        .from("dinoai_chat_conversations")
        .upsert(rows, { onConflict: "id" });
      if (cancelled) {
        return;
      }
      if (error) {
        console.error("Gagal menyinkronkan riwayat chat:", error);
        setHistorySyncNotice(
          "Riwayat belum tersinkron ke akun. Periksa koneksi lalu coba lagi.",
        );
        return;
      }
      setHistorySyncNotice("");
      window.localStorage.removeItem(legacyStorageKey);
    };
    void syncAccountHistory();
    return () => {
      cancelled = true;
    };
  }, [conversations, historyOwnerId, legacyStorageKey, userId]);
  /* DINOAI INITIAL QUOTA */
  useEffect(() => {
    void loadQuota();
    void loadWalletCredits();
  }, [userId, loadQuota, loadWalletCredits]);
  useEffect(() => {
    const refreshUsage = () => {
      void loadQuota();
      void loadWalletCredits();
    };
    const refreshVisibleUsage = () => {
      if (document.visibilityState === "visible") {
        refreshUsage();
      }
    };
    window.addEventListener(DINO_AI_USAGE_CHANGED_EVENT, refreshUsage);
    window.addEventListener("focus", refreshUsage);
    document.addEventListener("visibilitychange", refreshVisibleUsage);
    return () => {
      window.removeEventListener(DINO_AI_USAGE_CHANGED_EVENT, refreshUsage);
      window.removeEventListener("focus", refreshUsage);
      document.removeEventListener("visibilitychange", refreshVisibleUsage);
    };
  }, [loadQuota, loadWalletCredits]);
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
  }, [loadQuota, quota?.resetAt]);
  /* DINOAI NEW CHAT */
  const startConversation = () => {
    const conversation = createConversation();
    setConversations((current) => [conversation, ...current]);
    setActiveConversationId(conversation.id);
    setInput("");
    setPendingAttachment(null);
    setAttachmentError("");
    setHistoryOpen(false);
  };
  /* DINOAI SELECT CHAT */
  const selectConversation = (conversationId: string) => {
    setActiveConversationId(conversationId);
    setInput("");
    setPendingAttachment(null);
    setAttachmentError("");
    setHistoryOpen(false);
  };
  /* DINOAI DELETE CHAT */
  const deleteConversation = async (conversationId: string) => {
    if (historyOwnerId === userId) {
      const { error } = await supabase
        .from("dinoai_chat_conversations")
        .delete()
        .eq("id", conversationId)
        .eq("user_id", userId);
      if (error) {
        console.error("Gagal menghapus riwayat chat:", error);
        setHistorySyncNotice("Chat belum terhapus dari akun. Coba lagi.");
        return;
      }
    }
    const remaining = conversations.filter(
      (conversation) => conversation.id !== conversationId,
    );
    const nextConversations =
      remaining.length > 0 ? remaining : [createConversation()];
    setConversations(nextConversations);
    if (activeConversationId === conversationId) {
      setActiveConversationId(nextConversations[0].id);
    }
  };
  const beginRenameConversation = (conversation: ChatConversation) => {
    setEditingConversationId(conversation.id);
    setEditingConversationTitle(conversation.title);
  };
  const saveConversationTitle = (conversationId: string) => {
    const title = editingConversationTitle.trim();
    if (!title) {
      return;
    }
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === conversationId
          ? { ...conversation, title, updatedAt: Date.now() }
          : conversation,
      ),
    );
    setEditingConversationId(null);
    setEditingConversationTitle("");
  };
  /* DINOAI SEND */
  const handleSend = async (prompt?: string) => {
    const attachment = pendingAttachment;
    const text = (prompt ?? input).trim() || (
      attachment?.kind === "audio"
        ? "Transkripsikan dan rangkum pesan suara ini."
        : attachment
          ? "Analisis lampiran ini dan jelaskan poin pentingnya."
          : ""
    );
    if ((!text && !attachment) || loading) {
      return;
    }
    const creditCost = attachment ? 2 : 1;
    if (quota && quota.creditsRemaining + walletCredits < creditCost) {
      setAttachmentError(
        attachment
          ? "Analisis file, gambar, dan suara memerlukan 2 kredit."
          : "Kredit belum cukup untuk mengirim pesan.",
      );
      return;
    }
    const conversationId = activeConversation.id;
    const userMessage: ChatMessage = {
      id: createId(),
      role: "user",
      content: text,
      ...(attachment
        ? {
            attachment: {
              kind: attachment.kind,
              name: attachment.name,
              mimeType: attachment.mimeType,
            },
          }
        : {}),
    };
    const history = buildRequestHistory(activeConversation.messages);
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
    setPendingAttachment(null);
    setAttachmentError("");
    setLoadingConversationIds((current) => [...current, conversationId]);
    try {
      const { data, error } = await supabase.functions.invoke(
        "dinoai-chat",
        {
          body: {
            message: text,
            history,
            ...(attachment ? { attachment } : {}),
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
      void loadWalletCredits();
      const assistantMessage: ChatMessage = {
        id: createId(),
        role: "assistant",
        content: reply,
        incomplete: data?.incomplete === true,
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
      void loadWalletCredits();
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
  const quotaEmpty = !!quota && quota.creditsRemaining + walletCredits < 1;
  const availableCredits = creditsRemaining + walletCredits;
  const attachmentNeedsMoreCredits = !!pendingAttachment && availableCredits < 2;
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
          <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
            <span>Token pembelian tersisa</span>
            <span className="font-semibold text-foreground">{walletCredits}</span>
          </div>
          <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
            Chat teks 1 kredit · analisis file, gambar, dan suara 2 kredit.
          </p>
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
              Kredit belum cukup untuk mengirim pesan teks (1 kredit)
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
        <div className="mx-auto flex h-12 w-12 items-center justify-center">
          <img
            src="/logodino.PNG"
            alt=""
            className="h-full w-full scale-110 object-contain"
          />
        </div>
        <h3 className="mt-4 text-base font-semibold">
          Kuota harian dan token pembelianmu sudah habis
        </h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Chat teks menggunakan 1 kredit, sedangkan analisis file, gambar, dan
          suara menggunakan 2 kredit. Kredit harian kembali setelah reset atau
          kamu dapat melihat paket kredit pembelian.
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
            href="/numea"
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
          <div className="flex h-10 w-10 items-center justify-center">
            <img
              src="/logodino.PNG"
              alt=""
              className="h-full w-full scale-110 object-contain"
            />
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
      {historySyncNotice && (
        <p
          className="mb-2 px-2 text-[11px] leading-5 text-muted-foreground"
          role="status"
        >
          {historySyncNotice}
        </p>
      )}
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
                {editingConversationId === conversation.id ? (
                  <form
                    className="flex min-w-0 flex-1 items-center gap-1 px-2 py-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      saveConversationTitle(conversation.id);
                    }}
                  >
                    <input
                      autoFocus
                      aria-label="Nama percakapan"
                      className="min-w-0 flex-1 rounded-lg border border-border/70 bg-background px-2 py-1.5 text-[13px] outline-none focus:border-[#EF629F]/60"
                      maxLength={80}
                      onChange={(event) =>
                        setEditingConversationTitle(event.target.value)
                      }
                      value={editingConversationTitle}
                    />
                    <button
                      type="submit"
                      aria-label="Simpan nama percakapan"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#EF629F] hover:bg-background"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="Batal mengganti nama"
                      onClick={() => {
                        setEditingConversationId(null);
                        setEditingConversationTitle("");
                      }}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-background"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </form>
                ) : (
                  <>
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
                    <button
                      type="button"
                      onClick={() => beginRenameConversation(conversation)}
                      aria-label={`Ganti nama ${conversation.title}`}
                      title="Ganti nama"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-background hover:text-foreground md:mr-1 md:opacity-0 md:transition-opacity md:group-hover:opacity-100 md:focus-visible:opacity-100"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteConversation(conversation.id)}
                      aria-label={`Hapus ${conversation.title}`}
                      title="Hapus percakapan"
                      className="mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-background hover:text-destructive md:opacity-0 md:transition-opacity md:group-hover:opacity-100 md:focus-visible:opacity-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
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
              <div className="flex h-10 w-10 shrink-0 items-center justify-center">
                <img
                  src="/logodino.PNG"
                  alt=""
                  className="h-full w-full scale-110 object-contain"
                />
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
                  className={`flex min-w-0 shrink-0 items-end gap-3 ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {message.role === "assistant" && (
                    <div className="mb-1 flex h-9 w-9 shrink-0 items-center justify-center">
                      <img
                        src="/logodino.PNG"
                        alt=""
                        className="h-full w-full scale-110 object-contain"
                      />
                    </div>
                  )}
                  <div
                    className={
                      message.role === "user"
                        ? "min-w-0 max-w-[85%] break-words rounded-[24px] rounded-br-md bg-gradient-to-r from-[#EECDA3] to-[#EF629F] px-5 py-4 text-[16px] leading-7 text-white shadow-lg shadow-pink-500/10 sm:max-w-[75%]"
                        : "dino-glass min-w-0 max-w-[85%] break-words rounded-[24px] rounded-bl-md px-5 py-4 text-[16px] leading-7 sm:max-w-[75%]"
                    }
                  >
                    {message.attachment && (
                      <div
                        className={`mb-2 flex max-w-full items-center gap-2 rounded-xl px-3 py-2 text-xs ${
                          message.role === "user"
                            ? "bg-white/15 text-white"
                            : "bg-muted/70 text-muted-foreground"
                        }`}
                      >
                        {message.attachment.kind === "image" ? (
                          <Image className="h-4 w-4 shrink-0" />
                        ) : message.attachment.kind === "audio" ? (
                          <Mic className="h-4 w-4 shrink-0" />
                        ) : (
                          <FileText className="h-4 w-4 shrink-0" />
                        )}
                        <span className="truncate">{message.attachment.name}</span>
                      </div>
                    )}
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
                        {message.incomplete && (
                          <p className="mt-4 rounded-xl border border-[#EF629F]/20 bg-[#EF629F]/5 px-3 py-2 text-sm leading-6 text-muted-foreground">
                            Jawaban mencapai batas panjang sebelum semua rincian tersampaikan. Balas{" "}
                            <strong className="font-semibold text-foreground">
                              “lanjutkan dari bagian terakhir”
                            </strong>{" "}
                            untuk meneruskan tanpa mengulang bagian sebelumnya.
                          </p>
                        )}
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
                  <div className="mb-1 flex h-9 w-9 shrink-0 items-center justify-center">
                    <img
                      src="/logodino.PNG"
                      alt=""
                      className="h-full w-full scale-110 object-contain"
                    />
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
                <input
                  ref={attachmentInputRef}
                  type="file"
                  accept="image/jpeg,image/png,application/pdf,text/plain,text/markdown,text/csv,.md,.csv,audio/mpeg,audio/wav,audio/ogg,audio/aac,audio/mp4,.mp3,.wav,.ogg,.aac,.m4a"
                  className="hidden"
                  aria-label="Pilih file, gambar, atau audio"
                  onChange={(event) => {
                    void handleAttachmentSelect(event.currentTarget.files?.[0]);
                    event.currentTarget.value = "";
                  }}
                  disabled={loading || isRecording}
                />
                <div className="dino-glass rounded-[28px] p-3 shadow-xl shadow-black/5">
                  {pendingAttachment && (
                    <div className="mb-2 flex min-w-0 items-center gap-2 rounded-xl border border-border/60 bg-white/40 px-3 py-2 text-xs dark:bg-white/5">
                      {pendingAttachment.kind === "image" ? (
                        <Image className="h-4 w-4 shrink-0 text-[#EF629F]" />
                      ) : pendingAttachment.kind === "audio" ? (
                        <Mic className="h-4 w-4 shrink-0 text-[#EF629F]" />
                      ) : (
                        <FileText className="h-4 w-4 shrink-0 text-[#EF629F]" />
                      )}
                      <span className="min-w-0 flex-1 truncate">{pendingAttachment.name}</span>
                      <span className="shrink-0 text-muted-foreground">2 kredit</span>
                      <button
                        type="button"
                        onClick={removePendingAttachment}
                        className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                        aria-label="Hapus lampiran"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                  <div className="flex items-end gap-2">
                    <button
                      type="button"
                      onClick={() => attachmentInputRef.current?.click()}
                      disabled={loading || isRecording}
                      className="dino-button flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-white/40 text-muted-foreground transition hover:text-[#EF629F] disabled:opacity-40 dark:bg-white/5"
                      aria-label="Lampirkan file, gambar, atau audio"
                      title="Lampirkan file atau gambar"
                    >
                      <Paperclip className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={isRecording ? stopVoiceRecording : () => void startVoiceRecording()}
                      disabled={loading}
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition disabled:opacity-40 ${
                        isRecording
                          ? "bg-red-500 text-white"
                          : "dino-button border border-border/60 bg-white/40 text-muted-foreground hover:text-[#EF629F] dark:bg-white/5"
                      }`}
                      aria-label={isRecording ? "Hentikan rekaman suara" : "Rekam pesan suara"}
                      title={isRecording ? "Hentikan rekaman" : "Rekam pesan suara"}
                    >
                      {isRecording ? <Square className="h-4 w-4" /> : <Mic className="h-5 w-5" />}
                    </button>
                    <textarea
                      value={input}
                      maxLength={8_000}
                      onChange={(event) => setInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          void handleSend();
                        }
                      }}
                      rows={1}
                      placeholder={isRecording ? "Sedang merekam... (maks. 30 detik)" : "Tanyakan sesuatu kepada DinoAI..."}
                      className="min-h-12 min-w-0 flex-1 resize-none bg-transparent px-2 py-3 text-[17px] leading-6 outline-none placeholder:text-muted-foreground"
                      disabled={loading || isRecording}
                    />
                    <button
                      type="button"
                      onClick={() => void handleSend()}
                      disabled={(!input.trim() && !pendingAttachment) || loading || isRecording || attachmentNeedsMoreCredits}
                      className="dino-gradient flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg shadow-pink-500/10 transition duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
                      aria-label="Kirim pesan"
                    >
                      <Send className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                {(attachmentError || attachmentNeedsMoreCredits) && (
                  <p role="status" className="mt-2 text-center text-xs text-[#c9447b]">
                    {attachmentError || "Analisis file, gambar, dan suara memerlukan 2 kredit. Tambah token atau lanjutkan dengan chat teks."}
                  </p>
                )}
                <p className="mt-2 text-center text-[12px] text-muted-foreground">
                  Chat teks 1 kredit · analisis file, gambar, dan suara 2 kredit · rekaman maksimal 30 detik
                </p>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
