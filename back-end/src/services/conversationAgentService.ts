import OpenAI from 'openai'
import { env } from '../config/env'
import { assistantKnowledgeRepository } from '../repositories/assistantKnowledgeRepository'
import { categoryRepository } from '../repositories/categoryRepository'
import type { AssistantResponse } from '../types/domain'
import {
  buildProductReply,
  detectIntent,
  extractJsonObject,
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

  if (intent === 'website_guidance') {
    return {
      intent,
      responseSource: 'agent',
      reply:
        'I can guide you through the website. Dashboard shows store activity, Products lists inventory items, Categories organizes stock groups, and Add Product is where I help collect fields for a new item.',
      productDraft: null,
      suggestions: ['Ask me how to add a new product.', 'Ask me which page manages stock items.'],
      warnings: [],
    }
  }

  const productReply = buildProductReply(draft)

  return {
    intent,
    responseSource: 'agent',
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
2. When the user is adding a new product, ask concise follow-up questions and ask the user to confirm extracted inputs.

Website guide:
${assistantKnowledgeRepository.getWebsiteGuide().map((item) => `- ${item}`).join('\n')}

Current category list:
${categories.map((category) => `- ${category.name}`).join('\n') || '- No categories found'}

Current path: ${request.currentPath || 'unknown'}

Return strict JSON:
{
  "intent": "website_guidance" | "product_form_fill",
  "responseSource": "agent",
  "reply": "string",
  "suggestions": ["string"],
  "warnings": ["string"]
}

Do not return productDraft here.
If the user is providing product data, set intent to "product_form_fill".
Otherwise set intent to "website_guidance".
When product data is partial, ask only for the missing fields.
When product data seems complete, ask the user to confirm the captured fields before submission.
When the user explicitly asks you to search online or generate the product form from internet data, mention that you searched online and ask the user to confirm the generated details before saving.
Do not answer tax-law questions here because those are handled by a separate RAG flow.
Keep replies short, spoken, and practical.`

    const response = await openai.responses.create({
      model: env.openaiModel,
      ...(internetLookup ? {} : { text: { format: { type: 'json_object' } } }),
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
      const parsed = JSON.parse(
        extractJsonObject(content),
      ) as Omit<AssistantResponse, 'productDraft' | 'transcript'>
      return {
        intent: parsed.intent,
        responseSource: 'agent',
        reply: parsed.reply,
        productDraft: null,
        suggestions: parsed.suggestions ?? [],
        warnings: parsed.warnings ?? [],
        answered: parsed.answered,
        confidence: parsed.confidence,
        citations: parsed.citations ?? [],
      }
    } catch {
      return fallbackAssistantResponse(request)
    }
  },
}
