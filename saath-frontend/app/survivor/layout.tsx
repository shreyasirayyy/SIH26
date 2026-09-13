import { SurvivorNav } from "@/components/SurvivorNav";
import { SurvivorHeader } from "@/components/SurvivorHeader";
import { SurvivorSidebar } from "@/components/SurvivorSidebar";

export default function SurvivorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="saath-page-bg min-h-screen">
      <SurvivorSidebar />
      <main className="desktop-main min-h-screen mobile-safe-bottom">
        <SurvivorHeader />
        {children}
      </main>
      <SurvivorNav />
    </div>
  );
}
