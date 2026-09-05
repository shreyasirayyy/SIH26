import { StaffTopNav } from "@/components/StaffTopNav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex-1">
      <StaffTopNav role="admin" />
      <main className="w-full px-5 py-8 md:px-8 xl:px-12">{children}</main>
    </div>
  );
}
