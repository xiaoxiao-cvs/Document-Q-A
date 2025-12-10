/**
 * 聊天服务 - 处理问答、流式响应等
 */
import { apiClient, API_BASE_URL, API_PREFIX } from './api';
import type { 
  ChatRequest, 
  ChatResponse, 
  Conversation,
  SourceReference 
} from '@/types';

export const chatService = {
  /**
   * 发送问题（非流式）
   */
  async ask(request: ChatRequest): Promise<ChatResponse> {
    const response = await apiClient.post<ChatResponse>('/chat', request);
    return response.data;
  },

  /**
   * 发送问题（流式响应）
   * @param request 聊天请求
   * @param callbacks 回调函数
   */
  async askStream(
    request: ChatRequest,
    callbacks: {
      onContent?: (content: string) => void;
      onSources?: (sources: SourceReference[], conversationId: string) => void;
      onDone?: () => void;
      onError?: (error: string) => void;
    }
  ): Promise<void> {
    const { onContent, onSources, onDone, onError } = callbacks;

    try {
      const response = await fetch(`${API_BASE_URL}${API_PREFIX}/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || '请求失败');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('无法读取响应流');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            
            if (data === '[DONE]') {
              onDone?.();
              continue;
            }

            if (!data) continue;

            try {
              const event = JSON.parse(data);
              
              switch (event.type) {
                case 'text':
                  // 后端发送的是 'text' 类型
                  onContent?.(event.content || '');
                  break;
                case 'content':
                  // 兼容 'content' 类型
                  onContent?.(event.content || '');
                  break;
                case 'sources':
                  onSources?.(event.sources || [], event.conversation_id || '');
                  break;
                case 'error':
                  onError?.(event.message || event.error || '未知错误');
                  break;
                case 'done':
                  onDone?.();
                  break;
              }
            } catch {
              // 如果不是 JSON，可能是纯文本内容
              console.warn('无法解析 SSE 数据:', data);
            }
          }
        }
      }
    } catch (error) {
      onError?.(error instanceof Error ? error.message : '未知错误');
    }
  },

  /**
   * 获取会话历史
   */
  async getConversation(conversationId: string): Promise<Conversation> {
    const response = await apiClient.get<Conversation>(`/chat/conversations/${conversationId}`);
    return response.data;
  },

  /**
   * 获取文档的所有会话
   */
  async getConversations(documentId: string): Promise<Conversation[]> {
    const response = await apiClient.get<Conversation[]>(`/chat/conversations?document_id=${documentId}`);
    return response.data;
  },
};
