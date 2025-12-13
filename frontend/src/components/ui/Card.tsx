import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
  hoverable?: boolean
  onClick?: () => void
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  hoverable = false,
  onClick,
}) => {
  const Component = hoverable ? motion.div : 'div'
  const hoverProps = hoverable ? {
    whileHover: { y: -2, scale: 1.01 },
    transition: { type: 'spring', stiffness: 300 }
  } : {}
  
  return (
    <Component
      onClick={onClick}
      className={cn(
        'bg-white rounded-2xl border border-gray-200 shadow-sm',
        hoverable && 'cursor-pointer hover:shadow-md transition-shadow',
        className
      )}
      {...hoverProps}
    >
      {children}
    </Component>
  )
}
