import { forwardRef, useRef, useEffect } from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { animate, appleEasings, appleDurations } from "@/hooks/use-anime";

/**
 * 毛玻璃面板变体样式
 * 基于苹果设计语言的半透明效果
 */
const glassPanelVariants = cva(
  "relative rounded-2xl backdrop-blur-xl transition-all duration-300",
  {
    defaultVariants: {
      variant: "default",
      intensity: "medium",
    },
    variants: {
      variant: {
        // 默认毛玻璃效果
        default:
          "bg-white/70 dark:bg-black/50 border border-white/20 dark:border-white/10 shadow-apple-md",
        // 深色毛玻璃效果
        dark:
          "bg-black/40 dark:bg-black/60 border border-white/10 shadow-apple-lg text-white",
        // 浅色毛玻璃效果
        light:
          "bg-white/80 dark:bg-white/10 border border-white/30 dark:border-white/5 shadow-apple-md",
        // 彩色毛玻璃效果（主题色）
        colored:
          "bg-primary/10 dark:bg-primary/20 border border-primary/20 dark:border-primary/30 shadow-apple-md",
        // 无边框毛玻璃
        borderless:
          "bg-white/60 dark:bg-black/40 shadow-apple-lg",
        // 强调效果
        elevated:
          "bg-white/80 dark:bg-black/60 border border-white/30 dark:border-white/15 shadow-apple-xl",
      },
      intensity: {
        // 轻微模糊
        light: "backdrop-blur-sm",
        // 中等模糊
        medium: "backdrop-blur-xl",
        // 强烈模糊
        heavy: "backdrop-blur-2xl",
        // 极强模糊
        ultra: "backdrop-blur-3xl",
      },
    },
  }
);

interface GlassPanelProps
  extends React.ComponentProps<"div">,
    VariantProps<typeof glassPanelVariants> {
  /** 是否启用进入动画 */
  enableEnterAnimation?: boolean;
  /** 是否启用悬停动画 */
  enableHoverAnimation?: boolean;
  /** 是否启用发光效果 */
  enableGlow?: boolean;
  /** 发光颜色 */
  glowColor?: string;
}

/**
 * 毛玻璃面板组件
 * 实现苹果风格的半透明、高斯模糊效果
 */
const GlassPanel = forwardRef<HTMLDivElement, GlassPanelProps>(
  (
    {
      className,
      variant,
      intensity,
      enableEnterAnimation = false,
      enableHoverAnimation = true,
      enableGlow = false,
      glowColor = "rgba(0, 122, 255, 0.3)",
      children,
      ...props
    },
    ref
  ) => {
    const panelRef = useRef<HTMLDivElement>(null);
    const combinedRef = (ref as React.RefObject<HTMLDivElement>) || panelRef;

    // 进入动画
    useEffect(() => {
      if (!enableEnterAnimation || !panelRef.current) return;

      animate(panelRef.current, {
        opacity: [0, 1],
        scale: [0.95, 1],
        translateY: [20, 0],
        duration: appleDurations.slow,
        ease: appleEasings.decelerate,
      });
    }, [enableEnterAnimation]);

    // 悬停动画
    useEffect(() => {
      if (!enableHoverAnimation || !panelRef.current) return;

      const element = panelRef.current;

      const handleMouseEnter = () => {
        animate(element, {
          scale: 1.01,
          translateY: -2,
          duration: appleDurations.normal,
          ease: appleEasings.standard,
        });
      };

      const handleMouseLeave = () => {
        animate(element, {
          scale: 1,
          translateY: 0,
          duration: appleDurations.normal,
          ease: appleEasings.standard,
        });
      };

      element.addEventListener("mouseenter", handleMouseEnter);
      element.addEventListener("mouseleave", handleMouseLeave);

      return () => {
        element.removeEventListener("mouseenter", handleMouseEnter);
        element.removeEventListener("mouseleave", handleMouseLeave);
      };
    }, [enableHoverAnimation]);

    // 发光效果样式
    const glowStyle = enableGlow
      ? {
          boxShadow: `0 0 30px ${glowColor}, 0 0 60px ${glowColor}`,
        }
      : {};

    return (
      <div
        ref={combinedRef}
        className={cn(glassPanelVariants({ variant, intensity }), className)}
        style={glowStyle}
        {...props}
      >
        {children}
      </div>
    );
  }
);

GlassPanel.displayName = "GlassPanel";

/**
 * 毛玻璃卡片组件
 * 带有标题和内容区域的毛玻璃面板
 */
interface GlassCardProps extends GlassPanelProps {
  /** 卡片标题 */
  title?: string;
  /** 卡片描述 */
  description?: string;
  /** 底部内容 */
  footer?: React.ReactNode;
}

const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ title, description, footer, children, className, ...props }, ref) => {
    return (
      <GlassPanel
        ref={ref}
        className={cn("flex flex-col p-6", className)}
        {...props}
      >
        {(title || description) && (
          <div className="mb-4 space-y-1.5">
            {title && (
              <h3 className="text-xl font-semibold leading-tight tracking-tight">
                {title}
              </h3>
            )}
            {description && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {description}
              </p>
            )}
          </div>
        )}
        <div className="flex-1">{children}</div>
        {footer && <div className="mt-4 pt-4 border-t border-white/10">{footer}</div>}
      </GlassPanel>
    );
  }
);

GlassCard.displayName = "GlassCard";

/**
 * 毛玻璃导航栏组件
 * 适用于顶部固定导航
 */
interface GlassNavbarProps extends React.ComponentProps<"nav"> {
  /** 是否固定在顶部 */
  fixed?: boolean;
}

const GlassNavbar = forwardRef<HTMLElement, GlassNavbarProps>(
  ({ className, fixed = true, children, ...props }, ref) => {
    return (
      <nav
        ref={ref}
        className={cn(
          "w-full py-4 px-6 backdrop-blur-xl bg-white/70 dark:bg-black/50 border-b border-white/20 dark:border-white/10 shadow-apple-sm z-50 transition-all duration-300",
          fixed && "fixed top-0 left-0 right-0",
          className
        )}
        {...props}
      >
        {children}
      </nav>
    );
  }
);

GlassNavbar.displayName = "GlassNavbar";

/**
 * 毛玻璃按钮组件
 * 小型的毛玻璃风格按钮
 */
interface GlassButtonProps extends React.ComponentProps<"button"> {
  /** 是否启用按压动画 */
  enablePressAnimation?: boolean;
}

const GlassButton = forwardRef<HTMLButtonElement, GlassButtonProps>(
  ({ className, enablePressAnimation = true, children, ...props }, ref) => {
    const buttonRef = useRef<HTMLButtonElement>(null);
    const combinedRef = (ref as React.RefObject<HTMLButtonElement>) || buttonRef;

    // 按压动画
    useEffect(() => {
      if (!enablePressAnimation || !buttonRef.current) return;

      const element = buttonRef.current;

      const handleMouseDown = () => {
        animate(element, {
          scale: 0.95,
          duration: appleDurations.fast,
          ease: appleEasings.standard,
        });
      };

      const handleMouseUp = () => {
        animate(element, {
          scale: 1,
          duration: appleDurations.normal,
          ease: appleEasings.spring,
        });
      };

      element.addEventListener("mousedown", handleMouseDown);
      element.addEventListener("mouseup", handleMouseUp);
      element.addEventListener("mouseleave", handleMouseUp);

      return () => {
        element.removeEventListener("mousedown", handleMouseDown);
        element.removeEventListener("mouseup", handleMouseUp);
        element.removeEventListener("mouseleave", handleMouseUp);
      };
    }, [enablePressAnimation]);

    return (
      <button
        ref={combinedRef}
        className={cn(
          "px-4 py-2 rounded-xl backdrop-blur-xl bg-white/60 dark:bg-white/10 border border-white/30 dark:border-white/10 shadow-apple-sm hover:shadow-apple-md hover:bg-white/80 dark:hover:bg-white/20 transition-all duration-200 font-medium text-sm cursor-pointer",
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

GlassButton.displayName = "GlassButton";

export { GlassPanel, GlassCard, GlassNavbar, GlassButton, glassPanelVariants };
