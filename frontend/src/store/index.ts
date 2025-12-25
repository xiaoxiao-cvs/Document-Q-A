import { create } from 'zustand'
import { Document, Message, Source, TokenUsage } from '@/types'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface ToastState {
  isOpen: boolean
  message: string
  type: ToastType
}

export interface HighlightArea {
  page: number
  x0?: number
  y0?: number
  x1?: number
  y1?: number
  text?: string
}

interface AppState {
  // Documents
  documents: Document[]
  selectedDocumentIds: string[]
  currentDocumentId: string | null  // 当前选中的单个文档（用于问答页面）
  isUploading: boolean
  uploadProgress: number
  
  // PDF Viewer
  currentPdfUrl: string | null
  currentPdfFilename: string | null
  highlightAreas: HighlightArea[]
  targetPage: number | null
  
  // Chat
  messages: Message[]
  isChatLoading: boolean
  isStreaming: boolean
  streamingContent: string
  sessionId: string | null
  
  // Token Usage (累计)
  tokenUsage: TokenUsage
  
  // Toast
  toast: ToastState
  
  // Actions
  setDocuments: (documents: Document[]) => void
  addDocument: (document: Document) => void
  removeDocument: (id: string) => void
  toggleDocumentSelection: (id: string) => void
  setSelectedDocumentIds: (ids: string[]) => void
  setCurrentDocumentId: (id: string | null) => void
  clearSelection: () => void
  setIsUploading: (isUploading: boolean) => void
  setUploadProgress: (progress: number) => void
  
  // PDF Actions
  setPdfUrl: (url: string | null, filename?: string | null) => void
  setHighlightAreas: (areas: HighlightArea[]) => void
  addHighlightArea: (area: HighlightArea) => void
  clearHighlightAreas: () => void
  setTargetPage: (page: number | null) => void
  navigateToSource: (source: Source) => void
  
  // Chat Actions
  addMessage: (message: Message) => void
  updateLastMessage: (content: string) => void
  setMessages: (messages: Message[]) => void
  setIsChatLoading: (isLoading: boolean) => void
  setIsStreaming: (isStreaming: boolean) => void
  setStreamingContent: (content: string) => void
  appendStreamingContent: (chunk: string) => void
  clearMessages: () => void
  setSessionId: (sessionId: string | null) => void
  
  // Token Usage Actions
  addTokenUsage: (usage: TokenUsage) => void
  resetTokenUsage: () => void
  
  // Toast Actions
  showToast: (message: string, type?: ToastType) => void
  hideToast: () => void
}

export const useAppStore = create<AppState>((set) => ({
  // Initial state
  documents: [],
  selectedDocumentIds: [],
  currentDocumentId: null,
  isUploading: false,
  uploadProgress: 0,
  
  // PDF Viewer initial state
  currentPdfUrl: null,
  currentPdfFilename: null,
  highlightAreas: [],
  targetPage: null,
  
  // Chat initial state
  messages: [],
  isChatLoading: false,
  isStreaming: false,
  streamingContent: '',
  sessionId: null,
  
  // Token Usage initial state
  tokenUsage: {
    prompt_tokens: 0,
    completion_tokens: 0,
    total_tokens: 0,
  },
  
  // Toast initial state
  toast: {
    isOpen: false,
    message: '',
    type: 'info',
  },
  
  // Documents actions
  setDocuments: (documents) => set({ documents }),
  
  addDocument: (document) => 
    set((state) => ({ 
      documents: [document, ...state.documents] 
    })),
  
  removeDocument: (id) => 
    set((state) => ({ 
      documents: state.documents.filter(doc => doc.id !== id),
      selectedDocumentIds: state.selectedDocumentIds.filter(docId => docId !== id),
      currentDocumentId: state.currentDocumentId === id ? null : state.currentDocumentId,
    })),
  
  toggleDocumentSelection: (id) => 
    set((state) => ({
      selectedDocumentIds: state.selectedDocumentIds.includes(id)
        ? state.selectedDocumentIds.filter(docId => docId !== id)
        : [...state.selectedDocumentIds, id]
    })),
  
  setSelectedDocumentIds: (ids) => set({ selectedDocumentIds: ids }),
  
  setCurrentDocumentId: (id) => set({ currentDocumentId: id }),
  
  clearSelection: () => set({ selectedDocumentIds: [] }),
  
  setIsUploading: (isUploading) => set({ isUploading }),
  
  setUploadProgress: (progress) => set({ uploadProgress: progress }),
  
  // PDF Actions
  setPdfUrl: (url, filename = null) => set({ 
    currentPdfUrl: url, 
    currentPdfFilename: filename,
    highlightAreas: [],
    targetPage: null,
  }),
  
  setHighlightAreas: (areas) => set({ highlightAreas: areas }),
  
  addHighlightArea: (area) => 
    set((state) => ({
      highlightAreas: [...state.highlightAreas, area]
    })),
  
  clearHighlightAreas: () => set({ highlightAreas: [], targetPage: null }),
  
  setTargetPage: (page) => set({ targetPage: page }),
  
  navigateToSource: (source) => {
    const page = source.page || 1
    const highlight: HighlightArea = {
      page,
      text: source.chunk_text,
    }
    set({
      targetPage: page,
      highlightAreas: [highlight],
    })
  },
  
  // Chat actions
  addMessage: (message) => 
    set((state) => ({ 
      messages: [...state.messages, message] 
    })),
  
  updateLastMessage: (content) =>
    set((state) => {
      const messages = [...state.messages]
      if (messages.length > 0) {
        messages[messages.length - 1] = {
          ...messages[messages.length - 1],
          content,
        }
      }
      return { messages }
    }),
  
  setMessages: (messages) => set({ messages }),
  
  setIsChatLoading: (isChatLoading) => set({ isChatLoading }),
  
  setIsStreaming: (isStreaming) => set({ isStreaming }),
  
  setStreamingContent: (content) => set({ streamingContent: content }),
  
  appendStreamingContent: (chunk) =>
    set((state) => ({
      streamingContent: state.streamingContent + chunk,
    })),
  
  clearMessages: () => set({ 
    messages: [], 
    streamingContent: '',
    tokenUsage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
  }),
  
  setSessionId: (sessionId) => set({ sessionId }),
  
  // Token Usage Actions
  addTokenUsage: (usage) =>
    set((state) => ({
      tokenUsage: {
        prompt_tokens: state.tokenUsage.prompt_tokens + usage.prompt_tokens,
        completion_tokens: state.tokenUsage.completion_tokens + usage.completion_tokens,
        total_tokens: state.tokenUsage.total_tokens + usage.total_tokens,
      },
    })),
  
  resetTokenUsage: () => set({
    tokenUsage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
  }),
  
  // Toast Actions
  showToast: (message, type = 'info') => set({
    toast: { isOpen: true, message, type },
  }),
  
  hideToast: () => set((state) => ({
    toast: { ...state.toast, isOpen: false },
  })),
}))
