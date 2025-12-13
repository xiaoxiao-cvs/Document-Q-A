import axios from 'axios'
import { Document, ChatRequest, ChatResponse, UploadResponse } from '@/types'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Documents API
export const documentsApi = {
  // Get all documents
  getAll: async (): Promise<Document[]> => {
    const response = await api.get('/v1/documents')
    return response.data
  },

  // Upload a file
  upload: async (file: File): Promise<UploadResponse> => {
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await api.post('/v1/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  // Delete a document
  delete: async (documentId: string): Promise<void> => {
    await api.delete(`/v1/documents/${documentId}`)
  },
}

// Chat API
export const chatApi = {
  // Send a chat message
  sendMessage: async (request: ChatRequest): Promise<ChatResponse> => {
    const response = await api.post('/v1/chat', request)
    return response.data
  },
}

export default api
