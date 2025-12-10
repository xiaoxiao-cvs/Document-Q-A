/**
 * 聊天面板组件
 * 包含消息列表和输入框
 */
import { useCallback, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { useChatStore, useDocumentStore } from '@/stores';
import { MessageSquare, Trash2, AlertCircle } from 'lucide-react';
import type { SourceReference } from '@/types';

interface ChatPanelProps {
  className?: string;
}

/**
 * 欢迎消息组件
 */
function WelcomeMessage({ hasDocument }: { hasDocument: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-primary/20 to-accent/30 flex items-center justify-center mb-6">
        <MessageSquare className="h-8 w-8 text-primary" />
      </div>
      <h2 className="text-2xl font-semibold mb-3">开始对话</h2>
      {hasDocument ? (
        <p className="text-muted-foreground max-w-md">
          文档已准备就绪！您可以开始提问了。
          <br />
          AI 会根据文档内容为您提供准确的答案，并标注来源位置。
        </p>
      ) : (
        <p className="text-muted-foreground max-w-md">
          请先上传一个 PDF 文档。
          <br />
          上传后，您可以用自然语言向文档提问。
        </p>
      )}
    </div>
  );
}

/**
 * 错误提示组件
 */
function ErrorAlert({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div className="mx-4 mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30 flex items-start gap-3">
      <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-destructive font-medium">发送失败</p>
        <p className="text-xs text-destructive/80 mt-1">{message}</p>
      </div>
      <Button variant="ghost" size="sm" onClick={onDismiss} className="shrink-0">
        关闭
      </Button>
    </div>
  );
}

/**
 * 聊天面板主组件
 */
export function ChatPanel({ className }: ChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 从 store 获取状态
  const { currentDocument } = useDocumentStore();
  const {
    messages,
    isLoading,
    isStreaming,
    error,
    sendMessage,
    setHighlightedSource,
    clearChat,
  } = useChatStore();

  // 发送消息
  const handleSend = useCallback(
    (question: string) => {
      if (currentDocument) {
        sendMessage(question, currentDocument.id);
      }
    },
    [currentDocument, sendMessage]
  );

  // 点击来源引用
  const handleSourceClick = useCallback(
    (source: SourceReference) => {
      setHighlightedSource(source);
    },
    [setHighlightedSource]
  );

  // 清除错误
  const handleDismissError = useCallback(() => {
    // 清除错误逻辑，可以在 store 中添加 clearError 方法
  }, []);

  // 自动滚动到底部
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isStreaming]);

  const hasMessages = messages.length > 0;
  const hasDocument = !!currentDocument;

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-background/95 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-linear-to-br from-primary/20 to-accent/30 flex items-center justify-center">
            <MessageSquare className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-sm">智能问答</h2>
            <p className="text-xs text-muted-foreground">
              {currentDocument?.original_filename || '未选择文档'}
            </p>
          </div>
        </div>

        {hasMessages && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearChat}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            清空
          </Button>
        )}
      </div>

      {/* 消息区域 */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="p-4 space-y-6 min-h-full">
          {hasMessages ? (
            <>
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  onSourceClick={handleSourceClick}
                />
              ))}
              <div ref={messagesEndRef} />
            </>
          ) : (
            <WelcomeMessage hasDocument={hasDocument} />
          )}
        </div>
      </ScrollArea>

      {/* 错误提示 */}
      {error && <ErrorAlert message={error} onDismiss={handleDismissError} />}

      {/* 输入区域 */}
      <ChatInput
        onSend={handleSend}
        isLoading={isLoading || isStreaming}
        disabled={!hasDocument}
        placeholder={
          hasDocument
            ? '输入您的问题...'
            : '请先上传文档后再提问'
        }
      />
    </div>
  );
}
