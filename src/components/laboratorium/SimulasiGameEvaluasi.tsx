import { useRef, useState } from "react"
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Check,
  CheckCircle2,
  Cuboid,
  RotateCcw,
  Sparkles,
  Target,
} from "lucide-react"
import Dino3DScene, { type SelectedPart } from "../Dino3DScene"
import type { AdventureCompletion } from "./adventureProgress"

type ActivityStage = "observe" | "explore" | "challenge" | "evaluation" | "result"
type PartType = SelectedPart["type"]
type Feedback = { tone: "success" | "error"; message: string }
type AttemptResult = "pending" | "first-try" | "retry"

type ChoiceActivity = {
  kind: "choice"
  prompt: string
  options: string[]
  answer: string
  explanation: string
}

type PartActivity = {
  kind: "part"
  prompt: string
  target: PartType
  explanation: string
}

type Activity = ChoiceActivity | PartActivity

const STAGES: { id: Exclude<ActivityStage, "result">; title: string }[] = [
  { id: "observe", title: "Amati" },
  { id: "explore", title: "Eksplorasi" },
  { id: "challenge", title: "Tantangan" },
  { id: "evaluation", title: "Evaluasi" },
]

const explorationTasks: { target: PartType; prompt: string; success: string }[] = [
  { target: "Sisi", prompt: "Klik atau sentuh salah satu sisi kubus.", success: "Bagus! Sisi adalah bidang datar yang membatasi bangun." },
  { target: "Rusuk", prompt: "Sekarang temukan salah satu rusuk kubus.", success: "Tepat! Rusuk adalah garis tempat dua sisi bertemu." },
  { target: "Titik sudut", prompt: "Terakhir, temukan satu titik sudut.", success: "Hebat! Titik sudut adalah tempat beberapa rusuk bertemu." },
]

const challengeTasks: Activity[] = [
  {
    kind: "choice",
    prompt: "Bangun ruang apakah yang sedang kamu amati?",
    options: ["Kubus", "Balok", "Tabung"],
    answer: "Kubus",
    explanation: "Bangun pada layar adalah kubus. Keenam sisinya berbentuk persegi yang sama besar.",
  },
  {
    kind: "part",
    prompt: "Sentuh salah satu rusuk pada model kubus.",
    target: "Rusuk",
    explanation: "Benar! Rusuk kubus berbentuk garis lurus dan menjadi pertemuan dua sisi.",
  },
  {
    kind: "choice",
    prompt: "Berapa banyak titik sudut yang dimiliki kubus?",
    options: ["6", "8", "12"],
    answer: "8",
    explanation: "Kubus memiliki 8 titik sudut.",
  },
]

const evaluationTasks: Activity[] = [
  {
    kind: "part",
    prompt: "Buktikan pemahamanmu: sentuh satu titik sudut pada kubus.",
    target: "Titik sudut",
    explanation: "Tepat! Titik sudut adalah tempat beberapa rusuk bertemu.",
  },
  {
    kind: "choice",
    prompt: "Bangun apakah yang mempunyai 6 sisi persegi sama besar?",
    options: ["Kubus", "Balok", "Tabung"],
    answer: "Kubus",
    explanation: "Kubus memiliki enam sisi berbentuk persegi yang sama besar.",
  },
  {
    kind: "choice",
    prompt: "Berapa banyak rusuk yang dimiliki kubus?",
    options: ["8", "12", "6"],
    answer: "12",
    explanation: "Kubus mempunyai 12 rusuk.",
  },
]

const initialResults = (): AttemptResult[] => Array<AttemptResult>(3).fill("pending")

function StageProgress({ stage }: { stage: Exclude<ActivityStage, "result"> }) {
  const activeIndex = STAGES.findIndex((item) => item.id === stage)
  const progress = ((activeIndex + 1) / STAGES.length) * 100

  return (
    <section aria-label="Progres aktivitas" className="rounded-2xl border border-border/70 bg-background/80 p-4 shadow-sm sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold">Tahap {activeIndex + 1} dari {STAGES.length} — {STAGES[activeIndex].title}</p>
        <span className="text-xs font-semibold text-muted-foreground">{Math.round(progress)}%</span>
      </div>
      <div
        role="progressbar"
        aria-label="Progres DinoLab Challenge"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
        className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted"
      >
        <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-[width] duration-500" style={{ width: `${progress}%` }} />
      </div>
      <ol className="mt-4 grid grid-cols-4 gap-2" aria-label="Urutan aktivitas">
        {STAGES.map((item, index) => {
          const complete = index < activeIndex
          const active = index === activeIndex
          return (
            <li key={item.id} aria-current={active ? "step" : undefined} className="min-w-0">
              <div className={`flex min-h-10 items-center justify-center gap-1.5 rounded-xl px-1.5 text-center text-[11px] font-bold sm:min-h-11 sm:gap-2 sm:text-sm ${active ? "bg-emerald-600 text-white" : complete ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-200" : "bg-muted/70 text-muted-foreground"}`}>
                {complete ? <Check className="h-4 w-4 shrink-0" aria-hidden="true" /> : <span className="tabular-nums">{index + 1}</span>}
                <span className="truncate">{item.title}</span>
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

function FeedbackMessage({ feedback }: { feedback: Feedback | null }) {
  if (!feedback) return null
  const success = feedback.tone === "success"
  return (
    <div role="status" aria-live="polite" className={`mt-4 flex items-start gap-3 rounded-2xl p-4 text-sm leading-6 ${success ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-200" : "bg-amber-500/10 text-amber-900 dark:text-amber-200"}`}>
      {success ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" /> : <Target className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />}
      <p>{feedback.message}</p>
    </div>
  )
}

function ChoiceOptions({
  activity,
  selected,
  locked,
  onSelect,
}: {
  activity: ChoiceActivity
  selected: string | null
  locked: boolean
  onSelect: (option: string) => void
}) {
  return (
    <div role="group" aria-label="Pilihan jawaban" className="mt-5 grid gap-2 sm:grid-cols-3">
      {activity.options.map((option) => (
        <button
          key={option}
          type="button"
          disabled={locked}
          aria-pressed={selected === option}
          onClick={() => onSelect(option)}
          className={`min-h-12 rounded-xl border px-4 py-3 text-left text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-default ${selected === option ? "border-emerald-500 bg-emerald-500/10 text-emerald-800 ring-1 ring-emerald-500/30 dark:text-emerald-200" : "border-border/70 bg-background hover:border-emerald-400/60 hover:bg-emerald-500/5"}`}
        >
          {option}
        </button>
      ))}
    </div>
  )
}

export default function SimulasiGameEvaluasi({
  playerName,
  onActivityComplete,
  onBackToMap,
}: {
  playerName: string
  onActivityComplete: (completion: AdventureCompletion) => void
  onBackToMap: () => void
}) {
  const runId = useRef(`${Date.now()}-${Math.random().toString(36).slice(2, 10)}`)
  const [stage, setStage] = useState<ActivityStage>("observe")
  const [showHiddenEdges, setShowHiddenEdges] = useState(true)
  const [selectedPart, setSelectedPart] = useState<SelectedPart | null>(null)
  const [explorationIndex, setExplorationIndex] = useState(0)
  const [challengeIndex, setChallengeIndex] = useState(0)
  const [evaluationIndex, setEvaluationIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [challengeResults, setChallengeResults] = useState<AttemptResult[]>(initialResults)
  const [evaluationResults, setEvaluationResults] = useState<AttemptResult[]>(initialResults)

  const currentChallenge = challengeTasks[challengeIndex]
  const currentEvaluation = evaluationTasks[evaluationIndex]
  const isCorrectFeedback = feedback?.tone === "success"

  const recordChallenge = (correct: boolean) => {
    setChallengeResults((current) => current.map((result, index) => index === challengeIndex && result === "pending" ? (correct ? "first-try" : "retry") : result))
  }

  const recordEvaluation = (correct: boolean) => {
    setEvaluationResults((current) => current.map((result, index) => index === evaluationIndex && result === "pending" ? (correct ? "first-try" : "retry") : result))
  }

  const handlePartSelect = (part: SelectedPart | null) => {
    if (!part) return
    setSelectedPart(part)
    if (isCorrectFeedback) return

    if (stage === "explore") {
      const task = explorationTasks[explorationIndex]
      setFeedback(part.type === task.target
        ? { tone: "success", message: task.success }
        : { tone: "error", message: `Kamu memilih ${part.type.toLowerCase()}. ${task.prompt}` })
      return
    }

    if (stage === "challenge" && currentChallenge?.kind === "part") {
      const correct = part.type === currentChallenge.target
      recordChallenge(correct)
      setFeedback(correct
        ? { tone: "success", message: currentChallenge.explanation }
        : { tone: "error", message: `Itu ${part.type.toLowerCase()}. Coba cari ${currentChallenge.target.toLowerCase()} pada model.` })
      return
    }

    if (stage === "evaluation" && currentEvaluation?.kind === "part") {
      const correct = part.type === currentEvaluation.target
      recordEvaluation(correct)
      setFeedback(correct
        ? { tone: "success", message: currentEvaluation.explanation }
        : { tone: "error", message: `Yang kamu pilih adalah ${part.type.toLowerCase()}. Coba sentuh ${currentEvaluation.target.toLowerCase()}.` })
    }
  }

  const checkChoice = (activity: ChoiceActivity, group: "challenge" | "evaluation") => {
    if (!selectedAnswer) return
    const correct = selectedAnswer === activity.answer
    if (group === "challenge") recordChallenge(correct)
    else recordEvaluation(correct)
    setFeedback(correct
      ? { tone: "success", message: activity.explanation }
      : { tone: "error", message: "Belum tepat. Coba amati model dan pikirkan kembali." })
  }

  const advanceExploration = () => {
    setSelectedPart(null)
    setFeedback(null)
    if (explorationIndex < explorationTasks.length - 1) {
      setExplorationIndex((index) => index + 1)
    } else {
      setStage("challenge")
    }
  }

  const advanceChallenge = () => {
    setSelectedPart(null)
    setSelectedAnswer(null)
    setFeedback(null)
    if (challengeIndex < challengeTasks.length - 1) {
      setChallengeIndex((index) => index + 1)
    } else {
      setStage("evaluation")
    }
  }

  const advanceEvaluation = () => {
    setSelectedPart(null)
    setSelectedAnswer(null)
    setFeedback(null)
    if (evaluationIndex < evaluationTasks.length - 1) {
      setEvaluationIndex((index) => index + 1)
    } else {
      completeActivity()
    }
  }

  const restartActivity = () => {
    runId.current = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    setStage("observe")
    setShowHiddenEdges(true)
    setSelectedPart(null)
    setExplorationIndex(0)
    setChallengeIndex(0)
    setEvaluationIndex(0)
    setSelectedAnswer(null)
    setFeedback(null)
    setChallengeResults(initialResults())
    setEvaluationResults(initialResults())
  }

  const correctChallenges = challengeResults.filter((result) => result === "first-try").length
  const correctEvaluations = evaluationResults.filter((result) => result === "first-try").length
  const totalCorrect = correctChallenges + correctEvaluations

  const completeActivity = () => {
    onActivityComplete({
      id: runId.current,
      playerName: playerName.trim() || "Penjelajah",
      correctFirstTry: totalCorrect,
      challengeFirstTry: correctChallenges,
      evaluationFirstTry: correctEvaluations,
      completedAt: new Date().toISOString(),
    })
    setStage("result")
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6 sm:py-8 lg:space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-200">
            <Sparkles className="h-4 w-4" aria-hidden="true" />DinoLab Adventure · Misi 01
          </div>
          <h2 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">Bangun &amp; Temukan</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">Eksplorasi konsep, selesaikan tantangan, dan buktikan pemahamanmu.</p>
        </div>
        {stage === "result" && (
          <button type="button" onClick={restartActivity} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border/70 bg-background px-4 py-3 text-sm font-bold transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
            <RotateCcw className="h-4 w-4" aria-hidden="true" />Ulangi aktivitas
          </button>
        )}
      </header>

      {stage !== "result" ? (
        <StageProgress stage={stage} />
      ) : (
        <section aria-label="Progres aktivitas" className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4 sm:p-5">
          <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-200"><BadgeCheck className="h-5 w-5" aria-hidden="true" /><p className="font-bold">Tahap 4 dari 4 — Selesai</p></div>
          <div role="progressbar" aria-label="Progres DinoLab Challenge" aria-valuemin={0} aria-valuemax={100} aria-valuenow={100} className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted"><div className="h-full w-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500" /></div>
        </section>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(19rem,0.8fr)] lg:gap-6">
        <section aria-label="Simulasi bangun ruang" className="min-w-0 overflow-hidden rounded-3xl border border-emerald-500/15 bg-background/70 shadow-lg shadow-emerald-950/5">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
            <div>
              <h3 className="font-bold">Model kubus 3D</h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">Putar untuk mengamati. Sentuh sisi, rusuk, atau titik sudut sesuai instruksi.</p>
            </div>
            {selectedPart && stage !== "observe" && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-200">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />{selectedPart.type} dipilih
              </span>
            )}
          </div>
          <div className="overflow-hidden border-y border-border/50 bg-gradient-to-br from-emerald-100/65 via-emerald-50/45 to-cyan-100/60 dark:from-emerald-950/20 dark:via-[#0d1917] dark:to-cyan-950/20">
            <Dino3DScene
              shape="cube"
              length={4}
              width={4}
              height={4}
              radius={2}
              showHiddenEdges={showHiddenEdges}
              onToggleHiddenEdges={() => setShowHiddenEdges((visible) => !visible)}
              onSelectPart={handlePartSelect}
            />
          </div>
          <p className="px-4 py-3 text-xs leading-5 text-muted-foreground sm:px-6">Geser dengan mouse atau jari untuk memutar, cubit untuk memperbesar, lalu klik atau sentuh bagian bangun.</p>
        </section>

        <aside className="min-w-0 rounded-3xl border border-border/70 bg-background/85 p-5 shadow-sm sm:p-6" aria-live="polite">
          {stage === "observe" && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Amati</p>
              <h3 className="mt-2 text-xl font-black">Kenali bentuknya</h3>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">Amati bangun ruang berikut. Putar dan lihat bentuknya dari berbagai sisi. Perhatikan bidang datar, garis, dan sudutnya.</p>
              <div className="mt-5 rounded-2xl bg-cyan-500/5 p-4 text-sm leading-6"><span className="font-bold">Petunjuk:</span> gunakan mouse atau jari untuk memutar model. Kamu bisa memperbesar tampilan dengan scroll atau cubit layar.</div>
              <button type="button" onClick={() => setStage("explore")} className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2">
                Mulai Eksplorasi<ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          )}

          {stage === "explore" && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Eksplorasi {explorationIndex + 1} dari {explorationTasks.length}</p>
              <h3 className="mt-2 text-xl font-black">Temukan bagian bangun</h3>
              <p className="mt-4 rounded-2xl bg-muted/60 p-4 text-base font-semibold leading-7">{explorationTasks[explorationIndex].prompt}</p>
              {selectedPart && <p className="mt-3 text-xs text-muted-foreground">Pilihanmu: {selectedPart.type} — {selectedPart.name}</p>}
              <FeedbackMessage feedback={feedback} />
              {isCorrectFeedback && (
                <button type="button" onClick={advanceExploration} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2">
                  {explorationIndex === explorationTasks.length - 1 ? "Lanjut ke Tantangan" : "Temuan berikutnya"}<ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>
          )}

          {stage === "challenge" && currentChallenge && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-cyan-800 dark:text-cyan-200">Tantangan {challengeIndex + 1}/{challengeTasks.length}</p>
              <h3 className="mt-2 text-xl font-black">Uji temuanmu</h3>
              <p className="mt-4 rounded-2xl bg-cyan-500/5 p-4 text-base font-semibold leading-7">{currentChallenge.prompt}</p>
              {currentChallenge.kind === "choice" ? (
                <>
                  <ChoiceOptions activity={currentChallenge} selected={selectedAnswer} locked={isCorrectFeedback} onSelect={(option) => { setSelectedAnswer(option); setFeedback(null) }} />
                  {!isCorrectFeedback && <button type="button" disabled={!selectedAnswer} onClick={() => checkChoice(currentChallenge, "challenge")} className="mt-4 min-h-12 w-full rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-45">Periksa jawaban</button>}
                </>
              ) : (
                <p className="mt-4 rounded-xl border border-dashed border-cyan-600/40 px-4 py-3 text-sm leading-6 text-muted-foreground">Pilih langsung pada model 3D. Tantangan ini tidak memakai pilihan jawaban.</p>
              )}
              <FeedbackMessage feedback={feedback} />
              {isCorrectFeedback && <button type="button" onClick={advanceChallenge} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2">{challengeIndex === challengeTasks.length - 1 ? "Mulai Evaluasi" : "Tantangan berikutnya"}<ArrowRight className="h-4 w-4" aria-hidden="true" /></button>}
            </div>
          )}

          {stage === "evaluation" && currentEvaluation && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Evaluasi {evaluationIndex + 1}/{evaluationTasks.length}</p>
              <h3 className="mt-2 text-xl font-black">Buktikan pemahamanmu</h3>
              <p className="mt-4 rounded-2xl bg-emerald-500/5 p-4 text-base font-semibold leading-7">{currentEvaluation.prompt}</p>
              {currentEvaluation.kind === "choice" ? (
                <>
                  <ChoiceOptions activity={currentEvaluation} selected={selectedAnswer} locked={isCorrectFeedback} onSelect={(option) => { setSelectedAnswer(option); setFeedback(null) }} />
                  {!isCorrectFeedback && <button type="button" disabled={!selectedAnswer} onClick={() => checkChoice(currentEvaluation, "evaluation")} className="mt-4 min-h-12 w-full rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-45">Periksa jawaban</button>}
                </>
              ) : (
                <p className="mt-4 rounded-xl border border-dashed border-emerald-600/40 px-4 py-3 text-sm leading-6 text-muted-foreground">Sentuh langsung bagian yang diminta pada model 3D.</p>
              )}
              <FeedbackMessage feedback={feedback} />
              {isCorrectFeedback && <button type="button" onClick={advanceEvaluation} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2">{evaluationIndex === evaluationTasks.length - 1 ? "Lihat Hasil" : "Soal berikutnya"}<ArrowRight className="h-4 w-4" aria-hidden="true" /></button>}
            </div>
          )}

          {stage === "result" && (
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"><BadgeCheck className="h-7 w-7" aria-hidden="true" /></div>
              <p className="mt-4 text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Hasil eksplorasi</p>
              <h3 className="mt-2 text-2xl font-black">Bagus! Aktivitas selesai.</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Kamu sudah menyelesaikan eksplorasi bangun ruang. Terus gunakan pengamatanmu saat belajar bentuk lain.</p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-emerald-500/10 p-4"><p className="text-xs font-semibold text-muted-foreground">Tepat pada percobaan pertama</p><p className="mt-1 text-2xl font-black tabular-nums">{totalCorrect}/{challengeTasks.length + evaluationTasks.length}</p></div>
                <div className="rounded-2xl bg-cyan-500/10 p-4"><p className="text-xs font-semibold text-muted-foreground">Progres</p><p className="mt-1 text-2xl font-black">100%</p></div>
              </div>
              <div className="mt-3 rounded-2xl border border-border/60 p-4">
                <p className="text-sm font-bold">Skor percobaan pertama</p>
                <div className="mt-3 flex items-center justify-between text-sm"><span>Tantangan</span><strong>{correctChallenges}/{challengeTasks.length}</strong></div>
                <div className="mt-2 flex items-center justify-between text-sm"><span>Evaluasi</span><strong>{correctEvaluations}/{evaluationTasks.length}</strong></div>
                <p className="mt-3 text-xs leading-5 text-muted-foreground">Semua tantangan berhasil diselesaikan. Skor menunjukkan jawaban atau temuan yang tepat pada percobaan pertama.</p>
              </div>
              <div className="mt-3 rounded-2xl bg-muted/50 p-4">
                <p className="text-sm font-bold">Konsep yang dipelajari</p>
                <ul className="mt-2 space-y-1 text-sm leading-6 text-muted-foreground">
                  <li>Kubus memiliki 6 sisi berbentuk persegi.</li>
                  <li>Kubus memiliki 12 rusuk dan 8 titik sudut.</li>
                  <li>Rusuk menghubungkan sisi, dan titik sudut menjadi tempat rusuk bertemu.</li>
                </ul>
              </div>
              <button type="button" onClick={onBackToMap} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-border/70 bg-background px-5 py-3 text-sm font-bold transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />Kembali ke Peta DinoLab
              </button>
            </div>
          )}
        </aside>
      </div>

      {stage === "result" && (
        <div className="flex flex-wrap items-center justify-center gap-2 rounded-2xl bg-emerald-500/[0.04] p-4 text-center text-sm text-muted-foreground">
          <Cuboid className="h-4 w-4 text-emerald-700 dark:text-emerald-300" aria-hidden="true" />Skor dihitung lokal dan tidak dikirim ke database.
        </div>
      )}
    </div>
  )
}
