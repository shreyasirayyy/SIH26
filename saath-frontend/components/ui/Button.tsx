"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]",
          size === "sm" && "px-3 py-1.5 text-sm min-h-9",
          size === "md" && "px-4 py-2.5 text-sm min-h-11",
          size === "lg" && "px-6 py-3.5 text-base min-h-13",
          variant === "primary" && "bg-deep-teal text-white hover:bg-[#0c5f58] shadow-sm",
          variant === "secondary" &&
            "bg-white text-deep-teal border border-border-color hover:bg-pale-sage/40",
          variant === "ghost" && "bg-transparent text-text-secondary hover:bg-pale-sage/40",
          variant === "danger" && "bg-warm-peach text-white hover:opacity-90",
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
