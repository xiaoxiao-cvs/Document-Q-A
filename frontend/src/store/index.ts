import { create } from 'zustand'
import { Document, Message } from '@/types'

interface AppState {
  // Documents
  documents: Document[]
  selectedDocumentIds: string[]
  isUploading: boolean
  
  // Chat
  messages: Message[]
  isChatLoading: boolean
  
  // Actions
  setDocuments: (documents: Document[]) => void
  addDocument: (document: Document) => void
  removeDocument: (id: string) => void
  toggleDocumentSelection: (id: string) => void
  setSelectedDocumentIds: (ids: string[]) => void
  clearSelection: () => void
  setIsUploading: (isUploading: boolean) => void
  
  addMessage: (message: Message) => void
  setMessages: (messages: Message[]) => void
  setIsChatLoading: (isLoading: boolean) => void
  clearMessages: () => void
}

export const useAppStore = create<AppState>((set) => ({
  // Initial state
  documents: [],
  selectedDocumentIds: [],
  isUploading: false,
  messages: [],
  isChatLoading: false,
  
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
  
  // Chat actions
  addMessage: (message) => 
    set((state) => ({ 
      messages: [...state.messages, message] 
    })),
  
  setMessages: (messages) => set({ messages }),
  
  setIsChatLoading: (isChatLoading) => set({ isChatLoading }),
  
  clearMessages: () => set({ messages: [] }),
}))
