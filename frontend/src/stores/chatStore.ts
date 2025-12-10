/**
 * 聊天状态管理
 */
import { create } from 'zustand';
import type { Message, SourceReference, BoundingBox } from '@/types';
import { chatService } from '@/services';

interface ChatState {
  // 状态
  messages: Message[];
  conversationId: string | null;
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;

  // 高亮状态
  highlightedSource: SourceReference | null;
  highlightPage: number | null;
  highlightBbox: BoundingBox | null;

  // 操作
  sendMessage: (question: string, fileId: string) => Promise<void>;
  setHighlightedSource: (source: SourceReference | null) => void;
  clearHighlight: () => void;
  clearChat: () => void;
  loadConversation: (conversationId: string) => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  // 初始状态
  messages: [],
  conversationId: null,
  isLoading: false,
  isStreaming: false,
  error: null,

  highlightedSource: null,
  highlightPage: null,
  highlightBbox: null,

  // 发送消息（流式）
  sendMessage: async (question: string, fileId: string) => {
    const { conversationId, messages } = get();

    // 添加用户消息
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: question,
      created_at: new Date().toISOString(),
    };

    // 添加占位的助手消息
    const assistantMessage: Message = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString(),
      isStreaming: true,
    };

    set({
      messages: [...messages, userMessage, assistantMessage],
      isLoading: true,
      isStreaming: true,
      error: null,
    });

    let accumulatedContent = '';

    try {
      await chatService.askStream(
        {
          question,
          file_id: fileId,
          conversation_id: conversationId || undefined,
        },
        {
          onContent: (content) => {
            accumulatedContent += content;
            set((state) => ({
              messages: state.messages.map((msg) =>
                msg.id === assistantMessage.id
                  ? { ...msg, content: accumulatedContent }
                  : msg
              ),
            }));
          },
          onSources: (sources, newConversationId) => {
            set((state) => ({
              conversationId: newConversationId || state.conversationId,
              messages: state.messages.map((msg) =>
                msg.id === assistantMessage.id
                  ? { ...msg, sources, isStreaming: false }
                  : msg
              ),
            }));
          },
          onDone: () => {
            set((state) => ({
              isLoading: false,
              isStreaming: false,
              messages: state.messages.map((msg) =>
                msg.id === assistantMessage.id
                  ? { ...msg, isStreaming: false }
                  : msg
              ),
            }));
          },
          onError: (error) => {
            set((state) => ({
              error,
              isLoading: false,
              isStreaming: false,
              messages: state.messages.filter((msg) => msg.id !== assistantMessage.id),
            }));
          },
        }
      );
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '发送失败',
        isLoading: false,
        isStreaming: false,
      });
    }
  },

  // 设置高亮来源
  setHighlightedSource: (source) => {
    if (source) {
      set({
        highlightedSource: source,
        highlightPage: source.page,
        highlightBbox: source.bbox,
      });
    } else {
      get().clearHighlight();
    }
  },

  // 清除高亮
  clearHighlight: () => {
    set({
      highlightedSource: null,
      highlightPage: null,
      highlightBbox: null,
    });
  },

  // 清空聊天
  clearChat: () => {
    set({
      messages: [],
      conversationId: null,
      error: null,
      highlightedSource: null,
      highlightPage: null,
      highlightBbox: null,
    });
  },

  // 加载会话历史
  loadConversation: async (conversationId: string) => {
    set({ isLoading: true, error: null });
    try {
      const conversation = await chatService.getConversation(conversationId);
      set({
        messages: conversation.messages.map((msg) => ({
          ...msg,
          sources: msg.sources || undefined,
        })),
        conversationId: conversation.id,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '加载会话失败',
        isLoading: false,
      });
    }
  },
}));
