export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

export type AuthUser = {
  id: string
  name: string
  email: string
}

export type Category = {
  id: string
  name: string
  description: string
  createdAt: string
}

export type Product = {
  id: string
  name: string
  sku: string
  description: string
  price: number
  stock: number
  categoryId: string | null
  createdAt: string
  updatedAt: string
  category?: Category | null
}

export type AssistantIntent = 'onboarding' | 'tax_advice' | 'product_form_fill'

export type ProductDraft = {
  name: string
  sku: string
  description: string
  price: number | null
  stock: number | null
  categoryName: string
}

export type AssistantMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type AssistantResponse = {
  intent: AssistantIntent
  reply: string
  transcript?: string
  productDraft: ProductDraft | null
  suggestions: string[]
  warnings: string[]
}

export type AgoraTokenResponse = {
  appId: string
  channel: string
  account: string
  token: string
  expiresAt: number
  expiresInSeconds: number
}

export type AgoraAgentStartResponse = {
  started: boolean
  channel: string
  agentName: string
  provider: 'external_agora_agent'
  sessionId?: string
  status: string
}

export type AgoraAgentLaunch = {
  agentName: string
  mode: 'manual' | 'external'
  status: 'not_configured' | 'starting' | 'running' | 'failed'
  message?: string
  sessionId?: string
}

export type AgoraAssistantSessionResponse = {
  sessionId: string
  appId: string
  channel: string
  account: string
  token: string
  expiresAt: number
  expiresInSeconds: number
  agentLaunch: AgoraAgentLaunch
  messages: AssistantMessage[]
  productDraft: ProductDraft | null
}

export type AgoraAssistantSessionState = {
  id: string
  channel: string
  account: string
  currentPath?: string
  messages: AssistantMessage[]
  productDraft: ProductDraft | null
  agentLaunch: AgoraAgentLaunch
  createdAt: string
  updatedAt: string
}

type ApiOptions = Omit<RequestInit, 'body'> & {
  body?: BodyInit | object | null
}

export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers = new Headers(options.headers)
  let body = options.body

  if (body && typeof body === 'object' && !(body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
    body = JSON.stringify(body)
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    body: body ?? undefined,
    credentials: 'include',
  })

  const contentType = response.headers.get('content-type') ?? ''
  const payload = contentType.includes('application/json')
    ? ((await response.json()) as T | { message?: string })
    : null

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'message' in payload
        ? payload.message || 'Request failed.'
        : 'Request failed.'

    throw new Error(message)
  }

  return payload as T
}
