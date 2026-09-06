"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { apiRequest, setSession } from "@/lib/api";
import { useAppStore } from "@/store/useAppStore";
import { Role } from "@/types";

const DEMO_ACCOUNTS: { role: Role; label: string; id: string; backendRole: "COUNSELLOR" | "DISTRICT_ADMIN" | "STATE_ADMIN" | "NATIONAL_ADMIN" }[] = [
  { role: "counsellor", label: "Dr. Neha — Counsellor", id: "counsellor@saath", backendRole: "COUNSELLOR" },
  { role: "district", label: "Demo District Admin", id: "district@saath", backendRole: "DISTRICT_ADMIN" },
  { role: "state", label: "Demo State Admin", id: "state@saath", backendRole: "STATE_ADMIN" },
  { role: "national", label: "Demo National Admin", id: "national@saath", backendRole: "NATIONAL_ADMIN" },
];

export default function StaffLoginPage() {
  const router = useRouter();
  const setStaffRole = useAppStore((s) => s.setStaffRole);
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function loginAs(role: Role, backendRole?: "COUNSELLOR" | "DISTRICT_ADMIN" | "STATE_ADMIN" | "NATIONAL_ADMIN", staffId?: string) {
    setError(null);
    setLoading(true);

    try {
      if (backendRole) {
        const resolvedStaffId = staffId ?? id ?? "demo-staff";
        const response = await apiRequest<{ accessToken?: string; user?: { role?: string } }>("/api/v1/auth/staff-token", {
          method: "POST",
          body: JSON.stringify({ role: backendRole, staffId: resolvedStaffId }),
        });
        if (response.accessToken) setSession(response.accessToken);
      }
      setStaffRole(role);
      router.push(role === "counsellor" ? "/counsellor" : "/admin");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to sign in with the staff account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col px-6 py-10 max-w-md mx-auto w-full">
      <p className="text-xs font-semibold text-amber uppercase tracking-wide">Secure staff access</p>
      <h1 className="mt-1 text-xl font-semibold">Staff sign in</h1>

      <div className="mt-6 space-y-3">
        <Input placeholder="Staff ID or email" value={id} onChange={(e) => setId(e.target.value)} />
        <Input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p role="alert" className="text-sm text-warm-peach">{error}</p>}
        <Button className="w-full" onClick={() => void loginAs("counsellor", "COUNSELLOR", id || "counsellor@saath")} disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </Button>
      </div>

      <p className="mt-8 text-sm font-medium text-text-secondary">Or continue with a staff role</p>
      <div className="mt-3 space-y-2">
        {DEMO_ACCOUNTS.map((acc) => (
          <Card
            key={acc.id}
            className="cursor-pointer hover:border-deep-teal"
            onClick={() => void loginAs(acc.role, acc.backendRole, acc.id)}
          >
            <p className="text-sm font-medium">{acc.label}</p>
            <p className="text-xs text-text-secondary">{acc.id}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
