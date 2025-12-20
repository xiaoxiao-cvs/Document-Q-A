import { useCallback, useRef } from 'react'
import { useAppStore } from '@/store'
import { chatApi } from '@/api'
import { Message, Source } from '@/types'

export const useChat = () => {
  const {
    messages,
    isChatLoading,
    isStreaming,
    streamingContent,
    selectedDocumentIds,
    addMessage,
    updateLastMessage,
    setIsChatLoading,
    setIsStreaming,
    setStreamingContent,
    appendStreamingContent,
    navigateToSource,
  } = useAppStore()

  // Abort controller for canceling streaming
  const abortControllerRef = useRef<AbortController | null>(null)

  // Send a message with streaming support
  const sendMessage = useCallback(async (query: string, useStreaming = true) => {
    if (!query.trim()) return

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
    setStreamingContent('')

    try {
      if (useStreaming) {
        // 流式输出
        setIsStreaming(true)
        
        // Create placeholder for AI message
        const aiMessageId = (Date.now() + 1).toString()
        const aiMessage: Message = {
          id: aiMessageId,
          role: 'assistant',
          content: '',
          timestamp: new Date().toISOString(),
          sources: [],
        }
        addMessage(aiMessage)

        let accumulatedContent = ''
        let receivedSources: Source[] = []

        await chatApi.sendMessageStream(
          {
            query: query.trim(),
            document_ids: selectedDocumentIds.length > 0 ? selectedDocumentIds : undefined,
            top_k: 5,
          },
          // On chunk received
          (chunk) => {
            accumulatedContent += chunk
            setStreamingContent(accumulatedContent)
            updateLastMessage(accumulatedContent)
          },
          // On sources received
          (sources) => {
            receivedSources = sources
            // Update the last message with sources
            const state = useAppStore.getState()
            const msgs = [...state.messages]
            if (msgs.length > 0) {
              msgs[msgs.length - 1] = {
                ...msgs[msgs.length - 1],
                sources: receivedSources,
              }
              useAppStore.setState({ messages: msgs })
            }
          },
          // On error
          (error) => {
            console.error('Streaming error:', error)
            updateLastMessage(accumulatedContent || `抱歉，发生了错误：${error.message}`)
          },
          // On complete
          () => {
            setIsStreaming(false)
          }
        )
      } else {
        // 非流式输出
        const response = await chatApi.sendMessage({
          query: query.trim(),
          document_ids: selectedDocumentIds.length > 0 ? selectedDocumentIds : undefined,
          top_k: 5,
        })

        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.answer,
          timestamp: new Date().toISOString(),
          sources: response.sources,
        }
        addMessage(aiMessage)
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      
      // Add error message
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: error instanceof Error 
          ? `抱歉，发生了错误：${error.message}` 
          : '抱歉，发生了未知错误。请稍后重试。',
        timestamp: new Date().toISOString(),
      }
      addMessage(errorMessage)
      
      throw error
    } finally {
      setIsChatLoading(false)
      setIsStreaming(false)
    }
  }, [selectedDocumentIds, addMessage, updateLastMessage, setIsChatLoading, setIsStreaming, setStreamingContent])

  // Navigate to source in PDF
  const goToSource = useCallback((source: Source) => {
    navigateToSource(source)
  }, [navigateToSource])

  // Cancel streaming
  const cancelStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setIsStreaming(false)
    setIsChatLoading(false)
  }, [setIsStreaming, setIsChatLoading])

  return {
    messages,
    isChatLoading,
    isStreaming,
    streamingContent,
    sendMessage,
    goToSource,
    cancelStreaming,
  }
}
