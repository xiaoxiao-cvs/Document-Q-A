export interface Document {
  id: string
  filename: string
  file_size: number
  upload_time: string
  status?: string
  chunk_count?: number
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  sources?: Source[]
}

export interface Source {
  document_id?: string
  document_name?: string
  chunk_text: string
  page?: number
  similarity_score?: number
}

export interface ChatRequest {
  query: string
  document_ids?: string[]
  session_id?: string
  top_k?: number
}

export interface ChatResponse {
  answer: string
  sources: Source[]
  session_id?: string
  query?: string
}

export interface UploadResponse {
  id: string
  filename: string
  file_size: number
  upload_time: string
  status: string
  chunk_count?: number
  message: string
}

export interface ErrorResponse {
  code: number
  message: string
  detail?: string
  type?: string
}
