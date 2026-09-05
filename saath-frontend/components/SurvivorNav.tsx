"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { FileText, HeartHandshake, Home, Sparkles, Wind } from "lucide-react";

const items = [
  { href: "/survivor", label: "Home", icon: Home },
  { href: "/survivor/check-in", label: "Check-in", icon: HeartHandshake },
  { href: "/survivor/feel-better", label: "Feel better", icon: Wind },
  { href: "/survivor/my-space", label: "My space", icon: FileText },
  { href: "/survivor/support", label: "Support", icon: Sparkles },
];

export function SurvivorNav() {
  const pathname = usePathname();
  return <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#c8d3d0]/70 bg-[#fffdf8]/92 px-2 pb-[env(safe-area-inset-bottom)] pt-2 shadow-[0_-12px_35px_rgba(29,71,64,.08)] backdrop-blur-xl md:hidden"><ul className="mx-auto flex max-w-lg justify-between"><li className="contents">{items.map(({ href, label, icon: Icon }) => { const active = href === "/survivor" ? pathname === href : pathname.startsWith(href); return <Link key={href} href={href} className={cn("flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl py-2 text-[10px] font-semibold", active ? "text-[#0f766e]" : "text-[#87938f]")}><span className={cn("rounded-xl px-3 py-1", active && "bg-[#dcebdd]")}><Icon size={18} strokeWidth={active ? 2.5 : 1.8} /></span><span className="truncate">{label}</span></Link>; })}</li></ul></nav>;
}
