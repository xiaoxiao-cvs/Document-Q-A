/**
 * 应用侧边栏组件
 * 包含文档上传和文档列表
 */
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { DocumentUpload } from '@/components/document/DocumentUpload';
import { DocumentList } from '@/components/document/DocumentList';
import { 
  Sparkles, 
  Upload, 
  ChevronLeft, 
  ChevronRight,
  Settings,
  HelpCircle,
} from 'lucide-react';

interface AppSidebarProps {
  className?: string;
}

export function AppSidebar({ className }: AppSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  return (
    <div
      className={cn(
        'flex flex-col h-full bg-background/80 backdrop-blur-xl border-r transition-all duration-300',
        isCollapsed ? 'w-16' : 'w-72',
        className
      )}
    >
      {/* 头部 */}
      <div className="flex items-center gap-3 px-4 py-4 border-b">
        <div className="w-9 h-9 rounded-xl bg-linear-to-br from-primary to-primary/60 flex items-center justify-center shrink-0">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        {!isCollapsed && (
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-lg tracking-tight">Doc Q&A</h1>
            <p className="text-xs text-muted-foreground">智能文档问答</p>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="shrink-0"
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* 上传按钮 */}
      {!isCollapsed && (
        <div className="p-4">
          <Button
            onClick={() => setShowUpload(!showUpload)}
            className="w-full"
            variant={showUpload ? 'secondary' : 'default'}
          >
            <Upload className="h-4 w-4 mr-2" />
            上传文档
          </Button>
        </div>
      )}

      {/* 上传区域 */}
      {!isCollapsed && showUpload && (
        <div className="px-4 pb-4">
          <DocumentUpload onUploadSuccess={() => setShowUpload(false)} />
        </div>
      )}

      {!isCollapsed && <Separator />}

      {/* 文档列表 */}
      {!isCollapsed && <DocumentList className="flex-1" />}

      {/* 折叠状态的快捷操作 */}
      {isCollapsed && (
        <div className="flex flex-col items-center gap-2 p-2 flex-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setIsCollapsed(false);
              setShowUpload(true);
            }}
            title="上传文档"
          >
            <Upload className="h-5 w-5" />
          </Button>
        </div>
      )}

      {/* 底部操作 */}
      <div className="border-t p-2">
        {isCollapsed ? (
          <div className="flex flex-col items-center gap-1">
            <Button variant="ghost" size="icon" title="设置">
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" title="帮助">
              <HelpCircle className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="flex-1 justify-start">
              <Settings className="h-4 w-4 mr-2" />
              设置
            </Button>
            <Button variant="ghost" size="sm" className="flex-1 justify-start">
              <HelpCircle className="h-4 w-4 mr-2" />
              帮助
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
