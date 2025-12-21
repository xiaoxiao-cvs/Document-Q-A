import React, { useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Send, Loader2, StopCircle, Sparkles } from 'lucide-react'
import { ChatBubble } from './ChatBubble'
import { Message, Source } from '@/types'

interface ChatAreaProps {
  messages: Message[]
  onSendMessage: (message: string) => void
  onSourceClick?: (source: Source) => void
  onCancelStreaming?: () => void
  loading?: boolean
  isStreaming?: boolean
  hasDocuments?: boolean
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  messages,
  onSendMessage,
  onSourceClick,
  onCancelStreaming,
  loading = false,
  isStreaming = false,
  hasDocuments = false,
}) => {
  const [input, setInput] = React.useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 150) + 'px'
    }
  }, [input])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim() && !loading && !isStreaming) {
      onSendMessage(input.trim())
      setInput('')
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-md">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                  <Sparkles className="w-10 h-10 text-blue-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  智能文档问答
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  {hasDocuments 
                    ? '文档已就绪，您可以开始提问了'
                    : '请先在左侧上传并选择文档，然后向 AI 提问'}
                </p>
                {hasDocuments && (
                  <div className="flex flex-wrap gap-2 justify-center">
                    {['这份文档讲了什么？', '总结一下主要内容', '有哪些关键信息？'].map((hint) => (
                      <button
                        key={hint}
                        onClick={() => setInput(hint)}
                        className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors border border-gray-200"
                      >
                        {hint}
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <ChatBubble 
                key={message.id} 
                message={message} 
                onSourceClick={onSourceClick}
              />
            ))}
            {loading && !isStreaming && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3"
              >
                <div className="w-8 h-8 rounded-xl bg-gray-800 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                </div>
                <div className="px-4 py-3 bg-gray-50 rounded-2xl rounded-tl-sm border border-gray-200">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <p className="text-sm text-gray-500">AI 正在思考...</p>
                  </div>
                </div>
              </motion.div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 p-4 bg-white">
        <form onSubmit={handleSubmit} className="flex gap-3 items-end">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={hasDocuments ? "输入您的问题... (Shift+Enter 换行)" : "请先选择文档..."}
              disabled={loading || isStreaming || !hasDocuments}
              rows={1}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-gray-600 focus:ring-2 focus:ring-gray-300 outline-none transition-all disabled:opacity-50 resize-none overflow-hidden bg-white"
              style={{ minHeight: '48px', maxHeight: '150px' }}
            />
          </div>
          
          {isStreaming ? (
            <motion.button
              type="button"
              onClick={onCancelStreaming}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-4 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors flex items-center gap-2"
            >
              <StopCircle className="w-5 h-5" />
              停止
            </motion.button>
          ) : (
            <motion.button
              type="submit"
              disabled={!input.trim() || loading || !hasDocuments}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-6 py-3 bg-gray-800 text-white rounded-xl font-medium hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <Send className="w-5 h-5" />
              发送
            </motion.button>
          )}
        </form>
        
        {/* 提示信息 */}
        {!hasDocuments && (
          <p className="text-xs text-amber-600 mt-2 text-center">
            ⚠️ 请先在左侧上传并选择至少一个文档
          </p>
        )}
      </div>
    </div>
  )
}
