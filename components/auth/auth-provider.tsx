'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  AuthUser,
  getMe,
  getToken,
  login as loginRequest,
  logout as clearAuth,
  signup as signupRequest,
} from '@/lib/auth'

type LoginInput = {
  email: string
  password: string
}

type SignupInput = {
  organization_name: string
  admin_name: string
  admin_email: string
  password: string
}

type AuthContextValue = {
  user: AuthUser | null
  loading: boolean
  isAuthenticated: boolean
  isAdmin: boolean
  isReviewer: boolean
  refreshUser: () => Promise<AuthUser | null>
  signIn: (payload: LoginInput) => Promise<AuthUser>
  signUp: (payload: SignupInput) => Promise<AuthUser>
  signOut: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    const token = getToken()
    if (!token) {
      setUser(null)
      setLoading(false)
      return null
    }

    try {
      const currentUser = await getMe()
      setUser(currentUser)
      return currentUser
    } catch {
      clearAuth()
      setUser(null)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshUser()
  }, [refreshUser])

  const signIn = useCallback(async (payload: LoginInput) => {
    const currentUser = await loginRequest(payload)
    setUser(currentUser)
    return currentUser
  }, [])

  const signUp = useCallback(async (payload: SignupInput) => {
    const currentUser = await signupRequest(payload)
    setUser(currentUser)
    return currentUser
  }, [])

  const signOut = useCallback(() => {
    clearAuth()
    setUser(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      isAdmin: user?.role === 'admin',
      isReviewer: user?.role === 'reviewer',
      refreshUser,
      signIn,
      signUp,
      signOut,
    }),
    [loading, refreshUser, signIn, signOut, signUp, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return value
}
