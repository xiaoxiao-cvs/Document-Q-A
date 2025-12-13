import React from 'react'
import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { User, Bot } from 'lucide-react'
import { Message } from '@/types'

interface ChatBubbleProps {
  message: Message
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ message }) => {
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
        <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-dark flex items-center justify-center">
          <Bot className="w-5 h-5 text-light" />
        </div>
      )}

      {/* Message Content */}
      <div className={`max-w-[70%] ${isUser ? 'order-first' : ''}`}>
        <div
          className={`
            px-4 py-3 rounded-2xl
            ${isUser
              ? 'bg-dark text-light rounded-tr-sm'
              : 'bg-white text-dark rounded-tl-sm border border-gray-200'
            }
          `}
        >
          {isUser ? (
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose prose-sm max-w-none prose-p:my-2 prose-pre:my-2 prose-ul:my-2 prose-ol:my-2">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
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
            <p className="text-xs text-gray-500 px-2">参考来源：</p>
            {message.sources.map((source, idx) => (
              <div
                key={idx}
                className="text-xs p-2 bg-gray-50 rounded-lg border border-gray-200"
              >
                <p className="font-medium text-gray-700 truncate">
                  {source.document_name}
                </p>
                <p className="text-gray-500 line-clamp-2 mt-1">
                  {source.chunk_text}
                </p>
                <p className="text-gray-400 mt-1">
                  相似度: {(source.similarity_score * 100).toFixed(1)}%
                </p>
              </div>
            ))}
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
        <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-dark flex items-center justify-center">
          <User className="w-5 h-5 text-light" />
        </div>
      )}
    </motion.div>
  )
}
