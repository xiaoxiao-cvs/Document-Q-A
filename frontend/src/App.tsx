import React, { useEffect } from 'react'
import { MainLayout } from './components/layout/MainLayout'
import { Sidebar } from './components/layout/Sidebar'
import { UploadZone } from './components/business/UploadZone'
import { FileList } from './components/business/FileList'
import { ChatArea } from './components/business/ChatArea'
import { PDFViewer } from './components/business/PDFViewer'
import { useDocuments } from './hooks/useDocuments'
import { useChat } from './hooks/useChat'
import { Modal } from './components/ui/Modal'
import { Trash2 } from 'lucide-react'
import { Source } from './types'

function App() {
  const {
    documents,
    selectedDocumentIds,
    isUploading,
    uploadProgress,
    currentPdfUrl,
    currentPdfFilename,
    highlightAreas,
    targetPage,
    fetchDocuments,
    uploadFiles,
    deleteDocument,
    selectDocument,
  } = useDocuments()

  const { 
    messages, 
    isChatLoading, 
    isStreaming,
    sendMessage, 
    goToSource,
    cancelStreaming,
  } = useChat()

  const [deleteModal, setDeleteModal] = React.useState<{
    isOpen: boolean
    documentId: string | null
    documentName: string
  }>({
    isOpen: false,
    documentId: null,
    documentName: '',
  })

  // Fetch documents on mount
  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  // Handle file upload
  const handleUpload = async (files: File[]) => {
    try {
      await uploadFiles(files)
    } catch (error) {
      console.error('Upload failed:', error)
      alert('文件上传失败，请重试')
    }
  }

  // Handle document selection
  const handleSelect = (id: string) => {
    selectDocument(id)
  }

  // Handle delete confirmation
  const handleDeleteClick = (id: string) => {
    const doc = documents.find(d => d.id === id)
    if (doc) {
      setDeleteModal({
        isOpen: true,
        documentId: id,
        documentName: doc.filename,
      })
    }
  }

  // Handle delete confirm
  const handleDeleteConfirm = async () => {
    if (deleteModal.documentId) {
      try {
        await deleteDocument(deleteModal.documentId)
        setDeleteModal({ isOpen: false, documentId: null, documentName: '' })
      } catch (error) {
        console.error('Delete failed:', error)
        alert('删除失败，请重试')
      }
    }
  }

  // Handle source click - navigate to PDF location
  const handleSourceClick = (source: Source) => {
    goToSource(source)
  }

  // Check if we should show the PDF panel
  const showPdfPanel = selectedDocumentIds.length > 0

  return (
    <>
      <MainLayout
        sidebar={
          <Sidebar>
            <div className="border-b border-dark/10">
              <UploadZone 
                onUpload={handleUpload} 
                uploading={isUploading}
                uploadProgress={uploadProgress}
              />
            </div>
            <div className="flex-1 overflow-y-auto">
              <FileList
                documents={documents}
                selectedIds={selectedDocumentIds}
                onSelect={handleSelect}
                onDelete={handleDeleteClick}
              />
            </div>
            {selectedDocumentIds.length > 0 && (
              <div className="p-4 border-t border-dark/10">
                <p className="text-xs text-light/60 text-center">
                  已选择 {selectedDocumentIds.length} 个文档
                </p>
              </div>
            )}
          </Sidebar>
        }
        showRightPanel={showPdfPanel}
        rightPanel={
          <PDFViewer
            file={currentPdfUrl}
            filename={currentPdfFilename || undefined}
            highlightAreas={highlightAreas}
            targetPage={targetPage || undefined}
          />
        }
      >
        <ChatArea
          messages={messages}
          onSendMessage={sendMessage}
          onSourceClick={handleSourceClick}
          onCancelStreaming={cancelStreaming}
          loading={isChatLoading}
          isStreaming={isStreaming}
          hasDocuments={selectedDocumentIds.length > 0}
        />
      </MainLayout>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, documentId: null, documentName: '' })}
        title="确认删除"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            确定要删除文档 <span className="font-semibold">{deleteModal.documentName}</span> 吗？
            此操作无法撤销。
          </p>
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setDeleteModal({ isOpen: false, documentId: null, documentName: '' })}
              className="px-4 py-2 rounded-xl border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleDeleteConfirm}
              className="px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              删除
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}

export default App
