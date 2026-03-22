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

export type AssistantIntent = 'website_guidance' | 'tax_law_rag' | 'product_form_fill'

export type AssistantResponseSource = 'agent' | 'rag'

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

export type AssistantCitation = {
  chunkId: string
  score: number
  symbol: string
  title: string
  detailUrl: string
  issueDate: string
  effectiveDate: string
  documentType: string
  issuingAgency: string
  excerpt: string
  sourceFile: string
}

export type AssistantResponse = {
  intent: AssistantIntent
  responseSource: AssistantResponseSource
  reply: string
  transcript?: string
  productDraft: ProductDraft | null
  suggestions: string[]
  warnings: string[]
  answered?: boolean
  confidence?: number
  citations?: AssistantCitation[]
}

export type AgoraAgentLaunch = {
  agentName: string
  mode: 'manual' | 'external'
  status: 'not_configured' | 'starting' | 'running' | 'stopped' | 'failed'
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

export type DashboardStat = {
  label: string
  value: number
  delta: string | null
  danger?: boolean
}

export type DashboardMovementBar = {
  label: string
  incoming: number
  outgoing: number
}

export type DashboardActivity = {
  title: string
  meta: string
  icon: string
  tone: string
  timestamp: string
}

export type DashboardResponse = {
  stats: DashboardStat[]
  movement: DashboardMovementBar[]
  activities: DashboardActivity[]
}
