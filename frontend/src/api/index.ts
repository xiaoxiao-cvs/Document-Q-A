import axios from 'axios'
import { Document, ChatRequest, ChatResponse, UploadResponse, Source, TokenUsage } from '@/types'

// API 基础路径从环境变量读取
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30秒超时
})

// 请求拦截器 - 添加请求日志
api.interceptors.request.use(
  (config) => {
    if (import.meta.env.DEV) {
      console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`)
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器 - 统一处理错误
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 处理网络错误
    if (!error.response) {
      console.error('[API] 网络错误:', error.message)
      return Promise.reject(new Error('网络连接失败，请检查网络连接'))
    }
    
    // 处理HTTP错误
    const { status, data } = error.response
    let message = data?.message || data?.detail || '请求失败'
    
    switch (status) {
      case 400:
        message = data?.message || '请求参数错误'
        break
      case 404:
        message = '请求的资源不存在'
        break
      case 429:
        message = '请求过于频繁，请稍后重试'
        break
      case 500:
        message = '服务器内部错误'
        break
    }
    
    console.error(`[API] 错误 ${status}:`, message)
    return Promise.reject(new Error(message))
  }
)

// Documents API
export const documentsApi = {
  // Get all documents
  getAll: async (): Promise<Document[]> => {
    const response = await api.get('/v1/documents')
    return response.data
  },

  // Upload a file
  upload: async (file: File, onProgress?: (progress: number) => void): Promise<UploadResponse> => {
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await api.post('/v1/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          onProgress(progress)
        }
      },
    })
    return response.data
  },

  // Delete a document
  delete: async (documentId: string): Promise<void> => {
    await api.delete(`/v1/documents/${documentId}`)
  },

  // Get document PDF URL
  getPdfUrl: (documentId: string): string => {
    return `${API_BASE_URL}/v1/documents/${documentId}/file`
  },

  // Get document thumbnail URL
  getThumbnailUrl: (documentId: string): string => {
    return `${API_BASE_URL}/v1/documents/${documentId}/thumbnail`
  },
}

// Chat API
export const chatApi = {
  // Send a chat message (non-streaming)
  sendMessage: async (request: ChatRequest): Promise<ChatResponse> => {
    const response = await api.post('/v1/chat', request)
    return response.data
  },

  // Send a chat message with streaming
  sendMessageStream: async (
    request: ChatRequest,
    onChunk: (chunk: string) => void,
    onSources?: (sources: Source[]) => void,
    onError?: (error: Error) => void,
    onComplete?: (usage?: TokenUsage) => void,
  ): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE_URL}/v1/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || errorData.detail || `HTTP ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('无法读取响应流')
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        
        if (done) {
          // 处理最后的 buffer
          if (buffer.trim()) {
            processSSELine(buffer, onChunk, onSources, onComplete)
          }
          break
        }

        buffer += decoder.decode(value, { stream: true })
        
        // 处理 SSE 格式的数据
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          processSSELine(line, onChunk, onSources, onComplete)
        }
      }
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error('流式请求失败'))
    }
  },
}

// 处理 SSE 行数据
function processSSELine(
  line: string,
  onChunk: (chunk: string) => void,
  onSources?: (sources: Source[]) => void,
  onComplete?: (usage?: TokenUsage) => void,
) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith(':')) return

  if (trimmed.startsWith('data: ')) {
    const data = trimmed.slice(6)
    
    // 尝试解析 JSON 格式的数据
    if (data.startsWith('{')) {
      try {
        const parsed = JSON.parse(data)
        
        // 处理不同类型的消息
        if (parsed.type === 'chunk' && parsed.content !== undefined) {
          // 内容片段
          onChunk(parsed.content)
          return
        }
        if (parsed.type === 'sources' && Array.isArray(parsed.sources)) {
          // 来源信息
          onSources?.(parsed.sources)
          return
        }
        if (parsed.type === 'done') {
          // 完成标记，提取 token 用量
          onComplete?.(parsed.usage)
          return
        }
        if (parsed.type === 'error') {
          // 错误信息
          onChunk(parsed.message || '发生错误')
          return
        }
        
        // 兼容旧格式
        if (parsed.sources && Array.isArray(parsed.sources)) {
          onSources?.(parsed.sources)
          return
        }
        if (parsed.done) {
          onComplete?.(parsed.usage)
          return
        }
      } catch {
        // 不是有效 JSON，作为普通文本处理
      }
    }
    
    // 普通文本 chunk
    if (data !== '[DONE]') {
      onChunk(data)
    }
  }
}

export default api
