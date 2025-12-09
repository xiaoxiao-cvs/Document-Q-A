import { useRef, useEffect, forwardRef } from "react";

import { cn } from "@/lib/utils";
import { animate, appleEasings, appleDurations } from "@/hooks/use-anime";

interface CardProps extends React.ComponentProps<"div"> {
  enableHoverAnimation?: boolean;
  enableEnterAnimation?: boolean;
  variant?: "default" | "glass" | "elevated" | "outlined";
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className,
      enableHoverAnimation = true,
      enableEnterAnimation = false,
      variant = "default",
      ...props
    },
    ref
  ) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const combinedRef = (ref as React.RefObject<HTMLDivElement>) || cardRef;

    // 进入动画
    useEffect(() => {
      if (!enableEnterAnimation || !cardRef.current) return;

      animate(cardRef.current, {
        opacity: [0, 1],
        translateY: [20, 0],
        duration: appleDurations.slow,
        ease: appleEasings.decelerate,
      });
    }, [enableEnterAnimation]);

    // 悬停动画
    useEffect(() => {
      if (!enableHoverAnimation || !cardRef.current) return;

      const element = cardRef.current;

      const handleMouseEnter = () => {
        animate(element, {
          translateY: -4,
          duration: appleDurations.normal,
          ease: appleEasings.standard,
        });
      };

      const handleMouseLeave = () => {
        animate(element, {
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

    const variantClasses = {
      default:
        "bg-card shadow-apple-md hover:shadow-apple-lg border border-border/50",
      glass:
        "glass shadow-apple-lg hover:shadow-apple-xl",
      elevated:
        "bg-card shadow-apple-lg hover:shadow-apple-xl border-0",
      outlined:
        "bg-transparent border border-border shadow-none hover:bg-accent/30",
    };

    return (
      <div
        ref={combinedRef}
        className={cn(
          "relative flex flex-col gap-6 rounded-2xl bg-clip-padding py-6 text-card-foreground transition-all duration-300",
          variantClasses[variant],
          className
        )}
        data-slot="card"
        {...props}
      />
    );
  }
);

Card.displayName = "Card";

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className
      )}
      data-slot="card-header"
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("font-semibold text-xl leading-tight tracking-tight", className)}
      data-slot="card-title"
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("text-muted-foreground text-sm leading-relaxed", className)}
      data-slot="card-description"
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      data-slot="card-action"
      {...props}
    />
  );
}

function CardPanel({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("px-6", className)} data-slot="card-content" {...props} />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex items-center gap-4 px-6 [.border-t]:pt-6", className)}
      data-slot="card-footer"
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardPanel,
  CardPanel as CardContent,
};
