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
        'Start an Agora session to connect the website with the remote voice agent. The backend will turn the agent transcript into replies and JSON for the add-product form.',
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
