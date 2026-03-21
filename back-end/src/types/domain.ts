export type SessionUser = {
  id: string
  name: string
  email: string
  password: string
}

export type PublicUser = {
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
}

export type ProductWithCategory = Product & {
  category: Category | null
}

export type InvoiceData = {
  ten_khach_hang: string
  san_pham: string
  so_luong: number
  don_gia: number
  tong_tien: number
  can_xuat_hoa_don: boolean
}

export type ApiResponse = {
  status: 'success' | 'error'
  message: string
  data?: InvoiceData
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

export type AgoraAgentLaunch = {
  agentName: string
  mode: 'manual' | 'external'
  status: 'not_configured' | 'starting' | 'running' | 'failed'
  message?: string
  sessionId?: string
}

export type AgoraAssistantSession = {
  id: string
  userId: string
  channel: string
  account: string
  currentPath?: string
  messages: AssistantMessage[]
  productDraft: ProductDraft | null
  agentLaunch: AgoraAgentLaunch
  createdAt: string
  updatedAt: string
}
