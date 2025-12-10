/**
 * 聊天输入框组件
 * 支持自适应高度和快捷键发送
 */
import { useState, useRef, useCallback, useEffect, type KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2, Paperclip } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function ChatInput({
  onSend,
  isLoading = false,
  disabled = false,
  placeholder = '输入问题，按 Enter 发送...',
  className,
}: ChatInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 自适应高度
  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, 200); // 最大高度 200px
      textarea.style.height = `${newHeight}px`;
    }
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  // 发送消息
  const handleSend = useCallback(() => {
    const trimmedValue = value.trim();
    if (trimmedValue && !isLoading && !disabled) {
      onSend(trimmedValue);
      setValue('');
      // 重置高度
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  }, [value, isLoading, disabled, onSend]);

  // 键盘事件处理
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      // Enter 发送，Shift+Enter 换行
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const canSend = value.trim().length > 0 && !isLoading && !disabled;

  return (
    <div className={cn('relative', className)}>
      <div className="flex items-end gap-2 p-4 bg-background/80 backdrop-blur-xl border-t">
        {/* 附件按钮（预留） */}
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 h-10 w-10 rounded-full"
          disabled
          title="附件功能开发中"
        >
          <Paperclip className="h-5 w-5 text-muted-foreground" />
        </Button>

        {/* 输入框容器 */}
        <div className="relative flex-1 min-w-0">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isLoading || disabled}
            className={cn(
              'min-h-11 max-h-[200px] py-3 px-4 pr-12',
              'resize-none overflow-y-auto',
              'rounded-2xl border-2 border-muted',
              'bg-muted/30 backdrop-blur',
              'focus:border-primary focus:ring-0',
              'placeholder:text-muted-foreground/60',
              'transition-all duration-200',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
            rows={1}
          />

          {/* 发送按钮 */}
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!canSend}
            className={cn(
              'absolute right-2 bottom-2 h-8 w-8 rounded-full',
              'transition-all duration-200',
              canSend
                ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            )}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* 提示文字 */}
      <div className="px-4 pb-2 text-xs text-muted-foreground text-center">
        <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px]">Enter</kbd>
        {' '}发送，
        <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px]">Shift + Enter</kbd>
        {' '}换行
      </div>
    </div>
  );
}
