import { createContext, useContext, useEffect, useMemo, useState } from "react"
import supabase from "@/lib/supabase"

export type UserProfile = {
  id: string
  email: string | null
  username: string | null
  image?: string | null
  role: "pending" | "member" | "admin" | string | null
  company_id?: string | null
}

type AuthContextType = {
  user: UserProfile | null
  login: (email: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  updateUser: (updates: Partial<UserProfile>) => Promise<void>
  updatePassword: (password: string) => Promise<void>
  refreshUser: () => Promise<void>
  loading: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

const selectProfile = "id, email, username, image, role, company_id"

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const normalizeProfile = (profile: UserProfile | null, email?: string | null) => {
    if (!profile) return null
    return {
      ...profile,
      email: profile.email ?? email ?? null,
    }
  }

  const fetchProfile = async (userId: string, email?: string | null) => {
    const { data, error } = await supabase
      .from("profiles")
      .select(selectProfile)
      .eq("id", userId)
      .maybeSingle()

    if (error) throw error
    if (data) return normalizeProfile(data as UserProfile, email)

    const fallbackUsername = email ? email.split("@")[0] : null
    const { data: inserted, error: insertError } = await supabase
      .from("profiles")
      .insert({
        id: userId,
        email: email ?? null,
        username: fallbackUsername,
      })
      .select(selectProfile)
      .single()

    if (insertError) throw insertError
    return normalizeProfile(inserted as UserProfile, email)
  }

  const refreshUser = async () => {
    const { data, error } = await supabase.auth.getUser()
    if (error) throw error
    if (!data.user) {
      setUser(null)
      return
    }
    const profile = await fetchProfile(data.user.id, data.user.email ?? null)
    setUser(profile)
  }

  useEffect(() => {
    let mounted = true

    const initialize = async () => {
      try {
        const { data } = await supabase.auth.getSession()
        const authUser = data.session?.user ?? null
        if (!authUser) {
          if (mounted) setUser(null)
        } else {
          const profile = await fetchProfile(authUser.id, authUser.email ?? null)
          if (mounted) setUser(profile)
        }
      } catch (error) {
        console.error("Failed to load auth session:", error)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    initialize()

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return
      if (!session?.user) {
        setUser(null)
        setLoading(false)
        return
      }
      try {
        const profile = await fetchProfile(session.user.id, session.user.email ?? null)
        if (mounted) setUser(profile)
      } catch (error) {
        console.error("Failed to refresh profile:", error)
      } finally {
        if (mounted) setLoading(false)
      }
    })

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error || !data.user) return false

    try {
      const profile = await fetchProfile(data.user.id, data.user.email ?? null)
      setUser(profile)
      return true
    } catch (err) {
      console.error("Failed to load profile after login:", err)
      return false
    }
  }

  const updateUser = async (updates: Partial<UserProfile>) => {
    if (!user) return

    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.id)
      .select(selectProfile)
      .single()

    if (error) throw error

    setUser(normalizeProfile(data as UserProfile, user.email ?? null))
  }

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password })
    if (error) throw error
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  const value = useMemo(
    () => ({ user, login, logout, updateUser, updatePassword, refreshUser, loading }),
    [user, loading]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider")
  return ctx
}
