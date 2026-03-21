import { createContext, useContext, useMemo, useState } from 'react'
import type { Dispatch, ReactNode, SetStateAction } from 'react'
import type { AssistantMessage, ProductDraft } from '../lib/api'

type AssistantContextValue = {
  messages: AssistantMessage[]
  productDraft: ProductDraft | null
  setMessages: Dispatch<SetStateAction<AssistantMessage[]>>
  setProductDraft: Dispatch<SetStateAction<ProductDraft | null>>
  clearProductDraft: () => void
}

const AssistantContext = createContext<AssistantContextValue | undefined>(undefined)

export function AssistantProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      role: 'assistant',
      content:
        'Start talking to the AI assistant. It can guide you around the website, answer stock and Vietnam tax workflow questions, and help fill and confirm the add-product form.',
    },
  ])
  const [productDraft, setProductDraft] = useState<ProductDraft | null>(null)

  const value = useMemo(
    () => ({
      messages,
      productDraft,
      setMessages,
      setProductDraft,
      clearProductDraft() {
        setProductDraft(null)
      },
    }),
    [messages, productDraft],
  )

  return <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>
}

export function useAssistant() {
  const context = useContext(AssistantContext)

  if (!context) {
    throw new Error('useAssistant must be used within AssistantProvider.')
  }

  return context
}
