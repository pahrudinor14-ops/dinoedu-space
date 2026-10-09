import { useCallback, useEffect, useState, type FormEvent } from "react"

import {

  Bookmark, Check, Clock3, ImagePlus, LoaderCircle, MessageCircle, MoreHorizontal,

  Send, ThumbsUp, Trash2, X, XCircle, Flag, FileText, RefreshCw, ClipboardList, ShieldCheck,

} from "lucide-react"

import { supabase } from "../../../lib/supabase"

type PostStatus = "draft" | "pending_review" | "published" | "rejected" | "archived"

type FeedPost = {

  id: string

  author_id: string

  author_name: string

  title: string

  body: string

  image_path: string | null

  status: PostStatus

  review_note: string | null

  created_at: string

  updated_at: string

  published_at: string | null

  image_url?: string | null

  like_count?: number

  bookmark_count?: number

  comment_count?: number

}

type FeedComment = {

  id: string

  post_id: string

  author_id: string

  author_name: string

  body: string

  created_at: string

}

type FeedReport = { id: string; post_id: string; reporter_id: string; reason: string; status: "pending" | "reviewed" | "dismissed"; created_at: string; post: { title: string; body: string; author_name: string } | null }

const dateLabel = (value: string) => new Intl.DateTimeFormat("id-ID", {

  dateStyle: "medium", timeStyle: "short",

}).format(new Date(value))

const isExpertRole = (role: string | null | undefined) => {
  const normalized = (role ?? "").trim().toLowerCase()
  return normalized.includes("ahli") || normalized.includes("pakar") || normalized.includes("expert")
}


const statusLabel: Record<PostStatus, string> = {

  draft: "Draf",

  pending_review: "Menunggu tinjauan",

  published: "Terbit",

  rejected: "Perlu perbaikan",

  archived: "Diarsipkan",

}

export default function NumeaCommunityFeed() {

  const [userId, setUserId] = useState<string | null>(null)

  const [isAdmin, setIsAdmin] = useState(false)

  // null berarti daftar admin penulis belum berhasil dibaca dari Supabase.

  const [adminAuthorIds, setAdminAuthorIds] = useState<string[] | null>(null)
  const [expertAuthorIds, setExpertAuthorIds] = useState<string[] | null>(null)

  const [isApproved, setIsApproved] = useState(false)

  const [posts, setPosts] = useState<FeedPost[]>([])

  const [loading, setLoading] = useState(true)

  const [saving, setSaving] = useState(false)

  const [error, setError] = useState("")

  const [notice, setNotice] = useState("")

  const [showComposer, setShowComposer] = useState(false)

  const [showMine, setShowMine] = useState(false)

  const [title, setTitle] = useState("")

  const [body, setBody] = useState("")

  const [imageFile, setImageFile] = useState<File | null>(null)

  const [imagePreview, setImagePreview] = useState("")

  const [editingId, setEditingId] = useState<string | null>(null)

  const [commentsByPost, setCommentsByPost] = useState<Record<string, FeedComment[]>>({})

  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({})

  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({})

  const [likedPostIds, setLikedPostIds] = useState<string[]>([])

  const [bookmarkedPostIds, setBookmarkedPostIds] = useState<string[]>([])

  const [busyAction, setBusyAction] = useState<string | null>(null)

  const [reportingPostId, setReportingPostId] = useState<string | null>(null)

  const [reportReason, setReportReason] = useState("")

  const [showReports, setShowReports] = useState(false)

  const [feedReports, setFeedReports] = useState<FeedReport[]>([])

  const loadPosts = useCallback(async (currentUserId: string | null, admin: boolean) => {

    let query = supabase.from("numea_community_posts")

      .select("id,author_id,author_name,title,body,image_path,status,review_note,created_at,updated_at,published_at")

      .order("created_at", { ascending: false })

      .limit(100)

    if (admin) {

      // Admin dapat melihat antrean moderasi dan postingan terbit

    } else if (currentUserId) {

      query = query.or(`status.eq.published,author_id.eq.${currentUserId}`)

    } else {

      query = query.eq("status", "published")

    }

    const { data, error: loadError } = await query

    if (loadError) throw loadError

    const rows = (data ?? []) as FeedPost[]

    // Periksa peran penulis melalui RPC agar anggota tidak perlu membaca tabel admin langsung.

    const authorIds = [...new Set(rows.map((post) => post.author_id))]

    if (authorIds.length > 0) {
      const [
        { data: adminAuthors, error: adminAuthorsError },
        { data: authorProfiles, error: profilesError },
      ] = await Promise.all([
        supabase.rpc("numea_get_admin_user_ids", { p_user_ids: authorIds }),
        supabase.from("numea_profiles").select("user_id,role").in("user_id", authorIds),
      ])

      setAdminAuthorIds(
        adminAuthorsError ? null : (adminAuthors ?? []).map((row: { user_id: string }) => row.user_id),
      )
      setExpertAuthorIds(
        profilesError
          ? null
          : (authorProfiles ?? [])
              .filter((row: { user_id: string; role: string | null }) => isExpertRole(row.role))
              .map((row: { user_id: string; role: string | null }) => row.user_id),
      )
    } else {
      setAdminAuthorIds([])
      setExpertAuthorIds([])
    }

    const hydrated = await Promise.all(rows.map(async (post) => {

      let image_url: string | null = null

      if (post.image_path) {

        const { data: signed } = await supabase.storage

          .from("numea-community-post-images")

          .createSignedUrl(post.image_path, 60 * 60)

        image_url = signed?.signedUrl ?? null

      }

      return { ...post, image_url }

    }))

    setPosts(hydrated)

    if (currentUserId && rows.length) {

      const ids = rows.map((post) => post.id)

      const [likesResult, bookmarksResult] = await Promise.all([

        supabase.from("numea_community_post_reactions").select("post_id").eq("user_id", currentUserId).in("post_id", ids),

        supabase.from("numea_community_post_bookmarks").select("post_id").eq("user_id", currentUserId).in("post_id", ids),

      ])

      if (!likesResult.error) setLikedPostIds((likesResult.data ?? []).map((item) => item.post_id))

      if (!bookmarksResult.error) setBookmarkedPostIds((bookmarksResult.data ?? []).map((item) => item.post_id))

    } else {

      setLikedPostIds([])

      setBookmarkedPostIds([])

    }

    if (rows.length) {

      const postIds = rows.map((post) => post.id)

      const [likesCount, bookmarksCount, commentsCount] = await Promise.all([

        supabase.from("numea_community_post_reactions").select("post_id").in("post_id", postIds),

        supabase.from("numea_community_post_bookmarks").select("post_id").in("post_id", postIds),

        supabase.from("numea_community_post_comments").select("post_id").eq("is_hidden", false).in("post_id", postIds),

      ])

      const countByPost = (items: { post_id: string }[] | null) => (items ?? []).reduce<Record<string, number>>((acc, item) => {

        acc[item.post_id] = (acc[item.post_id] ?? 0) + 1

        return acc

      }, {})

      const likes = countByPost(likesCount.data as { post_id: string }[] | null)

      const bookmarks = countByPost(bookmarksCount.data as { post_id: string }[] | null)

      const comments = countByPost(commentsCount.data as { post_id: string }[] | null)

      setPosts((current) => current.map((post) => ({

        ...post,

        like_count: likes[post.id] ?? 0,

        bookmark_count: bookmarks[post.id] ?? 0,

        comment_count: comments[post.id] ?? 0,

      })))

    } else {

      setPosts((current) => current.map((post) => ({ ...post, like_count: 0, bookmark_count: 0, comment_count: 0 })))

    }

    if (admin) {

      const { data: reportRows, error: reportError } = await supabase

        .from("numea_community_post_reports")

        .select("id,post_id,reporter_id,reason,status,created_at,post:numea_community_posts!numea_community_post_reports_post_id_fkey(title,body,author_name)")

        .order("created_at", { ascending: false })

        .limit(100)

      if (reportError) throw reportError

      setFeedReports((reportRows ?? []) as unknown as FeedReport[])

    }

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

      const admin = !adminError && Boolean(adminData)

      setUserId(currentUser?.id ?? null)

      setIsAdmin(admin)

      if (!currentUser) {

        setIsApproved(false)

        await loadPosts(null, false)

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

          await loadPosts(null, false)

          setNotice("Kamu dapat membaca postingan terbit. Kontribusi, komentar, suka, dan simpan tersedia untuk anggota NUMEA yang disetujui")

          return

        }

      }

      await loadPosts(currentUser.id, admin)

    } catch (loadError) {

      setError(loadError instanceof Error ? loadError.message : "Feed Community gagal dimuat")

    } finally {

      setLoading(false)

    }

  }, [loadPosts])

  useEffect(() => { void initialize() }, [initialize])

  useEffect(() => {

    if (!imageFile) {

      setImagePreview("")

      return

    }

    const url = URL.createObjectURL(imageFile)

    setImagePreview(url)

    return () => URL.revokeObjectURL(url)

  }, [imageFile])

  const resetComposer = () => {

    setShowComposer(false)

    setEditingId(null)

    setTitle("")

    setBody("")

    setImageFile(null)

    setImagePreview("")

  }

  const startEdit = (post: FeedPost) => {

    setEditingId(post.id)

    setTitle(post.title)

    setBody(post.body)

    setImageFile(null)

    setImagePreview(post.image_url ?? "")

    setShowComposer(true)

  }

  const savePost = async (submitForReview: boolean, event?: FormEvent<HTMLFormElement>) => {

    event?.preventDefault()

    if (!userId || (!isApproved && !isAdmin)) {

      setError("Hanya anggota NUMEA yang disetujui yang dapat mengirim kontribusi")

      return

    }

    if (title.trim().length < 5 || body.trim().length < 10) {

      setError("Judul minimal 5 karakter dan isi minimal 10 karakter")

      return

    }

    setSaving(true)

    setError("")

    setNotice("")

    try {

      let imagePath: string | null = null

      const existing = editingId ? posts.find((post) => post.id === editingId) : null

      imagePath = existing?.image_path ?? null

      if (imageFile) {

        const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"]

        if (!allowed.includes(imageFile.type)) throw new Error("Format gambar yang didukung: JPG, PNG, WEBP, atau GIF")

        if (imageFile.size > 5 * 1024 * 1024) throw new Error("Ukuran gambar maksimal 5 MB")

        const extension = imageFile.name.split(".").pop()?.toLowerCase() || "jpg"

        const path = `${userId}/${crypto.randomUUID()}.${extension}`

        const { error: uploadError } = await supabase.storage.from("numea-community-post-images")

          .upload(path, imageFile, { contentType: imageFile.type, upsert: false })

        if (uploadError) throw uploadError

        imagePath = path

      }

      if (editingId) {

        const { error: updateError } = await supabase.from("numea_community_posts").update({

          title: title.trim(), body: body.trim(), image_path: imagePath,

          status: submitForReview ? "pending_review" : "draft",

          review_note: null,

        }).eq("id", editingId)

        if (updateError) throw updateError

        setNotice(submitForReview ? "Perubahan dikirim untuk ditinjau admin" : "Draf berhasil disimpan")

      } else {

        const { error: insertError } = await supabase.from("numea_community_posts").insert({

          author_id: userId,

          title: title.trim(),

          body: body.trim(),

          image_path: imagePath,

          status: submitForReview ? "pending_review" : "draft",

        })

        if (insertError) throw insertError

        setNotice(submitForReview ? "Postingan dikirim untuk ditinjau admin" : "Draf berhasil disimpan")

      }

      resetComposer()

      await loadPosts(userId, isAdmin)

    } catch (saveError) {

      setError(saveError instanceof Error ? saveError.message : "Postingan gagal disimpan")

    } finally {

      setSaving(false)

    }

  }

  const reviewPost = async (postId: string, status: "published" | "rejected" | "archived") => {

    if (!isAdmin || !userId) return

    const review_note = status === "rejected" ? window.prompt("Catatan perbaikan untuk penulis")?.trim() : null

    if (status === "rejected" && !review_note) return

    setBusyAction(postId)

    const { error: reviewError } = await supabase.from("numea_community_posts").update({

      status,

      review_note,

      reviewed_by: userId,

      reviewed_at: new Date().toISOString(),

      published_at: status === "published" ? new Date().toISOString() : null,

    }).eq("id", postId)

    setBusyAction(null)

    if (reviewError) {

      setError(reviewError.message)

      return

    }

    setNotice(status === "published" ? "Postingan berhasil diterbitkan" : status === "rejected" ? "Postingan dikembalikan kepada penulis" : "Postingan diarsipkan")

    await loadPosts(userId, isAdmin)

  }

  const deletePost = async (post: FeedPost) => {

    if (post.author_id !== userId && !isAdmin) return

    if (!window.confirm("Hapus postingan ini? Komentar terkait juga akan dihapus")) return

    const { error: deleteError } = await supabase.from("numea_community_posts").delete().eq("id", post.id)

    if (deleteError) setError(deleteError.message)

    else {

      setPosts((current) => current.filter((item) => item.id !== post.id))

      setNotice("Postingan dihapus")

    }

  }

  const toggleLike = async (postId: string) => {

    if (!userId || (!isApproved && !isAdmin)) {

      setNotice("Masuk sebagai anggota NUMEA yang disetujui untuk memberi suka")

      return

    }

    const liked = likedPostIds.includes(postId)

    const result = liked

      ? await supabase.from("numea_community_post_reactions").delete().eq("post_id", postId).eq("user_id", userId)

      : await supabase.from("numea_community_post_reactions").insert({ post_id: postId, user_id: userId })

    if (result.error) setError(result.error.message)

    else {

      setLikedPostIds((current) => liked ? current.filter((id) => id !== postId) : [...current, postId])

      setPosts((current) => current.map((post) => post.id === postId ? { ...post, like_count: Math.max(0, (post.like_count ?? 0) + (liked ? -1 : 1)) } : post))

    }

  }

  const toggleBookmark = async (postId: string) => {

    if (!userId || (!isApproved && !isAdmin)) {

      setNotice("Masuk sebagai anggota NUMEA yang disetujui untuk menyimpan postingan")

      return

    }

    const saved = bookmarkedPostIds.includes(postId)

    const result = saved

      ? await supabase.from("numea_community_post_bookmarks").delete().eq("post_id", postId).eq("user_id", userId)

      : await supabase.from("numea_community_post_bookmarks").insert({ post_id: postId, user_id: userId })

    if (result.error) setError(result.error.message)

    else setBookmarkedPostIds((current) => saved ? current.filter((id) => id !== postId) : [...current, postId])

  }

  const loadComments = async (postId: string) => {

    const { data, error: commentError } = await supabase.from("numea_community_post_comments")

      .select("id,post_id,author_id,author_name,body,created_at").eq("post_id", postId)

      .eq("is_hidden", false).order("created_at", { ascending: true }).limit(100)

    if (commentError) {

      setError(commentError.message)

      return

    }

    setCommentsByPost((current) => ({ ...current, [postId]: (data ?? []) as FeedComment[] }))

  }

  const toggleComments = async (postId: string) => {

    const willExpand = !expandedComments[postId]

    setExpandedComments((current) => ({ ...current, [postId]: willExpand }))

    if (willExpand && !commentsByPost[postId]) await loadComments(postId)

  }

  const sendComment = async (event: FormEvent<HTMLFormElement>, postId: string) => {

    event.preventDefault()

    const comment = (commentInputs[postId] ?? "").trim()

    if (!comment || !userId || (!isApproved && !isAdmin)) {

      setNotice("Hanya anggota NUMEA yang disetujui yang dapat berkomentar")

      return

    }

    setBusyAction(`comment-${postId}`)

    const { error: commentError } = await supabase.from("numea_community_post_comments").insert({

      post_id: postId, author_id: userId, body: comment,

    })

    setBusyAction(null)

    if (commentError) setError(commentError.message)

    else {

      setCommentInputs((current) => ({ ...current, [postId]: "" }))

      setPosts((current) => current.map((post) => post.id === postId ? { ...post, comment_count: (post.comment_count ?? 0) + 1 } : post))

      await loadComments(postId)

    }

  }

  const reportPost = async (postId: string) => {

    if (!userId || (!isApproved && !isAdmin)) {

      setNotice("Masuk sebagai anggota NUMEA yang disetujui untuk melaporkan postingan")

      return

    }

    const reason = reportReason.trim() || window.prompt("Jelaskan alasan laporan postingan ini")?.trim() || ""

    if (reason.length < 3) return

    const { error: reportError } = await supabase.from("numea_community_post_reports").insert({

      post_id: postId, reporter_id: userId, reason,

    })

    if (reportError) setError(reportError.message)

    else {

      setNotice("Laporan postingan terkirim ke admin")

      setReportingPostId(null)

      setReportReason("")

    }

  }

  const reviewFeedReport = async (reportId: string, status: "reviewed" | "dismissed") => {

    if (!isAdmin || !userId) return

    const { error: reviewError } = await supabase.from("numea_community_post_reports").update({

      status, reviewed_by: userId, reviewed_at: new Date().toISOString(),

    }).eq("id", reportId)

    if (reviewError) setError(reviewError.message)

    else {

      setFeedReports((current) => current.map((report) => report.id === reportId ? { ...report, status } : report))

      setNotice(status === "reviewed" ? "Laporan postingan ditandai sudah ditinjau" : "Laporan postingan ditutup tanpa tindakan")

    }

  }

  const visiblePosts = posts.filter((post) => {

    if (showMine) return post.author_id === userId

    if (isAdmin) return true

    return post.status === "published" || post.author_id === userId

  })

  return (

    <div className="min-w-0 w-full h-[calc(100dvh-6rem)] max-h-[calc(100dvh-6rem)] overflow-y-auto overflow-x-hidden overscroll-y-contain touch-pan-y pb-8 pr-1 [scrollbar-gutter:stable]">

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">

        <div>

          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#E95C9E]">Berbagi & bertumbuh</p>

          <h2 className="mt-1 text-2xl font-bold">Feed Komunitas</h2>

          <p className="mt-1 text-sm text-muted-foreground">Bagikan pengalaman dan praktik baik pendidikan kepada komunitas NUMEA</p>

        </div>

        <div className="flex flex-wrap gap-2">

          {userId && <button type="button" onClick={() => setShowMine((value) => !value)} className={`rounded-full border px-4 py-2 text-sm font-semibold ${showMine ? "border-[#E95C9E]/40 bg-[#E95C9E]/10" : "border-border/60"}`}>{showMine ? "Semua postingan" : "Postingan saya"}</button>}

          {isAdmin && <button type="button" onClick={() => setShowReports((value) => !value)} className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold ${showReports ? "border-[#E95C9E]/40 bg-[#E95C9E]/10" : "border-border/60"}`}><ClipboardList className="h-4 w-4" /> Laporan <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs">{feedReports.filter((report) => report.status === "pending").length}</span></button>}

          {(isApproved || isAdmin) && <button type="button" onClick={() => { setShowComposer((value) => !value); setError(""); }} className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#FF7411] to-[#E95C9E] px-4 py-2 text-sm font-semibold text-white"><FileText className="h-4 w-4" /> Tulis postingan</button>}

          <button type="button" onClick={() => void initialize()} className="flex h-10 w-10 items-center justify-center rounded-full border border-border/60" aria-label="Muat ulang feed"><RefreshCw className="h-4 w-4" /></button>

        </div>

      </div>

      {notice && <div role="status" className="mb-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-3 text-sm text-emerald-700">{notice}</div>}

      {error && <div role="alert" className="mb-4 flex items-start gap-2 rounded-2xl border border-red-500/25 bg-red-500/5 p-3 text-sm text-red-600"><XCircle className="mt-0.5 h-4 w-4 shrink-0" /><span className="flex-1">{error}</span><button type="button" onClick={() => setError("")} aria-label="Tutup pesan"><X className="h-4 w-4" /></button></div>}

      {showReports && isAdmin && <section className="mb-5 rounded-3xl border border-border/60 bg-white/45 p-4 backdrop-blur-xl dark:bg-white/[0.03] sm:p-6">

        <div className="mb-4 flex items-center justify-between gap-3"><div><h3 className="font-bold">Laporan postingan</h3><p className="mt-1 text-xs text-muted-foreground">Tinjau laporan anggota dan catat tindak lanjutnya</p></div><button type="button" onClick={() => setShowReports(false)} className="rounded-full border border-border/60 p-2" aria-label="Tutup laporan"><X className="h-4 w-4" /></button></div>

        {feedReports.length === 0 ? <p className="rounded-2xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">Belum ada laporan postingan</p> : <div className="space-y-3">{feedReports.map((report) => <article key={report.id} className="rounded-2xl border border-border/60 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold">{report.post?.title ?? "Postingan tidak tersedia"}</p><span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs">{report.status === "pending" ? "Menunggu" : report.status === "reviewed" ? "Ditinjau" : "Ditutup"}</span></div><p className="mt-2 text-sm">{report.reason}</p><p className="mt-1 text-xs text-muted-foreground">Dilaporkan {dateLabel(report.created_at)} · Penulis: {report.post?.author_name ?? "Tidak diketahui"}</p>{report.status === "pending" && <div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => void reviewFeedReport(report.id, "reviewed")} className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-2 text-xs font-semibold text-white"><Check className="h-3.5 w-3.5" /> Tandai ditinjau</button><button type="button" onClick={() => void reviewFeedReport(report.id, "dismissed")} className="rounded-full border border-border/60 px-3 py-2 text-xs font-semibold">Tutup tanpa tindakan</button></div>}</article>)}</div>}

      </section>}

      {showComposer && (isApproved || isAdmin) && <form onSubmit={(event) => void savePost(true, event)} className="mb-5 max-h-[calc(100dvh-11rem)] overflow-y-auto overscroll-contain touch-pan-y rounded-3xl border border-[#E95C9E]/25 bg-white/45 p-4 shadow-sm backdrop-blur-xl [scrollbar-gutter:stable] dark:bg-white/[0.03] sm:max-h-[calc(100dvh-12rem)] sm:p-6">

        <div className="mb-4 flex items-center justify-between gap-3"><div><h3 className="font-bold">{editingId ? "Edit postingan" : "Tulis postingan"}</h3><p className="mt-1 text-xs text-muted-foreground">Postingan baru ditinjau admin sebelum tampil untuk publik</p></div><button type="button" onClick={resetComposer} className="flex h-9 w-9 items-center justify-center rounded-full border border-border/60" aria-label="Tutup editor"><X className="h-4 w-4" /></button></div>

        <div className="space-y-3">

          <input value={title} onChange={(event) => setTitle(event.target.value)} required minLength={5} maxLength={180} placeholder="Judul postingan" className="w-full rounded-2xl border border-border/60 bg-background/80 px-4 py-3 text-sm outline-none focus:border-[#E95C9E]/50" />

          <textarea value={body} onChange={(event) => setBody(event.target.value)} required minLength={10} maxLength={12000} rows={5} placeholder="Bagikan pengalaman, ide, atau praktik baik pendidikan..." className="w-full resize-y touch-pan-y rounded-2xl border border-border/60 bg-background/80 px-4 py-3 text-sm leading-6 outline-none focus:border-[#E95C9E]/50" />

          <label className="flex cursor-pointer flex-wrap items-center gap-3 rounded-2xl border border-dashed border-border/70 p-3 text-sm hover:bg-background/60"><ImagePlus className="h-5 w-5 text-[#E95C9E]" /><span className="font-semibold">Tambahkan gambar</span><span className="text-xs text-muted-foreground">JPG, PNG, WEBP, GIF · Maks. 5 MB</span><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={(event) => setImageFile(event.target.files?.[0] ?? null)} /></label>

          {imagePreview && <div className="relative max-w-sm overflow-hidden rounded-2xl border border-border/60"><img src={imagePreview} alt="Pratinjau gambar postingan" className="max-h-72 w-full object-cover" /><button type="button" onClick={() => { setImageFile(null); setImagePreview(""); }} className="absolute right-2 top-2 rounded-full bg-black/70 p-2 text-white" aria-label="Hapus gambar"><X className="h-4 w-4" /></button></div>}

          {editingId && <p className="text-xs text-amber-700">Perubahan postingan akan dikirim kembali untuk ditinjau admin</p>}

          <div className="flex flex-wrap justify-end gap-2"><button type="button" disabled={saving} onClick={() => void savePost(false)} className="rounded-full border border-border/60 px-4 py-2.5 text-sm font-semibold disabled:opacity-50">Simpan draf</button><button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2.5 text-sm font-semibold text-background disabled:opacity-50">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Kirim untuk ditinjau</button></div>

        </div>

      </form>}

      {loading ? <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="h-5 w-5 animate-spin" /> Memuat postingan</div> : visiblePosts.length === 0 ? <div className="rounded-3xl border border-dashed border-border/60 p-10 text-center"><MessageCircle className="mx-auto h-10 w-10 text-muted-foreground" /><h3 className="mt-3 font-semibold">{showMine ? "Belum ada postingan milikmu" : "Belum ada postingan"}</h3><p className="mt-1 text-sm text-muted-foreground">Jadilah anggota pertama yang membagikan praktik baik pendidikan</p></div> : <div className="space-y-4">

        {visiblePosts.map((post) => <article key={post.id} className="overflow-hidden rounded-3xl border border-border/60 bg-white/45 shadow-sm backdrop-blur-xl dark:bg-white/[0.03]">

          <div className="p-4 sm:p-6">

            <div className="mb-3 flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#F6C64F]/70 via-[#FF7411]/65 to-[#E95C9E]/65 text-sm font-bold text-white">{post.author_name.trim().charAt(0).toUpperCase()}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-sm font-semibold">{post.author_name}</span>{(adminAuthorIds?.includes(post.author_id) || (isAdmin && post.author_id === userId)) ? <span className="inline-flex items-center gap-1 rounded-full border border-violet-500/25 bg-violet-500/10 px-2 py-0.5 text-[10px] font-bold text-violet-700 dark:text-violet-300"><Check className="h-3 w-3" /> Admin NUMEA</span> : expertAuthorIds?.includes(post.author_id) ? <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300"><ShieldCheck className="h-3 w-3" /> Ahli</span> : adminAuthorIds !== null && expertAuthorIds !== null ? <span className="rounded-full border border-border/60 bg-muted/50 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">Anggota</span> : null}{(isAdmin || post.author_id === userId) && <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${post.status === "published" ? "bg-emerald-500/10 text-emerald-700" : post.status === "rejected" ? "bg-red-500/10 text-red-700" : "bg-amber-500/10 text-amber-700"}`}>{statusLabel[post.status]}</span>}</div><time className="mt-1 block text-xs text-muted-foreground" dateTime={post.created_at}>{dateLabel(post.created_at)}</time></div><div className="flex items-center gap-1">{(post.author_id === userId && ["draft", "rejected", "pending_review"].includes(post.status)) && <button type="button" onClick={() => startEdit(post)} className="rounded-full p-2 text-muted-foreground hover:bg-background" title="Edit postingan"><MoreHorizontal className="h-4 w-4" /></button>}{(post.author_id === userId || isAdmin) && <button type="button" onClick={() => void deletePost(post)} className="rounded-full p-2 text-muted-foreground hover:bg-red-500/10 hover:text-red-600" title="Hapus postingan"><Trash2 className="h-4 w-4" /></button>}</div></div>

            <h3 className="text-lg font-bold leading-snug">{post.title}</h3>

            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7">{post.body}</p>

            {post.image_url && <img src={post.image_url} alt={`Gambar untuk ${post.title}`} loading="lazy" className="mt-4 max-h-[520px] w-full rounded-2xl border border-border/40 object-contain bg-black/[0.02]" />}

            {post.status === "rejected" && post.review_note && post.author_id === userId && <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3 text-sm"><p className="font-semibold">Catatan admin</p><p className="mt-1">{post.review_note}</p></div>}

            {post.status === "pending_review" && post.author_id === userId && <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-amber-700"><Clock3 className="h-3.5 w-3.5" /> Menunggu persetujuan admin</p>}

            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border/50 pt-3">

              <button type="button" onClick={() => void toggleLike(post.id)} className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold ${likedPostIds.includes(post.id) ? "bg-[#E95C9E]/15 text-[#C43B80]" : "hover:bg-background"}`}><ThumbsUp className="h-4 w-4" /> Suka {post.like_count ? `· ${post.like_count}` : ""}</button>

              <button type="button" onClick={() => void toggleComments(post.id)} className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold hover:bg-background"><MessageCircle className="h-4 w-4" /> Komentar{(post.comment_count ?? 0) > 0 ? <span className="rounded-full bg-foreground/10 px-1.5 py-0.5 text-[10px] tabular-nums">{post.comment_count}</span> : null}</button>

              <button type="button" onClick={() => void toggleBookmark(post.id)} className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold ${bookmarkedPostIds.includes(post.id) ? "bg-[#F6C64F]/20 text-amber-800" : "hover:bg-background"}`}><Bookmark className="h-4 w-4" /> Simpan{(post.bookmark_count ?? 0) > 0 ? <span className="rounded-full bg-foreground/10 px-1.5 py-0.5 text-[10px] tabular-nums">{post.bookmark_count}</span> : null}</button>

              {post.status === "published" && (isApproved || isAdmin) && <button type="button" onClick={() => { setReportingPostId(reportingPostId === post.id ? null : post.id); setReportReason("") }} className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-background"><Flag className="h-4 w-4" /> Laporkan</button>}

            </div>

            {reportingPostId === post.id && <form onSubmit={(event) => { event.preventDefault(); void reportPost(post.id) }} className="mt-3 flex flex-col gap-2 sm:flex-row"><input value={reportReason} onChange={(event) => setReportReason(event.target.value)} minLength={3} required placeholder="Alasan laporan" className="min-w-0 flex-1 rounded-xl border border-border/60 bg-background px-3 py-2 text-sm" /><button type="submit" className="rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background">Kirim laporan</button></form>}

            {expandedComments[post.id] && <div className="mt-3 rounded-2xl bg-background/50 p-3"><div className="space-y-3">{(commentsByPost[post.id] ?? []).map((comment) => <div key={comment.id} className="flex gap-2"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E95C9E]/10 text-xs font-bold">{comment.author_name.charAt(0).toUpperCase()}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-semibold">{comment.author_name}</span><time className="text-[10px] text-muted-foreground">{dateLabel(comment.created_at)}</time></div><p className="mt-1 whitespace-pre-wrap break-words text-sm">{comment.body}</p></div>{(comment.author_id === userId || isAdmin) && <button type="button" onClick={async () => { const { error: deleteError } = await supabase.from("numea_community_post_comments").delete().eq("id", comment.id); if (deleteError) setError(deleteError.message); else { setPosts((current) => current.map((item) => item.id === post.id ? { ...item, comment_count: Math.max(0, (item.comment_count ?? 0) - 1) } : item)); await loadComments(post.id) } }} className="self-start rounded-full p-1.5 text-muted-foreground hover:text-red-600" aria-label="Hapus komentar"><Trash2 className="h-3.5 w-3.5" /></button>}</div>)}</div>

              {(isApproved || isAdmin) && <form onSubmit={(event) => void sendComment(event, post.id)} className="mt-3 flex gap-2"><input value={commentInputs[post.id] ?? ""} onChange={(event) => setCommentInputs((current) => ({ ...current, [post.id]: event.target.value }))} maxLength={2000} placeholder="Tulis komentar..." className="min-w-0 flex-1 rounded-full border border-border/60 bg-background px-4 py-2.5 text-sm outline-none focus:border-[#E95C9E]/50" /><button type="submit" disabled={!commentInputs[post.id]?.trim() || busyAction === `comment-${post.id}`} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-foreground text-background disabled:opacity-50" aria-label="Kirim komentar"><Send className="h-4 w-4" /></button></form>}

            </div>}

            {isAdmin && post.status === "pending_review" && <div className="mt-4 flex flex-wrap gap-2 border-t border-border/50 pt-4"><button type="button" disabled={busyAction === post.id} onClick={() => void reviewPost(post.id, "published")} className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"><Check className="h-4 w-4" /> Setujui & terbitkan</button><button type="button" disabled={busyAction === post.id} onClick={() => void reviewPost(post.id, "rejected")} className="inline-flex items-center gap-2 rounded-full border border-red-500/30 px-4 py-2 text-xs font-semibold text-red-600 disabled:opacity-50"><XCircle className="h-4 w-4" /> Tolak / minta perbaikan</button></div>}

            {isAdmin && post.status === "published" && <div className="mt-3 flex justify-end"><button type="button" onClick={() => void reviewPost(post.id, "archived")} className="rounded-full border border-border/60 px-3 py-2 text-xs font-semibold">Arsipkan postingan</button></div>}

          </div>

        </article>)}

      </div>}

      {!isApproved && !isAdmin && !loading && <p className="mt-4 text-xs text-muted-foreground">Untuk berkontribusi, memberi komentar, menyukai, atau menyimpan postingan, gunakan akun anggota NUMEA yang telah disetujui</p>}

    </div>

  )

}