import { mergeProps } from "@base-ui-components/react/merge-props";
import { useRender } from "@base-ui-components/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import { useRef, useEffect, type MouseEvent } from "react";

import { cn } from "@/lib/utils";
import { animate, appleEasings, appleDurations } from "@/hooks/use-anime";

const buttonVariants = cva(
  "relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-xl border-0 bg-clip-padding font-medium text-sm outline-none transition-all before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-xl)-1px)] pointer-coarse:after:absolute pointer-coarse:after:size-full pointer-coarse:after:min-h-11 pointer-coarse:after:min-w-11 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    defaultVariants: {
      size: "default",
      variant: "default",
    },
    variants: {
      size: {
        default:
          "min-h-10 px-5 py-2.5",
        icon: "size-10",
        "icon-lg": "size-11",
        "icon-sm": "size-9",
        "icon-xl": "size-12 [&_svg:not([class*='size-'])]:size-5",
        "icon-xs":
          "size-8 rounded-lg before:rounded-[calc(var(--radius-lg)-1px)]",
        lg: "min-h-12 px-6 py-3 text-base",
        sm: "min-h-8 gap-1.5 px-4 py-2 text-sm",
        xl: "min-h-14 px-8 py-4 text-lg [&_svg:not([class*='size-'])]:size-5",
        xs: "min-h-7 gap-1 rounded-lg px-3 py-1.5 text-xs before:rounded-[calc(var(--radius-lg)-1px)] [&_svg:not([class*='size-'])]:size-3",
      },
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-apple-md hover:shadow-apple-lg hover:brightness-110 active:brightness-95 active:shadow-apple-sm",
        destructive:
          "bg-destructive text-white shadow-apple-md hover:shadow-apple-lg hover:brightness-110 active:brightness-95 active:shadow-apple-sm",
        "destructive-outline":
          "border border-destructive/30 bg-transparent text-destructive shadow-apple-sm hover:bg-destructive/5 hover:border-destructive/50 active:bg-destructive/10",
        ghost: "hover:bg-accent/50 active:bg-accent/70",
        link: "underline-offset-4 hover:underline text-primary",
        outline:
          "border border-border bg-background/80 backdrop-blur-sm shadow-apple-sm hover:bg-accent/50 hover:shadow-apple-md active:bg-accent/70 active:shadow-none",
        secondary:
          "bg-secondary text-secondary-foreground shadow-apple-sm hover:bg-secondary/80 hover:shadow-apple-md active:bg-secondary/90 active:shadow-none",
        glass:
          "glass shadow-apple-md hover:shadow-apple-lg active:shadow-apple-sm",
      },
    },
  },
);

interface ButtonProps extends useRender.ComponentProps<"button"> {
  variant?: VariantProps<typeof buttonVariants>["variant"];
  size?: VariantProps<typeof buttonVariants>["size"];
  enablePressAnimation?: boolean;
  enableRipple?: boolean;
}

function Button({ 
  className, 
  variant, 
  size, 
  render,
  enablePressAnimation = true,
  enableRipple = true,
  ...props 
}: ButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  // 苹果风格按压动画
  useEffect(() => {
    if (!enablePressAnimation || !buttonRef.current) return;

    const element = buttonRef.current;

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
        duration: appleDurations.normal,
        ease: appleEasings.spring,
      });
    };

    element.addEventListener('mousedown', handleMouseDown);
    element.addEventListener('mouseup', handleMouseUp);
    element.addEventListener('mouseleave', handleMouseUp);
    element.addEventListener('touchstart', handleMouseDown);
    element.addEventListener('touchend', handleMouseUp);

    return () => {
      element.removeEventListener('mousedown', handleMouseDown);
      element.removeEventListener('mouseup', handleMouseUp);
      element.removeEventListener('mouseleave', handleMouseUp);
      element.removeEventListener('touchstart', handleMouseDown);
      element.removeEventListener('touchend', handleMouseUp);
    };
  }, [enablePressAnimation]);

  // 波纹效果处理器
  const handleRipple = (e: MouseEvent<HTMLButtonElement>) => {
    if (!enableRipple || !buttonRef.current) return;

    const button = buttonRef.current;
    const rect = button.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ripple = document.createElement('span');
    ripple.className = 'absolute rounded-full bg-white/30 pointer-events-none';
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    ripple.style.width = '0';
    ripple.style.height = '0';
    ripple.style.transform = 'translate(-50%, -50%)';

    button.appendChild(ripple);

    animate(ripple, {
      width: [0, Math.max(rect.width, rect.height) * 2],
      height: [0, Math.max(rect.width, rect.height) * 2],
      opacity: [0.5, 0],
      duration: appleDurations.slow,
      ease: appleEasings.decelerate,
      onComplete: () => {
        ripple.remove();
      },
    });
  };

  const typeValue: React.ButtonHTMLAttributes<HTMLButtonElement>["type"] =
    render ? undefined : "button";

  const defaultProps = {
    ref: buttonRef,
    className: cn(buttonVariants({ className, size, variant }), "overflow-hidden"),
    "data-slot": "button",
    type: typeValue,
    onClick: (e: MouseEvent<HTMLButtonElement>) => {
      handleRipple(e);
      if (props.onClick) {
        (props.onClick as (e: MouseEvent<HTMLButtonElement>) => void)(e);
      }
    },
  };

  return useRender({
    defaultTagName: "button",
    props: mergeProps<"button">(defaultProps, props),
    render,
  });
}

export { Button, buttonVariants };
