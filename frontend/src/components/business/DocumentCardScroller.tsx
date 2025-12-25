import { useRef, useState, useEffect, useCallback, ReactNode } from 'react'
import { motion } from 'framer-motion'
import { FileText, Clock, Layers, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { Document } from '@/types'
import { documentsApi } from '@/api'
import { formatFileSize, formatDateTime } from '@/lib/utils'
import { ConfirmModal } from '@/components/ui/ConfirmModal'

interface DocumentCardScrollerProps {
  documents: Document[]
  onDocumentClick: (documentId: string) => void
  onDelete?: (documentId: string) => void
  uploadSlot?: ReactNode
}

export const DocumentCardScroller = ({
  documents,
  onDocumentClick,
  onDelete,
  uploadSlot,
}: DocumentCardScrollerProps) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  // 更新滚动按钮状态
  const updateScrollButtons = useCallback(() => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current
      setCanScrollLeft(scrollLeft > 0)
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10)
    }
  }, [])

  // 使用 useEffect 添加非 passive 的 wheel 事件监听器
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      container.scrollLeft += e.deltaY
      updateScrollButtons()
    }

    // 添加非 passive 的事件监听器
    container.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      container.removeEventListener('wheel', handleWheel)
    }
  }, [updateScrollButtons])

  // 滚动到指定方向
  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 300
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      })
      setTimeout(updateScrollButtons, 300)
    }
  }

  return (
    <div className="relative group">
      {/* 左侧滚动按钮 */}
      {canScrollLeft && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 bg-white hover:bg-gray-100 rounded-full shadow-lg border border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
      )}

      {/* 右侧滚动按钮 */}
      {canScrollRight && (documents.length > 2 || (uploadSlot && documents.length > 1)) && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 bg-white hover:bg-gray-100 rounded-full shadow-lg border border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      )}

      {/* 滚动容器 */}
      <div
        ref={scrollContainerRef}
        onScroll={updateScrollButtons}
        className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide scroll-smooth"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {/* 上传卡片插槽 */}
        {uploadSlot}
        
        {/* 文档卡片 */}
        {documents.map((doc, index) => (
          <DocumentCard
            key={doc.id}
            document={doc}
            index={index}
            onClick={() => onDocumentClick(doc.id)}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  )
}

interface DocumentCardProps {
  document: Document
  index: number
  onClick: () => void
  onDelete?: (documentId: string) => void
}

const DocumentCard = ({ document, index, onClick, onDelete }: DocumentCardProps) => {
  const [thumbnailError, setThumbnailError] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const thumbnailUrl = documentsApi.getThumbnailUrl(document.id)

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowDeleteConfirm(true)
  }

  const confirmDelete = () => {
    if (onDelete) {
      onDelete(document.id)
    }
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.05 }}
        onClick={onClick}
        className="flex-shrink-0 w-56 cursor-pointer group/card"
      >
        <div className="relative bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-gray-400 hover:shadow-md transition-all duration-200">
          {/* 删除按钮 */}
          {onDelete && (
            <button
              onClick={handleDelete}
              className="absolute top-2 right-2 z-20 p-1.5 rounded-full hover:bg-gray-200 transition-colors duration-200"
              title="删除文档"
            >
              <X className="w-4 h-4 text-gray-500 hover:text-gray-700" />
            </button>
          )}
        {/* 缩略图区域 */}
        <div className="relative h-32 bg-gray-100 overflow-hidden">
          {!thumbnailError ? (
            <img
              src={thumbnailUrl}
              alt={document.filename}
              className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-300"
              onError={() => setThumbnailError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <FileText className="w-12 h-12 text-gray-300" />
            </div>
          )}
          {/* 悬浮遮罩 */}
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity">
            <div className="absolute bottom-2 left-2 right-2">
              <span className="text-xs text-white bg-gray-800/80 px-2 py-1 rounded">
                点击开始提问
              </span>
            </div>
          </div>
        </div>

        {/* 信息区域 */}
        <div className="p-3">
          <h3 className="font-medium text-gray-800 text-sm truncate mb-2" title={document.filename}>
            {document.filename}
          </h3>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Layers className="w-3 h-3" />
              {document.chunk_count || 0} 片段
            </span>
            <span>{formatFileSize(document.file_size)}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
            <Clock className="w-3 h-3" />
            {formatDateTime(document.upload_time)}
          </div>
        </div>
      </div>
    </motion.div>

      {/* 删除确认对话框 */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title="删除文档"
        message={`确定要删除文档 "${document.filename}" 吗？此操作无法撤销。`}
        confirmText="删除"
        cancelText="取消"
        type="danger"
      />
    </>
  )
}
