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

function getMissingDraftFields(draft: ProductDraft | null) {
  if (!draft) {
    return ['name', 'sku', 'category', 'description', 'price', 'stock']
  }

  const missing: string[] = []

  if (!draft.name.trim()) {
    missing.push('name')
  }
  if (!draft.sku.trim()) {
    missing.push('sku')
  }
  if (!draft.categoryName.trim()) {
    missing.push('category')
  }
  if (!draft.description.trim()) {
    missing.push('description')
  }
  if (draft.price === null) {
    missing.push('price')
  }
  if (draft.stock === null) {
    missing.push('stock')
  }

  return missing
}

function formatMissingFields(missingFields: string[]) {
  if (missingFields.length === 0) {
    return 'No required fields are missing.'
  }

  if (missingFields.length === 1) {
    return missingFields[0]
  }

  return `${missingFields.slice(0, -1).join(', ')}, and ${missingFields.at(-1)}`
}

function buildProductReply(draft: ProductDraft | null) {
  const missingFields = getMissingDraftFields(draft)

  if (!draft) {
    return {
      reply:
        'I am ready to help fill the add-product form. Please say the product name, SKU, category, description, sale price, and initial stock.',
      suggestions: [
        'Say the product name and SKU clearly.',
        'Mention category, sale price, and initial stock.',
      ],
      warnings: ['I could not extract enough product data from that recording yet.'],
    }
  }

  if (missingFields.length === 0) {
    return {
      reply:
        'I filled the add-product draft and sent it to the form. Please review the values and confirm if the name, SKU, category, description, sale price, and initial stock are correct.',
      suggestions: [
        'Confirm the draft if everything looks correct.',
        'Tell me exactly which field should be changed if anything is wrong.',
      ],
      warnings: [],
    }
  }

  return {
    reply: `I filled part of the add-product draft and sent it to the form. Please confirm the captured values and tell me the missing ${formatMissingFields(
      missingFields,
    )}.`,
    suggestions: [
      'Confirm the fields that are already correct.',
      `Provide the missing ${formatMissingFields(missingFields)}.`,
    ],
    warnings: [`Missing product fields: ${missingFields.join(', ')}`],
  }
}

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

  const productReply = buildProductReply(draft)

  return {
    intent,
    reply: productReply.reply,
    productDraft: draft,
    suggestions: productReply.suggestions,
    warnings: productReply.warnings,
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
If the user is providing product data, set intent to "product_form_fill".
When product data is partial, ask only for the missing fields.
When product data seems complete, ask the user to confirm the captured fields before submission.
Keep replies short, spoken, and practical.`

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
    const missingFields = getMissingDraftFields(productDraft)
    const productReply = buildProductReply(productDraft)

    return parseAssistantPayload(
      JSON.stringify({
        intent: conversationReply.intent,
        reply: productReply.reply,
        productDraft,
        suggestions:
          conversationReply.suggestions.length > 0
            ? conversationReply.suggestions
            : productReply.suggestions,
        warnings: [...conversationReply.warnings, ...productReply.warnings, ...(missingFields.length
          ? [`Waiting for confirmation or missing values: ${missingFields.join(', ')}`]
          : ['Draft ready for user confirmation.'])],
      }),
    )
  },
}
