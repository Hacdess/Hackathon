import OpenAI from 'openai'
import { env } from '../config/env'
import { assistantKnowledgeRepository } from '../repositories/assistantKnowledgeRepository'
import { categoryRepository } from '../repositories/categoryRepository'
import type { AssistantResponse } from '../types/domain'
import {
  buildProductReply,
  detectIntent,
  extractDraftFromText,
  getUserConversationText,
  stringifyConversation,
  type AssistantRequest,
  wantsInternetLookup,
} from './assistantShared'

const openai = env.openaiApiKey ? new OpenAI({ apiKey: env.openaiApiKey }) : null

function fallbackAssistantResponse(request: AssistantRequest): AssistantResponse {
  const intent = detectIntent(request.message, request.currentPath)
  const draft =
    intent === 'product_form_fill' ? extractDraftFromText(getUserConversationText(request)) : null

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

export const conversationAgentService = {
  fallbackAssistantResponse,

  async generateReply(request: AssistantRequest): Promise<AssistantResponse> {
    if (!openai) {
      return fallbackAssistantResponse(request)
    }

    const internetLookup = wantsInternetLookup(request.message, request.currentPath)
    const categories = await categoryRepository.findAll()
    const conversationPrompt = `
You are the first conversation agent for a seller support app.
Your jobs are:
1. Instruct the user so they get familiar with the website.
2. Answer general questions related to stock workflows and high-level Vietnam tax record-keeping.
3. When the user is adding a new product, ask concise follow-up questions and ask the user to confirm extracted inputs.

Website guide:
${assistantKnowledgeRepository.getWebsiteGuide().map((item) => `- ${item}`).join('\n')}

Vietnam tax guidance rules:
${assistantKnowledgeRepository.getVietnamTaxGuide().map((item) => `- ${item}`).join('\n')}

Current category list:
${categories.map((category) => `- ${category.name}`).join('\n') || '- No categories found'}

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
When the user explicitly asks you to search online or generate the product form from internet data, mention that you searched online and ask the user to confirm the generated details before saving.
Keep replies short, spoken, and practical.`

    const response = await openai.responses.create({
      model: env.openaiModel,
      text: { format: { type: 'json_object' } },
      tools: internetLookup ? [{ type: 'web_search' }] : [],
      input: [
        { role: 'system', content: conversationPrompt },
        {
          role: 'user',
          content: `Conversation so far:\n${stringifyConversation(
            request.conversation,
          )}\n\nLatest user message:\n${request.message}`,
        },
      ],
    })

    const content = response.output_text
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
      }
    } catch {
      return fallbackAssistantResponse(request)
    }
  },
}
