import { useCallback, useRef } from 'react'
import { useAppStore } from '@/store'
import { chatApi } from '@/api'
import { Message, Source, TokenUsage } from '@/types'

export const useChat = () => {
  const {
    messages,
    isChatLoading,
    isStreaming,
    streamingContent,
    selectedDocumentIds,
    currentDocumentId,
    tokenUsage,
    addMessage,
    updateLastMessage,
    setIsChatLoading,
    setIsStreaming,
    setStreamingContent,
    navigateToSource,
    addTokenUsage,
  } = useAppStore()

  // Abort controller for canceling streaming
  const abortControllerRef = useRef<AbortController | null>(null)

  // Send a message with streaming support
  const sendMessage = useCallback(async (query: string, useStreaming = true) => {
    if (!query.trim()) return

    // 确定使用哪些文档ID
    const docIds = currentDocumentId 
      ? [currentDocumentId] 
      : (selectedDocumentIds.length > 0 ? selectedDocumentIds : undefined)

    // 检查文档状态
    if (docIds && docIds.length > 0) {
      const documents = useAppStore.getState().documents
      const selectedDocs = documents.filter(doc => docIds.includes(doc.id))
      
      // 检查是否有文档正在处理中
      const processingDocs = selectedDocs.filter(doc => 
        doc.status === 'pending' || doc.status === 'processing'
      )
      
      if (processingDocs.length > 0) {
        useAppStore.getState().showToast(
          '文档正在处理中，请稍后再试...',
          'warning'
        )
        return
      }
      
      // 检查是否有文档处理失败
      const failedDocs = selectedDocs.filter(doc => doc.status === 'failed')
      
      if (failedDocs.length > 0) {
        useAppStore.getState().showToast(
          `文档 "${failedDocs[0].filename}" 处理失败，无法提问`,
          'error'
        )
        return
      }
      
      // 检查是否有文档没有切片
      const emptyDocs = selectedDocs.filter(doc => !doc.chunk_count || doc.chunk_count === 0)
      
      if (emptyDocs.length > 0) {
        useAppStore.getState().showToast(
          '所选文档未生成有效内容，无法提问',
          'warning'
        )
        return
      }
    }

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
            document_ids: docIds,
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
          // On complete with usage
          (usage?: TokenUsage) => {
            setIsStreaming(false)
            if (usage) {
              addTokenUsage(usage)
            }
          }
        )
      } else {
        // 非流式输出
        const response = await chatApi.sendMessage({
          query: query.trim(),
          document_ids: docIds,
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
        
        // 添加 token 用量
        if (response.usage) {
          addTokenUsage(response.usage)
        }
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
  }, [currentDocumentId, selectedDocumentIds, addMessage, updateLastMessage, setIsChatLoading, setIsStreaming, setStreamingContent, addTokenUsage])

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
    tokenUsage,
    sendMessage,
    goToSource,
    cancelStreaming,
  }
}
