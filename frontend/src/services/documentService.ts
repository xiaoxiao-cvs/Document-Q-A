/**
 * 文档服务 - 处理文档上传、获取等操作
 */
import { apiClient, getFileUrl } from './api';
import type { Document, DocumentUploadResponse, DocumentChunk } from '@/types';

export const documentService = {
  /**
   * 上传 PDF 文档
   */
  async upload(file: File, onProgress?: (progress: number) => void): Promise<DocumentUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post<DocumentUploadResponse>('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });

    return response.data;
  },

  /**
   * 获取文档信息
   */
  async get(documentId: string): Promise<Document> {
    const response = await apiClient.get<Document>(`/documents/${documentId}`);
    return response.data;
  },

  /**
   * 获取所有文档
   */
  async list(): Promise<Document[]> {
    const response = await apiClient.get<Document[]>('/documents');
    return response.data;
  },

  /**
   * 获取文档的文本块
   */
  async getChunks(documentId: string): Promise<DocumentChunk[]> {
    const response = await apiClient.get<DocumentChunk[]>(`/documents/${documentId}/chunks`);
    return response.data;
  },

  /**
   * 删除文档
   */
  async delete(documentId: string): Promise<void> {
    await apiClient.delete(`/documents/${documentId}`);
  },

  /**
   * 获取 PDF 文件 URL
   */
  getFileUrl(documentId: string): string {
    return getFileUrl(documentId);
  },
};
