import React from 'react'

interface MainLayoutProps {
  sidebar: React.ReactNode
  children: React.ReactNode
}

export const MainLayout: React.FC<MainLayoutProps> = ({ sidebar, children }) => {
  return (
    <div className="flex h-screen bg-light-secondary overflow-hidden">
      {sidebar}
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  )
}
