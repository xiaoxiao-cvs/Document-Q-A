import { useCallback } from 'react'
import { useAppStore } from '@/store'
import { chatApi } from '@/api'
import { Message } from '@/types'

export const useChat = () => {
  const {
    messages,
    isChatLoading,
    selectedDocumentIds,
    addMessage,
    setIsChatLoading,
  } = useAppStore()

  // Send a message
  const sendMessage = useCallback(async (query: string) => {
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: query,
      timestamp: new Date().toISOString(),
    }
    addMessage(userMessage)

    // Set loading state
    setIsChatLoading(true)

    try {
      // Call API
      const response = await chatApi.sendMessage({
        query,
        document_ids: selectedDocumentIds.length > 0 ? selectedDocumentIds : undefined,
        top_k: 3,
      })

      // Add AI response
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.answer,
        timestamp: new Date().toISOString(),
        sources: response.sources,
      }
      addMessage(aiMessage)

      return response
    } catch (error) {
      console.error('Failed to send message:', error)
      
      // Add error message
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '抱歉，发生了错误。请稍后重试。',
        timestamp: new Date().toISOString(),
      }
      addMessage(errorMessage)
      
      throw error
    } finally {
      setIsChatLoading(false)
    }
  }, [selectedDocumentIds, addMessage, setIsChatLoading])

  return {
    messages,
    isChatLoading,
    sendMessage,
  }
}
