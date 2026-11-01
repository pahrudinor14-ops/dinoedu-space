const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);
interface GeminiRequestOptions {
  apiKey: string;
  model: string;
  requestBody: string;
  timeoutMs: number;
}
interface GeminiFallbackOptions extends GeminiRequestOptions {
  fallbackModel: string;
  operation: string;
  validateOutput?: (text: string) => boolean;
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function hasGeneratedText(value: unknown): boolean {
  if (!isRecord(value) || !Array.isArray(value.candidates)) return false;
  const candidate = value.candidates.find(isRecord);
  if (!candidate || !isRecord(candidate.content) || !Array.isArray(candidate.content.parts)) {
    return false;
  }
  return candidate.content.parts.some(
    (part) => isRecord(part) && typeof part.text === "string" && part.text.trim().length > 0,
  );
}
export async function callGeminiModel({
  apiKey,
  model,
  requestBody,
  timeoutMs,
}: GeminiRequestOptions): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: requestBody,
        signal: controller.signal,
      },
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
export function getGeminiFailureReason(error: unknown): string {
  return error instanceof Error && error.name === "AbortError"
    ? "gemini_timeout"
    : "gemini_network_error";
}
export async function callGeminiWithFallback({
  apiKey,
  fallbackModel,
  model,
  operation,
  requestBody,
  timeoutMs,
  validateOutput,
}: GeminiFallbackOptions): Promise<Response> {
  const models = model === fallbackModel ? [model] : [model, fallbackModel];
  for (const [index, modelName] of models.entries()) {
    let response: Response;
    try {
      response = await callGeminiModel({
        apiKey,
        model: modelName,
        requestBody,
        timeoutMs,
      });
    } catch (error) {
      if (index === models.length - 1) throw error;
      console.warn(`${operation}: model utama gagal dihubungi; mencoba cadangan.`, {
        reason: error instanceof Error ? error.name : "unknown",
      });
      continue;
    }
    const retryable = RETRYABLE_STATUSES.has(response.status) || response.status === 404;
    let outputUsable = false;
    if (response.ok) {
      const payload: unknown = await response.clone().json().catch(() => null);
      const { text } = extractGeminiContent(payload);
      outputUsable = hasGeneratedText(payload) &&
        (!validateOutput || validateOutput(text));
    }
    if (index === models.length - 1 || (!retryable && (!response.ok || outputUsable))) {
      return response;
    }
    console.warn(`${operation}: respons model utama tidak dapat digunakan; mencoba cadangan.`, {
      httpStatus: response.status,
      reason: response.ok ? "empty_or_invalid_response" : "retryable_provider_status",
    });
    try {
      await response.body?.cancel();
    } catch {
      // Discard the primary response before the single fallback attempt.
    }
  }
  throw new Error("Gemini fallback exhausted without a response.");
}
export function extractGeminiContent(value: unknown): {
  text: string;
  finishReason: string | null;
} {
  if (!isRecord(value) || !Array.isArray(value.candidates)) {
    return { text: "", finishReason: null };
  }
  const candidate = value.candidates.find(isRecord);
  if (!candidate) return { text: "", finishReason: null };
  const content = isRecord(candidate.content) ? candidate.content : null;
  const parts = content && Array.isArray(content.parts) ? content.parts : [];
  return {
    text: parts
      .filter(isRecord)
      .map((part) => typeof part.text === "string" ? part.text : "")
      .join(""),
    finishReason: typeof candidate.finishReason === "string"
      ? candidate.finishReason
      : null,
  };
}
