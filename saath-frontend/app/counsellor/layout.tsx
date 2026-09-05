import { StaffTopNav } from "@/components/StaffTopNav";

export default function CounsellorLayout({ children }: { children: React.ReactNode }) {
  return <StaffTopNav role="counsellor">{children}</StaffTopNav>;
}
