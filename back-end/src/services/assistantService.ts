import type { AssistantResponse } from '../types/domain'
import {
  buildProductReply,
  getMissingDraftFields,
  hasConfirmationIntent,
  parseAssistantPayload,
  prepareProductDraft,
  type AssistantRequest,
} from './assistantShared'
import { conversationAgentService } from './conversationAgentService'
import { productExtractionService } from './productExtractionService'
import { speechService } from './speechService'

export const assistantService = {
  async transcribeAudio(file: Express.Multer.File) {
    return speechService.transcribeAudio(file)
  },

  async respond(request: AssistantRequest): Promise<AssistantResponse> {
    const conversationReply = await conversationAgentService.generateReply(request)

    if (conversationReply.intent !== 'product_form_fill') {
      return conversationReply
    }

    const extractedDraft = await productExtractionService.extractDraft(request)
    const preparedDraft = await prepareProductDraft(request, extractedDraft)
    const productDraft = preparedDraft.draft
    const missingFields = getMissingDraftFields(productDraft)
    const productReply = buildProductReply(productDraft, {
      generatedFields: preparedDraft.generatedFields,
      normalizedCategory: preparedDraft.normalizedCategory,
      skuCollisionResolved: preparedDraft.skuCollisionResolved,
      userConfirmed: hasConfirmationIntent(request.message),
    })

    return parseAssistantPayload(
      JSON.stringify({
        intent: conversationReply.intent,
        reply: productReply.reply,
        productDraft,
        suggestions:
          conversationReply.suggestions.length > 0
            ? conversationReply.suggestions
            : productReply.suggestions,
        warnings: [
          ...conversationReply.warnings,
          ...preparedDraft.warnings,
          ...productReply.warnings,
          ...(missingFields.length
            ? [`Waiting for confirmation or missing values: ${missingFields.join(', ')}`]
            : ['Draft ready for user confirmation.']),
        ],
      }),
    )
  },
}
