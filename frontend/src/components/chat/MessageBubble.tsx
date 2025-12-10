/**
 * 消息气泡组件
 * 用于显示用户和 AI 的对话消息
 */
import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { User, Bot, FileText } from 'lucide-react';
import type { Message, SourceReference } from '@/types';

interface MessageBubbleProps {
  message: Message;
  onSourceClick?: (source: SourceReference, index: number) => void;
}

/**
 * 来源引用标签
 */
function SourceTag({
  source,
  index,
  onClick,
}: {
  source: SourceReference;
  index: number;
  onClick?: () => void;
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      className="inline-flex items-center gap-1 px-2 py-0.5 h-auto text-xs font-medium hover:bg-primary/10 hover:text-primary transition-colors"
      title={source.content_preview}
    >
      <FileText className="h-3 w-3" />
      <span>[{index + 1}] 第 {source.page} 页</span>
    </Button>
  );
}

/**
 * 来源引用列表
 */
function SourcesList({
  sources,
  onSourceClick,
}: {
  sources: SourceReference[];
  onSourceClick?: (source: SourceReference, index: number) => void;
}) {
  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t border-border/50">
      <p className="text-xs text-muted-foreground mb-2">来源引用：</p>
      <div className="flex flex-wrap gap-2">
        {sources.map((source, index) => (
          <SourceTag
            key={source.chunk_id}
            source={source}
            index={index}
            onClick={() => onSourceClick?.(source, index)}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * 用户消息气泡
 */
function UserBubble({ content }: { content: string }) {
  return (
    <div className="flex items-start gap-3 justify-end">
      <div className="max-w-[80%] px-4 py-3 rounded-2xl rounded-tr-sm bg-primary text-primary-foreground">
        <p className="text-sm whitespace-pre-wrap">{content}</p>
      </div>
      <Avatar className="h-8 w-8 bg-primary/20 flex items-center justify-center shrink-0">
        <User className="h-4 w-4 text-primary" />
      </Avatar>
    </div>
  );
}

/**
 * AI 消息气泡
 */
function AssistantBubble({
  message,
  onSourceClick,
}: {
  message: Message;
  onSourceClick?: (source: SourceReference, index: number) => void;
}) {
  const { content, sources, isStreaming } = message;

  return (
    <div className="flex items-start gap-3">
      <Avatar className="h-8 w-8 bg-linear-to-br from-primary/20 to-accent/30 flex items-center justify-center shrink-0">
        <Bot className="h-4 w-4 text-primary" />
      </Avatar>
      <div className="max-w-[85%] px-4 py-3 rounded-2xl rounded-tl-sm bg-muted/60 backdrop-blur-sm">
        {content ? (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown
              components={{
                p: ({ children }) => (
                  <p className="text-sm leading-relaxed mb-2 last:mb-0">{children}</p>
                ),
                ul: ({ children }) => (
                  <ul className="text-sm list-disc list-inside space-y-1 mb-2">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="text-sm list-decimal list-inside space-y-1 mb-2">{children}</ol>
                ),
                li: ({ children }) => <li className="text-sm">{children}</li>,
                code: ({ children, className }) => {
                  const isInline = !className;
                  return isInline ? (
                    <code className="px-1.5 py-0.5 rounded bg-muted text-sm font-mono">
                      {children}
                    </code>
                  ) : (
                    <code className="block p-3 rounded-lg bg-muted text-sm font-mono overflow-x-auto">
                      {children}
                    </code>
                  );
                },
                pre: ({ children }) => <pre className="my-2">{children}</pre>,
                blockquote: ({ children }) => (
                  <blockquote className="border-l-2 border-primary/50 pl-3 italic text-muted-foreground">
                    {children}
                  </blockquote>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold">{children}</strong>
                ),
                h1: ({ children }) => (
                  <h1 className="text-lg font-bold mb-2">{children}</h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-base font-bold mb-2">{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-sm font-bold mb-1">{children}</h3>
                ),
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        ) : isStreaming ? (
          <div className="flex items-center gap-2">
            <span className="flex gap-1">
              <span className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
              <span className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
              <span className="w-2 h-2 rounded-full bg-primary animate-bounce" />
            </span>
            <span className="text-sm text-muted-foreground">正在思考...</span>
          </div>
        ) : (
          <Skeleton className="h-4 w-32" />
        )}

        {/* 流式传输时显示光标 */}
        {isStreaming && content && (
          <span className="inline-block w-0.5 h-4 bg-primary animate-pulse ml-0.5" />
        )}

        {/* 来源引用 */}
        {!isStreaming && sources && sources.length > 0 && (
          <SourcesList sources={sources} onSourceClick={onSourceClick} />
        )}
      </div>
    </div>
  );
}

/**
 * 消息气泡主组件
 */
export const MessageBubble = memo(function MessageBubble({
  message,
  onSourceClick,
}: MessageBubbleProps) {
  if (message.role === 'user') {
    return <UserBubble content={message.content} />;
  }

  return <AssistantBubble message={message} onSourceClick={onSourceClick} />;
});
