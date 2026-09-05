"use client";

import { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full rounded-xl border border-border-color bg-white px-4 py-3 text-base text-text-primary placeholder:text-text-secondary/60 focus:border-deep-teal outline-none min-h-[44px]",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
