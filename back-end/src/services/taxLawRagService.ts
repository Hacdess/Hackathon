import OpenAI from 'openai'
import { execFile } from 'node:child_process'
import path from 'node:path'
import { promisify } from 'node:util'
import type { AssistantRequest } from './assistantShared'
import type { AssistantCitation, AssistantResponse } from '../types/domain'
import { env } from '../config/env'

const execFileAsync = promisify(execFile)
const openai = env.openaiApiKey ? new OpenAI({ apiKey: env.openaiApiKey }) : null

type RagCliResponse = {
  question?: string
  answer?: string
  answered?: boolean
  confidence?: number
  sources?: Array<{
    chunk_id?: string
    score?: number
    symbol?: string
    title?: string
    detail_url?: string
    issue_date?: string
    effective_date?: string
    document_type?: string
    issuing_agency?: string
    excerpt?: string
    source_file?: string
  }>
}

async function translateForVietnameseRag(question: string) {
  if (!openai) {
    return question.trim()
  }

  const response = await openai.responses.create({
    model: env.openaiModel,
    input: [
      {
        role: 'system',
        content:
          'Translate the user question into natural Vietnamese for retrieval against a Vietnamese tax-law corpus. If the question is already Vietnamese, keep it Vietnamese and lightly normalize wording for search. Return plain text only.',
      },
      {
        role: 'user',
        content: question,
      },
    ],
  })

  return response.output_text.trim() || question.trim()
}

async function translateAnswerToEnglish(answer: string) {
  if (!openai) {
    return answer.trim()
  }

  const response = await openai.responses.create({
    model: env.openaiModel,
    input: [
      {
        role: 'system',
        content:
          'Translate the assistant answer into clear English. Preserve legal citations, document symbols, dates, and numeric values exactly. Return plain text only.',
      },
      {
        role: 'user',
        content: answer,
      },
    ],
  })

  return response.output_text.trim() || answer.trim()
}

function resolveRepoRoot() {
  return path.resolve(__dirname, '../../..')
}

function resolveRagScriptPath() {
  return path.join(resolveRepoRoot(), 'back-end', 'src', 'rag', 'RAG_tool.py')
}

function resolveCorpusDir() {
  if (env.ragCorpusDir) {
    return path.resolve(env.ragCorpusDir)
  }

  return path.join(resolveRepoRoot(), 'output_tax_laws', 'json_by_symbol')
}

function mapCitations(sources: RagCliResponse['sources']): AssistantCitation[] {
  return (sources ?? []).map((source) => ({
    chunkId: source.chunk_id ?? '',
    score: typeof source.score === 'number' ? source.score : 0,
    symbol: source.symbol ?? '',
    title: source.title ?? '',
    detailUrl: source.detail_url ?? '',
    issueDate: source.issue_date ?? '',
    effectiveDate: source.effective_date ?? '',
    documentType: source.document_type ?? '',
    issuingAgency: source.issuing_agency ?? '',
    excerpt: source.excerpt ?? '',
    sourceFile: source.source_file ?? '',
  }))
}

function fallbackResponse(message: string, warning: string): AssistantResponse {
  return {
    intent: 'tax_law_rag',
    responseSource: 'rag',
    reply: 'I could not retrieve the tax-law answer from the indexed corpus right now.',
    productDraft: null,
    suggestions: [
      'Ask a more specific tax-law question with the document symbol if you have it.',
      'Try again after checking that the tax-law corpus is available on the backend.',
    ],
    warnings: [warning],
    answered: false,
    confidence: 0,
    citations: [],
  }
}

export const taxLawRagService = {
  async answer(request: AssistantRequest): Promise<AssistantResponse> {
    const question = request.message.trim()
    if (!question) {
      return fallbackResponse(request.message, 'Tax-law question is empty.')
    }

    try {
      const scriptPath = resolveRagScriptPath()
      const corpusDir = resolveCorpusDir()
      const command = env.pythonCommand || 'python'
      const ragQuestion = await translateForVietnameseRag(question)
      const { stdout } = await execFileAsync(
        command,
        [scriptPath, '--question', ragQuestion, '--corpus-dir', corpusDir],
        {
          cwd: resolveRepoRoot(),
          timeout: 30_000,
          maxBuffer: 4 * 1024 * 1024,
        },
      )

      const parsed = JSON.parse(stdout) as RagCliResponse
      const citations = mapCitations(parsed.sources)
      const translatedReply = parsed.answer?.trim()
        ? await translateAnswerToEnglish(parsed.answer)
        : 'I could not find a supported answer in the indexed tax-law corpus.'

      return {
        intent: 'tax_law_rag',
        responseSource: 'rag',
        reply: translatedReply,
        productDraft: null,
        suggestions:
          citations.length > 0
            ? [
                'Ask for the effective date or issuing agency of the cited document.',
                'Ask for another tax-law document by symbol if you need a comparison.',
              ]
            : [
                'Ask a narrower question about VAT, invoices, decrees, or circulars.',
                'Include the document symbol if you already know it.',
              ],
        warnings: [
          ...(ragQuestion !== question ? ['Question translated to Vietnamese for corpus retrieval.'] : []),
          ...(parsed.answered === false ? ['Answer limited to indexed tax-law documents only.'] : []),
        ],
        answered: parsed.answered ?? false,
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0,
        citations,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown RAG execution error.'
      return fallbackResponse(request.message, `Tax-law RAG execution failed: ${message}`)
    }
  },
}

