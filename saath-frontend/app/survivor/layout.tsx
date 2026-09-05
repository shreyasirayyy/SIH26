import { SurvivorNav } from "@/components/SurvivorNav";
import { SurvivorHeader } from "@/components/SurvivorHeader";
import { SurvivorSidebar } from "@/components/SurvivorSidebar";

export default function SurvivorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_90%_0%,rgba(220,235,221,.7),transparent_30%),linear-gradient(135deg,#fff9f0_0%,#f7f5ed_52%,#eef6f0_100%)]">
      <SurvivorSidebar />
      <main className="desktop-main min-h-screen mobile-safe-bottom">
        <SurvivorHeader />
        {children}
      </main>
      <SurvivorNav />
    </div>
  );
}
