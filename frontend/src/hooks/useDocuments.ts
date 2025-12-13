import { useCallback } from 'react'
import { useAppStore } from '@/store'
import { documentsApi } from '@/api'
import { Document } from '@/types'

export const useDocuments = () => {
  const {
    documents,
    selectedDocumentIds,
    isUploading,
    setDocuments,
    addDocument,
    removeDocument,
    toggleDocumentSelection,
    setIsUploading,
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

  // Upload files
  const uploadFiles = useCallback(async (files: File[]) => {
    setIsUploading(true)
    try {
      const uploadPromises = files.map(file => documentsApi.upload(file))
      const results = await Promise.all(uploadPromises)
      
      // Add uploaded documents to store
      results.forEach(result => {
        const doc: Document = {
          id: result.id,
          filename: result.filename,
          file_size: result.file_size,
          upload_time: new Date().toISOString(),
          chunk_count: result.chunk_count,
        }
        addDocument(doc)
      })
      
      return results
    } catch (error) {
      console.error('Failed to upload files:', error)
      throw error
    } finally {
      setIsUploading(false)
    }
  }, [addDocument, setIsUploading])

  // Delete a document
  const deleteDocument = useCallback(async (id: string) => {
    try {
      await documentsApi.delete(id)
      removeDocument(id)
    } catch (error) {
      console.error('Failed to delete document:', error)
      throw error
    }
  }, [removeDocument])

  return {
    documents,
    selectedDocumentIds,
    isUploading,
    fetchDocuments,
    uploadFiles,
    deleteDocument,
    toggleDocumentSelection,
  }
}
