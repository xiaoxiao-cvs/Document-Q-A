import { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { GlassPanel, GlassCard, GlassButton } from '@/components/ui/glass-panel';
import { animate, stagger, appleEasings, appleDurations } from '@/hooks/use-anime';
import { FileText, MessageSquare, Upload, Sparkles, ArrowRight } from 'lucide-react';

/**
 * 主应用组件
 * 展示苹果风格设计系统和动画效果
 */
function App() {
  const heroRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  // 页面加载动画
  useEffect(() => {
    // 英雄区域动画
    if (heroRef.current) {
      const heroElements = heroRef.current.querySelectorAll('[data-animate]');
      animate(heroElements, {
        opacity: { from: 0, to: 1 },
        translateY: { from: 30, to: 0 },
        duration: appleDurations.slow,
        delay: stagger(100, { from: 'first' }),
        ease: appleEasings.decelerate,
      });
    }

    // 特性卡片动画
    if (featuresRef.current) {
      const featureCards = featuresRef.current.querySelectorAll('[data-animate]');
      animate(featureCards, {
        opacity: { from: 0, to: 1 },
        translateY: { from: 40, to: 0 },
        scale: { from: 0.95, to: 1 },
        duration: appleDurations.slow,
        delay: stagger(150, { from: 'first' }),
        ease: appleEasings.decelerate,
      });
    }

    // CTA 区域动画
    if (ctaRef.current) {
      animate(ctaRef.current, {
        opacity: { from: 0, to: 1 },
        translateY: { from: 20, to: 0 },
        duration: appleDurations.deliberate,
        delay: 600,
        ease: appleEasings.decelerate,
      });
    }
  }, []);

  // 功能特性数据
  const features = [
    {
      icon: FileText,
      title: '智能文档解析',
      description: '支持 PDF、Word、TXT 等多种格式，自动提取文档关键信息',
    },
    {
      icon: MessageSquare,
      title: '自然语言问答',
      description: '基于 AI 大模型，用自然语言与文档进行对话交互',
    },
    {
      icon: Sparkles,
      title: '精准语义理解',
      description: '采用先进的向量检索技术，精确定位相关内容',
    },
  ];

  return (
    <div className="min-h-screen bg-linear-to-br from-background via-background to-accent/20">
      {/* 背景装饰 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl animate-pulse-soft" />
        <div className="absolute top-1/2 -left-40 w-60 h-60 bg-primary/5 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-20 w-40 h-40 bg-accent/20 rounded-full blur-2xl animate-pulse-soft" />
      </div>

      {/* 主内容 */}
      <div className="relative z-10 container mx-auto px-6 py-12 space-y-16">
        
        {/* 英雄区域 */}
        <section ref={heroRef} className="text-center space-y-8 pt-12">
          <div data-animate className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <Sparkles className="w-4 h-4" />
              <span>AI 驱动的智能问答</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight bg-linear-to-r from-foreground via-foreground to-muted-foreground bg-clip-text">
              Document Q&A
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              上传您的文档，用自然语言提问，获得精准答案。
              <br />
              让 AI 成为您的智能文档助手。
            </p>
          </div>

          <div data-animate className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="xl" className="group">
              开始使用
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button variant="outline" size="xl">
              <Upload className="w-5 h-5 mr-2" />
              上传文档
            </Button>
          </div>

          {/* 毛玻璃演示卡片 */}
          <div data-animate className="pt-8">
            <GlassPanel 
              variant="default" 
              intensity="medium"
              enableHoverAnimation
              className="max-w-lg mx-auto p-6"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-medium">试试问一下：</p>
                  <p className="text-sm text-muted-foreground">"这份报告的主要结论是什么？"</p>
                </div>
              </div>
            </GlassPanel>
          </div>
        </section>

        {/* 特性区域 */}
        <section ref={featuresRef} className="space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold">核心功能</h2>
            <p className="text-muted-foreground">强大的 AI 能力，简洁的使用体验</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card 
                key={index}
                data-animate
                variant="glass"
                enableHoverAnimation
                className="p-6"
              >
                <div className="space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <feature.icon className="w-7 h-7 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold">{feature.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* 毛玻璃组件展示 */}
        <section className="space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold">设计系统</h2>
            <p className="text-muted-foreground">苹果风格的精致组件</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* 毛玻璃卡片展示 */}
            <GlassCard
              title="毛玻璃效果"
              description="半透明背景配合高斯模糊，营造层次感"
              enableEnterAnimation
              footer={
                <div className="flex gap-2">
                  <GlassButton>了解更多</GlassButton>
                  <GlassButton>查看文档</GlassButton>
                </div>
              }
            >
              <div className="space-y-3">
                <div className="h-2 bg-white/30 rounded-full w-full" />
                <div className="h-2 bg-white/20 rounded-full w-4/5" />
                <div className="h-2 bg-white/10 rounded-full w-3/5" />
              </div>
            </GlassCard>

            {/* 按钮样式展示 */}
            <Card variant="elevated" className="p-6 space-y-6">
              <CardHeader className="p-0">
                <CardTitle>按钮组件</CardTitle>
                <CardDescription>多种样式和交互动画</CardDescription>
              </CardHeader>
              <CardContent className="p-0 space-y-4">
                <div className="flex flex-wrap gap-3">
                  <Button>默认按钮</Button>
                  <Button variant="secondary">次要按钮</Button>
                  <Button variant="outline">轮廓按钮</Button>
                  <Button variant="ghost">幽灵按钮</Button>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button variant="glass">毛玻璃</Button>
                  <Button variant="destructive">危险操作</Button>
                  <Button size="sm">小按钮</Button>
                  <Button size="lg">大按钮</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* CTA 区域 */}
        <section ref={ctaRef} className="text-center py-12">
          <GlassPanel 
            variant="elevated" 
            intensity="heavy"
            enableGlow
            glowColor="rgba(0, 122, 255, 0.15)"
            className="max-w-2xl mx-auto p-12 space-y-6"
          >
            <h2 className="text-3xl font-bold">准备好开始了吗？</h2>
            <p className="text-muted-foreground text-lg">
              立即体验智能文档问答系统，提升您的工作效率
            </p>
            <div className="flex justify-center gap-4">
              <Button size="lg">
                免费开始
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button variant="outline" size="lg">
                了解更多
              </Button>
            </div>
          </GlassPanel>
        </section>

      </div>
    </div>
  );
}

export default App;
