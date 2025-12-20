import React, { useState, useCallback, useRef, useEffect } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Loader2,
  FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

// 配置 PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

export interface HighlightArea {
  page: number
  x0?: number
  y0?: number
  x1?: number
  y1?: number
  text?: string
}

interface PDFViewerProps {
  /** PDF 文件 URL 或 Base64 */
  file: string | null
  /** 文件名 */
  filename?: string
  /** 高亮区域 */
  highlightAreas?: HighlightArea[]
  /** 跳转到指定页码 */
  targetPage?: number
  /** 页码变化回调 */
  onPageChange?: (page: number) => void
  /** 类名 */
  className?: string
}

export const PDFViewer: React.FC<PDFViewerProps> = ({
  file,
  filename,
  highlightAreas = [],
  targetPage,
  onPageChange,
  className,
}) => {
  const [numPages, setNumPages] = useState<number>(0)
  const [pageNumber, setPageNumber] = useState<number>(1)
  const [scale, setScale] = useState<number>(1.0)
  const [rotation, setRotation] = useState<number>(0)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [containerWidth, setContainerWidth] = useState<number>(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const pageRef = useRef<HTMLDivElement>(null)

  // 监听容器宽度变化
  useEffect(() => {
    if (!containerRef.current) return

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width)
      }
    })

    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  // 跳转到目标页
  useEffect(() => {
    if (targetPage && targetPage >= 1 && targetPage <= numPages) {
      setPageNumber(targetPage)
    }
  }, [targetPage, numPages])

  // 文档加载成功
  const onDocumentLoadSuccess = useCallback(
    ({ numPages: total }: { numPages: number }) => {
      setNumPages(total)
      setPageNumber(1)
      setIsLoading(false)
      setError(null)
    },
    []
  )

  // 文档加载失败
  const onDocumentLoadError = useCallback((err: Error) => {
    console.error('PDF 加载失败:', err)
    setError('PDF 文件加载失败，请检查文件是否有效')
    setIsLoading(false)
  }, [])

  // 翻页
  const goToPage = useCallback(
    (page: number) => {
      const newPage = Math.max(1, Math.min(page, numPages))
      setPageNumber(newPage)
      onPageChange?.(newPage)
    },
    [numPages, onPageChange]
  )

  const previousPage = useCallback(() => goToPage(pageNumber - 1), [goToPage, pageNumber])
  const nextPage = useCallback(() => goToPage(pageNumber + 1), [goToPage, pageNumber])

  // 缩放
  const zoomIn = useCallback(() => setScale((s) => Math.min(s + 0.25, 3)), [])
  const zoomOut = useCallback(() => setScale((s) => Math.max(s - 0.25, 0.5)), [])
  const resetZoom = useCallback(() => setScale(1), [])

  // 旋转
  const rotate = useCallback(() => setRotation((r) => (r + 90) % 360), [])

  // 当前页的高亮区域
  const currentHighlights = highlightAreas.filter((h) => h.page === pageNumber)

  // 空状态
  if (!file) {
    return (
      <div className={cn('h-full flex items-center justify-center bg-gray-50', className)}>
        <div className="text-center p-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-gray-100 flex items-center justify-center">
            <FileText className="w-10 h-10 text-gray-300" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">暂无文档</h3>
          <p className="text-sm text-gray-500">请先在左侧上传并选择文档</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col h-full bg-gray-100', className)}>
      {/* 工具栏 */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200 shadow-sm">
        {/* 文件名 */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
          <span className="text-sm font-medium text-gray-700 truncate">
            {filename || '文档预览'}
          </span>
        </div>

        {/* 翻页控制 */}
        <div className="flex items-center gap-1">
          <button
            onClick={previousPage}
            disabled={pageNumber <= 1}
            className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="上一页"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-1 px-2">
            <input
              type="number"
              min={1}
              max={numPages}
              value={pageNumber}
              onChange={(e) => goToPage(parseInt(e.target.value) || 1)}
              className="w-12 px-2 py-1 text-center text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-500">/ {numPages}</span>
          </div>
          <button
            onClick={nextPage}
            disabled={pageNumber >= numPages}
            className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="下一页"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* 缩放和旋转控制 */}
        <div className="flex items-center gap-1">
          <button
            onClick={zoomOut}
            disabled={scale <= 0.5}
            className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="缩小"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
          <button
            onClick={resetZoom}
            className="px-2 py-1 text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors min-w-[60px]"
            title="重置缩放"
          >
            {Math.round(scale * 100)}%
          </button>
          <button
            onClick={zoomIn}
            disabled={scale >= 3}
            className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="放大"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
          <div className="w-px h-6 bg-gray-200 mx-1" />
          <button
            onClick={rotate}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            title="旋转"
          >
            <RotateCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* PDF 内容区 */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto p-4 flex justify-center"
      >
        {isLoading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-2" />
              <p className="text-sm text-gray-500">正在加载文档...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center p-8 bg-red-50 rounded-xl">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                <FileText className="w-8 h-8 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-red-700 mb-2">加载失败</h3>
              <p className="text-sm text-red-500">{error}</p>
            </div>
          </div>
        )}

        <Document
          file={file}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={null}
          className={cn(isLoading || error ? 'hidden' : '')}
        >
          <div ref={pageRef} className="relative inline-block shadow-lg">
            <Page
              pageNumber={pageNumber}
              scale={scale}
              rotate={rotation}
              width={containerWidth > 0 ? Math.min(containerWidth - 32, 800) * scale : undefined}
              renderTextLayer={true}
              renderAnnotationLayer={true}
              className="bg-white"
            />
            
            {/* 高亮层 */}
            <AnimatePresence>
              {currentHighlights.map((highlight, index) => (
                <HighlightOverlay
                  key={`highlight-${index}`}
                  highlight={highlight}
                  scale={scale}
                />
              ))}
            </AnimatePresence>
          </div>
        </Document>
      </div>
    </div>
  )
}

// 高亮覆盖层组件
interface HighlightOverlayProps {
  highlight: HighlightArea
  scale: number
}

const HighlightOverlay: React.FC<HighlightOverlayProps> = ({ highlight, scale }) => {
  // 如果没有坐标信息，显示页面级别的提示
  if (!highlight.x0 || !highlight.y0 || !highlight.x1 || !highlight.y1) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute top-4 right-4 bg-yellow-100 border border-yellow-300 rounded-lg px-3 py-2 shadow-md"
      >
        <p className="text-xs text-yellow-700">
          来源：第 {highlight.page} 页
        </p>
      </motion.div>
    )
  }

  // 计算高亮区域的位置和大小
  const style: React.CSSProperties = {
    position: 'absolute',
    left: highlight.x0 * scale,
    top: highlight.y0 * scale,
    width: (highlight.x1 - highlight.x0) * scale,
    height: (highlight.y1 - highlight.y0) * scale,
    backgroundColor: 'rgba(255, 235, 59, 0.4)',
    border: '2px solid rgba(255, 193, 7, 0.8)',
    borderRadius: '4px',
    pointerEvents: 'none',
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      style={style}
    />
  )
}

export default PDFViewer
