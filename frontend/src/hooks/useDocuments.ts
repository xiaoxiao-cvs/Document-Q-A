import { useCallback } from 'react'
import { useAppStore } from '@/store'
import { documentsApi } from '@/api'
import { Document } from '@/types'

export const useDocuments = () => {
  const {
    documents,
    selectedDocumentIds,
    isUploading,
    uploadProgress,
    currentPdfUrl,
    currentPdfFilename,
    highlightAreas,
    targetPage,
    setDocuments,
    addDocument,
    removeDocument,
    toggleDocumentSelection,
    setIsUploading,
    setUploadProgress,
    setPdfUrl,
    clearHighlightAreas,
    showToast,
  } = useAppStore()

  // Fetch all documents
  const fetchDocuments = useCallback(async () => {
    try {
      const docs = await documentsApi.getAll()
      setDocuments(docs)
    } catch (error) {
      console.error('Failed to fetch documents:', error)
      throw error
    }
  }, [setDocuments])

  // Upload files with progress tracking
  const uploadFiles = useCallback(async (files: File[]) => {
    setIsUploading(true)
    setUploadProgress(0)
    
    try {
      const results = []
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const result = await documentsApi.upload(file, (progress) => {
          // Calculate overall progress across all files
          const overallProgress = Math.round(((i / files.length) + (progress / 100 / files.length)) * 100)
          setUploadProgress(overallProgress)
        })
        
        // Add uploaded document to store
        const doc: Document = {
          id: String(result.id),
          filename: result.filename,
          file_size: result.file_size,
          upload_time: result.upload_time || new Date().toISOString(),
          status: result.status,
          chunk_count: result.chunk_count,
        }
        addDocument(doc)
        results.push(result)
        
        // Auto-select newly uploaded document
        toggleDocumentSelection(doc.id)
      }
      
      setUploadProgress(100)
      
      // 显示上传完成提示
      const fileText = files.length > 1 ? `${files.length} 个文件` : files[0].name
      showToast(`${fileText} 上传成功！正在后台处理文档切片和向量化...`, 'success')
      
      return results
    } catch (error) {
      console.error('Failed to upload files:', error)
      showToast('上传失败，请重试', 'error')
      throw error
    } finally {
      setIsUploading(false)
      // Reset progress after a short delay
      setTimeout(() => setUploadProgress(0), 1000)
    }
  }, [addDocument, setIsUploading, setUploadProgress, toggleDocumentSelection])

  // Delete a document
  const deleteDocument = useCallback(async (id: string) => {
    try {
      await documentsApi.delete(id)
      removeDocument(id)
      
      // Clear PDF view if deleted document was being viewed
      if (selectedDocumentIds.length === 1 && selectedDocumentIds[0] === id) {
        setPdfUrl(null)
      }
    } catch (error) {
      console.error('Failed to delete document:', error)
      throw error
    }
  }, [removeDocument, selectedDocumentIds, setPdfUrl])

  // Select document and load PDF for preview
  const selectDocument = useCallback((id: string) => {
    toggleDocumentSelection(id)
    
    // Load PDF for the first selected document
    const doc = documents.find(d => d.id === id)
    if (doc) {
      const pdfUrl = documentsApi.getPdfUrl(id)
      setPdfUrl(pdfUrl, doc.filename)
      clearHighlightAreas()
    }
  }, [documents, toggleDocumentSelection, setPdfUrl, clearHighlightAreas])

  // Get selected document details
  const selectedDocuments = documents.filter(d => selectedDocumentIds.includes(d.id))

  return {
    documents,
    selectedDocumentIds,
    selectedDocuments,
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
    toggleDocumentSelection,
  }
}
