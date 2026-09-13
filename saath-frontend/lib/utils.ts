import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatRelativeTime(iso?: string | null): string {
  if (!iso) return "No activity yet";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "No activity yet";
  
  const now = Date.now();
  const diffMs = now - d.getTime();
  const diffSeconds = Math.round(diffMs / 1000);
  const diffMinutes = Math.round(diffSeconds / 60);
  const diffHours = Math.round(diffMinutes / 60);
  const diffDays = Math.round(diffHours / 24);

  if (diffSeconds < 45) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  
  return formatDate(iso);
}
