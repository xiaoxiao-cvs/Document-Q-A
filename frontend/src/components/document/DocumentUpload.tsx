/**
 * 文档上传组件
 * 支持拖拽上传和点击上传
 */
import { useCallback, useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useDocumentStore } from '@/stores';
import { Upload, FileText, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface DocumentUploadProps {
  className?: string;
  onUploadSuccess?: () => void;
}

export function DocumentUpload({ className, onUploadSuccess }: DocumentUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { isUploading, uploadProgress, error, uploadDocument, clearError } = useDocumentStore();

  // 处理文件选择
  const handleFileSelect = useCallback((file: File) => {
    if (file.type !== 'application/pdf') {
      alert('只支持 PDF 文件');
      return;
    }
    setSelectedFile(file);
    clearError();
  }, [clearError]);

  // 点击上传
  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  // 文件输入变化
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  // 拖拽事件处理
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  // 开始上传
  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;

    try {
      await uploadDocument(selectedFile);
      setSelectedFile(null);
      onUploadSuccess?.();
    } catch {
      // 错误已在 store 中处理
    }
  }, [selectedFile, uploadDocument, onUploadSuccess]);

  // 取消选择
  const handleCancel = useCallback(() => {
    setSelectedFile(null);
    clearError();
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }, [clearError]);

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* 隐藏的文件输入 */}
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleInputChange}
        className="hidden"
      />

      {/* 拖拽区域 */}
      {!selectedFile && !isUploading && (
        <div
          onClick={handleClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            'relative flex flex-col items-center justify-center',
            'p-8 border-2 border-dashed rounded-2xl',
            'cursor-pointer transition-all duration-200',
            isDragging
              ? 'border-primary bg-primary/5 scale-[1.02]'
              : 'border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/30',
          )}
        >
          <div
            className={cn(
              'w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-all',
              isDragging ? 'bg-primary/20' : 'bg-muted'
            )}
          >
            <Upload
              className={cn(
                'h-8 w-8 transition-colors',
                isDragging ? 'text-primary' : 'text-muted-foreground'
              )}
            />
          </div>
          <p className="text-sm font-medium mb-1">
            {isDragging ? '松开鼠标上传文件' : '拖拽文件到此处，或点击选择'}
          </p>
          <p className="text-xs text-muted-foreground">支持 PDF 格式</p>
        </div>
      )}

      {/* 已选择文件预览 */}
      {selectedFile && !isUploading && (
        <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 border">
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{selectedFile.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(selectedFile.size)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleCancel}>
              <X className="h-4 w-4" />
            </Button>
            <Button onClick={handleUpload} size="sm">
              <Upload className="h-4 w-4 mr-2" />
              上传
            </Button>
          </div>
        </div>
      )}

      {/* 上传进度 */}
      {isUploading && (
        <div className="space-y-3 p-4 rounded-xl bg-muted/30 border">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 text-primary animate-spin" />
            <div className="flex-1">
              <p className="text-sm font-medium">正在上传...</p>
              <p className="text-xs text-muted-foreground">
                {selectedFile?.name}
              </p>
            </div>
            <span className="text-sm font-medium text-primary">
              {uploadProgress}%
            </span>
          </div>
          <Progress value={uploadProgress} className="h-2" />
        </div>
      )}

      {/* 上传成功 */}
      {uploadProgress === 100 && !isUploading && !selectedFile && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/30">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          <p className="text-sm text-green-700 dark:text-green-400">文档上传成功！</p>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/30">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="ghost" size="sm" onClick={clearError} className="ml-auto">
            关闭
          </Button>
        </div>
      )}
    </div>
  );
}
