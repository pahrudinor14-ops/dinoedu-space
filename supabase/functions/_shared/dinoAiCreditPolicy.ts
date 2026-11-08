/**
 * Presentation and Edge Function mirror of the server-side DinoAI credit
 * policy. The reservation RPC in Supabase remains authoritative for charging.
 */
export const DINO_AI_CREDIT_COSTS = {
  chatText: 1,
  chatAttachment: 2,
  cv: 2,
  jobLetter: 2,
  questionSet: 2,
  teachingModule: 2,
  worksheet: 2,
  rubric: 2,
  evaluation: 2,
  dinoLabScribble: 2,
} as const

export const DINO_AI_CREDIT_FEATURES = {
  chatText: "dinoai-chat",
  chatAttachment: "dinoai-chat-media",
  dinoLabScribble: "ai-scribble-analysis",
  cv: "ai-cv-maker",
  jobLetter: "ai-surat-lamaran",
  questionSet: "ai-pembuat-soal",
  teachingModule: "ai-modul-ajar",
  worksheet: "ai-lkpd",
  rubric: "ai-rubrik",
  evaluation: "ai-evaluasi",
} as const

export const DINO_AI_USAGE_CONTEXTS = {
  dinoLabScribble: "dinolab-scribble",
} as const

export function creditLabel(credits: number): string {
  return `${credits} kredit`
}
