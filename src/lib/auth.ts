export interface AuthUser {
  uuid: string
  email: string
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init.headers },
    ...init,
  })
  const data: unknown = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = typeof data === 'object' && data && 'error' in data && typeof data.error === 'string'
      ? data.error
      : '请求失败，请稍后重试。'
    throw new Error(message)
  }
  return data as T
}

export async function requestEmailCode(email: string): Promise<void> {
  await request('/api/auth/request-code', { method: 'POST', body: JSON.stringify({ email }) })
}

export async function verifyEmailCode(email: string, code: string): Promise<AuthUser> {
  const data = await request<{ user: AuthUser }>('/api/auth/verify-code', {
    method: 'POST',
    body: JSON.stringify({ email, code }),
  })
  return data.user
}

export async function devLogin(email: string): Promise<AuthUser> {
  const data = await request<{ user: AuthUser }>('/api/auth/dev-login', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
  return data.user
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const data = await request<{ user: AuthUser }>('/api/auth/me')
    return data.user
  } catch {
    return null
  }
}

export async function logout(): Promise<void> {
  await request('/api/auth/logout', { method: 'POST' })
}
