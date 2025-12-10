/**
 * 主布局组件
 * 实现左右分屏可调整大小的布局
 * 支持移动端响应式设计
 */
import { useState } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { cn } from '@/lib/utils';
import { AppSidebar } from './AppSidebar';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { PDFViewer } from '@/components/pdf/PDFViewer';
import { useDocumentStore } from '@/stores';
import { documentService } from '@/services';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { GripVertical, FileText, MessageSquare, X } from 'lucide-react';

interface MainLayoutProps {
  className?: string;
}

/**
 * 可调整大小的分隔条
 */
function ResizeHandle({ className }: { className?: string }) {
  return (
    <PanelResizeHandle
      className={cn(
        'group relative flex w-2 items-center justify-center',
        'bg-transparent hover:bg-primary/5 transition-colors',
        className
      )}
    >
      <div
        className={cn(
          'h-8 w-1 rounded-full bg-muted-foreground/20',
          'group-hover:bg-primary/50 group-active:bg-primary',
          'transition-colors'
        )}
      />
      <GripVertical
        className={cn(
          'absolute h-4 w-4 text-muted-foreground/30',
          'group-hover:text-primary/50 group-active:text-primary',
          'transition-colors'
        )}
      />
    </PanelResizeHandle>
  );
}

/**
 * 移动端面板切换按钮
 */
function MobileTabBar({
  activeTab,
  onTabChange,
  hasDocument,
}: {
  activeTab: 'chat' | 'pdf';
  onTabChange: (tab: 'chat' | 'pdf') => void;
  hasDocument: boolean;
}) {
  return (
    <div className="flex items-center justify-center gap-2 p-2 bg-background/95 backdrop-blur border-t">
      <Button
        variant={activeTab === 'chat' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onTabChange('chat')}
        className="flex-1 max-w-32"
      >
        <MessageSquare className="h-4 w-4 mr-2" />
        聊天
      </Button>
      <Button
        variant={activeTab === 'pdf' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onTabChange('pdf')}
        disabled={!hasDocument}
        className="flex-1 max-w-32"
      >
        <FileText className="h-4 w-4 mr-2" />
        文档
      </Button>
    </div>
  );
}

/**
 * 移动端侧边栏覆盖层
 */
function MobileSidebarOverlay({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen) return null;

  return (
    <>
      {/* 背景遮罩 */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        onClick={onClose}
      />
      {/* 侧边栏 */}
      <div className="fixed inset-y-0 left-0 z-50 w-80 max-w-[85vw]">
        <div className="relative h-full">
          <AppSidebar className="h-full" />
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="absolute top-4 right-4"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </>
  );
}

/**
 * 桌面端布局
 */
function DesktopLayout({ pdfUrl }: { pdfUrl: string | null }) {
  return (
    <div className="flex h-screen bg-background">
      {/* 侧边栏 */}
      <AppSidebar />

      {/* 主内容区 */}
      <div className="flex-1 min-w-0">
        <PanelGroup direction="horizontal" className="h-full">
          {/* 左侧 - 聊天面板 */}
          <Panel
            defaultSize={50}
            minSize={30}
            maxSize={70}
            className="flex flex-col"
          >
            <ChatPanel className="h-full" />
          </Panel>

          {/* 分隔条 */}
          <ResizeHandle />

          {/* 右侧 - PDF 预览 */}
          <Panel
            defaultSize={50}
            minSize={30}
            maxSize={70}
            className="flex flex-col bg-muted/20"
          >
            <PDFViewer fileUrl={pdfUrl} className="h-full" />
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
}

/**
 * 移动端布局
 */
function MobileLayout({ pdfUrl }: { pdfUrl: string | null }) {
  const [activeTab, setActiveTab] = useState<'chat' | 'pdf'>('chat');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { currentDocument } = useDocumentStore();

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* 头部 */}
      <header className="flex items-center justify-between px-4 py-3 border-b bg-background/95 backdrop-blur">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSidebarOpen(true)}
        >
          <FileText className="h-5 w-5 mr-2" />
          文档
        </Button>
        <h1 className="font-semibold text-lg">Doc Q&A</h1>
        <div className="w-20" /> {/* 占位，保持标题居中 */}
      </header>

      {/* 内容区 */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === 'chat' ? (
          <ChatPanel className="h-full" />
        ) : (
          <PDFViewer fileUrl={pdfUrl} className="h-full" />
        )}
      </div>

      {/* 底部 Tab 栏 */}
      <MobileTabBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        hasDocument={!!currentDocument}
      />

      {/* 侧边栏覆盖层 */}
      <MobileSidebarOverlay
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
    </div>
  );
}

/**
 * 主布局组件
 */
export function MainLayout({ className }: MainLayoutProps) {
  const isMobile = useIsMobile();
  const { currentDocument } = useDocumentStore();

  // 获取 PDF 文件 URL
  const pdfUrl = currentDocument
    ? documentService.getFileUrl(currentDocument.id)
    : null;

  if (isMobile) {
    return (
      <div className={className}>
        <MobileLayout pdfUrl={pdfUrl} />
      </div>
    );
  }

  return (
    <div className={className}>
      <DesktopLayout pdfUrl={pdfUrl} />
    </div>
  );
}
