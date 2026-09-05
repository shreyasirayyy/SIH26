"use client";

import { ArrowLeft } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

export function BackButton() {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === "/survivor" || pathname === "/welcome") return null;

  return (
    <button
      type="button"
      onClick={() => {
        if (window.history.length > 1) router.back();
        else router.push("/survivor");
      }}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border-color/70 bg-white/75 text-text-secondary hover:border-deep-teal hover:bg-pale-sage hover:text-deep-teal"
      aria-label="Go back"
      title="Go back"
    >
      <ArrowLeft size={15} />
    </button>
  );
}
