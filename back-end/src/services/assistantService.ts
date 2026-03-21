import OpenAI, { toFile } from 'openai'
import { env } from '../config/env'
import { assistantKnowledgeRepository } from '../repositories/assistantKnowledgeRepository'
import type {
  AssistantMessage,
  AssistantResponse,
  ProductDraft,
} from '../types/domain'

type AssistantRequest = {
  message: string
  currentPath?: string
  conversation?: AssistantMessage[]
}

const openai = env.openaiApiKey ? new OpenAI({ apiKey: env.openaiApiKey }) : null

const emptyDraft = (): ProductDraft => ({
  name: '',
  sku: '',
  description: '',
  price: null,
  stock: null,
  categoryName: '',
})

function extractDraftFromText(message: string): ProductDraft | null {
  const draft = emptyDraft()
  const lower = message.toLowerCase()

  const nameMatch = message.match(/(?:product|item|name)\s*(?:is|:)?\s*([^.,"\n]+)/i)
  const skuMatch = message.match(/sku\s*(?:is|:)?\s*([A-Z0-9-]+)/i)
  const priceMatch = message.match(/(?:price|cost)\s*(?:is|:)?\s*\$?(\d+(?:\.\d+)?)/i)
  const stockMatch = message.match(/(?:stock|quantity|units?)\s*(?:is|:)?\s*(\d+)/i)
  const categoryMatch = message.match(/(?:category)\s*(?:is|:)?\s*([^.,"\n]+)/i)

  if (nameMatch) {
    draft.name = nameMatch[1].trim()
  } else if (lower.includes('macbook')) {
    draft.name = 'MacBook'
  }

  if (skuMatch) {
    draft.sku = skuMatch[1].trim()
  }

  if (priceMatch) {
    draft.price = Number(priceMatch[1])
  }

  if (stockMatch) {
    draft.stock = Number(stockMatch[1])
  }

  if (categoryMatch) {
    draft.categoryName = categoryMatch[1].trim()
  }

  draft.description = message.trim()

  const hasData = Boolean(
    draft.name || draft.sku || draft.description || draft.price !== null || draft.stock !== null,
  )

  return hasData ? draft : null
}

function detectIntent(message: string, currentPath?: string) {
  const lower = message.toLowerCase()

  if (
    currentPath === '/products/new' ||
    lower.includes('product') ||
    lower.includes('sku') ||
    lower.includes('stock') ||
    lower.includes('price') ||
    lower.includes('category')
  ) {
    return 'product_form_fill' as const
  }

  if (
    lower.includes('tax') ||
    lower.includes('vat') ||
    lower.includes('invoice') ||
    lower.includes('hoa don') ||
    lower.includes('thue')
  ) {
    return 'tax_advice' as const
  }

  return 'onboarding' as const
}

function fallbackAssistantResponse(request: AssistantRequest): AssistantResponse {
  const intent = detectIntent(request.message, request.currentPath)
  const draft = intent === 'product_form_fill' ? extractDraftFromText(request.message) : null

  if (intent === 'onboarding') {
    return {
      intent,
      reply:
        'I can guide you through the website. Dashboard shows store activity, Products lists inventory items, Categories organizes stock groups, and Add Product is where I help collect fields for a new item.',
      productDraft: null,
      suggestions: ['Ask me how to add a new product.', 'Ask me which page manages stock items.'],
      warnings: [],
    }
  }

  if (intent === 'tax_advice') {
    return {
      intent,
      reply:
        'I can give general Vietnam tax workflow guidance around invoices, VAT-related records, and stock documentation, but please confirm legal details with official regulations or a qualified accountant.',
      productDraft: null,
      suggestions: [
        'Ask which records to keep for stock and invoices.',
        'Ask how product records support tax documentation.',
      ],
      warnings: ['This is operational guidance, not legal or accounting advice.'],
    }
  }

  return {
    intent,
    reply:
      draft
        ? 'I extracted a product draft from your voice input. Please confirm the fields I captured and tell me what still needs correction.'
        : 'I am ready to help fill the add-product form. Please say the product name, SKU, category, description, sale price, and initial stock.',
    productDraft: draft,
    suggestions: [
      'Say the product name and SKU clearly.',
      'Mention category, sale price, and initial stock.',
    ],
    warnings: draft ? [] : ['I could not extract enough product data from that recording yet.'],
  }
}

function parseAssistantPayload(rawText: string): AssistantResponse {
  const parsed = JSON.parse(rawText) as AssistantResponse

  return {
    intent: parsed.intent,
    reply: parsed.reply,
    transcript: parsed.transcript,
    productDraft: parsed.productDraft,
    suggestions: parsed.suggestions ?? [],
    warnings: parsed.warnings ?? [],
  }
}

function stringifyConversation(conversation: AssistantMessage[] = []) {
  return conversation
    .slice(-8)
    .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
    .join('\n')
}

async function generateConversationReply(request: AssistantRequest) {
  if (!openai) {
    return fallbackAssistantResponse(request)
  }

  const conversationPrompt = `
You are the Agora conversation agent for a seller support app.
Your jobs are:
1. Instruct the user so they get familiar with the website.
2. Answer general questions related to stock workflows and high-level Vietnam tax record-keeping.
3. When the user is adding a new product, ask concise follow-up questions and ask the user to confirm extracted inputs.

Website guide:
${assistantKnowledgeRepository.getWebsiteGuide().map((item) => `- ${item}`).join('\n')}

Vietnam tax guidance rules:
${assistantKnowledgeRepository.getVietnamTaxGuide().map((item) => `- ${item}`).join('\n')}

Current path: ${request.currentPath || 'unknown'}

Return strict JSON:
{
  "intent": "onboarding" | "tax_advice" | "product_form_fill",
  "reply": "string",
  "suggestions": ["string"],
  "warnings": ["string"]
}

Do not return productDraft here.
If the user is providing product data, set intent to "product_form_fill" and ask the user to confirm or provide missing fields.`

  const completion = await openai.chat.completions.create({
    model: env.openaiModel,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: conversationPrompt },
      {
        role: 'user',
        content: `Conversation so far:\n${stringifyConversation(
          request.conversation,
        )}\n\nLatest user message:\n${request.message}`,
      },
    ],
  })

  const content = completion.choices[0]?.message?.content
  if (!content) {
    return fallbackAssistantResponse(request)
  }

  try {
    const parsed = JSON.parse(content) as Omit<AssistantResponse, 'productDraft' | 'transcript'>
    return {
      intent: parsed.intent,
      reply: parsed.reply,
      productDraft: null,
      suggestions: parsed.suggestions ?? [],
      warnings: parsed.warnings ?? [],
    } satisfies AssistantResponse
  } catch {
    return fallbackAssistantResponse(request)
  }
}

async function extractProductDraft(request: AssistantRequest) {
  if (!openai) {
    return extractDraftFromText(request.message)
  }

  const extractionPrompt = `
You are an LLM extraction agent.
Your only task is to convert the seller's spoken product information into JSON for the add-product form.

Return strict JSON:
{
  "productDraft": {
    "name": "string",
    "sku": "string",
    "description": "string",
    "price": number|null,
    "stock": number|null,
    "categoryName": "string"
  } | null
}

If a field is missing, leave it empty or null.
Do not include any explanation outside JSON.`

  const completion = await openai.chat.completions.create({
    model: env.openaiModel,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: extractionPrompt },
      {
        role: 'user',
        content: `Conversation so far:\n${stringifyConversation(
          request.conversation,
        )}\n\nLatest user message:\n${request.message}`,
      },
    ],
  })

  const content = completion.choices[0]?.message?.content
  if (!content) {
    return extractDraftFromText(request.message)
  }

  try {
    const parsed = JSON.parse(content) as { productDraft: ProductDraft | null }
    return parsed.productDraft
  } catch {
    return extractDraftFromText(request.message)
  }
}

export const assistantService = {
  async transcribeAudio(file: Express.Multer.File) {
    if (!openai) {
      throw new Error(
        'Voice mode requires OPENAI_API_KEY on the backend so audio can be transcribed.',
      )
    }

    const transcript = await openai.audio.transcriptions.create({
      file: await toFile(file.buffer, file.originalname || 'voice.webm', {
        type: file.mimetype || 'audio/webm',
      }),
      model: env.openaiTranscriptionModel,
    })

    return transcript.text
  },

  async respond(request: AssistantRequest): Promise<AssistantResponse> {
    const conversationReply = await generateConversationReply(request)

    if (conversationReply.intent !== 'product_form_fill') {
      return conversationReply
    }

    const productDraft = await extractProductDraft(request)

    return parseAssistantPayload(
      JSON.stringify({
        intent: conversationReply.intent,
        reply: conversationReply.reply,
        productDraft,
        suggestions: conversationReply.suggestions,
        warnings:
          productDraft === null
            ? [...conversationReply.warnings, 'No structured product draft has been confirmed yet.']
            : conversationReply.warnings,
      }),
    )
  },
}
