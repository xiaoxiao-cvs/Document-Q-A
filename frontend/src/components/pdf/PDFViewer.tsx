/**
 * PDF 查看器组件
 * 支持翻页、缩放、高亮显示
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePDFStore, useChatStore } from '@/stores';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  FileText
} from 'lucide-react';
import type { BoundingBox } from '@/types';

// 设置 PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFViewerProps {
  fileUrl: string | null;
  className?: string;
}

/**
 * 高亮覆盖层组件
 */
function HighlightOverlay({
  bbox,
  scale,
  pageHeight,
}: {
  bbox: BoundingBox;
  scale: number;
  pageWidth: number;
  pageHeight: number;
}) {
  // PDF 坐标原点在左下角，需要转换为 CSS 坐标（左上角）
  const style = {
    position: 'absolute' as const,
    left: bbox.x0 * scale,
    top: (pageHeight - bbox.y1) * scale,
    width: (bbox.x1 - bbox.x0) * scale,
    height: (bbox.y1 - bbox.y0) * scale,
    backgroundColor: 'rgba(255, 213, 0, 0.4)',
    border: '2px solid rgba(255, 180, 0, 0.8)',
    borderRadius: '4px',
    pointerEvents: 'none' as const,
    transition: 'all 0.3s ease',
    animation: 'pulse 2s infinite',
  };

  return <div style={style} />;
}

/**
 * PDF 页面组件
 */
function PDFPage({
  pageNumber,
  scale,
  highlightBbox,
  highlightPage,
  onPageLoad,
}: {
  pageNumber: number;
  scale: number;
  highlightBbox: BoundingBox | null;
  highlightPage: number | null;
  onPageLoad?: (width: number, height: number) => void;
}) {
  const [pageSize, setPageSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldHighlight = highlightPage === pageNumber && highlightBbox;

  const handlePageLoadSuccess = useCallback(
    (page: { width: number; height: number }) => {
      setPageSize({ width: page.width, height: page.height });
      onPageLoad?.(page.width, page.height);
    },
    [onPageLoad]
  );

  // 如果需要高亮，滚动到该页面
  useEffect(() => {
    if (shouldHighlight && containerRef.current) {
      containerRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [shouldHighlight]);

  return (
    <div
      ref={containerRef}
      className="relative mb-4 shadow-lg rounded-lg overflow-hidden bg-white"
      data-page={pageNumber}
    >
      <Page
        pageNumber={pageNumber}
        scale={scale}
        onLoadSuccess={handlePageLoadSuccess}
        loading={
          <div className="flex items-center justify-center h-[800px] w-[600px]">
            <Skeleton className="h-full w-full" />
          </div>
        }
        className="[&_.react-pdf__Page__canvas]:mx-auto"
      />
      
      {/* 页码标签 */}
      <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 text-white text-xs rounded">
        第 {pageNumber} 页
      </div>

      {/* 高亮覆盖层 */}
      {shouldHighlight && highlightBbox && (
        <HighlightOverlay
          bbox={highlightBbox}
          scale={scale}
          pageWidth={pageSize.width}
          pageHeight={pageSize.height}
        />
      )}
    </div>
  );
}

/**
 * PDF 工具栏组件
 */
function PDFToolbar({
  scale,
  currentPage,
  totalPages,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onPrevPage,
  onNextPage,
}: {
  scale: number;
  currentPage: number;
  totalPages: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onPrevPage: () => void;
  onNextPage: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-background/95 backdrop-blur border-b sticky top-0 z-10">
      {/* 缩放控制 */}
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={onZoomOut} title="缩小">
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="w-16 text-center text-sm font-medium">
          {Math.round(scale * 100)}%
        </span>
        <Button variant="ghost" size="sm" onClick={onZoomIn} title="放大">
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={onResetZoom} title="重置缩放">
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      {/* 翻页控制 */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onPrevPage}
          disabled={currentPage <= 1}
          title="上一页"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium px-2">
          {currentPage} / {totalPages}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onNextPage}
          disabled={currentPage >= totalPages}
          title="下一页"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

/**
 * 空状态组件
 */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
      <FileText className="h-16 w-16 mb-4 opacity-30" />
      <p className="text-lg font-medium">未选择文档</p>
      <p className="text-sm">请先上传或选择一个 PDF 文档</p>
    </div>
  );
}

/**
 * PDF 查看器主组件
 */
export function PDFViewer({ fileUrl, className }: PDFViewerProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // 从 store 获取状态和方法
  const { 
    scale, 
    currentPage, 
    totalPages,
    setTotalPages, 
    setCurrentPage,
    zoomIn, 
    zoomOut, 
    resetZoom,
    nextPage,
    prevPage,
    setIsLoading,
  } = usePDFStore();

  const { highlightPage, highlightBbox } = useChatStore();

  // 文档加载成功
  const onDocumentLoadSuccess = useCallback(
    ({ numPages }: { numPages: number }) => {
      setTotalPages(numPages);
      setCurrentPage(1);
      setIsLoading(false);
    },
    [setTotalPages, setCurrentPage, setIsLoading]
  );

  // 文档加载开始
  const onDocumentLoadStart = useCallback(() => {
    setIsLoading(true);
  }, [setIsLoading]);

  // 当高亮页面变化时，滚动到对应页面
  useEffect(() => {
    if (highlightPage && scrollContainerRef.current) {
      const pageElement = scrollContainerRef.current.querySelector(
        `[data-page="${highlightPage}"]`
      );
      if (pageElement) {
        pageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setCurrentPage(highlightPage);
      }
    }
  }, [highlightPage, setCurrentPage]);

  // 监听滚动更新当前页码
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const pages = container.querySelectorAll('[data-page]');
      const containerRect = container.getBoundingClientRect();
      const containerCenter = containerRect.top + containerRect.height / 2;

      for (const page of pages) {
        const rect = page.getBoundingClientRect();
        if (rect.top <= containerCenter && rect.bottom >= containerCenter) {
          const pageNum = parseInt(page.getAttribute('data-page') || '1', 10);
          setCurrentPage(pageNum);
          break;
        }
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [setCurrentPage]);

  if (!fileUrl) {
    return (
      <div className={className}>
        <EmptyState />
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className || ''}`}>
      {/* 工具栏 */}
      <PDFToolbar
        scale={scale}
        currentPage={currentPage}
        totalPages={totalPages}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onResetZoom={resetZoom}
        onPrevPage={prevPage}
        onNextPage={nextPage}
      />

      {/* PDF 内容区 */}
      <ScrollArea className="flex-1" ref={scrollContainerRef}>
        <div className="p-4 flex flex-col items-center bg-muted/30 min-h-full">
          <Document
            file={fileUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadStart={onDocumentLoadStart}
            loading={
              <div className="flex flex-col gap-4 items-center py-8">
                <Skeleton className="h-[800px] w-[600px] rounded-lg" />
              </div>
            }
            error={
              <div className="flex flex-col items-center justify-center py-8 text-destructive">
                <FileText className="h-16 w-16 mb-4 opacity-50" />
                <p className="text-lg font-medium">加载失败</p>
                <p className="text-sm">无法加载 PDF 文档</p>
              </div>
            }
          >
            {Array.from({ length: totalPages }, (_, index) => (
              <PDFPage
                key={`page-${index + 1}`}
                pageNumber={index + 1}
                scale={scale}
                highlightBbox={highlightBbox}
                highlightPage={highlightPage}
              />
            ))}
          </Document>
        </div>
      </ScrollArea>

      {/* 高亮动画样式 */}
      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.6;
          }
        }
      `}</style>
    </div>
  );
}
