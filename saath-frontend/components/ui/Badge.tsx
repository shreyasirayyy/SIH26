import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: "teal" | "sage" | "amber" | "peach" | "plum" | "neutral";
}

const toneMap: Record<string, string> = {
  teal: "bg-deep-teal/10 text-deep-teal",
  sage: "bg-sage/20 text-[#3f6b46]",
  amber: "bg-amber/15 text-[#8a6111]",
  peach: "bg-warm-peach/15 text-[#a2542f]",
  plum: "bg-muted-plum/15 text-muted-plum",
  neutral: "bg-pale-sage/60 text-text-secondary",
};

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        toneMap[tone],
        className
      )}
      {...props}
    />
  );
}
