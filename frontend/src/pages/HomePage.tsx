import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FileText, Brain, Search, MessageSquare, Sparkles, Settings } from 'lucide-react'
import { UploadZone } from '@/components/business/UploadZone'
import { DocumentCardScroller } from '@/components/business/DocumentCardScroller'
import { SettingsModal } from '@/components/business/SettingsModal'
import { Toast } from '@/components/ui/Toast'
import { useDocuments } from '@/hooks/useDocuments'
import { useAppStore } from '@/store'

const features = [
  {
    icon: FileText,
    title: '智能文档解析',
    description: '支持 PDF、TXT、DOCX 等格式，自动提取文本内容',
  },
  {
    icon: Brain,
    title: '向量化存储',
    description: '使用先进的嵌入模型将文档内容向量化，支持语义检索',
  },
  {
    icon: Search,
    title: 'RAG 检索增强',
    description: '基于问题检索最相关的文档片段，提供精准的上下文',
  },
  {
    icon: MessageSquare,
    title: '智能问答',
    description: '结合 LLM 大语言模型，基于文档内容生成准确回答',
  },
]

export const HomePage = () => {
  const navigate = useNavigate()
  const { uploadFiles, isUploading, uploadProgress, documents, deleteDocument } = useDocuments()
  const { toast, hideToast, showToast } = useAppStore()
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  const handleUpload = async (files: File[]) => {
    await uploadFiles(files)
  }

  const handleDocumentClick = (documentId: string) => {
    navigate(`/chat/${documentId}`)
  }

  const handleDeleteDocument = async (documentId: string) => {
    try {
      await deleteDocument(documentId)
      showToast('文档已删除', 'success')
    } catch (error) {
      console.error('删除文档失败:', error)
      showToast('删除文档失败，请重试', 'error')
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Toast Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        isOpen={toast.isOpen}
        onClose={hideToast}
      />
      
      {/* Settings Modal */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Settings Button - Fixed Position */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          onClick={() => setIsSettingsOpen(true)}
          className="fixed top-4 right-4 z-30 p-2.5 rounded-xl bg-white border border-gray-200 shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-colors"
          title="模型设置"
        >
          <Settings className="w-5 h-5 text-gray-600" />
        </motion.button>
        
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gray-100 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gray-50 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="p-3 bg-gray-100 rounded-2xl border border-gray-200">
                <Sparkles className="w-8 h-8 text-gray-700" />
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold text-gray-900">
                Document Q&A
              </h1>
            </div>
            <p className="text-xl text-gray-500 max-w-2xl mx-auto">
              智能文档问答系统 — 上传文档，即可与你的文档对话
            </p>
          </motion.div>

          {/* How it works */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-12"
          >
            <h2 className="text-lg font-medium text-gray-600 text-center mb-6">
              工作原理
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
                  className="p-4 rounded-xl bg-gray-50 border border-gray-200 hover:border-gray-300 hover:bg-gray-100 transition-colors"
                >
                  <feature.icon className="w-6 h-6 text-gray-700 mb-3" />
                  <h3 className="font-medium text-gray-900 mb-1 text-sm">
                    {feature.title}
                  </h3>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    {feature.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Upload & Documents Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            {documents.length === 0 ? (
              /* 没有文档时显示大上传框 */
              <div className="max-w-2xl mx-auto">
                <UploadZone
                  onUpload={handleUpload}
                  uploading={isUploading}
                  uploadProgress={uploadProgress}
                />
              </div>
            ) : (
              /* 有文档时显示横向布局 */
              <>
                <h2 className="text-lg font-medium text-gray-700 mb-4">
                  选择文档开始提问
                </h2>
                <DocumentCardScroller
                  documents={documents}
                  onDocumentClick={handleDocumentClick}
                  onDelete={handleDeleteDocument}
                  uploadSlot={
                    <UploadZone
                      onUpload={handleUpload}
                      uploading={isUploading}
                      uploadProgress={uploadProgress}
                      compact
                    />
                  }
                />
              </>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  )
}
