/**
 * 文档状态管理
 */
import { create } from 'zustand';
import type { Document, DocumentUploadResponse } from '@/types';
import { documentService } from '@/services';

interface DocumentState {
  // 状态
  documents: Document[];
  currentDocument: Document | null;
  isUploading: boolean;
  uploadProgress: number;
  isLoading: boolean;
  error: string | null;

  // 操作
  fetchDocuments: () => Promise<void>;
  fetchDocument: (id: string) => Promise<void>;
  uploadDocument: (file: File) => Promise<DocumentUploadResponse>;
  deleteDocument: (id: string) => Promise<void>;
  setCurrentDocument: (doc: Document | null) => void;
  clearError: () => void;
}

export const useDocumentStore = create<DocumentState>((set, get) => ({
  // 初始状态
  documents: [],
  currentDocument: null,
  isUploading: false,
  uploadProgress: 0,
  isLoading: false,
  error: null,

  // 获取所有文档
  fetchDocuments: async () => {
    set({ isLoading: true, error: null });
    try {
      const documents = await documentService.list();
      set({ documents, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '获取文档列表失败',
        isLoading: false 
      });
    }
  },

  // 获取单个文档
  fetchDocument: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const document = await documentService.get(id);
      set({ currentDocument: document, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '获取文档失败',
        isLoading: false 
      });
    }
  },

  // 上传文档
  uploadDocument: async (file: File) => {
    set({ isUploading: true, uploadProgress: 0, error: null });
    try {
      const result = await documentService.upload(file, (progress) => {
        set({ uploadProgress: progress });
      });
      
      // 上传成功后刷新文档列表
      await get().fetchDocuments();
      
      // 设置当前文档
      const document = await documentService.get(result.file_id);
      set({ 
        currentDocument: document,
        isUploading: false, 
        uploadProgress: 100 
      });
      
      return result;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '上传失败',
        isUploading: false 
      });
      throw error;
    }
  },

  // 删除文档
  deleteDocument: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await documentService.delete(id);
      
      // 如果删除的是当前文档，清空当前文档
      if (get().currentDocument?.id === id) {
        set({ currentDocument: null });
      }
      
      // 刷新文档列表
      await get().fetchDocuments();
      set({ isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '删除失败',
        isLoading: false 
      });
    }
  },

  // 设置当前文档
  setCurrentDocument: (doc) => {
    set({ currentDocument: doc });
  },

  // 清除错误
  clearError: () => {
    set({ error: null });
  },
}));
