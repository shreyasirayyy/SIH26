"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ProgressDots } from "@/components/ui/ProgressDots";
import { caseService } from "@/services/case";

function VerifyOtpInner() {
  const router = useRouter();
  const params = useSearchParams();
  const docket = params.get("docket") ?? "";
  const mobile = params.get("mobile") ?? "";

  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await caseService.verifyOtp(otp);
    setLoading(false);
    if (!result.ok) {
      setError("That code doesn't look right. Please try again.");
      return;
    }
    router.push(`/case-found?docket=${encodeURIComponent(docket)}&mobile=${encodeURIComponent(mobile)}`);
  }

  return (
    <div className="flex-1 flex flex-col px-6 py-8 max-w-md mx-auto w-full">
      <ProgressDots step={2} total={5} />
      <h1 className="mt-6 text-xl font-semibold">Enter the code we sent</h1>
      <p className="mt-2 text-sm text-text-secondary">
        We&apos;ve sent a 6-digit code to the mobile number ending in {mobile.slice(-4) || "----"}.
      </p>

      <form onSubmit={handleVerify} className="mt-6 space-y-4">
        <Input
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          inputMode="numeric"
          maxLength={6}
          placeholder="••••••"
          className="text-center tracking-[0.5em] text-lg"
          required
        />
        {error && (
          <p role="alert" className="text-sm text-warm-peach">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? "Checking..." : "Verify & Continue"}
        </Button>
      </form>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={null}>
      <VerifyOtpInner />
    </Suspense>
  );
}
