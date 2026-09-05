import Link from "next/link";
import { Bell, FileText, HeartHandshake, Home, LogOut, Settings, Sparkles, UserRound, Wind } from "lucide-react";
import { SurvivorNav } from "@/components/SurvivorNav";

const navItems = [
  { href: "/survivor", label: "Home", icon: Home },
  { href: "/survivor/check-in", label: "Check-in", icon: HeartHandshake },
  { href: "/survivor/feel-better", label: "Feel better", icon: Wind },
  { href: "/survivor/my-space", label: "My space", icon: FileText },
  { href: "/survivor/support", label: "Support", icon: Sparkles },
];

function NorthStar({ small = false }: { small?: boolean }) {
  return <span className={`relative inline-flex items-center justify-center ${small ? "h-8 w-8" : "h-11 w-11"}`} aria-hidden="true"><span className="absolute inset-1 rounded-full bg-[#dcebdd] opacity-80 blur-[5px]" /><span className={`star-breathe relative text-[#d69e2e] ${small ? "text-[15px]" : "text-[21px]"}`}>✦</span></span>;
}

export default function SurvivorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_90%_0%,rgba(220,235,221,.7),transparent_30%),linear-gradient(135deg,#fff9f0_0%,#f7f5ed_52%,#eef6f0_100%)]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-63 flex-col border-r border-[#c8d3d0]/65 bg-[#f8faf4]/88 px-5 py-7 backdrop-blur-xl md:flex xl:w-68">
        <Link href="/survivor" className="flex items-center gap-3 px-2" aria-label="SAATH home">
          <NorthStar />
          <div><div className="font-display text-[28px] font-bold leading-none text-[#0f766e]">SAATH</div><div className="mt-1 text-[10px] font-semibold uppercase tracking-[.22em] text-[#7b8c88]">with you, over time</div></div>
        </Link>
        <div className="my-9 h-px bg-[#c8d3d0]/55" />
        <p className="px-3 text-[10px] font-bold uppercase tracking-[.2em] text-[#91a09b]">Your space</p>
        <nav className="mt-3 space-y-1">
          {navItems.map(({ href, label, icon: Icon }, index) => <Link key={href} href={href} className={`group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium ${index === 0 ? "bg-[#dcebdd] text-[#0f766e] shadow-sm" : "text-[#60706d] hover:bg-white/80 hover:text-[#0f766e]"}`}><Icon size={18} strokeWidth={index === 0 ? 2.3 : 1.8} /><span>{label}</span>{label === "Feel better" && <span className="ml-auto rounded-full bg-[#fff2df] px-2 py-0.5 text-[9px] font-bold text-[#b0762c]">NEW</span>}</Link>)}
        </nav>
        <div className="mt-auto space-y-1">
          <div className="mb-4 rounded-2xl bg-[#0f766e] p-4 text-white shadow-lg shadow-[#0f766e]/15"><div className="flex items-center gap-2"><span className="text-[#f9ca64]">✦</span><span className="text-xs font-bold tracking-wide">TAARA is here</span></div><p className="mt-2 text-xs leading-relaxed text-white/75">A gentle place to pause, reflect, or simply be.</p><Link href="/survivor/taara" className="mt-3 inline-flex text-xs font-semibold text-[#d8f0df]">Open quiet space <span className="ml-1">→</span></Link></div>
          <Link href="/survivor/case" className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm text-[#60706d] hover:bg-white"><UserRound size={18} /><span>Sunita&apos;s space</span></Link>
            <Link href="/survivor/privacy" className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm text-[#60706d] hover:bg-white"><Settings size={18} /><span>Privacy & control</span></Link>
          <button className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm text-[#60706d] hover:bg-white"><LogOut size={18} /><span>Sign out</span></button>
        </div>
      </aside>
      <main className="desktop-main min-h-screen mobile-safe-bottom">
        <header className="flex items-center justify-between px-5 py-5 md:px-10 md:py-7 xl:px-14"><div className="flex items-center gap-3 md:hidden"><NorthStar small /><span className="font-display text-2xl font-bold text-[#0f766e]">SAATH</span></div><div className="hidden md:block"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#8b9a95]">Sunday, 06 September 2026</p></div><div className="flex items-center gap-2"><button aria-label="Notifications" className="relative rounded-full border border-[#c8d3d0]/70 bg-white/70 p-2.5 text-[#65746f] hover:text-[#0f766e]"><Bell size={17} /><span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#e89a78]" /></button><div className="hidden h-9 w-9 items-center justify-center rounded-full bg-[#e7d6cb] text-xs font-bold text-[#6f4d3d] sm:flex">S</div></div></header>
        {children}
      </main>
      <SurvivorNav />
    </div>
  );
}
