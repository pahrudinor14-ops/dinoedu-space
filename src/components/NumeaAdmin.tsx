import { useEffect, useState } from "react"
import { ArrowLeft, Check, Clock3, Eye, Loader2, Search, ShieldAlert, UserCheck, UserX, X, type LucideIcon } from "lucide-react"
import { supabase } from "../lib/supabase"
interface NumeaAdminProps {
  onBack: () => void
  darkMode?: boolean
}
interface Member {
  user_id: string
  status: "approved" | "suspended"
  approved_at: string | null
  suspended_at: string | null
  full_name: string
  role: string
  institution?: string
}
interface NumeaAdminAccount {
  user_id: string
  email: string | null
  full_name: string
}
interface JoinRequest {
  id: string
  user_id: string
  full_name: string
  role: string
  institution: string
  interests: string[]
  join_reason: string
  activities: string[]
  agreement: boolean
  status: "pending" | "approved" | "rejected" | "suspended"
  rejection_reason?: string | null
  created_at: string
}
const selectClass = "numea-admin-select w-full rounded-2xl border border-border/70 bg-white/45 px-4 py-3 text-[13px] outline-none backdrop-blur-xl transition focus:border-[#E95C9E]/40 dark:bg-white/5"
const inputClass = "w-full rounded-2xl border border-border/70 bg-white/45 px-4 py-3 text-[13px] outline-none backdrop-blur-xl transition focus:border-[#E95C9E]/40 dark:bg-white/5"
export default function NumeaAdmin({ onBack }: NumeaAdminProps) {
  const [requests, setRequests] = useState<JoinRequest[]>([])
  const [selectedRequest, setSelectedRequest] = useState<JoinRequest | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("pending")
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const [rejectReason, setRejectReason] = useState("")
  const [members, setMembers] = useState<Member[]>([])
  const [adminAccounts, setAdminAccounts] = useState<NumeaAdminAccount[]>([])
  const [memberLoading, setMemberLoading] = useState(true)
  const loadMembers = async () => {
    setMemberLoading(true)
    const { data, error } = await supabase.rpc("get_numea_member_management")
    if (error) {
      setMessage(error.message)
      setMembers([])
      setMemberLoading(false)
      return
    }
    setMembers((data ?? []) as Member[])
    setMemberLoading(false)
  }

  const loadRequests = async () => {
    setLoading(true)
    setMessage("")
    const { data, error } = await supabase
      .from("numea_join_requests")
      .select("id,user_id,full_name,role,institution,interests,join_reason,activities,agreement,status,created_at")
      .order("created_at", { ascending: false })
    if (error) {
      setMessage(error.message)
      setRequests([])
    } else {
      setRequests((data ?? []) as JoinRequest[])
    }
    setLoading(false)
  }
  useEffect(() => {
    void loadRequests()
    void loadMembers()
  }, [])
  const handleApprove = async (requestId: string) => {
    setProcessingId(requestId)
    setMessage("")
    const { error } = await supabase.rpc("approve_numea_join_request", { request_id: requestId })
    if (error) {
      setMessage(error.message)
    } else {
      setMessage("Pengajuan berhasil disetujui")
      setSelectedRequest(null)
      await loadRequests()
      await loadMembers()
    }
    setProcessingId(null)
  }
  const handleReject = async (requestId: string) => {
    if (rejectReason.trim().length < 3) {
      setMessage("Alasan penolakan perlu diisi")
      return
    }
    setProcessingId(requestId)
    setMessage("")
    const { error } = await supabase.rpc("reject_numea_join_request", {
      request_id: requestId,
      reason: rejectReason.trim(),
    })
    if (error) {
      setMessage(error.message)
    } else {
      setMessage("Pengajuan berhasil ditolak")
      setRejectReason("")
      setSelectedRequest(null)
      await loadRequests()
      await loadMembers()
    }
    setProcessingId(null)
  }
  const handleSuspend = async (userId: string) => {
    if (!window.confirm("Suspend membership member ini? Akses NUMEA akan dihentikan sampai diaktifkan kembali.")) return
    setProcessingId(userId)
    setMessage("")
    const { error } = await supabase.rpc("suspend_numea_membership", { p_user_id: userId })
    if (error) setMessage(error.message)
    else {
      setMessage("Membership berhasil disuspend")
      await loadMembers()
    }
    setProcessingId(null)
  }
  const handleReactivate = async (userId: string) => {
    if (!window.confirm("Aktifkan kembali membership member ini?")) return
    setProcessingId(userId)
    setMessage("")
    const { error } = await supabase.rpc("reactivate_numea_membership", { p_user_id: userId })
    if (error) setMessage(error.message)
    else {
      setMessage("Membership berhasil diaktifkan kembali")
      await loadMembers()
    }
    setProcessingId(null)
  }
  const filteredRequests = requests.filter((request) => {
    const query = search.trim().toLowerCase()
    const matchesStatus = statusFilter === "all" || request.status === statusFilter
    const matchesSearch = !query || [request.full_name, request.role, request.institution].join(" ").toLowerCase().includes(query)
    return matchesStatus && matchesSearch
  })
  const pendingCount = requests.filter((request) => request.status === "pending").length
  const approvedCount = requests.filter((request) => request.status === "approved").length
  const rejectedCount = requests.filter((request) => request.status === "rejected").length
  const suspendedCount = members.filter((member) => member.status === "suspended").length
  const statCards: Array<[string, number, LucideIcon, string]> = [
    ["Pending", pendingCount, Clock3, "text-[#FF7411]"],
    ["Approved", approvedCount, Check, "text-emerald-500"],
    ["Rejected", rejectedCount, X, "text-[#E95C9E]"],
    ["Suspended", suspendedCount, ShieldAlert, "text-[#FF7411]"],
  ]
  return (
    <div className="min-h-screen bg-background text-foreground">
      <style>{`
        .numea-admin-select option { background: #fff; color: #2B2729; }
        .dark .numea-admin-select option { background: #1D191F; color: #F8F4F5; }
        .dark .numea-admin-select { color-scheme: dark; }
      `}</style>
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-[1500px] items-center gap-3 px-4 sm:px-6 lg:px-8">
          <button type="button" onClick={onBack} className="dino-button flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-white/40 backdrop-blur-xl dark:bg-white/5" aria-label="Kembali">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#E95C9E]">NUMEA ADMIN</div>
            <h1 className="text-lg font-bold">Membership Management</h1>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1500px] px-4 pb-20 pt-7 sm:px-6 lg:px-8">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map(([label, count, Icon, iconClass]) => (
            <div key={label as string} className="dino-glass rounded-[24px] p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{label as string}</div>
                  <div className="mt-2 text-3xl font-bold">{count as number}</div>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/45 dark:bg-white/5">
                  <Icon className={`h-5 w-5 ${iconClass as string}`} />
                </div>
              </div>
            </div>
          ))}
        </section>
        <section className="mt-6 rounded-[28px] border border-border/60 bg-white/40 p-5 backdrop-blur-2xl dark:bg-white/5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#FF7411]">Membership</p>
              <h2 className="mt-1 text-2xl font-bold">Pengajuan Membership</h2>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari pemohon..." className={`${inputClass} pl-10 sm:w-[230px]`} />
              </div>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={`${selectClass} sm:w-[160px]`}>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="suspended">Suspended</option>
                <option value="all">Semua</option>
              </select>
            </div>
          </div>
          {message && <div className="mt-4 rounded-2xl border border-[#E95C9E]/20 bg-[#E95C9E]/5 px-4 py-3 text-[13px]">{message}</div>}
          <div className="mt-5 overflow-hidden rounded-2xl border border-border/60">
            {loading ? (
              <div className="flex items-center justify-center gap-2 px-5 py-12 text-[13px] text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Memuat pengajuan...
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="px-5 py-12 text-center text-[13px] text-muted-foreground">Belum ada pengajuan pada filter ini</div>
            ) : (
              <div className="divide-y divide-border/60">
                {filteredRequests.map((request) => (
                  <div key={request.id} className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                    <div className="min-w-0">
                      <div className="font-semibold">{request.full_name}</div>
                      <div className="mt-1 text-[12px] text-muted-foreground">{request.role} · {request.institution || "Institusi belum diisi"}</div>
                      <div className="mt-1 text-[11px] text-muted-foreground">{new Date(request.created_at).toLocaleString("id-ID")}</div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button type="button" onClick={() => setSelectedRequest(request)} className="dino-button inline-flex items-center gap-2 rounded-full border border-border/60 bg-white/45 px-4 py-2.5 text-[12px] font-semibold dark:bg-white/5">
                        <Eye className="h-3.5 w-3.5" />
                        Detail
                      </button>
                      {request.status === "pending" && (
                        <button type="button" disabled={processingId === request.id} onClick={() => void handleApprove(request.id)} className="dino-button inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#F6C64F] via-[#FF7411] to-[#E95C9E] px-4 py-2.5 text-[12px] font-semibold text-white disabled:opacity-60">
                          {processingId === request.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                          Setujui
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
        {adminAccounts.length > 0 && (
          <section className="mt-6 rounded-[28px] border border-[#E95C9E]/20 bg-[#E95C9E]/5 p-5 backdrop-blur-2xl sm:p-6">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#E95C9E]">Admin NUMEA</p>
              <h2 className="mt-1 text-2xl font-bold">Administrator</h2>
              <p className="mt-1 text-[13px] text-muted-foreground">Administrator dipisahkan dari daftar member dan tidak dapat di-Suspend dari halaman ini</p>
            </div>
            <div className="mt-5 overflow-hidden rounded-2xl border border-[#E95C9E]/15">
              <div className="divide-y divide-border/60">
                {adminAccounts.map((admin) => (
                  <div key={admin.user_id} className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                    <div className="min-w-0">
                      <div className="font-semibold">{admin.full_name}</div>
                      <div className="mt-1 text-[12px] text-muted-foreground">{admin.email || "Email tidak tersedia"}</div>
                    </div>
                    <div className="inline-flex w-fit items-center gap-1.5 rounded-full border border-[#E95C9E]/20 bg-[#E95C9E]/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#E95C9E]">Administrator</div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
        <section className="mt-6 rounded-[28px] border border-border/60 bg-white/40 p-5 backdrop-blur-2xl dark:bg-white/5 sm:p-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#E95C9E]">Member</p>
            <h2 className="mt-1 text-2xl font-bold">Member Aktif</h2>
            <p className="mt-1 text-[13px] text-muted-foreground">Kelola status akses member NUMEA</p>
          </div>
          <div className="mt-5 overflow-hidden rounded-2xl border border-border/60">
            {memberLoading ? (
              <div className="flex items-center justify-center gap-2 px-5 py-12 text-[13px] text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Memuat member...</div>
            ) : members.length === 0 ? (
              <div className="px-5 py-12 text-center text-[13px] text-muted-foreground">Belum ada member aktif atau suspended</div>
            ) : (
              <div className="divide-y divide-border/60">
                {members.map((member) => (
                  <div key={member.user_id} className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                    <div className="min-w-0">
                      <div className="font-semibold">{member.full_name}</div>
                      <div className="mt-1 text-[12px] text-muted-foreground">{member.role} · {member.institution || "Institusi belum diisi"}</div>
                      <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-border/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em]">
                        {member.status === "approved" ? <UserCheck className="h-3 w-3 text-emerald-500" /> : <ShieldAlert className="h-3 w-3 text-[#FF7411]" />}
                        {member.status === "approved" ? "Aktif" : "Suspended"}
                      </div>
                    </div>
                    {member.status === "approved" ? (
                      <button type="button" disabled={processingId === member.user_id} onClick={() => void handleSuspend(member.user_id)} className="dino-button inline-flex items-center justify-center gap-2 rounded-full border border-[#E95C9E]/30 bg-[#E95C9E]/10 px-4 py-2.5 text-[12px] font-semibold text-[#E95C9E] disabled:opacity-60">
                        {processingId === member.user_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserX className="h-3.5 w-3.5" />}
                        Suspend
                      </button>
                    ) : (
                      <button type="button" disabled={processingId === member.user_id} onClick={() => void handleReactivate(member.user_id)} className="dino-button inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#F6C64F] via-[#FF7411] to-[#E95C9E] px-4 py-2.5 text-[12px] font-semibold text-white disabled:opacity-60">
                        {processingId === member.user_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserCheck className="h-3.5 w-3.5" />}
                        Reactivate
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      {selectedRequest && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[28px] border border-border/60 bg-background p-6 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#E95C9E]">Detail Pengajuan</div>
                <h3 className="mt-1 text-2xl font-bold">{selectedRequest.full_name}</h3>
              </div>
              <button type="button" onClick={() => setSelectedRequest(null)} className="dino-button flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-white/40 dark:bg-white/5">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {[
                ["Peran", selectedRequest.role],
                ["Institusi", selectedRequest.institution || "-"],
                ["Status", selectedRequest.status],
                ["Persetujuan", selectedRequest.agreement ? "Disetujui" : "Belum disetujui"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-border/60 bg-white/35 p-4 dark:bg-white/5">
                  <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
                  <div className="mt-1 text-[13px] font-semibold">{value}</div>
                </div>
              ))}
            </div>
            <div className="mt-5 space-y-4">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Minat</div>
                <div className="mt-2 text-[13px] leading-6">{selectedRequest.interests?.join(", ") || "-"}</div>
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Alasan Bergabung</div>
                <div className="mt-2 rounded-2xl border border-border/60 bg-white/35 p-4 text-[13px] leading-6 dark:bg-white/5">{selectedRequest.join_reason}</div>
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Aktivitas yang Diinginkan</div>
                <div className="mt-2 text-[13px] leading-6">{selectedRequest.activities?.join(", ") || "-"}</div>
              </div>
            </div>
            {selectedRequest.status === "pending" && (
              <div className="mt-6 border-t border-border/60 pt-5">
                <label className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Alasan Penolakan</label>
                <textarea value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} placeholder="Isi jika pengajuan ditolak..." rows={3} className={`${inputClass} mt-2 resize-none`} />
                <div className="mt-4 flex flex-wrap justify-end gap-2">
                  <button type="button" disabled={processingId === selectedRequest.id} onClick={() => void handleReject(selectedRequest.id)} className="dino-button inline-flex items-center gap-2 rounded-full border border-[#E95C9E]/30 bg-[#E95C9E]/10 px-4 py-2.5 text-[12px] font-semibold text-[#E95C9E] disabled:opacity-60">
                    <X className="h-3.5 w-3.5" />
                    Tolak
                  </button>
                  <button type="button" disabled={processingId === selectedRequest.id} onClick={() => void handleApprove(selectedRequest.id)} className="dino-button inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#F6C64F] via-[#FF7411] to-[#E95C9E] px-5 py-2.5 text-[12px] font-semibold text-white disabled:opacity-60">
                    <Check className="h-3.5 w-3.5" />
                    Setujui
                  </button>
                </div>
              </div>
            )}
            {selectedRequest.status === "rejected" && selectedRequest.rejection_reason && (
              <div className="mt-6 rounded-2xl border border-[#E95C9E]/20 bg-[#E95C9E]/5 p-4 text-[13px]">
                <div className="font-semibold">Alasan penolakan</div>
                <div className="mt-1 text-muted-foreground">{selectedRequest.rejection_reason}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
