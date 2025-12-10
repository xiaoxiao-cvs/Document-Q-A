import { useRef, useState, useCallback } from 'react';
import { 
  animate, 
  stagger, 
  appleEasings, 
  appleDurations,
} from '@/hooks/use-anime';
import { Button } from '@/components/ui/button';
import { GlassPanel } from '@/components/ui/glass-panel';
import { Play, RotateCcw } from 'lucide-react';

/**
 * 动画演示项目接口
 */
interface AnimationDemo {
  /** 演示名称 */
  name: string;
  /** 演示描述 */
  description: string;
  /** 执行动画的函数 */
  play: (target: Element) => void;
}

/**
 * 单个动画演示卡片
 */
interface AnimationCardProps {
  demo: AnimationDemo;
  index: number;
}

function AnimationCard({ demo, index }: AnimationCardProps) {
  const targetRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlay = useCallback(() => {
    if (!targetRef.current || isPlaying) return;
    
    setIsPlaying(true);
    demo.play(targetRef.current);
    
    // 动画完成后重置状态
    setTimeout(() => {
      setIsPlaying(false);
    }, appleDurations.deliberate + 200);
  }, [demo, isPlaying]);

  const handleReset = useCallback(() => {
    if (!targetRef.current) return;
    
    // 重置元素状态
    animate(targetRef.current, {
      opacity: 1,
      scale: 1,
      translateX: 0,
      translateY: 0,
      rotate: 0,
      duration: appleDurations.fast,
      ease: appleEasings.standard,
    });
  }, []);

  return (
    <GlassPanel 
      variant="default" 
      intensity="medium"
      enableHoverAnimation={false}
      className="p-6 space-y-4"
    >
      {/* 动画演示区域 */}
      <div className="h-32 flex items-center justify-center bg-accent/30 rounded-xl overflow-hidden">
        <div
          ref={targetRef}
          className="w-16 h-16 rounded-2xl bg-primary shadow-apple-md flex items-center justify-center text-primary-foreground font-bold text-xl"
        >
          {index + 1}
        </div>
      </div>

      {/* 信息区域 */}
      <div className="space-y-2">
        <h3 className="font-semibold text-lg">{demo.name}</h3>
        <p className="text-sm text-muted-foreground">{demo.description}</p>
      </div>

      {/* 控制按钮 */}
      <div className="flex gap-2">
        <Button 
          size="sm" 
          onClick={handlePlay}
          disabled={isPlaying}
          className="flex-1"
        >
          <Play className="w-4 h-4 mr-1" />
          播放
        </Button>
        <Button 
          size="sm" 
          variant="outline"
          onClick={handleReset}
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>
    </GlassPanel>
  );
}

/**
 * 交错动画演示组件
 */
function StaggerDemo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlay = useCallback(() => {
    if (!containerRef.current || isPlaying) return;

    setIsPlaying(true);
    const items = containerRef.current.querySelectorAll('.stagger-item');
    
    // 先重置
    animate(items, {
      opacity: 0,
      translateY: 30,
      scale: 0.8,
      duration: 0,
    });

    // 交错动画
    setTimeout(() => {
      animate(items, {
        opacity: { from: 0, to: 1 },
        translateY: { from: 30, to: 0 },
        scale: { from: 0.8, to: 1 },
        duration: appleDurations.normal,
        delay: stagger(80, { from: 'first' }),
        ease: appleEasings.spring,
        onComplete: () => {
          setIsPlaying(false);
        },
      });
    }, 100);
  }, [isPlaying]);

  const handleReset = useCallback(() => {
    if (!containerRef.current) return;
    const items = containerRef.current.querySelectorAll('.stagger-item');
    animate(items, {
      opacity: 1,
      translateY: 0,
      scale: 1,
      duration: appleDurations.fast,
      ease: appleEasings.standard,
    });
  }, []);

  return (
    <GlassPanel 
      variant="elevated" 
      intensity="heavy"
      className="p-6 space-y-4 col-span-full"
    >
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <h3 className="font-semibold text-lg">交错动画</h3>
          <p className="text-sm text-muted-foreground">
            元素按顺序依次出现，创造流畅的视觉效果
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={handlePlay} disabled={isPlaying}>
            <Play className="w-4 h-4 mr-1" />
            播放
          </Button>
          <Button size="sm" variant="outline" onClick={handleReset}>
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div 
        ref={containerRef}
        className="grid grid-cols-6 md:grid-cols-12 gap-2"
      >
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="stagger-item aspect-square rounded-lg bg-primary/80 shadow-apple-sm"
          />
        ))}
      </div>
    </GlassPanel>
  );
}

/**
 * 动画展示页组件
 * 展示所有可用的 anime.js 动画效果
 */
export function AnimationShowcase() {
  // 动画演示列表
  const demos: AnimationDemo[] = [
    {
      name: '淡入',
      description: '元素从透明渐变为可见',
      play: (target) => {
        animate(target, {
          opacity: { from: 0, to: 1 },
          duration: appleDurations.normal,
          ease: appleEasings.decelerate,
        });
      },
    },
    {
      name: '缩放进入',
      description: '元素从小变大并显现',
      play: (target) => {
        animate(target, {
          opacity: { from: 0, to: 1 },
          scale: { from: 0.5, to: 1 },
          duration: appleDurations.normal,
          ease: appleEasings.spring,
        });
      },
    },
    {
      name: '上滑进入',
      description: '元素从下方滑入',
      play: (target) => {
        animate(target, {
          opacity: { from: 0, to: 1 },
          translateY: { from: 50, to: 0 },
          duration: appleDurations.slow,
          ease: appleEasings.decelerate,
        });
      },
    },
    {
      name: '弹跳',
      description: '元素弹跳效果',
      play: (target) => {
        animate(target, {
          translateY: [0, -30, 0],
          duration: appleDurations.slow,
          ease: appleEasings.bounce,
        });
      },
    },
    {
      name: '旋转',
      description: '元素旋转一周',
      play: (target) => {
        animate(target, {
          rotate: [0, 360],
          duration: appleDurations.deliberate,
          ease: appleEasings.standard,
        });
      },
    },
    {
      name: '摇晃',
      description: '元素左右摇晃',
      play: (target) => {
        animate(target, {
          translateX: [0, -15, 15, -10, 10, -5, 5, 0],
          duration: appleDurations.slow,
          ease: appleEasings.standard,
        });
      },
    },
    {
      name: '脉冲',
      description: '元素脉冲缩放',
      play: (target) => {
        animate(target, {
          scale: [1, 1.2, 1],
          duration: appleDurations.slow,
          ease: appleEasings.standard,
        });
      },
    },
    {
      name: '弹性',
      description: '带弹性效果的缩放',
      play: (target) => {
        animate(target, {
          scale: [1, 0.8, 1.1, 1],
          duration: appleDurations.deliberate,
          ease: appleEasings.elastic,
        });
      },
    },
  ];

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">动画效果展示</h2>
        <p className="text-muted-foreground">
          基于 anime.js 的苹果风格动画库
        </p>
      </div>

      {/* 交错动画演示 */}
      <StaggerDemo />

      {/* 基础动画演示 */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {demos.map((demo, index) => (
          <AnimationCard key={demo.name} demo={demo} index={index} />
        ))}
      </div>
    </div>
  );
}

export default AnimationShowcase;
