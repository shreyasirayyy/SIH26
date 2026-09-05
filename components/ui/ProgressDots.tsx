import { cn } from "@/lib/utils";

export function ProgressDots({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5" aria-label={`Step ${step} of ${total}`}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-1.5 rounded-full transition-all",
            i < step ? "w-6 bg-deep-teal" : "w-1.5 bg-border-color"
          )}
        />
      ))}
    </div>
  );
}
