import { useCallback, useEffect, useRef } from 'react';
import { animate, stagger, createTimeline, utils } from 'animejs';

// anime.js v4 类型定义 - 使用实际返回类型
type AnimeInstance = ReturnType<typeof animate>;
type TimelineInstance = ReturnType<typeof createTimeline>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnimateParams = Record<string, any>;

// 重新导出 anime.js 函数以便使用
export { animate, stagger, createTimeline, utils };

/**
 * 苹果风格缓动函数
 * 基于 Apple 人机交互指南
 * anime.js v4 语法
 */
export const appleEasings = {
  // 标准缓动 - 平滑自然
  standard: 'outQuad',
  // 减速缓动 - 用于元素进入屏幕
  decelerate: 'outCubic',
  // 加速缓动 - 用于元素离开屏幕
  accelerate: 'inCubic',
  // 锐利缓动 - 用于快速、干脆的动画
  sharp: 'inOutQuad',
  // 弹簧效果 - anime.js v4 使用 spring() 函数
  spring: 'outElastic(1, 0.5)',
  // 平滑弹性
  elastic: 'outElastic(1, 0.6)',
  // 轻柔弹跳
  bounce: 'outBounce',
} as const;

/**
 * 苹果风格动画时长（毫秒）
 */
export const appleDurations = {
  instant: 100,   // 瞬时
  fast: 200,      // 快速
  normal: 300,    // 正常
  slow: 500,      // 缓慢
  deliberate: 800, // 从容
} as const;

/**
 * 组件挂载时创建简单动画的 Hook
 */
export function useAnimeOnMount(
  selector: string | Element | Element[] | NodeList | null,
  params: AnimateParams,
  deps: React.DependencyList = []
) {
  const animationRef = useRef<AnimeInstance | null>(null);

  useEffect(() => {
    if (!selector) return;

    animationRef.current = animate(selector, {
      ...params,
      autoplay: true,
    });

    return () => {
      animationRef.current?.pause();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return animationRef;
}

/**
 * 创建可控动画的 Hook
 */
export function useAnime() {
  const animationsRef = useRef<Map<string, AnimeInstance>>(new Map());

  const play = useCallback(
    (
      key: string,
      targets: string | Element | Element[] | NodeList,
      params: AnimateParams
    ) => {
      // 停止相同 key 的现有动画
      const existing = animationsRef.current.get(key);
      if (existing) {
        existing.pause();
      }

      const animation = animate(targets, params);
      animationsRef.current.set(key, animation);
      return animation;
    },
    []
  );

  const stop = useCallback((key: string) => {
    const animation = animationsRef.current.get(key);
    if (animation) {
      animation.pause();
      animationsRef.current.delete(key);
    }
  }, []);

  const stopAll = useCallback(() => {
    animationsRef.current.forEach((animation) => animation.pause());
    animationsRef.current.clear();
  }, []);

  useEffect(() => {
    return () => {
      stopAll();
    };
  }, [stopAll]);

  return { play, stop, stopAll };
}

/**
 * 创建时间线动画的 Hook
 */
export function useTimeline(params?: AnimateParams) {
  const timelineRef = useRef<TimelineInstance | null>(null);

  useEffect(() => {
    timelineRef.current = createTimeline({
      autoplay: false,
      ...params,
    });

    return () => {
      timelineRef.current?.pause();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return timelineRef;
}

/**
 * 交错列表动画的 Hook
 */
export function useStaggerAnimation(
  containerRef: React.RefObject<HTMLElement>,
  itemSelector: string = '> *',
  options: {
    delay?: number;
    duration?: number;
    fromDirection?: 'first' | 'last' | 'center' | number;
    ease?: string;
  } = {}
) {
  const {
    delay = 50,
    duration = appleDurations.normal,
    fromDirection = 'first',
    ease = appleEasings.decelerate,
  } = options;

  const animate_ = useCallback(() => {
    if (!containerRef.current) return null;

    const items = containerRef.current.querySelectorAll(itemSelector);
    if (items.length === 0) return null;

    return animate(items, {
      opacity: { from: 0, to: 1 },
      translateY: { from: 20, to: 0 },
      duration,
      ease,
      delay: stagger(delay, { from: fromDirection }),
    });
  }, [containerRef, itemSelector, delay, duration, fromDirection, ease]);

  return animate_;
}

/**
 * 苹果风格淡入动画
 */
export function useFadeIn(
  ref: React.RefObject<HTMLElement>,
  options: {
    duration?: number;
    delay?: number;
    translateY?: number;
  } = {}
) {
  const { duration = appleDurations.normal, delay = 0, translateY = 10 } = options;

  useEffect(() => {
    if (!ref.current) return;

    const animation = animate(ref.current, {
      opacity: { from: 0, to: 1 },
      translateY: { from: translateY, to: 0 },
      duration,
      delay,
      ease: appleEasings.decelerate,
    });

    return () => {
      animation.pause();
    };
  }, [ref, duration, delay, translateY]);
}

/**
 * 苹果风格按压动画（用于按钮/卡片）
 */
export function usePressAnimation(ref: React.RefObject<HTMLElement>) {
  useEffect(() => {
    if (!ref.current) return;

    const element = ref.current;

    const handleMouseDown = () => {
      animate(element, {
        scale: 0.97,
        duration: appleDurations.fast,
        ease: appleEasings.standard,
      });
    };

    const handleMouseUp = () => {
      animate(element, {
        scale: 1,
        duration: appleDurations.fast,
        ease: appleEasings.spring,
      });
    };

    element.addEventListener('mousedown', handleMouseDown);
    element.addEventListener('mouseup', handleMouseUp);
    element.addEventListener('mouseleave', handleMouseUp);

    return () => {
      element.removeEventListener('mousedown', handleMouseDown);
      element.removeEventListener('mouseup', handleMouseUp);
      element.removeEventListener('mouseleave', handleMouseUp);
    };
  }, [ref]);
}

/**
 * 苹果风格悬停上浮动画
 */
export function useHoverLift(
  ref: React.RefObject<HTMLElement>,
  options: {
    translateY?: number;
    scale?: number;
  } = {}
) {
  const { translateY = -4, scale = 1.02 } = options;

  useEffect(() => {
    if (!ref.current) return;

    const element = ref.current;

    const handleMouseEnter = () => {
      animate(element, {
        translateY,
        scale,
        duration: appleDurations.normal,
        ease: appleEasings.standard,
      });
    };

    const handleMouseLeave = () => {
      animate(element, {
        translateY: 0,
        scale: 1,
        duration: appleDurations.normal,
        ease: appleEasings.standard,
      });
    };

    element.addEventListener('mouseenter', handleMouseEnter);
    element.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      element.removeEventListener('mouseenter', handleMouseEnter);
      element.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [ref, translateY, scale]);
}

/**
 * 工具函数：动画数字值变化
 */
export function animateValue(
  from: number,
  to: number,
  duration: number = appleDurations.slow,
  onUpdate: (value: number) => void,
  ease: string = appleEasings.decelerate
): AnimeInstance {
  const obj = { value: from };

  return animate(obj, {
    value: to,
    duration,
    ease,
    onUpdate: () => {
      onUpdate(obj.value);
    },
  });
}

/**
 * 预设苹果风格动画集合
 */
export const appleAnimations = {
  fadeIn: (target: string | Element, delay = 0) =>
    animate(target, {
      opacity: { from: 0, to: 1 },
      translateY: { from: 10, to: 0 },
      duration: appleDurations.normal,
      delay,
      ease: appleEasings.decelerate,
    }),

  fadeOut: (target: string | Element, delay = 0) =>
    animate(target, {
      opacity: { from: 1, to: 0 },
      translateY: { from: 0, to: -10 },
      duration: appleDurations.fast,
      delay,
      ease: appleEasings.accelerate,
    }),

  scaleIn: (target: string | Element, delay = 0) =>
    animate(target, {
      opacity: { from: 0, to: 1 },
      scale: { from: 0.9, to: 1 },
      duration: appleDurations.normal,
      delay,
      ease: appleEasings.spring,
    }),

  scaleOut: (target: string | Element, delay = 0) =>
    animate(target, {
      opacity: { from: 1, to: 0 },
      scale: { from: 1, to: 0.9 },
      duration: appleDurations.fast,
      delay,
      ease: appleEasings.accelerate,
    }),

  slideUp: (target: string | Element, delay = 0) =>
    animate(target, {
      opacity: { from: 0, to: 1 },
      translateY: { from: 30, to: 0 },
      duration: appleDurations.slow,
      delay,
      ease: appleEasings.decelerate,
    }),

  slideDown: (target: string | Element, delay = 0) =>
    animate(target, {
      opacity: { from: 0, to: 1 },
      translateY: { from: -30, to: 0 },
      duration: appleDurations.slow,
      delay,
      ease: appleEasings.decelerate,
    }),

  bounce: (target: string | Element, delay = 0) =>
    animate(target, {
      translateY: [0, -15, 0],
      duration: appleDurations.slow,
      delay,
      ease: appleEasings.bounce,
    }),

  pulse: (target: string | Element) =>
    animate(target, {
      scale: [1, 1.05, 1],
      duration: appleDurations.slow,
      ease: appleEasings.standard,
      loop: true,
    }),

  shake: (target: string | Element) =>
    animate(target, {
      translateX: [0, -5, 5, -5, 5, 0],
      duration: appleDurations.slow,
      ease: appleEasings.standard,
    }),

  glow: (target: string | Element) =>
    animate(target, {
      boxShadow: [
        '0 0 0px rgba(0, 122, 255, 0)',
        '0 0 20px rgba(0, 122, 255, 0.5)',
        '0 0 0px rgba(0, 122, 255, 0)',
      ],
      duration: appleDurations.deliberate,
      ease: appleEasings.standard,
      loop: true,
    }),

  staggerFadeIn: (targets: string | Element[] | NodeList, staggerDelay = 50) =>
    animate(targets, {
      opacity: { from: 0, to: 1 },
      translateY: { from: 20, to: 0 },
      duration: appleDurations.normal,
      delay: stagger(staggerDelay, { from: 'first' }),
      ease: appleEasings.decelerate,
    }),
};
