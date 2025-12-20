import { create } from 'zustand'
import { Document, Message, Source } from '@/types'

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
  
  // Actions
  setDocuments: (documents: Document[]) => void
  addDocument: (document: Document) => void
  removeDocument: (id: string) => void
  toggleDocumentSelection: (id: string) => void
  setSelectedDocumentIds: (ids: string[]) => void
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
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  documents: [],
  selectedDocumentIds: [],
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
  
  // Documents actions
  setDocuments: (documents) => set({ documents }),
  
  addDocument: (document) => 
    set((state) => ({ 
      documents: [document, ...state.documents] 
    })),
  
  removeDocument: (id) => 
    set((state) => ({ 
      documents: state.documents.filter(doc => doc.id !== id),
      selectedDocumentIds: state.selectedDocumentIds.filter(docId => docId !== id)
    })),
  
  toggleDocumentSelection: (id) => 
    set((state) => ({
      selectedDocumentIds: state.selectedDocumentIds.includes(id)
        ? state.selectedDocumentIds.filter(docId => docId !== id)
        : [...state.selectedDocumentIds, id]
    })),
  
  setSelectedDocumentIds: (ids) => set({ selectedDocumentIds: ids }),
  
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
  
  clearMessages: () => set({ messages: [], streamingContent: '' }),
}))
