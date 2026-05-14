'use client'

const TOKEN_KEY = 'email_review_access_token'
const USER_KEY = 'email_review_user'

export type AuthUser = {
  id: string
  organization_id: string
  name: string
  email: string
  role: 'admin' | 'reviewer'
  is_active: boolean
}

type TokenResponse = {
  access_token: string
  token_type: string
}

type LoginPayload = {
  email: string
  password: string
}

type SignupPayload = {
  organization_name: string
  admin_name: string
  admin_email: string
  password: string
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') ||
  'https://ai-reviewer-backend-1glg.onrender.com'

async function parseApiError(response: Response) {
  try {
    const data = await response.json()
    return data?.detail || 'Request failed'
  } catch {
    return 'Request failed'
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    throw new Error(await parseApiError(response))
  }

  return response.json()
}

export async function login(payload: LoginPayload) {
  const token = await request<TokenResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  saveToken(token.access_token)
  return getMe()
}

export async function signup(payload: SignupPayload) {
  const token = await request<TokenResponse>('/auth/register-organization', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  saveToken(token.access_token)
  return getMe()
}

export async function getMe() {
  const token = getToken()
  if (!token) {
    throw new Error('You are not logged in')
  }

  const user = await request<AuthUser>('/auth/me', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  saveUser(user)
  return user
}

export function saveToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token)
}

export function getToken() {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(TOKEN_KEY)
}

export function saveUser(user: AuthUser) {
  window.localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function getStoredUser() {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(USER_KEY)
  if (!raw) return null

  try {
    return JSON.parse(raw) as AuthUser
  } catch {
    return null
  }
}

export function logout() {
  window.localStorage.removeItem(TOKEN_KEY)
  window.localStorage.removeItem(USER_KEY)
}
