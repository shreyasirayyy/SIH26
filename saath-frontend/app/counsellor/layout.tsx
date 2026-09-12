"use client";

import { useEffect } from "react";
import { StaffTopNav } from "@/components/StaffTopNav";
import { counsellorService } from "@/services/case";
import { useAppStore } from "@/store/useAppStore";

export default function CounsellorLayout({ children }: { children: React.ReactNode }) {
  const counsellorProfile = useAppStore((s) => s.counsellorProfile);

  useEffect(() => {
    // On a fresh page load (e.g. refresh) we have a session token but the
    // in-memory counsellorProfile is empty — hydrate it from /counsellor/me.
    if (!counsellorProfile) {
      counsellorService.getMe().catch(() => {});
    }
  }, [counsellorProfile]);

  return <StaffTopNav role="counsellor">{children}</StaffTopNav>;
}
