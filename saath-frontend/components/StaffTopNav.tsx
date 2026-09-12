"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/Button";
import { Bell, ClipboardList, FileBarChart, LayoutDashboard, LogOut, Settings, UsersRound } from "lucide-react";

export function StaffTopNav({ role, children }: { role: "counsellor" | "admin"; children?: React.ReactNode }) {
  const router = useRouter();
  const logout = useAppStore((s) => s.logout);
  const items = role === "counsellor"
    ? [
        { href: "/counsellor", label: "Overview", icon: LayoutDashboard },
        { href: "/counsellor", label: "My cases", icon: UsersRound },
        { href: "/counsellor/alerts", label: "Alerts", icon: Bell },
        { href: "/counsellor", label: "Follow-ups", icon: ClipboardList },
        { href: "/counsellor", label: "Reports", icon: FileBarChart },
      ]
    : [
        { href: "/admin", label: "Overview", icon: LayoutDashboard },
        { href: "/admin", label: "Regions", icon: UsersRound },
        { href: "/admin", label: "Cases", icon: ClipboardList },
        { href: "/admin", label: "Reports", icon: FileBarChart },
        { href: "/admin", label: "Settings", icon: Settings },
      ];

  function signOut() { logout(); router.push("/welcome"); }

  return <div className="min-h-screen bg-[color:var(--background)] md:flex">
    <aside className="hidden w-64 shrink-0 border-r border-border-color bg-[color:var(--surface)] px-5 py-7 md:flex md:flex-col">
      <Link href={role === "counsellor" ? "/counsellor" : "/admin"} className="font-display text-3xl font-bold text-[color:var(--primary-teal)]">SAATH</Link>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-[.2em] text-[color:var(--text-secondary)]">{role === "counsellor" ? "Counsellor workspace" : "Admin workspace"}</p>
      <nav className="mt-10 space-y-1" aria-label="Staff navigation">{items.map(({ href, label, icon: Icon }, index) => <Link key={`${label}-${index}`} href={href} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium ${index === 0 ? "bg-[color:var(--primary-teal-dark)] text-[color:var(--primary-teal)]" : "text-[color:var(--text-secondary)] hover:bg-[color:var(--surface-subtle)] hover:text-[color:var(--primary-teal)]"}`}><Icon size={17} /><span>{label}</span>{label === "Alerts" && <span className="ml-auto rounded-full bg-[color:var(--warning-bg)] px-2 py-0.5 text-[10px] font-bold text-[color:var(--warning)]">2</span>}</Link>)}</nav>
      <div className="mt-auto border-t border-border-color pt-4"><Button size="sm" variant="ghost" className="w-full justify-start gap-2" onClick={signOut}><LogOut size={16} />Sign out</Button></div>
    </aside>
    <div className="min-w-0 flex-1"><header className="border-b border-border-color bg-[color:var(--surface)]"><div className="mx-auto flex w-full items-center justify-between px-5 py-4 md:px-8"><Link href={role === "counsellor" ? "/counsellor" : "/admin"} className="font-semibold text-[color:var(--primary-teal)] md:hidden">SAATH · {role === "counsellor" ? "Counsellor" : "Admin"}</Link><p className="hidden text-sm font-semibold text-[color:var(--text-primary)] md:block">{role === "counsellor" ? "Good morning, Dr. Neha" : "Aggregated decision intelligence"}</p><Button size="sm" variant="ghost" className="md:hidden" onClick={signOut}>Sign out</Button></div></header><nav className="flex gap-2 overflow-x-auto border-b border-border-color bg-[color:var(--surface)] px-5 py-2 md:hidden" aria-label="Staff navigation">{items.slice(0, 4).map(({ href, label }) => <Link key={label} href={href} className="whitespace-nowrap rounded-full bg-[color:var(--surface-subtle)] px-3 py-1.5 text-xs font-semibold text-[color:var(--text-secondary)]">{label}</Link>)}</nav><main className="w-full px-5 py-8 md:px-8 xl:px-12">{children}</main></div>
  </div>;
}
