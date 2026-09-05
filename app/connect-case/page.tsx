"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ProgressDots } from "@/components/ui/ProgressDots";
import { caseService } from "@/services/case";

export default function ConnectCasePage() {
  const router = useRouter();
  const [docket, setDocket] = useState("NHAA-RJ-2026-004821");
  const [mobile, setMobile] = useState("9876543210");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await caseService.verifyDocket(docket, mobile);
    setLoading(false);
    if (!result.ok) {
      setError(result.message ?? "Something went wrong. Please try again.");
      return;
    }
    await caseService.requestOtp();
    router.push(`/verify-otp?docket=${encodeURIComponent(docket)}&mobile=${encodeURIComponent(mobile)}`);
  }

  return (
    <div className="flex-1 flex flex-col px-6 py-8 max-w-md mx-auto w-full">
      <ProgressDots step={1} total={5} />
      <h1 className="mt-6 text-xl font-semibold">Connect your registered case</h1>
      <p className="mt-2 text-sm text-text-secondary">
        Use the mobile number already associated with your registered grievance.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="text-sm font-medium text-text-secondary" htmlFor="docket">
            NHAA Docket / Reference Number
          </label>
          <Input
            id="docket"
            className="mt-1.5"
            value={docket}
            onChange={(e) => setDocket(e.target.value)}
            placeholder="NHAA-XX-YYYY-NNNNNN"
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium text-text-secondary" htmlFor="mobile">
            Registered Mobile Number
          </label>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="rounded-xl border border-border-color bg-white px-3 py-3 text-text-secondary">
              +91
            </span>
            <Input
              id="mobile"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              inputMode="numeric"
              maxLength={10}
              placeholder="9876543210"
              required
            />
          </div>
        </div>

        {error && (
          <p role="alert" className="text-sm text-warm-peach">
            {error}
          </p>
        )}

        <p className="text-xs text-text-secondary">
          Your case information will be fetched securely after verification. This demo uses a
          synthetic NHAA case registry — no real government systems are accessed.
        </p>

        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? "Verifying..." : "Verify & Continue"}
        </Button>
      </form>

      <p className="mt-4 text-xs text-center text-text-secondary">
        Try docket <span className="font-mono">NHAA-RJ-2026-004821</span> for this demo.
      </p>
    </div>
  );
}
