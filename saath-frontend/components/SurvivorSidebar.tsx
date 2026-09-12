"use client";

import Link from "next/link";
import { FileText, HeartHandshake, Home, LogOut, MessageSquareText, Settings, Sparkles, UserRound, Wind } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";

const NAV_ITEMS = [
  ["/survivor", "Home", "होम", Home],
  ["/survivor/check-in", "Check-in", "चेक-इन", HeartHandshake],
  ["/survivor/feel-better", "Feel better", "बेहतर महसूस करें", Wind],
  ["/survivor/sahayak", "Sahayak", "सहायक", MessageSquareText],
  ["/survivor/my-space", "My space", "मेरी जगह", FileText],
  ["/survivor/support", "Support", "सहायता", Sparkles],
] as const;

const ITEM_BASE = "group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition-colors";
const ITEM_ACTIVE = "bg-[color:var(--primary-teal-dark)] text-[color:var(--primary-teal)] shadow-sm";
const ITEM_INACTIVE = "text-[color:var(--text-secondary)] hover:bg-[color:var(--surface-subtle)] hover:text-[color:var(--primary-teal)]";

export function SurvivorSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { language, survivorName, logout } = useAppStore();
  const hindi = language === "Hindi";
  const name = survivorName || (hindi ? "आपकी जगह" : "Your space");

  const isActive = (href: string) => (href === "/survivor" ? pathname === href : pathname.startsWith(href));

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-63 flex-col border-r border-border-color/65 bg-[color:var(--sidebar-background)]/90 px-5 py-7 backdrop-blur-xl md:flex xl:w-68">
      <Link href="/survivor" className="flex items-center gap-3 px-2">
        <span className="text-2xl text-[color:var(--accent-gold)]">✦</span>
        <div>
          <div className="font-display text-[28px] font-bold leading-none text-[color:var(--primary-teal)]">SAATH</div>
          <div className="mt-1 text-[10px] font-semibold uppercase tracking-[.22em] text-[color:var(--text-secondary)]">
            {hindi ? "साथ, हर समय" : "with you, over time"}
          </div>
        </div>
      </Link>

      <div className="my-9 h-px bg-[color:var(--border)]/55" />

      <p className="px-3 text-[10px] font-bold uppercase tracking-[.2em] text-[color:var(--text-secondary)]">
        {hindi ? "आपकी जगह" : "Your space"}
      </p>
      <nav className="mt-3 space-y-1">
        {NAV_ITEMS.map(([href, english, hindiLabel, Icon]) => {
          const active = isActive(href);
          return (
            <Link key={href} href={href} className={`${ITEM_BASE} ${active ? ITEM_ACTIVE : ITEM_INACTIVE}`}>
              <Icon size={18} strokeWidth={active ? 2.3 : 1.8} />
              <span>{hindi ? hindiLabel : english}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-1">
        <Link href="/survivor/profile" className={`${ITEM_BASE} ${isActive("/survivor/profile") ? ITEM_ACTIVE : ITEM_INACTIVE}`}>
          <UserRound size={18} strokeWidth={isActive("/survivor/profile") ? 2.3 : 1.8} />
          <span>{name}</span>
        </Link>
        <Link href="/survivor/privacy" className={`${ITEM_BASE} ${isActive("/survivor/privacy") ? ITEM_ACTIVE : ITEM_INACTIVE}`}>
          <Settings size={18} strokeWidth={isActive("/survivor/privacy") ? 2.3 : 1.8} />
          <span>{hindi ? "गोपनीयता और नियंत्रण" : "Privacy & control"}</span>
        </Link>
      </div>
    </aside>
  );
}