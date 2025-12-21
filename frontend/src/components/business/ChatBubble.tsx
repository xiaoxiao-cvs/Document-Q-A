import React from 'react'
import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { User, Bot, ExternalLink } from 'lucide-react'
import { Message, Source } from '@/types'

interface ChatBubbleProps {
  message: Message
  onSourceClick?: (source: Source) => void
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ message, onSourceClick }) => {
  const isUser = message.role === 'user'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {/* Avatar */}
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-gray-800 flex items-center justify-center">
          <Bot className="w-5 h-5 text-white" />
        </div>
      )}

      {/* Message Content */}
      <div className={`max-w-[70%] ${isUser ? 'order-first' : ''}`}>
        <div
          className={`
            px-4 py-3 rounded-2xl
            ${isUser
              ? 'bg-gray-800 text-white rounded-tr-sm'
              : 'bg-gray-50 text-gray-800 rounded-tl-sm border border-gray-200'
            }
          `}
        >
          {isUser ? (
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose prose-sm max-w-none prose-p:my-2 prose-pre:my-2 prose-ul:my-2 prose-ol:my-2">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content || '思考中...'}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Sources */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-2 space-y-1"
          >
            <p className="text-xs text-gray-500 px-2">📚 参考来源：</p>
            <div className="flex flex-wrap gap-1.5 px-2">
              {message.sources.map((source, idx) => (
                <SourceBadge
                  key={idx}
                  index={idx + 1}
                  source={source}
                  onClick={() => onSourceClick?.(source)}
                />
              ))}
            </div>
          </motion.div>
        )}

        <p className="text-xs text-gray-400 mt-1 px-2">
          {new Date(message.timestamp).toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-gray-800 flex items-center justify-center">
          <User className="w-5 h-5 text-white" />
        </div>
      )}
    </motion.div>
  )
}

// 来源徽章组件
interface SourceBadgeProps {
  index: number
  source: Source
  onClick?: () => void
}

const SourceBadge: React.FC<SourceBadgeProps> = ({ index, source, onClick }) => {
  const page = source.page || 1
  const score = source.similarity_score ? Math.round(source.similarity_score * 100) : null

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="group relative inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border border-blue-200 hover:border-blue-300 rounded-lg transition-all duration-200 cursor-pointer"
      title={`点击跳转到第 ${page} 页\n${source.chunk_text?.slice(0, 100)}...`}
    >
      {/* 序号 */}
      <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold bg-blue-500 text-white rounded-full">
        {index}
      </span>
      
      {/* 页码 */}
      <span className="text-xs font-medium text-blue-700">
        第 {page} 页
      </span>
      
      {/* 相似度 */}
      {score && (
        <span className="text-xs text-blue-500/70">
          {score}%
        </span>
      )}
      
      {/* 跳转图标 */}
      <ExternalLink className="w-3 h-3 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
      
      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap max-w-xs truncate z-50">
        {source.chunk_text?.slice(0, 80)}...
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
      </div>
    </motion.button>
  )
}
