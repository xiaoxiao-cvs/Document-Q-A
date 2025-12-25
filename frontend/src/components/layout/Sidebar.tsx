import React from 'react'
import { motion } from 'framer-motion'
import { MessageSquare } from 'lucide-react'

interface SidebarProps {
  children: React.ReactNode
}

export const Sidebar: React.FC<SidebarProps> = ({ children }) => {
  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="w-80 h-screen bg-dark-secondary/95 backdrop-blur-sm border-r border-dark/10 flex flex-col overflow-hidden"
    >
      {/* Logo & Title */}
      <div className="p-6 border-b border-dark/10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-light rounded-xl">
            <MessageSquare className="w-6 h-6 text-dark" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-light">Document Q&A</h1>
            <p className="text-xs text-light/60">智能文档问答系统</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </motion.aside>
  )
}
