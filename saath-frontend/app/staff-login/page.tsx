"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { apiRequest, setSession } from "@/lib/api";
import { counsellorService } from "@/services/case";
import { useAppStore } from "@/store/useAppStore";
import { Role } from "@/types";

const ADMIN_ACCOUNTS: { role: Role; label: string; id: string; backendRole: "DISTRICT_ADMIN" | "STATE_ADMIN" | "NATIONAL_ADMIN" }[] = [
  { role: "district", label: "Demo District Admin", id: "district@saath", backendRole: "DISTRICT_ADMIN" },
  { role: "state", label: "Demo State Admin", id: "state@saath", backendRole: "STATE_ADMIN" },
  { role: "national", label: "Demo National Admin", id: "national@saath", backendRole: "NATIONAL_ADMIN" },
];

export default function StaffLoginPage() {
  const router = useRouter();
  const setStaffRole = useAppStore((s) => s.setStaffRole);
  const [tab, setTab] = useState<"counsellor" | "admin">("counsellor");

  // Counsellor real login
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Admin demo access
  const [openGroup, setOpenGroup] = useState(false);

  async function counsellorLogin() {
    setError(null);
    setLoading(true);
    try {
      const profile = await counsellorService.login(email, password);
      setStaffRole("counsellor");
      void profile;
      router.push("/counsellor");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  }

  async function adminLogin(backendRole: "DISTRICT_ADMIN" | "STATE_ADMIN" | "NATIONAL_ADMIN", staffId: string, role: Role) {
    setError(null);
    setLoading(true);
    try {
      const response = await apiRequest<{ accessToken?: string }>("/api/v1/auth/staff-token", {
        method: "POST",
        body: JSON.stringify({ role: backendRole, staffId }),
      });
      if (response.accessToken) setSession(response.accessToken);
      setStaffRole(role);
      router.push("/admin");
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

      <div className="mt-6 flex gap-2 rounded-full bg-pale-sage/40 p-1 text-sm font-semibold">
        <button
          type="button"
          onClick={() => { setTab("counsellor"); setError(null); }}
          className={`flex-1 rounded-full px-3 py-2 ${tab === "counsellor" ? "bg-deep-teal text-white" : "text-text-secondary"}`}
        >
          Counsellor
        </button>
        <button
          type="button"
          onClick={() => { setTab("admin"); setError(null); }}
          className={`flex-1 rounded-full px-3 py-2 ${tab === "admin" ? "bg-deep-teal text-white" : "text-text-secondary"}`}
        >
          Admin
        </button>
      </div>

      {tab === "counsellor" && (
        <div className="mt-6 space-y-3">
          <p className="text-xs text-text-secondary">Sign in with your counsellor account.</p>
          <Input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void counsellorLogin(); }}
          />
          {error && <p role="alert" className="text-sm text-warm-peach">{error}</p>}
          <Button className="w-full" onClick={() => void counsellorLogin()} disabled={loading || !email || !password}>
            {loading ? "Signing in..." : "Sign in"}
          </Button>
          <p className="text-xs text-text-secondary">Demo: anjali@saath.com / saath123</p>
        </div>
      )}

      {tab === "admin" && (
        <div className="mt-6 space-y-2">
          <p className="text-xs text-text-secondary mb-2">Continue with a demo admin role.</p>
          <Card className="cursor-pointer hover:border-deep-teal" onClick={() => setOpenGroup((v) => !v)}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Admin roles</p>
              <span className="text-xs text-text-secondary">{openGroup ? "▲" : "▼"}</span>
            </div>
          </Card>
          {openGroup && (
            <div className="pl-2 space-y-2 border-l-2 border-deep-teal/30 ml-1">
              {ADMIN_ACCOUNTS.map((acc) => (
                <Card
                  key={acc.id}
                  className="cursor-pointer hover:border-deep-teal"
                  onClick={() => void adminLogin(acc.backendRole, acc.id, acc.role)}
                >
                  <p className="text-sm font-medium">{acc.label}</p>
                  <p className="text-xs text-text-secondary">{acc.id}</p>
                </Card>
              ))}
            </div>
          )}
          {error && <p role="alert" className="text-sm text-warm-peach">{error}</p>}
        </div>
      )}
    </div>
  );
}
