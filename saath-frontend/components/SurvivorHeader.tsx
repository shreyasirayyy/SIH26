"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BackButton } from "@/components/BackButton";
import { useAppStore } from "@/store/useAppStore";
import { notificationService } from "@/services/notifications";

export function SurvivorHeader() {
  const survivorName = useAppStore((state) => state.survivorName);
  const language = useAppStore((state) => state.language);
  const setLanguage = useAppStore((state) => state.setLanguage);
  const [hasNotifications, setHasNotifications] = useState(false);

  useEffect(() => {
    notificationService.getNotifications().then((items) => setHasNotifications(items.length > 0)).catch(() => setHasNotifications(false));
  }, []);

  const hindi = language === "Hindi";
  const initial = survivorName?.trim().charAt(0).toUpperCase() || "S";

  return <header className="flex items-center justify-between px-5 py-5 md:px-10 md:py-7 xl:px-14"><div className="flex items-center gap-3 md:hidden"><span className="font-display text-2xl font-bold text-deep-teal">SAATH</span></div><div className="hidden md:block"><p className="text-xs font-bold uppercase tracking-[.18em] text-text-secondary">{new Date().toLocaleDateString(language === "Hindi" ? "hi-IN" : "en-IN", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</p></div><div className="flex items-center gap-2"><div className="flex rounded-full border border-border-color/70 bg-white/70 p-0.5 text-[11px]"><button onClick={() => setLanguage("English")} className={hindi ? "px-2 py-1 text-text-secondary" : "rounded-full bg-deep-teal px-2 py-1 text-white"}>EN</button><button onClick={() => setLanguage("Hindi")} className={hindi ? "rounded-full bg-deep-teal px-2 py-1 text-white" : "px-2 py-1 text-text-secondary"}>हिं</button></div><BackButton /><Link href="/survivor/notifications" aria-label={hindi ? "सूचनाएँ खोलें" : "Open notifications"} title={hindi ? "सूचनाएँ" : "Notifications"} className="relative rounded-full border border-border-color/70 bg-white/70 p-2.5 text-text-secondary hover:text-deep-teal"><Bell size={17} />{hasNotifications && <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-warm-peach" />}</Link><Link href="/survivor/my-space" aria-label={survivorName ?? "Profile"} title={survivorName ?? (hindi ? "प्रोफ़ाइल" : "Profile")} className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e7d6cb] text-xs font-bold text-[#6f4d3d]">{initial}</Link></div></header>;
}
