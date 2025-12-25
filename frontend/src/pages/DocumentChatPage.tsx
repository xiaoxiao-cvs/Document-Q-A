import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Coins, FileText, GripVertical, Settings } from 'lucide-react'
import { Panel, Group, Separator } from 'react-resizable-panels'
import { ChatArea } from '@/components/business/ChatArea'
import { PDFViewer } from '@/components/business/PDFViewer'
import { SettingsModal } from '@/components/business/SettingsModal'
import { useChat } from '@/hooks/useChat'
import { useDocuments } from '@/hooks/useDocuments'
import { useAppStore } from '@/store'
import { documentsApi } from '@/api'

export const DocumentChatPage = () => {
  const { documentId } = useParams<{ documentId: string }>()
  const navigate = useNavigate()
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const { fetchDocuments } = useDocuments()
  
  const {
    messages,
    isChatLoading,
    isStreaming,
    tokenUsage,
    sendMessage,
    goToSource,
    cancelStreaming,
  } = useChat()

  const {
    documents,
    currentPdfUrl,
    currentPdfFilename,
    highlightAreas,
    targetPage,
    setCurrentDocumentId,
    setPdfUrl,
    clearMessages,
    resetTokenUsage,
  } = useAppStore()

  // 获取当前文档信息
  const currentDocument = documents.find(doc => doc.id === documentId)
  
  // 检查文档是否可用于提问
  const isDocumentReady = currentDocument?.status === 'processed' && (currentDocument?.chunk_count || 0) > 0
  
  // 初始化：立即加载文档列表
  useEffect(() => {
    fetchDocuments()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  
  // 轮询更新文档状态（如果文档正在处理中）
  useEffect(() => {
    if (!documentId) return
    
    // 如果找不到文档或文档还在处理中，定期刷新状态
    const needsUpdate = !currentDocument || 
      currentDocument.status === 'pending' || 
      currentDocument.status === 'processing'
    
    if (needsUpdate) {
      const interval = setInterval(async () => {
        try {
          // 刷新整个文档列表以获取最新状态
          await fetchDocuments()
          
          // 检查是否处理完成
          const updatedDocs = useAppStore.getState().documents
          const updatedDoc = updatedDocs.find(doc => doc.id === documentId)
          
          if (updatedDoc && currentDocument) {
            // 如果状态从处理中变为完成/失败，显示通知
            const wasProcessing = currentDocument.status === 'pending' || currentDocument.status === 'processing'
            const isNowComplete = updatedDoc.status === 'processed' || updatedDoc.status === 'failed'
            
            if (wasProcessing && isNowComplete) {
              if (updatedDoc.status === 'processed') {
                useAppStore.getState().showToast(
                  `文档 "${updatedDoc.filename}" 处理完成，共生成 ${updatedDoc.chunk_count} 个片段`,
                  'success'
                )
              } else {
                useAppStore.getState().showToast(
                  `文档 "${updatedDoc.filename}" 处理失败`,
                  'error'
                )
              }
            }
          }
        } catch (error) {
          console.error('更新文档状态失败:', error)
        }
      }, 3000) // 每3秒刷新一次
      
      return () => clearInterval(interval)
    }
  }, [documentId, currentDocument?.status, fetchDocuments])

  // 初始化：设置当前文档ID和加载PDF
  useEffect(() => {
    if (documentId) {
      setCurrentDocumentId(documentId)
      const pdfUrl = documentsApi.getPdfUrl(documentId)
      const filename = currentDocument?.filename || 'Document'
      setPdfUrl(pdfUrl, filename)
    }

    // 清理：离开页面时重置状态
    return () => {
      setCurrentDocumentId(null)
      clearMessages()
      resetTokenUsage()
    }
  }, [documentId])

  const handleBack = () => {
    navigate('/')
  }

  // 格式化 token 数量
  const formatTokens = (tokens: number) => {
    if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(1)}k`
    }
    return tokens.toString()
  }

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Top Status Bar */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="h-14 bg-gray-50 border-b border-gray-200 flex items-center px-4 gap-4"
      >
        {/* Back Button */}
        <button
          onClick={handleBack}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">返回</span>
        </button>

        {/* Divider */}
        <div className="w-px h-6 bg-gray-300" />

        {/* Document Info */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
          <span className="text-sm text-gray-700 truncate">
            {currentDocument?.filename || '加载中...'}
          </span>
        </div>

        {/* Token Usage */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 border border-gray-200">
            <Coins className="w-4 h-4 text-amber-500" />
            <div className="text-xs">
              <span className="text-gray-500">Token 消耗: </span>
              <span className="text-gray-800 font-medium">
                {formatTokens(tokenUsage.total_tokens)}
              </span>
              {tokenUsage.total_tokens > 0 && (
                <span className="text-gray-400 ml-1">
                  ({formatTokens(tokenUsage.prompt_tokens)} + {formatTokens(tokenUsage.completion_tokens)})
                </span>
              )}
            </div>
          </div>
          {/* Settings Button */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700"
            title="模型设置"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </motion.div>

      {/* Settings Modal */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      {/* Main Content - Split Panels */}
      <div className="flex-1 overflow-hidden">
        <Group orientation="horizontal" className="h-full">
          {/* Chat Panel */}
          <Panel id="chat" defaultSize={50} minSize={30}>
            <div className="h-full bg-white">
              <ChatArea
                messages={messages}
                onSendMessage={sendMessage}
                onSourceClick={goToSource}
                onCancelStreaming={cancelStreaming}
                loading={isChatLoading}
                isStreaming={isStreaming}
                hasDocuments={isDocumentReady}
              />
            </div>
          </Panel>

          {/* Resize Handle */}
          <Separator className="w-1.5 bg-gray-200 hover:bg-gray-400 transition-colors cursor-col-resize flex items-center justify-center">
            <GripVertical className="w-3 h-3 text-gray-400" />
          </Separator>

          {/* PDF Panel */}
          <Panel id="pdf" defaultSize={50} minSize={30}>
            <div className="h-full bg-gray-50 border-l border-gray-200">
              <PDFViewer
                file={currentPdfUrl}
                filename={currentPdfFilename || undefined}
                highlightAreas={highlightAreas}
                targetPage={targetPage || undefined}
              />
            </div>
          </Panel>
        </Group>
      </div>
    </div>
  )
}
