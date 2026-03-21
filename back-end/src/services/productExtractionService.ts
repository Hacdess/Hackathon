import OpenAI from 'openai'
import { env } from '../config/env'
import { categoryRepository } from '../repositories/categoryRepository'
import type { ProductDraft } from '../types/domain'
import {
  coerceProductDraft,
  extractJsonObject,
  extractDraftFromText,
  stringifyConversation,
  type AssistantRequest,
  wantsInternetLookup,
} from './assistantShared'

const openai = env.openaiApiKey ? new OpenAI({ apiKey: env.openaiApiKey }) : null

export const productExtractionService = {
  async extractDraft(request: AssistantRequest): Promise<ProductDraft | null> {
    if (!openai) {
      return extractDraftFromText(request.message)
    }

    const internetLookup = wantsInternetLookup(request.message, request.currentPath)
    const extractionPrompt = `
You are the second extraction agent.
Your only task is to convert the seller's spoken product information into JSON for the add-product form.
If the seller explicitly asks you to look up the product online, you may search the web to gather likely product details.

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
Prefer an existing category name when the seller refers to one loosely.
Do not include any explanation outside JSON.`

    const categories = await categoryRepository.findAll()
    const response = await openai.responses.create({
      model: env.openaiModel,
      ...(internetLookup ? {} : { text: { format: { type: 'json_object' } } }),
      tools: internetLookup ? [{ type: 'web_search' }] : [],
      input: [
        { role: 'system', content: extractionPrompt },
        {
          role: 'user',
          content: `Available categories:\n${categories
            .map((category) => `- ${category.name}`)
            .join('\n')}\n\nConversation so far:\n${stringifyConversation(
            request.conversation,
          )}\n\nLatest user message:\n${request.message}`,
        },
      ],
    })

    const content = response.output_text
    if (!content) {
      return extractDraftFromText(request.message)
    }

    try {
      const parsed = JSON.parse(extractJsonObject(content)) as {
        productDraft: ProductDraft | Record<string, unknown> | null
      }
      return coerceProductDraft(parsed.productDraft)
    } catch {
      return extractDraftFromText(request.message)
    }
  },
}
