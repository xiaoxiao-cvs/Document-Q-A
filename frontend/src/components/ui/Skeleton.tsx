import React from 'react'
import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
}

export const Skeleton: React.FC<SkeletonProps> = ({ className }) => {
  return (
    <div
      className={cn(
        'animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%]',
        className
      )}
      style={{
        animation: 'shimmer 1.5s ease-in-out infinite',
      }}
    />
  )
}

// 消息骨架屏
export const MessageSkeleton: React.FC = () => {
  return (
    <div className="flex gap-3 animate-pulse">
      <Skeleton className="w-8 h-8 rounded-xl flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4 rounded" />
        <Skeleton className="h-4 w-1/2 rounded" />
        <Skeleton className="h-4 w-2/3 rounded" />
      </div>
    </div>
  )
}

// 文档列表骨架屏
export const DocumentSkeleton: React.FC = () => {
  return (
    <div className="p-3 animate-pulse">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-lg flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4 rounded" />
          <Skeleton className="h-3 w-1/2 rounded" />
        </div>
      </div>
    </div>
  )
}

// PDF 预览骨架屏
export const PDFSkeleton: React.FC = () => {
  return (
    <div className="h-full flex flex-col animate-pulse p-4">
      {/* 工具栏骨架 */}
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-200">
        <Skeleton className="h-6 w-32 rounded" />
        <div className="flex gap-2">
          <Skeleton className="w-8 h-8 rounded" />
          <Skeleton className="w-8 h-8 rounded" />
          <Skeleton className="w-8 h-8 rounded" />
        </div>
      </div>
      {/* PDF 页面骨架 */}
      <div className="flex-1 flex justify-center">
        <Skeleton className="w-full max-w-lg h-full rounded-lg" />
      </div>
    </div>
  )
}

export default Skeleton
