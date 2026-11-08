export {
  DINO_AI_CREDIT_COSTS,
  DINO_AI_CREDIT_FEATURES,
  DINO_AI_USAGE_CONTEXTS,
  creditLabel,
} from "../../supabase/functions/_shared/dinoAiCreditPolicy"

export interface DinoAICreditStatus {
  dailyRemaining: number
  dailyLimit: number
  purchasedRemaining: number
}

export interface DinoAICreditStatusProps {
  creditStatus: DinoAICreditStatus | null
  creditStatusLoading: boolean
  creditStatusError: boolean
}
