import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react"

import {

  ArrowLeft, Hash, LoaderCircle, MessageCircle, Plus, Send, ShieldCheck,

  Trash2, Users, X, RefreshCw, Moon, Sun, AlertTriangle, ClipboardList, Check, XCircle,

} from "lucide-react"

import { supabase } from "../../../lib/supabase"

import NumeaCommunityFeed from "./NumeaCommunityFeed"

interface NumeaCommunityProps {

  onBack: () => void

  darkMode?: boolean

  onToggleTheme?: () => void

}

type CommunityRoom = {

  id: string

  name: string

  slug: string

  description: string

  topic: string

  created_at: string

}

type CommunityReport = {

  id: string

  message_id: string

  reporter_id: string

  reason: string

  status: "pending" | "reviewed" | "dismissed"

  created_at: string

  message: { body: string; sender_name: string; room_id: string; created_at: string } | null

}

type CommunityMessage = {

  id: string

  room_id: string

  sender_id: string

  sender_name: string

  body: string

  created_at: string

  updated_at: string

  is_hidden: boolean

}

const roomColors = [

  "from-[#F6C64F]/25 to-[#FF7411]/10",

  "from-[#E95C9E]/20 to-[#F6C64F]/10",

  "from-[#FF7411]/20 to-[#E95C9E]/10",

  "from-[#7C8CF8]/20 to-[#4DB6AC]/10",

]

const formatTime = (value: string) => new Intl.DateTimeFormat("id-ID", {

  hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short",

}).format(new Date(value))

const isExpertRole = (role: string | null | undefined) => {
  const normalized = (role ?? "").trim().toLowerCase()
  return normalized.includes("ahli") || normalized.includes("pakar") || normalized.includes("expert")
}


export default function NumeaCommunity({ onBack, darkMode = false, onToggleTheme }: NumeaCommunityProps) {

  const [userId, setUserId] = useState<string | null>(null)

  const [isAdmin, setIsAdmin] = useState(false)

  const [isApproved, setIsApproved] = useState(false)

  const [rooms, setRooms] = useState<CommunityRoom[]>([])

  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null)

  const [messages, setMessages] = useState<CommunityMessage[]>([])
  const [adminSenderIds, setAdminSenderIds] = useState<string[] | null>(null)
  const [expertSenderIds, setExpertSenderIds] = useState<string[] | null>(null)

  const [messageText, setMessageText] = useState("")

  const [roomName, setRoomName] = useState("")

  const [roomDescription, setRoomDescription] = useState("")

  const [showRoomForm, setShowRoomForm] = useState(false)

  const [loading, setLoading] = useState(true)

  const [sending, setSending] = useState(false)

  const [error, setError] = useState("")

  const [notice, setNotice] = useState("")

  const [search, setSearch] = useState("")

  const [showReports, setShowReports] = useState(false)

  const [reports, setReports] = useState<CommunityReport[]>([])

  const [reportsLoading, setReportsLoading] = useState(false)

  const [communityView, setCommunityView] = useState<"chat" | "feed">("chat")

  const selectedRoom = rooms.find((room) => room.id === selectedRoomId) ?? null

  const visibleRooms = useMemo(() => {

    const term = search.trim().toLowerCase()

    if (!term) return rooms

    return rooms.filter((room) => `${room.name} ${room.description} ${room.topic}`.toLowerCase().includes(term))

  }, [rooms, search])

  const loadRooms = useCallback(async () => {

    const { data, error: roomError } = await supabase

      .from("numea_community_rooms")

      .select("id,name,slug,description,topic,created_at")

      .eq("is_active", true)

      .order("sort_order", { ascending: true })

      .order("created_at", { ascending: true })

    if (roomError) throw roomError

    const rows = (data ?? []) as CommunityRoom[]

    setRooms(rows)

    setSelectedRoomId((current) => current && rows.some((room) => room.id === current) ? current : rows[0]?.id ?? null)

  }, [])

  const loadReports = useCallback(async () => {

    if (!isAdmin) return

    setReportsLoading(true)

    setError("")

    const { data, error: reportsError } = await supabase

      .from("numea_community_reports")

      .select("id,message_id,reporter_id,reason,status,created_at,message:numea_community_messages!numea_community_reports_message_id_fkey(body,sender_name,room_id,created_at)")

      .order("created_at", { ascending: false })

    setReportsLoading(false)

    if (reportsError) {

      setError(reportsError.message)

      return

    }

    setReports((data ?? []) as unknown as CommunityReport[])

  }, [isAdmin])

  const reviewReport = async (reportId: string, status: "reviewed" | "dismissed") => {

    if (!isAdmin || !userId) return

    const { error: reviewError } = await supabase

      .from("numea_community_reports")

      .update({ status, reviewed_by: userId, reviewed_at: new Date().toISOString() })

      .eq("id", reportId)

    if (reviewError) {

      setError(reviewError.message)

      return

    }

    setReports((current) => current.map((report) => report.id === reportId ? { ...report, status } : report))

    setNotice(status === "reviewed" ? "Laporan ditandai sudah ditinjau" : "Laporan ditutup tanpa tindakan")

  }

  const loadMessages = useCallback(async (roomId: string) => {

    const { data, error: messageError } = await supabase

      .from("numea_community_messages")

      .select("id,room_id,sender_id,sender_name,body,created_at,updated_at,is_hidden")

      .eq("room_id", roomId)

      .eq("is_hidden", false)

      .order("created_at", { ascending: true })

      .limit(150)

    if (messageError) throw messageError

    const rows = (data ?? []) as CommunityMessage[]
    setMessages(rows)

    const senderIds = [...new Set(rows.map((message) => message.sender_id))]
    if (senderIds.length === 0) {
      setAdminSenderIds([])
      setExpertSenderIds([])
      return
    }

    const [
      { data: adminRows, error: adminLookupError },
      { data: profileRows, error: profileLookupError },
    ] = await Promise.all([
      supabase.rpc("numea_get_admin_user_ids", { p_user_ids: senderIds }),
      supabase.from("numea_profiles").select("user_id,role").in("user_id", senderIds),
    ])

    setAdminSenderIds(
      adminLookupError ? null : (adminRows ?? []).map((row: { user_id: string }) => row.user_id),
    )
    setExpertSenderIds(
      profileLookupError
        ? null
        : (profileRows ?? [])
            .filter((row: { user_id: string; role: string | null }) => isExpertRole(row.role))
            .map((row: { user_id: string; role: string | null }) => row.user_id),
    )

  }, [])

  const initialize = useCallback(async () => {

    setLoading(true)

    setError("")

    try {

      const [{ data: authData, error: authError }, { data: adminData, error: adminError }] = await Promise.all([

        supabase.auth.getUser(),

        supabase.rpc("is_numea_admin"),

      ])

      if (authError) throw authError

      const currentUser = authData.user

      setUserId(currentUser?.id ?? null)

      const admin = !adminError && Boolean(adminData)

      setIsAdmin(admin)

      if (!currentUser) {

        setIsApproved(false)

        setError("Masuk dan pastikan keanggotaan NUMEA kamu sudah disetujui untuk membuka Community")

        return

      }

      if (admin) {

        setIsApproved(true)

      } else {

        const { data: membership, error: membershipError } = await supabase

          .from("numea_memberships").select("status").eq("user_id", currentUser.id).maybeSingle()

        if (membershipError) throw membershipError

        const approved = membership?.status === "approved"

        setIsApproved(approved)

        if (!approved) {

          setError("Community hanya tersedia bagi anggota NUMEA yang sudah disetujui")

          return

        }

      }

      await loadRooms()

    } catch (loadError) {

      setError(loadError instanceof Error ? loadError.message : "Community gagal dimuat")

    } finally {

      setLoading(false)

    }

  }, [loadRooms])

  useEffect(() => { void initialize() }, [initialize])

  useEffect(() => {

    if (!selectedRoomId || !isApproved) {

      setMessages([])

      return

    }

    let active = true

    void loadMessages(selectedRoomId).catch((loadError) => {

      if (active) setError(loadError instanceof Error ? loadError.message : "Pesan gagal dimuat")

    })

    const channel = supabase

      .channel(`numea-community-room-${selectedRoomId}`)

      .on("postgres_changes", {

        event: "*", schema: "public", table: "numea_community_messages",

        filter: `room_id=eq.${selectedRoomId}`,

      }, (payload) => {

        if (!active) return

        if (payload.eventType === "INSERT") {

          const incoming = payload.new as CommunityMessage

          if (!incoming.is_hidden) setMessages((current) => current.some((item) => item.id === incoming.id) ? current : [...current, incoming].slice(-150))

        } else if (payload.eventType === "UPDATE") {

          const updated = payload.new as CommunityMessage

          setMessages((current) => updated.is_hidden ? current.filter((item) => item.id !== updated.id) : current.map((item) => item.id === updated.id ? updated : item))

        } else if (payload.eventType === "DELETE") {

          const removed = payload.old as Partial<CommunityMessage>

          if (removed.id) setMessages((current) => current.filter((item) => item.id !== removed.id))

        }

      })

      .subscribe((status) => {

        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {

          setError("Koneksi realtime bermasalah. Coba muat ulang ruang diskusi")

        }

      })

    return () => {

      active = false

      void supabase.removeChannel(channel)

    }

  }, [selectedRoomId, isApproved, loadMessages])

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {

    event.preventDefault()

    const body = messageText.trim()

    if (!body || !selectedRoomId || !userId || !isApproved || sending) return

    setSending(true)

    setError("")

    setNotice("")

    const { error: sendError } = await supabase.from("numea_community_messages").insert({

      room_id: selectedRoomId,

      sender_id: userId,

      body,

    })

    setSending(false)

    if (sendError) {

      setError(sendError.message)

      return

    }

    setMessageText("")

  }

  const createRoom = async (event: FormEvent<HTMLFormElement>) => {

    event.preventDefault()

    if (!isAdmin || !roomName.trim()) return

    const name = roomName.trim()

    const slug = `${name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${crypto.randomUUID().slice(0, 6)}`

    const { error: createError } = await supabase.from("numea_community_rooms").insert({

      name, slug, description: roomDescription.trim(), topic: "Diskusi umum", created_by: userId,

    })

    if (createError) {

      setError(createError.message)

      return

    }

    setRoomName("")

    setRoomDescription("")

    setShowRoomForm(false)

    setNotice("Ruang diskusi berhasil dibuat")

    await loadRooms()

  }

  const removeMessage = async (messageId: string) => {

    if (!window.confirm("Hapus pesan ini? Tindakan ini tidak dapat dibatalkan")) return

    const { error: deleteError } = await supabase.from("numea_community_messages").delete().eq("id", messageId)

    if (deleteError) setError(deleteError.message)

    else setMessages((current) => current.filter((message) => message.id !== messageId))

  }

  const reportMessage = async (messageId: string) => {

    if (!userId) return

    const reason = window.prompt("Jelaskan alasan laporan pesan ini")?.trim()

    if (!reason) return

    const { error: reportError } = await supabase.from("numea_community_reports").insert({

      message_id: messageId, reporter_id: userId, reason,

    })

    if (reportError) setError(reportError.message)

    else setNotice("Laporan terkirim ke admin NUMEA")

  }

  return (

    <div className={communityView === "feed" ? "min-h-screen bg-background text-foreground" : "flex h-[100dvh] flex-col overflow-hidden bg-background text-foreground"}>

      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur-xl">

        <div className="mx-auto flex h-[68px] max-w-[1440px] items-center gap-3 px-4 sm:px-6">

          <button type="button" onClick={onBack} className="flex h-10 w-10 items-center justify-center rounded-full border border-border/60" aria-label="Kembali"><ArrowLeft className="h-4 w-4" /></button>

          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#F6C64F]/30 via-[#FF7411]/15 to-[#E95C9E]/20"><Users className="h-5 w-5 text-[#E95C9E]" /></div>

          <div className="min-w-0"><p className="text-sm font-bold">NUMEA Community</p><p className="text-xs text-muted-foreground">Belajar dan berdiskusi bersama</p></div>

          <nav className="ml-auto flex items-center rounded-full border border-border/60 bg-background/60 p-1" aria-label="Bagian Community"><button type="button" onClick={() => setCommunityView("feed")} className={`rounded-full px-3 py-2 text-xs font-semibold sm:px-4 ${communityView === "feed" ? "bg-[#E95C9E]/15 text-[#C43B80]" : "text-muted-foreground hover:text-foreground"}`}>Feed</button><button type="button" onClick={() => setCommunityView("chat")} className={`rounded-full px-3 py-2 text-xs font-semibold sm:px-4 ${communityView === "chat" ? "bg-[#E95C9E]/15 text-[#C43B80]" : "text-muted-foreground hover:text-foreground"}`}>Ruang Diskusi</button></nav>

          <div className="ml-auto flex items-center gap-2">

            <span className="hidden items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-600 sm:inline-flex"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Ruang realtime</span>

            {onToggleTheme && <button type="button" onClick={onToggleTheme} className="flex h-10 w-10 items-center justify-center rounded-full border border-border/60" aria-label={darkMode ? "Aktifkan mode terang" : "Aktifkan mode gelap"}>{darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</button>}

          </div>

        </div>

      </header>

      <main className={`mx-auto w-full max-w-[1440px] px-4 py-4 sm:px-6 lg:py-5 ${communityView === "feed" ? "min-h-0 overflow-visible" : "min-h-0 flex-1 flex flex-col overflow-hidden"}`}>

        {error && <div role="alert" className="mb-4 flex items-start gap-2 rounded-2xl border border-red-500/25 bg-red-500/5 p-4 text-sm text-red-600"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><span className="flex-1">{error}</span><button type="button" onClick={() => setError("")} aria-label="Tutup pesan"><X className="h-4 w-4" /></button></div>}

        {notice && <div role="status" className="mb-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-4 text-sm text-emerald-700">{notice}</div>}

        {loading ? (

          <div className="flex min-h-[55vh] items-center justify-center gap-3 text-sm text-muted-foreground"><LoaderCircle className="h-5 w-5 animate-spin" /> Memuat Community</div>

        ) : !isApproved ? (

          <div className="mx-auto mt-12 max-w-lg rounded-3xl border border-border/60 p-8 text-center"><ShieldCheck className="mx-auto h-10 w-10 text-[#E95C9E]" /><h1 className="mt-4 text-2xl font-bold">Community untuk anggota NUMEA</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">Setelah keanggotaan disetujui, kamu dapat bergabung ke ruang diskusi realtime</p><button type="button" onClick={onBack} className="mt-5 rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background">Kembali ke NUMEA</button></div>

        ) : communityView === "feed" ? (

          <NumeaCommunityFeed />

        ) : (

          <div className="grid h-full min-h-0 flex-1 grid-rows-[minmax(150px,32%)_minmax(0,1fr)] gap-4 overflow-hidden lg:grid-cols-[300px_minmax(0,1fr)] lg:grid-rows-1 lg:gap-5">

            <aside className="flex min-h-0 flex-col overflow-hidden rounded-3xl border border-border/60 bg-white/35 p-4 backdrop-blur-xl dark:bg-white/[0.03]">

              <div className="flex items-center justify-between gap-2"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#E95C9E]">Ruang bersama</p><h1 className="mt-1 text-xl font-bold">Diskusi</h1></div>{isAdmin && <button type="button" onClick={() => setShowRoomForm((value) => !value)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/60" title="Buat ruang"><Plus className="h-4 w-4" /></button>}</div>

              {isAdmin && <button type="button" onClick={() => { setShowReports(true); void loadReports() }} className={`mt-4 flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-sm font-semibold ${showReports ? "border-[#E95C9E]/40 bg-[#E95C9E]/10" : "border-border/60 hover:bg-background/60"}`}><span className="inline-flex items-center gap-2"><ClipboardList className="h-4 w-4" /> Laporan pesan</span><span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-700">{reports.filter((report) => report.status === "pending").length}</span></button>}

              <div className="mt-4"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari ruang diskusi" className="w-full rounded-xl border border-border/60 bg-background/70 px-3 py-2.5 text-sm outline-none focus:border-[#E95C9E]/50" /></div>

              {showRoomForm && isAdmin && <form onSubmit={createRoom} className="mt-4 space-y-2 rounded-2xl border border-border/60 p-3"><input required value={roomName} onChange={(event) => setRoomName(event.target.value)} placeholder="Nama ruang" className="w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm" /><textarea value={roomDescription} onChange={(event) => setRoomDescription(event.target.value)} placeholder="Deskripsi ruang" rows={2} className="w-full resize-y rounded-xl border border-border/60 bg-background px-3 py-2 text-sm" /><div className="flex gap-2"><button type="submit" className="rounded-full bg-foreground px-3 py-2 text-xs font-semibold text-background">Buat ruang</button><button type="button" onClick={() => setShowRoomForm(false)} className="rounded-full border border-border/60 px-3 py-2 text-xs">Batal</button></div></form>}

              <div className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pr-1">

                {visibleRooms.map((room, index) => <button type="button" key={room.id} onClick={() => setSelectedRoomId(room.id)} className={`w-full rounded-2xl border p-3 text-left transition-colors ${selectedRoomId === room.id ? "border-[#E95C9E]/35 bg-[#E95C9E]/10" : "border-transparent hover:border-border/60 hover:bg-background/60"}`}><div className="flex items-start gap-3"><div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${roomColors[index % roomColors.length]}`}><Hash className="h-4 w-4" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{room.name}</p><p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{room.description || room.topic}</p></div></div></button>)}

                {!visibleRooms.length && <p className="rounded-xl border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">Belum ada ruang yang cocok</p>}

              </div>

              <div className="shrink-0 pt-4"><div className="rounded-2xl bg-gradient-to-br from-[#F6C64F]/15 via-[#FF7411]/5 to-[#E95C9E]/10 p-4"><div className="flex items-center gap-2 text-sm font-semibold"><Users className="h-4 w-4 text-[#E95C9E]" /> Komunitas terbuka</div><p className="mt-2 text-xs leading-5 text-muted-foreground">Semua anggota NUMEA yang disetujui dapat bergabung. Tidak ada chat pribadi di Community</p></div></div>

            </aside>

            <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border border-border/60 bg-white/35 backdrop-blur-xl dark:bg-white/[0.03]">

              {showReports && isAdmin ? <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">

                <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#E95C9E]">Moderasi</p><h2 className="mt-1 text-xl font-bold">Laporan pesan</h2><p className="mt-1 text-sm text-muted-foreground">Tinjau laporan anggota dan tandai hasil penanganannya</p></div><button type="button" onClick={() => { setShowReports(false); void loadMessages(selectedRoomId ?? "") }} className="rounded-full border border-border/60 px-3 py-2 text-xs font-semibold">Kembali ke diskusi</button></div>

                {reportsLoading ? <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="h-4 w-4 animate-spin" /> Memuat laporan</div> : reports.length === 0 ? <div className="rounded-2xl border border-dashed border-border/60 p-8 text-center"><ClipboardList className="mx-auto h-8 w-8 text-muted-foreground" /><p className="mt-3 font-semibold">Belum ada laporan</p><p className="mt-1 text-sm text-muted-foreground">Laporan pesan anggota akan muncul di sini</p></div> : <div className="space-y-3">{reports.map((report) => <article key={report.id} className="rounded-2xl border border-border/60 bg-background/60 p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-sm font-semibold">Laporan pesan · {report.message?.sender_name || "Anggota NUMEA"}</p><p className="mt-1 text-xs text-muted-foreground">{formatTime(report.created_at)} · ID pesan {report.message_id.slice(0, 8)}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${report.status === "pending" ? "bg-amber-500/15 text-amber-700" : report.status === "reviewed" ? "bg-emerald-500/15 text-emerald-700" : "bg-muted text-muted-foreground"}`}>{report.status === "pending" ? "Menunggu" : report.status === "reviewed" ? "Ditinjau" : "Ditutup"}</span></div><div className="mt-3 rounded-xl bg-muted/50 p-3"><p className="text-xs font-semibold text-muted-foreground">Pesan yang dilaporkan</p><p className="mt-1 whitespace-pre-wrap break-words text-sm">{report.message?.body || "Pesan sudah dihapus atau tidak tersedia"}</p></div><p className="mt-3 text-sm"><span className="font-semibold">Alasan laporan: </span>{report.reason}</p>{report.status === "pending" && <div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => void reviewReport(report.id, "reviewed")} className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-3 py-2 text-xs font-semibold text-background"><Check className="h-3.5 w-3.5" /> Tandai ditinjau</button><button type="button" onClick={() => void reviewReport(report.id, "dismissed")} className="inline-flex items-center gap-1.5 rounded-full border border-border/60 px-3 py-2 text-xs font-semibold"><XCircle className="h-3.5 w-3.5" /> Tutup laporan</button><button type="button" onClick={() => { const room = rooms.find((item) => item.id === report.message?.room_id); if (room) { setSelectedRoomId(room.id); setShowReports(false) } }} disabled={!report.message?.room_id} className="rounded-full border border-border/60 px-3 py-2 text-xs font-semibold disabled:opacity-50">Buka ruang terkait</button></div>}</article>)}</div>}

              </div> : selectedRoom ? <>

                <div className="flex items-center gap-3 border-b border-border/60 px-4 py-4 sm:px-6"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E95C9E]/10"><Hash className="h-4 w-4 text-[#E95C9E]" /></div><div className="min-w-0 flex-1"><h2 className="truncate font-bold">{selectedRoom.name}</h2><p className="text-xs text-muted-foreground">{selectedRoom.description || "Ruang diskusi anggota NUMEA"}</p></div><button type="button" onClick={() => selectedRoomId && void loadMessages(selectedRoomId).catch((loadError) => setError(loadError.message))} className="flex h-9 w-9 items-center justify-center rounded-full border border-border/60" title="Muat ulang pesan"><RefreshCw className="h-4 w-4" /></button></div>

                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">

                  {messages.map((message) => {

                    const own = message.sender_id === userId

                    return <article key={message.id} className={`group flex gap-3 ${own ? "flex-row-reverse" : ""}`}><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#F6C64F]/70 via-[#FF7411]/65 to-[#E95C9E]/65 text-xs font-bold text-white">{(message.sender_name || "N").trim().charAt(0).toUpperCase()}</div><div className={`max-w-[min(85%,680px)] min-w-0 ${own ? "text-right" : ""}`}><div className={`mb-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground ${own ? "justify-end" : ""}`}><span className="font-semibold text-foreground">{own ? "Kamu" : message.sender_name || "Anggota NUMEA"}</span>{(adminSenderIds?.includes(message.sender_id) || (own && isAdmin)) ? <span className="inline-flex items-center gap-1 rounded-full border border-violet-500/25 bg-violet-500/10 px-2 py-0.5 text-[10px] font-bold text-violet-700 dark:text-violet-300"><ShieldCheck className="h-3 w-3" /> Admin NUMEA</span> : expertSenderIds?.includes(message.sender_id) ? <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300"><ShieldCheck className="h-3 w-3" /> Ahli</span> : adminSenderIds !== null && expertSenderIds !== null ? <span className="rounded-full border border-border/60 bg-muted/50 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">Anggota</span> : null}<time dateTime={message.created_at}>{formatTime(message.created_at)}</time></div><div className={`inline-block whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-left text-sm leading-6 ${own ? "rounded-tr-md bg-[#E95C9E]/15" : "rounded-tl-md bg-background/80"}`}>{message.body}</div><div className={`mt-1 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100 ${own ? "justify-end" : ""}`}><button type="button" onClick={() => void reportMessage(message.id)} className="text-[10px] text-muted-foreground hover:text-foreground">Laporkan</button>{(own || isAdmin) && <button type="button" onClick={() => void removeMessage(message.id)} className="inline-flex items-center gap-1 text-[10px] text-red-600"><Trash2 className="h-3 w-3" /> Hapus</button>}</div></div></article>

                  })}

                  {!messages.length && <div className="flex h-full min-h-[250px] flex-col items-center justify-center text-center"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E95C9E]/10"><MessageCircle className="h-6 w-6 text-[#E95C9E]" /></div><h3 className="mt-4 font-semibold">Mulai percakapan</h3><p className="mt-1 max-w-sm text-sm text-muted-foreground">Jadilah anggota pertama yang berbagi ide di ruang ini</p></div>}

                </div>

                <form onSubmit={sendMessage} className="border-t border-border/60 p-3 sm:p-4"><div className="flex items-end gap-2 rounded-2xl border border-border/60 bg-background/70 p-2"><textarea value={messageText} onChange={(event) => setMessageText(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit() } }} rows={1} maxLength={4000} placeholder={`Tulis pesan di #${selectedRoom.name}…`} className="max-h-36 min-h-10 flex-1 resize-y bg-transparent px-2 py-2 text-sm outline-none" /><button type="submit" disabled={!messageText.trim() || sending} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#FF7411] to-[#E95C9E] text-white disabled:cursor-not-allowed disabled:opacity-50" aria-label="Kirim pesan">{sending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</button></div><p className="mt-2 px-1 text-[10px] text-muted-foreground">Tekan Enter untuk mengirim · Shift + Enter untuk baris baru · Pesan terlihat oleh anggota yang disetujui</p></form>

              </> : <div className="flex flex-1 flex-col items-center justify-center p-8 text-center"><MessageCircle className="h-10 w-10 text-muted-foreground" /><h2 className="mt-4 text-xl font-bold">Belum ada ruang diskusi</h2><p className="mt-2 text-sm text-muted-foreground">Admin NUMEA dapat membuat ruang diskusi pertama</p></div>}

            </section>

          </div>

        )}

      </main>

    </div>

  )

}
