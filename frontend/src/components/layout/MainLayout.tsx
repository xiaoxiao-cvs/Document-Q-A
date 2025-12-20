import React from 'react'
import { Panel, Group, Separator } from 'react-resizable-panels'
import { GripVertical } from 'lucide-react'

interface MainLayoutProps {
  sidebar: React.ReactNode
  children: React.ReactNode
  rightPanel?: React.ReactNode
  showRightPanel?: boolean
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  sidebar,
  children,
  rightPanel,
  showRightPanel = false,
}) => {
  return (
    <div className="flex h-screen bg-light-secondary overflow-hidden">
      {/* 左侧边栏 - 固定宽度 */}
      {sidebar}

      {/* 主内容区 - 可调节分屏 */}
      <Group orientation="horizontal" className="flex-1">
        {/* 聊天区域 */}
        <Panel
          id="chat-panel"
          defaultSize={showRightPanel ? 50 : 100}
          minSize={30}
          className="overflow-hidden"
        >
          <main className="h-full overflow-hidden bg-white">
            {children}
          </main>
        </Panel>

        {/* 分割线 */}
        {showRightPanel && (
          <>
            <Separator className="w-2 bg-gray-100 hover:bg-blue-200 transition-colors flex items-center justify-center group relative">
              <div className="absolute inset-y-0 w-1 bg-gray-200 group-hover:bg-blue-400 transition-colors" />
              <GripVertical className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors relative z-10" />
            </Separator>

            {/* PDF 预览区域 */}
            <Panel
              id="pdf-panel"
              defaultSize={50}
              minSize={25}
              className="overflow-hidden"
            >
              <div className="h-full overflow-hidden bg-gray-50">
                {rightPanel}
              </div>
            </Panel>
          </>
        )}
      </Group>
    </div>
  )
}
