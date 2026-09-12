"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { FileText, HeartHandshake, Home, MessageSquareText, Sparkles, Wind } from "lucide-react";

import { useAppStore } from "@/store/useAppStore";

const items = [
  { href: "/survivor", labelEn: "Home", labelHi: "होम", icon: Home },
  { href: "/survivor/check-in", labelEn: "Check-in", labelHi: "चेक-इन", icon: HeartHandshake },
  { href: "/survivor/feel-better", labelEn: "Feel better", labelHi: "बेहतर महसूस करें", icon: Wind },
  { href: "/survivor/sahayak", labelEn: "Sahayak", labelHi: "सहायक", icon: MessageSquareText },
  { href: "/survivor/my-space", labelEn: "My space", labelHi: "मेरी जगह", icon: FileText },
  { href: "/survivor/support", labelEn: "Support", labelHi: "सहायता", icon: Sparkles },
];

export function SurvivorNav() {
  const pathname = usePathname();
  const language = useAppStore((state) => state.language);
  const hindi = language === "Hindi";

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border-color/70 bg-[color:var(--surface)]/90 px-2 pb-[env(safe-area-inset-bottom)] pt-2 shadow-[0_-12px_35px_rgba(29,71,64,.08)] backdrop-blur-xl md:hidden">
      <ul className="mx-auto flex max-w-lg justify-between">
        <li className="contents">
          {items.map(({ href, labelEn, labelHi, icon: Icon }) => {
            const active = href === "/survivor" ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl py-2 text-[10px] font-semibold",
                  active ? "text-[color:var(--primary-teal)]" : "text-[color:var(--text-secondary)]"
                )}
              >
                <span className={cn("rounded-xl px-3 py-1", active && "bg-[color:var(--primary-teal-dark)]")}>
                  <Icon size={18} strokeWidth={active ? 2.5 : 1.8} />
                </span>
                <span className="truncate">{hindi ? labelHi : labelEn}</span>
              </Link>
            );
          })}
        </li>
      </ul>
    </nav>
  );
}

