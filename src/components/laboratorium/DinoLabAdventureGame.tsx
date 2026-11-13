import { useEffect, useRef, useState } from "react"
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Cuboid,
  Footprints,
  Keyboard,
  MapPin,
  MessageCircle,
  RotateCcw,
  Sparkles,
  Target,
} from "lucide-react"
import DinoLabLogo from "../DinoLabLogo"
import Dino3DScene, { type SelectedPart } from "../Dino3DScene"
import type { AdventureCompletion } from "./adventureProgress"

type GameStage = "find-guide" | "dialogue-intro" | "find-lab" | "explore" | "find-terminal" | "dialogue-mission" | "quiz" | "dialogue-finale" | "result"
type Feedback = { tone: "success" | "error"; message: string }
type AttemptResult = "pending" | "first-try" | "retry"
type PartType = SelectedPart["type"]
type ChoiceTask = { kind: "choice"; prompt: string; options: string[]; answer: string; explanation: string }
type PartTask = { kind: "part"; prompt: string; target: PartType; explanation: string }
type QuizTask = ChoiceTask | PartTask

const explorationTasks: { target: PartType; prompt: string; success: string }[] = [
  { target: "Sisi", prompt: "Sentuh bidang datar pada kubus untuk menemukan sebuah sisi.", success: "Sisi ditemukan! Sisi adalah bidang datar yang membatasi bangun." },
  { target: "Rusuk", prompt: "Sekarang telusuri garis tempat dua sisi bertemu.", success: "Rusuk ditemukan! Setiap rusuk menghubungkan dua titik sudut." },
  { target: "Titik sudut", prompt: "Temukan titik tempat beberapa rusuk bertemu.", success: "Titik sudut ditemukan! Di sinilah beberapa rusuk bertemu." },
]

const quizTasks: QuizTask[] = [
  {
    kind: "choice",
    prompt: "Bentuk ruang apa yang baru saja kamu jelajahi?",
    options: ["Kubus", "Balok", "Tabung"],
    answer: "Kubus",
    explanation: "Benar! Bangun yang kamu amati adalah kubus.",
  },
  {
    kind: "part",
    prompt: "Pada model 3D, sentuh satu titik sudut kubus.",
    target: "Titik sudut",
    explanation: "Tepat! Titik sudut adalah tempat beberapa rusuk bertemu.",
  },
  {
    kind: "choice",
    prompt: "Berapa banyak rusuk yang dimiliki kubus?",
    options: ["8", "12", "6"],
    answer: "12",
    explanation: "Kubus mempunyai 12 rusuk.",
  },
]

const introLines = [
  { speaker: "Mira · Pemandu Lab", text: "Hai, {name}! Aku Mira. Pusat eksperimen sedang memeriksa sebuah kubus. Maukah kamu ikut menjelajah?" },
  { speaker: "Mira · Pemandu Lab", text: "Kita akan melihat modelnya, menemukan sisi, rusuk, dan titik sudut, lalu membantu terminal memeriksa catatan. Ayo temui modul kubus!" },
]

const missionLines = [
  { speaker: "Mira · Pemandu Lab", text: "Kerja bagus! Tiga penanda bagian bangun sudah terkumpul. Bawa temuanmu ke Terminal Misi di ujung jalur." },
]

const finaleLines = [
  { speaker: "Terminal Misi", text: "Catatan cocok! Kubus memiliki 6 sisi, 12 rusuk, dan 8 titik sudut. Kamu berhasil membantu tim lab." },
  { speaker: "Mira · Pemandu Lab", text: "Terima kasih sudah menjelajah, {name}. Sekarang kamu bisa menjelaskan bagian-bagian kubus dari model yang kamu temukan sendiri." },
]

const emptyAttempts = () => Array<AttemptResult>(3).fill("pending")
const makeRunId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
const clampPosition = (position: number) => Math.max(5, Math.min(95, position))

function GuideSprite() {
  return (
    <svg viewBox="0 0 80 108" className="h-full w-full" aria-hidden="true">
      <ellipse cx="40" cy="101" rx="23" ry="5" fill="#173d45" opacity=".2" />
      <path d="M26 47c-8 4-10 17-6 26l8 2 5-17zm29 1c8 4 10 17 6 26l-8 2-5-17z" fill="#d28b60" />
      <path d="M28 45c2-7 7-10 13-10s12 4 14 10l4 31c-10 7-25 7-36 0z" fill="#6949a1" />
      <path d="M33 44h16v8H33z" fill="#f3eee0" />
      <path d="M29 76h12v22H26zm15 0h12l4 22H44z" fill="#374960" />
      <path d="M29 96h12v7H25c-1-3 1-6 4-7zm16 0h10c4 2 7 4 7 7H45z" fill="#233f57" />
      <circle cx="40" cy="22" r="17" fill="#c9845a" />
      <path d="M24 23C22 11 28 4 40 4c12 0 19 7 16 21l-5-7c-7 2-15 2-23-1z" fill="#3b3442" />
      <circle cx="33" cy="23" r="1.5" fill="#243340" /><circle cx="47" cy="23" r="1.5" fill="#243340" />
      <path d="M35 32c3 2 7 2 10 0" fill="none" stroke="#8d4c40" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function AdventureScene({
  playerPosition,
  stage,
  completedFinds,
}: {
  playerPosition: number
  stage: GameStage
  completedFinds: boolean[]
}) {
  const activeStop = stage === "find-guide" || stage === "dialogue-intro" ? 0
    : stage === "find-lab" || stage === "explore" ? 1
      : stage === "find-terminal" || stage === "dialogue-mission" || stage === "quiz" ? 2
        : 3

  return (
    <div className="relative h-[17rem] min-w-0 overflow-hidden rounded-[1.75rem] border border-cyan-900/10 bg-gradient-to-b from-sky-200 via-cyan-100 to-emerald-100 shadow-inner sm:h-[22rem]" aria-label="Jalur petualangan di Pulau Tantangan">
      <svg viewBox="0 0 1000 440" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" role="img" aria-label="Jalur berkelok menghubungkan pemandu, stasiun kubus, dan terminal misi">
        <defs>
          <linearGradient id="island-sky" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#a7dce9" /><stop offset=".72" stopColor="#e2f5e9" /><stop offset="1" stopColor="#b9d9a6" /></linearGradient>
          <linearGradient id="island-ground" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#a5d797" /><stop offset="1" stopColor="#71b98f" /></linearGradient>
          <linearGradient id="path-ground" x1="0" x2="1"><stop stopColor="#f5d6a0" /><stop offset="1" stopColor="#edbd7c" /></linearGradient>
        </defs>
        <rect width="1000" height="440" fill="url(#island-sky)" />
        <circle cx="865" cy="70" r="40" fill="#fff1bd" opacity=".82" />
        <path d="M0 244c84-68 169-68 257-15 71-81 189-74 260 3 93-80 194-56 267 5 61-60 141-55 216-7v210H0z" fill="#c0e6ce" />
        <path d="M0 282c95-76 184-47 269 0 100-86 191-67 274 10 90-80 190-46 266 6 71-70 143-42 191 1v141H0z" fill="url(#island-ground)" />
        <path d="M-20 357c165-65 273 25 420-13 149-39 224-65 363-5 91 39 160 21 263-24v128H-20z" fill="#579f7e" opacity=".34" />
        <path d="M48 353C181 304 206 382 332 355s165-47 257-13 167 31 211 0 106-25 164 1" fill="none" stroke="#fff1d2" strokeWidth="52" strokeLinecap="round" opacity=".94" />
        <path d="M48 353C181 304 206 382 332 355s165-47 257-13 167 31 211 0 106-25 164 1" fill="none" stroke="url(#path-ground)" strokeWidth="39" strokeLinecap="round" />
        <path d="M48 353C181 304 206 382 332 355s165-47 257-13 167 31 211 0 106-25 164 1" fill="none" stroke="#fff7df" strokeWidth="3" strokeLinecap="round" strokeDasharray="3 18" opacity=".85" />
        <g fill="#4b9d79" opacity=".68">
          <path d="M74 250q20-60 40 0q-20-10-40 0m27 0v31"/><path d="M122 262q17-48 34 0q-17-8-34 0m17 0v24"/>
          <path d="M766 213q19-55 38 0q-19-9-38 0m19 0v28"/><path d="M812 222q16-46 32 0q-16-8-32 0m16 0v23"/>
          <path d="M918 281q20-58 40 0q-20-10-40 0m20 0v30"/><path d="M881 287q15-43 30 0q-15-7-30 0m15 0v23"/>
        </g>
        <g fill="#fff9e3" opacity=".9"><circle cx="291" cy="177" r="4"/><circle cx="477" cy="225" r="3"/><circle cx="682" cy="174" r="4"/><circle cx="950" cy="168" r="3"/></g>
      </svg>

      <div className={`absolute bottom-[29%] left-[20%] z-[2] flex -translate-x-1/2 flex-col items-center transition duration-300 ${activeStop === 0 ? "scale-105" : "opacity-90"}`}>
        <span className="mb-1 rounded-full border border-white/70 bg-white/90 px-2.5 py-1 text-[10px] font-black text-slate-700 shadow sm:text-xs">Mira · Pemandu</span>
        <div className="h-[4.2rem] w-[3.15rem] sm:h-[5rem] sm:w-[3.75rem]"><GuideSprite /></div>
      </div>
      <div className={`absolute bottom-[30%] left-[51%] z-[2] flex -translate-x-1/2 flex-col items-center transition duration-300 ${activeStop === 1 ? "scale-105" : "opacity-90"}`}>
        <span className="mb-2 rounded-xl border border-white/70 bg-[#f8fbf4] p-2.5 text-emerald-800 shadow-md sm:p-3"><Cuboid className="h-7 w-7 sm:h-9 sm:w-9" aria-hidden="true" /></span>
        <span className="rounded-full border border-white/70 bg-white/90 px-2.5 py-1 text-[10px] font-black text-slate-700 shadow sm:text-xs">Modul Kubus 3D</span>
      </div>
      <div className={`absolute bottom-[30%] left-[82%] z-[2] flex -translate-x-1/2 flex-col items-center transition duration-300 ${activeStop === 2 ? "scale-105" : "opacity-90"}`}>
        <span className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-white/70 bg-gradient-to-br from-amber-300 to-orange-400 text-amber-950 shadow-lg sm:h-14 sm:w-14"><Target className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden="true" /></span>
        <span className="rounded-full border border-white/70 bg-white/90 px-2.5 py-1 text-[10px] font-black text-slate-700 shadow sm:text-xs">Terminal Misi</span>
      </div>

      {explorationTasks.map((task, index) => {
        const markerPositions = [37, 43, 47]
        const found = completedFinds[index]
        return (
          <span key={task.target} className={`absolute bottom-[17%] z-[3] flex h-7 w-7 -translate-x-1/2 items-center justify-center rounded-full border-2 border-white text-xs font-black shadow-md transition ${found ? "bg-emerald-600 text-white" : "bg-white/70 text-slate-500"}`} style={{ left: `${markerPositions[index]}%` }} aria-label={found ? `Temuan ${index + 1} terkumpul` : `Temuan ${index + 1} belum terkumpul`}>
            {found ? <Check className="h-4 w-4" aria-hidden="true" /> : index + 1}
          </span>
        )
      })}

      <div className="absolute bottom-[18%] z-10 h-[5.2rem] w-[4rem] -translate-x-1/2 transition-[left] duration-300 ease-out sm:h-[6.5rem] sm:w-[4.8rem]" style={{ left: `${playerPosition}%` }} aria-label="Penjelajah sedang berada di jalur">
        <div className="relative flex h-full w-full animate-bounce items-center justify-center [animation-duration:1.8s]">
          <span className="absolute inset-1 rounded-full bg-cyan-300/50 blur-md" aria-hidden="true" />
          <span className="relative flex h-[4.25rem] w-[4.25rem] items-center justify-center rounded-[1.35rem] border-2 border-white/90 bg-white/90 p-2 shadow-lg ring-4 ring-emerald-600/15 sm:h-[5rem] sm:w-[5rem]">
            <DinoLabLogo className="h-full w-full object-contain drop-shadow-sm" />
          </span>
        </div>
      </div>

      <div className="absolute left-3 top-3 z-10 flex items-center gap-2 rounded-full border border-white/65 bg-white/75 px-3 py-1.5 text-[10px] font-bold text-slate-700 shadow-sm backdrop-blur sm:left-4 sm:top-4 sm:text-xs">
        <Footprints className="h-4 w-4 text-emerald-800" aria-hidden="true" />Jejak temuan {completedFinds.filter(Boolean).length}/3
      </div>
      <span className="absolute bottom-3 right-3 z-10 rounded-full bg-white/70 px-2.5 py-1 text-[9px] font-semibold text-slate-600 sm:bottom-4 sm:right-4 sm:text-[10px]">Pulau Tantangan · Jalur Eksperimen</span>
    </div>
  )
}

function JourneyProgress({ stage }: { stage: GameStage }) {
  const step = stage === "find-guide" || stage === "dialogue-intro" ? 0
    : stage === "find-lab" || stage === "explore" ? 1
      : stage === "find-terminal" || stage === "dialogue-mission" || stage === "quiz" ? 2 : 3
  const labels = ["Temui Mira", "Eksplorasi", "Misi", "Hasil"]
  return (
    <ol className="grid grid-cols-4 gap-2" aria-label="Tahapan petualangan">
      {labels.map((label, index) => (
        <li key={label} aria-current={step === index ? "step" : undefined} className={`flex min-h-10 items-center justify-center gap-1 rounded-xl px-1.5 text-center text-[10px] font-bold sm:min-h-11 sm:gap-2 sm:text-xs ${step === index ? "bg-emerald-700 text-white" : step > index ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-200" : "bg-muted/70 text-muted-foreground"}`}>
          {step > index ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <span>{index + 1}</span>}{label}
        </li>
      ))}
    </ol>
  )
}

export default function DinoLabAdventureGame({
  playerName,
  onActivityComplete,
  onBackToMap,
}: {
  playerName: string
  onActivityComplete: (completion: AdventureCompletion) => void
  onBackToMap: () => void
}) {
  const runId = useRef(makeRunId())
  const [stage, setStage] = useState<GameStage>("find-guide")
  const [playerPosition, setPlayerPosition] = useState(8)
  const [explorationIndex, setExplorationIndex] = useState(0)
  const [quizIndex, setQuizIndex] = useState(0)
  const [completedFinds, setCompletedFinds] = useState<boolean[]>([false, false, false])
  const [explorationResults, setExplorationResults] = useState<AttemptResult[]>(emptyAttempts)
  const [quizResults, setQuizResults] = useState<AttemptResult[]>(emptyAttempts)
  const [dialogueIndex, setDialogueIndex] = useState(0)
  const [selectedPart, setSelectedPart] = useState<SelectedPart | null>(null)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [showHiddenEdges, setShowHiddenEdges] = useState(true)

  const currentQuiz = quizTasks[quizIndex]
  const correctFeedback = feedback?.tone === "success"
  const canMove = stage === "find-guide" || stage === "find-lab" || stage === "find-terminal"
  const targetPosition = stage === "find-guide" ? 20 : stage === "find-lab" ? 51 : 82
  const nearTarget = Math.abs(playerPosition - targetPosition) <= 8

  const movePlayer = (direction: -1 | 1) => {
    if (!canMove) return
    setPlayerPosition((position) => clampPosition(position + direction * 5))
  }

  useEffect(() => {
    if (!canMove) return
    const moveWithKeyboard = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      if (key === "arrowleft" || key === "a") {
        event.preventDefault()
        setPlayerPosition((position) => clampPosition(position - 4))
      } else if (key === "arrowright" || key === "d") {
        event.preventDefault()
        setPlayerPosition((position) => clampPosition(position + 4))
      }
    }
    window.addEventListener("keydown", moveWithKeyboard)
    return () => window.removeEventListener("keydown", moveWithKeyboard)
  }, [canMove])

  const intro = introLines[dialogueIndex]
  const mission = missionLines[dialogueIndex]
  const finale = finaleLines[dialogueIndex]

  const recordAttempt = (results: AttemptResult[], setter: (next: AttemptResult[]) => void, index: number, correct: boolean) => {
    if (results[index] !== "pending") return
    setter(results.map((result, resultIndex) => resultIndex === index ? (correct ? "first-try" : "retry") : result))
  }

  const handlePartSelect = (part: SelectedPart | null) => {
    if (!part || correctFeedback) return
    setSelectedPart(part)
    if (stage === "explore") {
      const task = explorationTasks[explorationIndex]
      const correct = part.type === task.target
      recordAttempt(explorationResults, setExplorationResults, explorationIndex, correct)
      if (correct) setCompletedFinds((current) => current.map((found, index) => index === explorationIndex ? true : found))
      setFeedback(correct
        ? { tone: "success", message: task.success }
        : { tone: "error", message: `Yang kamu pilih adalah ${part.type.toLowerCase()}. Amati model, lalu coba lagi.` })
      return
    }
    if (stage === "quiz" && currentQuiz?.kind === "part") {
      const correct = part.type === currentQuiz.target
      recordAttempt(quizResults, setQuizResults, quizIndex, correct)
      setFeedback(correct
        ? { tone: "success", message: currentQuiz.explanation }
        : { tone: "error", message: `Itu ${part.type.toLowerCase()}. Coba sentuh ${currentQuiz.target.toLowerCase()}.` })
    }
  }

  const checkQuizAnswer = (task: ChoiceTask) => {
    if (!selectedAnswer) return
    const correct = selectedAnswer === task.answer
    recordAttempt(quizResults, setQuizResults, quizIndex, correct)
    setFeedback(correct
      ? { tone: "success", message: task.explanation }
      : { tone: "error", message: "Belum tepat. Ingat kembali bagian kubus yang kamu amati." })
  }

  const enterConversation = () => {
    setDialogueIndex(0)
    setStage("dialogue-intro")
  }

  const interactAtStop = () => {
    if (!nearTarget) return
    if (stage === "find-guide") enterConversation()
    if (stage === "find-lab") {
      setSelectedPart(null)
      setFeedback(null)
      setStage("explore")
    }
    if (stage === "find-terminal") {
      setDialogueIndex(0)
      setStage("dialogue-mission")
    }
  }

  const advanceDialogue = () => {
    if (stage === "dialogue-intro") {
      if (dialogueIndex < introLines.length - 1) setDialogueIndex((index) => index + 1)
      else {
        setDialogueIndex(0)
        setStage("find-lab")
      }
      return
    }
    if (stage === "dialogue-mission") {
      setStage("quiz")
      setFeedback(null)
      setSelectedPart(null)
      setSelectedAnswer(null)
      return
    }
    if (stage === "dialogue-finale") {
      if (dialogueIndex < finaleLines.length - 1) setDialogueIndex((index) => index + 1)
      else finishAdventure()
    }
  }

  const advanceExploration = () => {
    setSelectedPart(null)
    setFeedback(null)
    if (explorationIndex < explorationTasks.length - 1) setExplorationIndex((index) => index + 1)
    else setStage("find-terminal")
  }

  const advanceQuiz = () => {
    setSelectedPart(null)
    setSelectedAnswer(null)
    setFeedback(null)
    if (quizIndex < quizTasks.length - 1) setQuizIndex((index) => index + 1)
    else {
      setDialogueIndex(0)
      setStage("dialogue-finale")
    }
  }

  const firstTryExploration = explorationResults.filter((result) => result === "first-try").length
  const firstTryQuiz = quizResults.filter((result) => result === "first-try").length
  const totalFirstTry = firstTryExploration + firstTryQuiz

  function finishAdventure() {
    onActivityComplete({
      id: runId.current,
      playerName: playerName.trim() || "Penjelajah",
      correctFirstTry: totalFirstTry,
      challengeFirstTry: firstTryExploration,
      evaluationFirstTry: firstTryQuiz,
      completedAt: new Date().toISOString(),
    })
    setStage("result")
  }

  const restartAdventure = () => {
    runId.current = makeRunId()
    setStage("find-guide")
    setPlayerPosition(8)
    setExplorationIndex(0)
    setQuizIndex(0)
    setCompletedFinds([false, false, false])
    setExplorationResults(emptyAttempts())
    setQuizResults(emptyAttempts())
    setDialogueIndex(0)
    setSelectedPart(null)
    setSelectedAnswer(null)
    setFeedback(null)
    setShowHiddenEdges(true)
  }

  const isDialogue = stage === "dialogue-intro" || stage === "dialogue-mission" || stage === "dialogue-finale"
  const activeDialogue = stage === "dialogue-intro" ? intro : stage === "dialogue-mission" ? mission : stage === "dialogue-finale" ? finale : undefined
  const objective = stage === "find-guide" ? "Temui Mira di dekat pos informasi."
    : stage === "find-lab" ? "Berjalan ke Modul Kubus 3D."
      : stage === "find-terminal" ? "Bawa temuanmu ke Terminal Misi."
        : stage === "explore" ? explorationTasks[explorationIndex].prompt
          : stage === "quiz" ? currentQuiz?.prompt ?? "Selesaikan misi."
            : stage === "dialogue-intro" ? "Percakapan dengan Mira"
              : stage === "dialogue-mission" ? "Pesan dari Terminal Misi"
                : stage === "dialogue-finale" ? "Catatan petualangan"
                  : "Misi selesai"

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6 sm:py-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-200"><Sparkles className="h-4 w-4" aria-hidden="true" />Pulau Tantangan · Misi 01</div>
          <h2 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">Jejak Bentuk yang Hilang</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">Jelajahi jalur eksperimen bersama Mira dan bantu periksa model kubus.</p>
        </div>
        <button type="button" onClick={onBackToMap} className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-border/70 bg-background px-4 py-3 text-sm font-bold transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"><ArrowLeft className="h-4 w-4" aria-hidden="true" />Kembali ke Peta</button>
      </header>

      <JourneyProgress stage={stage} />

      <section className="rounded-3xl border border-border/70 bg-background/80 p-3 shadow-sm sm:p-5" aria-label="Dunia petualangan">
        <AdventureScene playerPosition={playerPosition} stage={stage} completedFinds={completedFinds} />
        <div className="mt-4 grid items-center gap-4 sm:grid-cols-[1fr_auto]">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-700"><MapPin className="h-4 w-4" aria-hidden="true" /></span>
            <div><p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Tujuanmu</p><p className="mt-1 text-sm font-bold leading-6">{objective}</p></div>
          </div>
          {canMove && (
            <div className="flex items-center justify-between gap-4 sm:justify-end">
              <div className="flex items-center gap-2" role="group" aria-label="Kontrol gerak penjelajah">
                <button type="button" onClick={() => movePlayer(-1)} aria-label="Berjalan ke kiri" className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-background text-foreground shadow-sm transition active:scale-95 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"><ChevronLeft className="h-7 w-7" aria-hidden="true" /></button>
                <button type="button" onClick={() => movePlayer(1)} aria-label="Berjalan ke kanan" className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-background text-foreground shadow-sm transition active:scale-95 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"><ChevronRight className="h-7 w-7" aria-hidden="true" /></button>
              </div>
              {nearTarget ? (
                <button type="button" onClick={interactAtStop} className="inline-flex min-h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 sm:flex-none"><MessageCircle className="h-5 w-5" aria-hidden="true" />{stage === "find-guide" ? "Ajak Mira bicara" : stage === "find-lab" ? "Aktifkan Modul Kubus" : "Buka Terminal Misi"}</button>
              ) : (
                <span className="hidden items-center gap-2 rounded-xl bg-muted/65 px-3 py-2 text-xs font-semibold text-muted-foreground md:inline-flex"><Keyboard className="h-4 w-4" aria-hidden="true" />Panah kiri/kanan atau A/D</span>
              )}
            </div>
          )}
        </div>
        {canMove && !nearTarget && <p className="mt-3 flex items-center gap-2 px-1 text-xs leading-5 text-muted-foreground md:hidden"><Keyboard className="h-4 w-4 shrink-0" aria-hidden="true" />Ketuk tombol panah untuk berjalan. Di laptop, gunakan panah atau tombol A/D.</p>}
      </section>

      {isDialogue && activeDialogue && (
        <section className="grid gap-4 rounded-3xl border border-cyan-700/15 bg-gradient-to-br from-cyan-500/[0.08] to-emerald-500/[0.06] p-4 sm:grid-cols-[5rem_1fr] sm:items-start sm:p-6" aria-label="Dialog petualangan" aria-live="polite">
          <div className="mx-auto h-20 w-16 sm:mx-0 sm:h-24 sm:w-[4.5rem]">{stage === "dialogue-intro" || stage === "dialogue-mission" ? <GuideSprite /> : <div className="flex h-full items-center justify-center rounded-2xl bg-amber-500/10 text-amber-800"><Cuboid className="h-8 w-8" aria-hidden="true" /></div>}</div>
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-cyan-800 dark:text-cyan-200">{activeDialogue.speaker}</p>
            <p className="mt-2 text-base font-semibold leading-7">{activeDialogue.text.replaceAll("{name}", playerName.trim() || "Penjelajah")}</p>
            <button type="button" onClick={advanceDialogue} className="mt-4 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">{stage === "dialogue-finale" && dialogueIndex === finaleLines.length - 1 ? "Lihat Hasil Petualangan" : "Lanjutkan"}<ArrowRight className="h-4 w-4" aria-hidden="true" /></button>
          </div>
        </section>
      )}

      {stage === "explore" && (
        <section className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,.65fr)]">
          <div className="overflow-hidden rounded-3xl border border-emerald-500/20 bg-background shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:px-5">
              <div><p className="text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Eksplorasi {explorationIndex + 1} dari 3</p><h3 className="mt-1 text-lg font-black">Modul Kubus 3D</h3></div>
              {selectedPart && <span className="rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-200">{selectedPart.type} dipilih</span>}
            </div>
            <div className="overflow-hidden border-y border-border/60 bg-gradient-to-br from-emerald-100/65 via-emerald-50/45 to-cyan-100/60 dark:from-emerald-950/20 dark:via-[#0d1917] dark:to-cyan-950/20">
              <Dino3DScene shape="cube" length={4} width={4} height={4} radius={2} showHiddenEdges={showHiddenEdges} onToggleHiddenEdges={() => setShowHiddenEdges((visible) => !visible)} onSelectPart={handlePartSelect} />
            </div>
            <p className="px-4 py-3 text-xs leading-5 text-muted-foreground">Geser model untuk memutarnya. Sentuh langsung bagian yang diminta.</p>
          </div>
          <aside className="rounded-3xl border border-border/70 bg-background/85 p-5 shadow-sm sm:p-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"><Target className="h-5 w-5" aria-hidden="true" /></div>
            <p className="mt-4 text-xs font-black uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Catatan temuan {explorationIndex + 1}/3</p>
            <h3 className="mt-2 text-xl font-black">{explorationTasks[explorationIndex].prompt}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Bagian terpilih: {selectedPart ? `${selectedPart.type} — ${selectedPart.name}` : "belum ada"}</p>
            {feedback && <div role="status" aria-live="polite" className={`mt-4 rounded-2xl p-4 text-sm leading-6 ${feedback.tone === "success" ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-200" : "bg-amber-500/10 text-amber-900 dark:text-amber-200"}`}>{feedback.message}</div>}
            {correctFeedback && <button type="button" onClick={advanceExploration} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-800">{explorationIndex === explorationTasks.length - 1 ? "Menuju Terminal Misi" : "Simpan Temuan"}<ArrowRight className="h-4 w-4" aria-hidden="true" /></button>}
          </aside>
        </section>
      )}

      {stage === "quiz" && currentQuiz && (
        <section className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(19rem,.7fr)]">
          {currentQuiz.kind === "part" ? (
            <div className="overflow-hidden rounded-3xl border border-cyan-700/20 bg-background shadow-sm">
              <div className="p-4 sm:p-5"><p className="text-xs font-bold uppercase tracking-wide text-cyan-800 dark:text-cyan-200">Misi terminal · Pertanyaan {quizIndex + 1}/3</p><h3 className="mt-2 text-lg font-black leading-7">{currentQuiz.prompt}</h3></div>
              <div className="overflow-hidden border-y border-border/60 bg-gradient-to-br from-emerald-100/65 via-emerald-50/45 to-cyan-100/60 dark:from-emerald-950/20 dark:via-[#0d1917] dark:to-cyan-950/20">
                <Dino3DScene shape="cube" length={4} width={4} height={4} radius={2} showHiddenEdges={showHiddenEdges} onToggleHiddenEdges={() => setShowHiddenEdges((visible) => !visible)} onSelectPart={handlePartSelect} />
              </div>
              <p className="p-4 text-xs text-muted-foreground">Jawab dengan menyentuh bagian kubus pada model, bukan dengan memilih opsi.</p>
            </div>
          ) : (
            <div className="rounded-3xl border border-cyan-700/20 bg-gradient-to-br from-cyan-500/[0.06] to-background p-5 shadow-sm sm:p-7">
              <p className="text-xs font-bold uppercase tracking-wide text-cyan-800 dark:text-cyan-200">Misi terminal · Pertanyaan {quizIndex + 1}/3</p>
              <h3 className="mt-3 text-xl font-black leading-8 sm:text-2xl">{currentQuiz.prompt}</h3>
              <div role="group" aria-label="Pilihan jawaban" className="mt-5 grid gap-3 sm:grid-cols-3">
                {currentQuiz.options.map((option) => <button key={option} type="button" disabled={correctFeedback} aria-pressed={selectedAnswer === option} onClick={() => { setSelectedAnswer(option); setFeedback(null) }} className={`min-h-14 rounded-2xl border px-4 py-3 text-left text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 disabled:cursor-default ${selectedAnswer === option ? "border-cyan-600 bg-cyan-500/10 text-cyan-900 ring-1 ring-cyan-600/30 dark:text-cyan-100" : "border-border/70 bg-background hover:bg-muted"}`}>{option}</button>)}
              </div>
              {!correctFeedback && <button type="button" disabled={!selectedAnswer} onClick={() => checkQuizAnswer(currentQuiz)} className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-cyan-800 px-4 py-3 text-sm font-bold text-white transition hover:bg-cyan-900 disabled:cursor-not-allowed disabled:opacity-45">Periksa jawaban<CheckCircle2 className="h-4 w-4" aria-hidden="true" /></button>}
            </div>
          )}
          <aside className="rounded-3xl border border-border/70 bg-background/85 p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200"><MessageCircle className="h-5 w-5" aria-hidden="true" /><p className="text-xs font-black uppercase tracking-wide">Pesan dari Mira</p></div>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">“Gunakan petunjuk yang kamu dapat saat berjalan dan mengamati model. Kita hanya perlu memastikan catatan utama.”</p>
            {selectedPart && currentQuiz.kind === "part" && <p className="mt-3 rounded-xl bg-muted/60 p-3 text-xs font-semibold">Pilihanmu: {selectedPart.type} — {selectedPart.name}</p>}
            {feedback && <div role="status" aria-live="polite" className={`mt-4 rounded-2xl p-4 text-sm leading-6 ${feedback.tone === "success" ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-200" : "bg-amber-500/10 text-amber-900 dark:text-amber-200"}`}>{feedback.message}</div>}
            {correctFeedback && <button type="button" onClick={advanceQuiz} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-800">{quizIndex === quizTasks.length - 1 ? "Tutup Misi" : "Lanjutkan Misi"}<ArrowRight className="h-4 w-4" aria-hidden="true" /></button>}
          </aside>
        </section>
      )}

      {stage === "result" && (
        <section className="grid items-start gap-5 rounded-3xl border border-emerald-500/20 bg-background/85 p-5 shadow-sm sm:p-7 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div>
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"><BadgeCheck className="h-7 w-7" aria-hidden="true" /></span>
            <p className="mt-4 text-xs font-black uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Catatan petualangan lengkap</p>
            <h3 className="mt-2 text-2xl font-black">Bagus, {playerName.trim() || "Penjelajah"}!</h3>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">Kamu berjalan menemui pemandu, menemukan bagian kubus pada model 3D, dan membantu memeriksa catatan misi.</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-emerald-500/10 p-4"><p className="text-xs font-semibold text-muted-foreground">Poin percobaan pertama</p><p className="mt-1 text-xl font-black tabular-nums">{totalFirstTry * 100} poin</p></div>
              <div className="rounded-2xl bg-cyan-500/10 p-4"><p className="text-xs font-semibold text-muted-foreground">Temuan eksplorasi</p><p className="mt-1 text-xl font-black tabular-nums">3/3</p></div>
              <div className="rounded-2xl bg-amber-500/10 p-4"><p className="text-xs font-semibold text-muted-foreground">Catatan terminal</p><p className="mt-1 text-xl font-black tabular-nums">3/3</p></div>
            </div>
            <p className="mt-4 rounded-2xl bg-muted/50 p-4 text-sm leading-6 text-muted-foreground">Kubus mempunyai 6 sisi persegi, 12 rusuk, dan 8 titik sudut. Skor tersimpan di papan peringkat lokal.</p>
          </div>
          <div className="flex flex-col gap-3 lg:pt-2">
            <button type="button" onClick={restartAdventure} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-border bg-background px-4 py-3 text-sm font-bold transition hover:bg-muted"><RotateCcw className="h-4 w-4" aria-hidden="true" />Jelajah lagi</button>
            <button type="button" onClick={onBackToMap} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-800"><ArrowLeft className="h-4 w-4" aria-hidden="true" />Kembali ke Peta</button>
            <p className="text-center text-xs leading-5 text-muted-foreground">{firstTryExploration}/3 temuan dan {firstTryQuiz}/3 catatan tepat pada percobaan pertama.</p>
          </div>
        </section>
      )}

      {stage !== "result" && !isDialogue && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-emerald-500/[0.04] px-4 py-3 text-xs leading-5 text-muted-foreground">
          <Keyboard className="h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-300" aria-hidden="true" />Gerakkan penjelajah dengan tombol panah/A-D atau kontrol sentuh. Di setiap stasiun, berhenti dekat penanda lalu pilih tombol interaksi.
        </div>
      )}
      {stage === "result" && <div className="sr-only" role="status" aria-live="polite">Petualangan selesai. {totalFirstTry} jawaban tepat pada percobaan pertama.</div>}
    </div>
  )
}
