/**
 * 文档列表组件
 * 显示已上传的文档，支持选择和删除
 */
import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useDocumentStore, useChatStore } from '@/stores';
import { FileText, Trash2, Clock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import type { Document, DocumentStatus } from '@/types';

interface DocumentListProps {
  className?: string;
}

/**
 * 文档状态图标
 */
function StatusIcon({ status }: { status: DocumentStatus }) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case 'processing':
      return <Loader2 className="h-4 w-4 text-primary animate-spin" />;
    case 'failed':
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
}

/**
 * 文档项组件
 */
function DocumentItem({
  document,
  isSelected,
  onSelect,
  onDelete,
}: {
  document: Document;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  // 格式化文件大小
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // 格式化日期
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div
      onClick={document.status === 'completed' ? onSelect : undefined}
      className={cn(
        'group flex items-center gap-3 p-3 rounded-xl transition-all duration-200',
        document.status === 'completed' && 'cursor-pointer hover:bg-muted/50',
        isSelected && 'bg-primary/10 ring-1 ring-primary/30',
      )}
    >
      <div
        className={cn(
          'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
          isSelected ? 'bg-primary/20' : 'bg-muted'
        )}
      >
        <FileText
          className={cn(
            'h-5 w-5',
            isSelected ? 'text-primary' : 'text-muted-foreground'
          )}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{document.original_filename}</p>
          <StatusIcon status={document.status} />
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{formatSize(document.file_size)}</span>
          {document.page_count && (
            <>
              <span>•</span>
              <span>{document.page_count} 页</span>
            </>
          )}
          <span>•</span>
          <span>{formatDate(document.created_at)}</span>
        </div>
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

/**
 * 加载骨架屏
 */
function LoadingSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3 p-3">
          <Skeleton className="w-10 h-10 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * 空状态
 */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-4">
        <FileText className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground">暂无文档</p>
      <p className="text-xs text-muted-foreground mt-1">上传 PDF 文档开始使用</p>
    </div>
  );
}

/**
 * 文档列表主组件
 */
export function DocumentList({ className }: DocumentListProps) {
  const {
    documents,
    currentDocument,
    isLoading,
    fetchDocuments,
    setCurrentDocument,
    deleteDocument,
  } = useDocumentStore();

  const { clearChat } = useChatStore();

  // 初始加载文档列表
  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // 选择文档
  const handleSelect = (doc: Document) => {
    if (currentDocument?.id !== doc.id) {
      setCurrentDocument(doc);
      clearChat(); // 切换文档时清空聊天记录
    }
  };

  // 删除文档
  const handleDelete = async (doc: Document) => {
    if (window.confirm(`确定要删除 "${doc.original_filename}" 吗？`)) {
      await deleteDocument(doc.id);
    }
  };

  return (
    <div className={cn('flex flex-col', className)}>
      <div className="px-4 py-3 border-b">
        <h3 className="font-semibold text-sm">我的文档</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          共 {documents.length} 个文档
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {isLoading ? (
            <LoadingSkeleton />
          ) : documents.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-1">
              {documents.map((doc) => (
                <DocumentItem
                  key={doc.id}
                  document={doc}
                  isSelected={currentDocument?.id === doc.id}
                  onSelect={() => handleSelect(doc)}
                  onDelete={() => handleDelete(doc)}
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
