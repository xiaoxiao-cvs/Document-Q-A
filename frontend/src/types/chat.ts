/**
 * 聊天相关类型定义
 */

/** 边界框坐标 - 用于 PDF 高亮定位 */
export interface BoundingBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** 来源引用 - AI 回答中引用的文档片段 */
export interface SourceReference {
  chunk_id: string;
  page: number;
  bbox: BoundingBox | null;
  relevance_score: number;
  content_preview: string;
}

/** 聊天消息 */
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: SourceReference[];
  created_at: string;
  isStreaming?: boolean;
}

/** 会话 */
export interface Conversation {
  id: string;
  document_id: string;
  messages: Message[];
  created_at: string;
  updated_at: string;
}

/** 聊天请求 */
export interface ChatRequest {
  question: string;
  file_id: string;
  conversation_id?: string;
}

/** 聊天响应 */
export interface ChatResponse {
  answer: string;
  sources: SourceReference[];
  conversation_id: string;
}

/** 流式聊天事件类型 */
export type StreamEventType = 'content' | 'sources' | 'done' | 'error';

/** 流式聊天事件 */
export interface StreamEvent {
  type: StreamEventType;
  content?: string;
  sources?: SourceReference[];
  conversation_id?: string;
  error?: string;
}
