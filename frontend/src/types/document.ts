/**
 * 文档相关类型定义
 */

/** 文档状态 */
export type DocumentStatus = 'pending' | 'processing' | 'completed' | 'failed';

/** 文档信息 */
export interface Document {
  id: string;
  filename: string;
  original_filename: string;
  file_size: number;
  page_count: number | null;
  status: DocumentStatus;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

/** 文档上传响应 */
export interface DocumentUploadResponse {
  file_id: string;
  filename: string;
  message: string;
  status: DocumentStatus;
}

/** 文档块 */
export interface DocumentChunk {
  id: string;
  chunk_index: number;
  content: string;
  page_number: number;
  bbox: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  } | null;
}
