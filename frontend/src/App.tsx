import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

function App() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <Card className="p-8 max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Document Q&A</h1>
          <p className="text-muted-foreground">
            智能文档问答系统
          </p>
        </div>
        <div className="flex flex-col gap-4">
          <Button size="lg" className="w-full">
            开始使用
          </Button>
          <Button variant="outline" size="lg" className="w-full">
            上传文档
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default App;
