"use client";

import Link from "next/link";
import { FileText, HeartHandshake, Home, LogOut, Settings, Sparkles, UserRound, Wind } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";

const items = [
  ["/survivor", "Home", "होम", Home],
  ["/survivor/check-in", "Check-in", "चेक-इन", HeartHandshake],
  ["/survivor/feel-better", "Feel better", "बेहतर महसूस करें", Wind],
  ["/survivor/my-space", "My space", "मेरी जगह", FileText],
  ["/survivor/support", "Support", "सहायता", Sparkles],
] as const;

export function SurvivorSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { language, survivorName, logout } = useAppStore();
  const hindi = language === "Hindi";
  const name = survivorName || (hindi ? "आपकी जगह" : "Your space");
  return <aside className="fixed inset-y-0 left-0 z-30 hidden w-63 flex-col border-r border-border-color/65 bg-[#f8faf4]/90 px-5 py-7 backdrop-blur-xl md:flex xl:w-68"><Link href="/survivor" className="flex items-center gap-3 px-2"><span className="text-2xl text-amber">✦</span><div><div className="font-display text-[28px] font-bold leading-none text-deep-teal">SAATH</div><div className="mt-1 text-[10px] font-semibold uppercase tracking-[.22em] text-text-secondary">{hindi ? "साथ, हर समय" : "with you, over time"}</div></div></Link><div className="my-9 h-px bg-border-color/55" /><p className="px-3 text-[10px] font-bold uppercase tracking-[.2em] text-text-secondary">{hindi ? "आपकी जगह" : "Your space"}</p><nav className="mt-3 space-y-1">{items.map(([href, english, hindiLabel, Icon]) => { const active = href === "/survivor" ? pathname === href : pathname.startsWith(href); return <Link key={href} href={href} className={`group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium ${active ? "bg-pale-sage text-deep-teal shadow-sm" : "text-text-secondary hover:bg-white/80 hover:text-deep-teal"}`}><Icon size={18} strokeWidth={active ? 2.3 : 1.8} /><span>{hindi ? hindiLabel : english}</span></Link>; })}</nav><div className="mt-auto space-y-1"><Link href="/survivor/case" className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm text-text-secondary hover:bg-white"><UserRound size={18} /><span>{name}</span></Link><Link href="/survivor/privacy" className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm text-text-secondary hover:bg-white"><Settings size={18} /><span>{hindi ? "गोपनीयता और नियंत्रण" : "Privacy & control"}</span></Link><button onClick={() => { logout(); router.push("/welcome"); }} className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm text-text-secondary hover:bg-white"><LogOut size={18} /><span>{hindi ? "साइन आउट" : "Sign out"}</span></button></div></aside>;
}
