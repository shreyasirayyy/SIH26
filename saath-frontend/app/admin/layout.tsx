import { StaffTopNav } from "@/components/StaffTopNav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <StaffTopNav role="admin">{children}</StaffTopNav>;
}
