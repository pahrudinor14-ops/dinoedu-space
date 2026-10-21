import { useEffect, useRef, useState } from "react"
import { supabase } from "../../lib/supabase"
type NumeaProfileRow = {
  user_id: string
  full_name: string | null
  avatar_path: string | null
}
export type NumeaProfileCard = {
  fullName: string | null
  avatarPath: string | null
  avatarUrl: string | null
}
export function useNumeaProfileCards(userIds: (string | null | undefined)[]) {
  const idsKey = [...new Set(userIds.filter((userId): userId is string => Boolean(userId)))].sort().join(",")
  const requestedIds = idsKey ? idsKey.split(",") : []
  const [profileCards, setProfileCards] = useState<Record<string, NumeaProfileCard>>({})
  const profileCardsRef = useRef(profileCards)
  const loadedIds = useRef(new Set<string>())
  useEffect(() => {
    let active = true
    let profileOwnerId: string | null = null
    const requestedIdSet = new Set(requestedIds)
    const loadProfiles = async (ids = requestedIds, force = false, refreshSignedUrls = false) => {
      // Profile rows and photos are private by default. Community content has
      // its own display-name snapshot, so only fetch the signed-in user's row
      // here; admin member-management uses its separately authorized flow.
      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (!active) return
      if (authError || !authData.user) {
        profileOwnerId = null
        loadedIds.current.clear()
        if (Object.keys(profileCardsRef.current).length > 0) {
          profileCardsRef.current = {}
          setProfileCards({})
        }
        return
      }
      const ownUserId = authData.user.id
      if (profileOwnerId !== ownUserId) {
        profileOwnerId = ownUserId
        loadedIds.current.clear()
        const ownCard = profileCardsRef.current[ownUserId]
        const nextCards = ownCard && requestedIdSet.has(ownUserId)
          ? { [ownUserId]: ownCard }
          : {}
        profileCardsRef.current = nextCards
        setProfileCards(nextCards)
      }
      const ownIds = ids.filter((userId) => userId === ownUserId)
      const idsToLoad = force ? ownIds : ownIds.filter((userId) => !loadedIds.current.has(userId))
      if (idsToLoad.length === 0) return
      const { data, error } = await supabase
        .from("numea_profiles")
        .select("user_id,full_name,avatar_path")
        .in("user_id", idsToLoad)
      if (error || !active) return
      const rows = (data ?? []) as NumeaProfileRow[]
      const avatarPaths = [...new Set(rows.flatMap((profile) => {
        if (!profile.avatar_path) return []
        const currentCard = profileCardsRef.current[profile.user_id]
        return refreshSignedUrls || currentCard?.avatarPath !== profile.avatar_path || !currentCard.avatarUrl
          ? [profile.avatar_path]
          : []
      }))]
      const avatarUrlByPath = new Map<string, string>()
      if (avatarPaths.length > 0) {
        const { data: signedAvatars, error: avatarError } = await supabase.storage
          .from("numea-profile-photos")
          .createSignedUrls(avatarPaths, 24 * 60 * 60)
        if (!avatarError) {
          for (const avatar of signedAvatars ?? []) {
            if (avatar.path && avatar.signedUrl) avatarUrlByPath.set(avatar.path, avatar.signedUrl)
          }
        }
      }
      if (!active) return
      const cardsByUser = new Map(rows.map((profile) => {
        const currentCard = profileCardsRef.current[profile.user_id]
        let avatarUrl: string | null = null
        if (profile.avatar_path) {
          if (profile.avatar_path === currentCard?.avatarPath && currentCard?.avatarUrl && !avatarUrlByPath.has(profile.avatar_path)) {
            avatarUrl = currentCard.avatarUrl
          } else {
            avatarUrl = avatarUrlByPath.get(profile.avatar_path) ?? null
          }
        }
        return [profile.user_id, {
          fullName: profile.full_name?.trim() || null,
          avatarPath: profile.avatar_path,
          avatarUrl,
        }] as const
      }))
      for (const userId of idsToLoad) loadedIds.current.add(userId)
      setProfileCards((current) => {
        const next = { ...current }
        for (const userId of idsToLoad) {
          const card = cardsByUser.get(userId)
          if (card) next[userId] = card
          else delete next[userId]
        }
        profileCardsRef.current = next
        return next
      })
    }
    if (requestedIds.length === 0) {
      loadedIds.current.clear()
      profileCardsRef.current = {}
      setProfileCards({})
      return () => { active = false }
    }
    for (const userId of loadedIds.current) {
      if (!requestedIdSet.has(userId)) loadedIds.current.delete(userId)
    }
    setProfileCards((current) => {
      const next = Object.fromEntries(Object.entries(current).filter(([userId]) => requestedIdSet.has(userId)))
      profileCardsRef.current = next
      return next
    })
    void loadProfiles()
    const channel = supabase
      .channel(`numea-profile-cards-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "numea_profiles",
      }, (payload) => {
        const changedProfile = (payload.eventType === "DELETE" ? payload.old : payload.new) as { user_id?: string }
        const changedUserId = changedProfile.user_id
        if (!changedUserId || changedUserId !== profileOwnerId || !requestedIdSet.has(changedUserId)) return
        if (payload.eventType === "DELETE") {
          loadedIds.current.delete(changedUserId)
          setProfileCards((current) => {
            const next = { ...current }
            delete next[changedUserId]
            profileCardsRef.current = next
            return next
          })
        } else {
          void loadProfiles([changedUserId], true)
        }
      })
      .subscribe()
    const refreshProfiles = () => {
      if (document.visibilityState === "visible") void loadProfiles(requestedIds, true, true)
    }
    const refreshProfileData = () => {
      if (document.visibilityState === "visible") void loadProfiles(requestedIds, true)
    }
    window.addEventListener("focus", refreshProfiles)
    document.addEventListener("visibilitychange", refreshProfiles)
    const refreshInterval = window.setInterval(refreshProfileData, 30_000)
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        profileOwnerId = null
        loadedIds.current.clear()
        profileCardsRef.current = {}
        setProfileCards({})
      } else if (["SIGNED_IN", "TOKEN_REFRESHED", "USER_UPDATED"].includes(event)) {
        window.setTimeout(() => {
          if (active) void loadProfiles(requestedIds, true, true)
        }, 0)
      }
    })
    return () => {
      active = false
      window.removeEventListener("focus", refreshProfiles)
      document.removeEventListener("visibilitychange", refreshProfiles)
      window.clearInterval(refreshInterval)
      authSubscription.unsubscribe()
      void supabase.removeChannel(channel)
    }
  }, [idsKey])
  return profileCards
}
