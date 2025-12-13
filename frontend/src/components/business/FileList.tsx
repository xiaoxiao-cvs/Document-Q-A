import React from 'react'
import { motion } from 'framer-motion'
import { FileText, Trash2, Clock } from 'lucide-react'
import { Document } from '@/types'
import { formatFileSize, formatDate } from '@/lib/utils'

interface FileListProps {
  documents: Document[]
  selectedIds: string[]
  onSelect: (id: string) => void
  onDelete: (id: string) => void
}

export const FileList: React.FC<FileListProps> = ({
  documents,
  selectedIds,
  onSelect,
  onDelete,
}) => {
  return (
    <div className="p-4 space-y-2">
      {documents.length === 0 ? (
        <div className="text-center py-8">
          <FileText className="w-12 h-12 mx-auto mb-3 text-light/30" />
          <p className="text-light/60 text-sm">暂无文档</p>
        </div>
      ) : (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            visible: {
              transition: {
                staggerChildren: 0.05,
              },
            },
          }}
        >
          {documents.map((doc) => {
            const isSelected = selectedIds.includes(doc.id)
            
            return (
              <motion.div
                key={doc.id}
                variants={{
                  hidden: { opacity: 0, y: 10 },
                  visible: { opacity: 1, y: 0 },
                }}
                className={`
                  group relative p-4 rounded-xl cursor-pointer transition-all
                  ${isSelected 
                    ? 'bg-light/10 border border-light/20' 
                    : 'bg-dark-secondary/50 border border-transparent hover:bg-dark-secondary/80'
                  }
                `}
                onClick={() => onSelect(doc.id)}
              >
                <div className="flex items-start gap-3">
                  <div className={`
                    p-2 rounded-lg flex-shrink-0
                    ${isSelected ? 'bg-light/20' : 'bg-dark/20'}
                  `}>
                    <FileText className={`w-4 h-4 ${isSelected ? 'text-light' : 'text-light/60'}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className={`text-sm font-medium truncate ${isSelected ? 'text-light' : 'text-light/90'}`}>
                      {doc.filename}
                    </h3>
                    <div className="flex items-center gap-3 mt-1 text-xs text-light/50">
                      <span>{formatFileSize(doc.file_size)}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(doc.upload_time)}
                      </span>
                    </div>
                    {doc.chunk_count && (
                      <p className="text-xs text-light/40 mt-1">
                        {doc.chunk_count} 个片段
                      </p>
                    )}
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onDelete(doc.id)
                    }}
                    className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-500/20 rounded-lg transition-all"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>

                {isSelected && (
                  <motion.div
                    layoutId="selected-indicator"
                    className="absolute inset-0 border-2 border-light rounded-xl pointer-events-none"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
              </motion.div>
            )
          })}
        </motion.div>
      )}
    </div>
  )
}
