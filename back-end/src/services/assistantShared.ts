import { categoryRepository } from '../repositories/categoryRepository'
import { productRepository } from '../repositories/productRepository'
import type { AssistantIntent, AssistantMessage, AssistantResponse, Category, ProductDraft } from '../types/domain'

export type AssistantRequest = {
  message: string
  currentPath?: string
  conversation?: AssistantMessage[]
}

const productHintKeywords: Record<string, string[]> = {
  Electronics: ['laptop', 'phone', 'tablet', 'monitor', 'keyboard', 'mouse', 'headphone', 'camera'],
  Accessories: ['cable', 'charger', 'adapter', 'case', 'bag', 'dock', 'stand', 'strap'],
}

export const emptyDraft = (): ProductDraft => ({
  name: '',
  sku: '',
  description: '',
  price: null,
  stock: null,
  categoryName: '',
})

export function getMissingDraftFields(draft: ProductDraft | null) {
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

export function formatMissingFields(missingFields: string[]) {
  if (missingFields.length === 0) {
    return 'No required fields are missing.'
  }

  if (missingFields.length === 1) {
    return missingFields[0]
  }

  return `${missingFields.slice(0, -1).join(', ')}, and ${missingFields.at(-1)}`
}

export function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

export function extractDraftFromText(message: string): ProductDraft | null {
  const draft = emptyDraft()
  const lower = message.toLowerCase()

  const nameMatch = message.match(/(?:product|item|name)\s*(?:is|:)?\s*([^.,"\n]+)/i)
  const skuMatch = message.match(/sku\s*(?:is|:)?\s*([A-Z0-9-]+)/i)
  const priceMatch = message.match(/(?:price|cost)\s*(?:is|:)?\s*\$?(\d+(?:\.\d+)?)/i)
  const stockMatch = message.match(/(?:stock|quantity|units?)\s*(?:is|:)?\s*(\d+)/i)
  const categoryMatch = message.match(/(?:category)\s*(?:is|:)?\s*([^.,"\n]+)/i)
  const descriptionMatch = message.match(
    /(?:description|details|summary)\s*(?:is|:)?\s*([^.]+(?:\.[^.]+){0,1})/i,
  )

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

  if (descriptionMatch) {
    draft.description = normalizeWhitespace(descriptionMatch[1])
  }

  const hasData = Boolean(
    draft.name || draft.sku || draft.description || draft.price !== null || draft.stock !== null,
  )

  return hasData ? draft : null
}

export function detectIntent(message: string, currentPath?: string): AssistantIntent {
  const lower = message.toLowerCase()

  if (
    currentPath === '/products/new' ||
    lower.includes('product') ||
    lower.includes('sku') ||
    lower.includes('stock') ||
    lower.includes('price') ||
    lower.includes('category')
  ) {
    return 'product_form_fill'
  }

  if (
    lower.includes('tax') ||
    lower.includes('vat') ||
    lower.includes('invoice') ||
    lower.includes('hoa don') ||
    lower.includes('thue')
  ) {
    return 'tax_advice'
  }

  return 'onboarding'
}

export function wantsInternetLookup(message: string, currentPath?: string) {
  const lower = message.toLowerCase()

  return (
    lower.includes('from the internet') ||
    lower.includes('from internet') ||
    lower.includes('search the web') ||
    lower.includes('search online') ||
    lower.includes('look it up') ||
    lower.includes('find the product details') ||
    lower.includes('auto generate') ||
    lower.includes('generate the fields') ||
    lower.includes('fill the form for me') ||
    ((currentPath === '/products/new' || lower.includes('add product')) &&
      (lower.includes('autofill') ||
        lower.includes('complete the form') ||
        lower.includes('use defaults') ||
        lower.includes('you decide')))
  )
}

export function hasConfirmationIntent(message: string) {
  const lower = message.toLowerCase().trim()

  return (
    lower === 'yes' ||
    lower === 'correct' ||
    lower === 'confirmed' ||
    lower === 'looks good' ||
    lower === 'all good' ||
    lower.includes('i confirm') ||
    lower.includes('looks correct') ||
    lower.includes('that is correct')
  )
}

export function mergeDrafts(base: ProductDraft | null, incoming: ProductDraft | null): ProductDraft | null {
  if (!base && !incoming) {
    return null
  }

  return {
    name: normalizeWhitespace(incoming?.name || base?.name || ''),
    sku: normalizeWhitespace(incoming?.sku || base?.sku || ''),
    description: normalizeWhitespace(incoming?.description || base?.description || ''),
    price: incoming?.price ?? base?.price ?? null,
    stock: incoming?.stock ?? base?.stock ?? null,
    categoryName: normalizeWhitespace(incoming?.categoryName || base?.categoryName || ''),
  }
}

export function getUserConversationText(request: AssistantRequest) {
  const priorUserMessages =
    request.conversation
      ?.filter((message) => message.role === 'user')
      .map((message) => message.content)
      .filter(Boolean) ?? []

  return [...priorUserMessages, request.message].join('\n')
}

export function stringifyConversation(conversation: AssistantMessage[] = []) {
  return conversation
    .slice(-8)
    .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
    .join('\n')
}

export function parseAssistantPayload(rawText: string): AssistantResponse {
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

export function buildProductReply(
  draft: ProductDraft | null,
  options?: {
    generatedFields?: string[]
    normalizedCategory?: string | null
    skuCollisionResolved?: boolean
    userConfirmed?: boolean
  },
) {
  const missingFields = getMissingDraftFields(draft)
  const generatedFields = options?.generatedFields ?? []
  const helperNotes: string[] = []

  if (options?.normalizedCategory) {
    helperNotes.push(`I matched the category to ${options.normalizedCategory}.`)
  }

  if (generatedFields.length > 0) {
    helperNotes.push(`I generated ${formatMissingFields(generatedFields)} to speed up the form.`)
  }

  if (options?.skuCollisionResolved) {
    helperNotes.push('I adjusted the SKU so it does not clash with an existing product.')
  }

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
    const reply = options?.userConfirmed
      ? 'Great, the add-product draft looks complete. I kept the values in the form. Please do one final visual review and save it when you are ready.'
      : 'I filled the add-product draft and sent it to the form. Please review the values and confirm if the name, SKU, category, description, sale price, and initial stock are correct.'

    return {
      reply,
      suggestions: [
        'Confirm the draft if everything looks correct.',
        'Tell me exactly which field should be changed if anything is wrong.',
      ],
      warnings: helperNotes,
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
    warnings: [...helperNotes, `Missing product fields: ${missingFields.join(', ')}`],
  }
}

function slugifySkuPart(value: string) {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
}

async function ensureUniqueSku(baseSku: string) {
  const candidate = slugifySkuPart(baseSku)
  if (!candidate) {
    return ''
  }

  let attempt = candidate.slice(0, 32)
  let suffix = 2

  while (await productRepository.findBySku(attempt)) {
    const trimmedBase = candidate.slice(0, Math.max(1, 29 - String(suffix).length))
    attempt = `${trimmedBase}-${suffix}`
    suffix += 1
  }

  return attempt
}

function inferCategoryFromDraft(draft: ProductDraft, categories: Category[]) {
  const haystack = `${draft.name} ${draft.description}`.toLowerCase()

  for (const category of categories) {
    if (haystack.includes(category.name.toLowerCase())) {
      return category
    }
  }

  for (const category of categories) {
    const keywords = productHintKeywords[category.name] ?? []
    if (keywords.some((keyword) => haystack.includes(keyword))) {
      return category
    }
  }

  return null
}

export async function prepareProductDraft(request: AssistantRequest, extractedDraft: ProductDraft | null) {
  let draft = mergeDrafts(extractDraftFromText(getUserConversationText(request)), extractedDraft)
  if (!draft) {
    return {
      draft: null,
      generatedFields: [] as string[],
      warnings: [] as string[],
      normalizedCategory: null as string | null,
      skuCollisionResolved: false,
    }
  }

  const generatedFields: string[] = []
  const warnings: string[] = []
  const categories = await categoryRepository.findAll()
  let normalizedCategory: string | null = null
  let skuCollisionResolved = false

  draft = {
    ...draft,
    name: normalizeWhitespace(draft.name),
    sku: normalizeWhitespace(draft.sku).toUpperCase(),
    description: normalizeWhitespace(draft.description),
    categoryName: normalizeWhitespace(draft.categoryName),
    price: draft.price !== null && Number.isFinite(draft.price) && draft.price >= 0 ? draft.price : null,
    stock: draft.stock !== null && Number.isFinite(draft.stock) && draft.stock >= 0 ? draft.stock : null,
  }

  if (draft.categoryName) {
    const exactCategory = await categoryRepository.findByName(draft.categoryName)
    if (exactCategory) {
      draft.categoryName = exactCategory.name
      normalizedCategory = exactCategory.name
    } else {
      const fuzzyCategory = categories.find((category) =>
        category.name.toLowerCase().includes(draft.categoryName.toLowerCase()) ||
        draft.categoryName.toLowerCase().includes(category.name.toLowerCase()),
      )

      if (fuzzyCategory) {
        draft.categoryName = fuzzyCategory.name
        normalizedCategory = fuzzyCategory.name
      }
    }
  }

  if (!draft.categoryName) {
    const inferredCategory = inferCategoryFromDraft(draft, categories)
    if (inferredCategory) {
      draft.categoryName = inferredCategory.name
      normalizedCategory = inferredCategory.name
      generatedFields.push('category')
    }
  }

  if (!draft.sku && draft.name) {
    draft.sku = await ensureUniqueSku(draft.name)
    if (draft.sku) {
      generatedFields.push('SKU')
    }
  } else if (draft.sku) {
    const existingProduct = await productRepository.findBySku(draft.sku)
    if (existingProduct && existingProduct.name.toLowerCase() !== draft.name.toLowerCase()) {
      draft.sku = await ensureUniqueSku(draft.sku)
      skuCollisionResolved = true
      warnings.push('The requested SKU already exists, so I suggested a unique SKU instead.')
    }
  }

  if ((!draft.description || draft.description.length < 12) && draft.name) {
    draft.description = draft.categoryName
      ? `${draft.name} in the ${draft.categoryName} category. Please review and adjust the details before saving.`
      : `${draft.name}. Please review and refine the product details before saving.`
    generatedFields.push('description')
  }

  if (draft.stock === null && wantsInternetLookup(request.message, request.currentPath)) {
    draft.stock = 0
    generatedFields.push('stock')
    warnings.push('Initial stock was not available online, so I set it to 0 for review.')
  }

  return {
    draft,
    generatedFields,
    warnings,
    normalizedCategory,
    skuCollisionResolved,
  }
}
