import Link from "next/link";
import { ArrowLeft, ShieldCheck, Eye, Lock, UserCheck, Bell, Settings, RefreshCw, Mail } from "lucide-react";

const sections = [
  {
    icon: ShieldCheck,
    title: "What SAATH collects",
    body: `SAATH collects only what is necessary to provide support. This includes your NHAA case reference (docket number), voluntary check-in responses you choose to submit, engagement information such as which features you use and how often, and optional voice or text signals only if you explicitly consent.

SAATH does not collect your real name, contact details, or any biometric data beyond what you voluntarily provide.`,
  },
  {
    icon: Eye,
    title: "How your data is used",
    body: `Your data is used to understand changes in your distress levels over time, personalise the support and resources recommended to you, and — only with your explicit consent — notify authorised professionals if a safety concern is detected.

No profiling, advertising, or sale of your data takes place. Your data is never used for purposes unrelated to your wellbeing.`,
  },
  {
    icon: Lock,
    title: "How your data is protected",
    body: `All data is encrypted in transit (TLS 1.3) and at rest (AES-256). Access is restricted to the minimum number of personnel required to operate SAATH, all of whom are bound by confidentiality obligations.

This prototype uses entirely synthetic demonstration data. No real government registries or personal records are accessed.`,
  },
  {
    icon: UserCheck,
    title: "Your consent rights",
    body: `You have the right to give, pause, or withdraw consent at any time. Withdrawing consent means SAATH will stop collecting new data, though it does not automatically delete historical data already held.

You can manage your consent preferences at any time from the Settings page inside SAATH.`,
  },
  {
    icon: Bell,
    title: "Third-party sharing",
    body: `SAATH may share your information with authorised professionals (such as counsellors or legal aid workers assigned to your case) only when:
• You have explicitly consented to this, or
• A safety policy threshold is triggered and disclosure is required by law.

No data is shared with advertisers, commercial entities, or government agencies beyond what is described here.`,
  },
  {
    icon: RefreshCw,
    title: "Data retention",
    body: `Your data is retained for the minimum period necessary to provide continuity of support. If you withdraw from SAATH, you may request deletion of your data by contacting the SAATH team. Certain records may be retained for legal compliance purposes.`,
  },
  {
    icon: Settings,
    title: "Your rights under applicable law",
    body: `Depending on your jurisdiction you may have the right to access, correct, or delete the personal data SAATH holds about you. You may also have the right to data portability, to object to processing, and to lodge a complaint with a supervisory authority.

To exercise any of these rights, please contact us using the details below.`,
  },
  {
    icon: Mail,
    title: "Contact",
    body: `For questions, concerns, or requests relating to your data and this Privacy Notice, please contact the SAATH privacy team.

This is a prototype application. No real personal data is processed and no formal data-controller obligations apply in this demonstration context.`,
  },
];

export default function PrivacyNoticePage() {
  return (
    <div className="min-h-screen saath-page-bg">
      {/* ── Top bar ── */}
      <header className="border-b border-border-color/60 bg-[color:var(--surface)]/80 backdrop-blur-sm px-6 py-4 md:px-10 xl:px-16 flex items-center justify-between">
        <Link href="/landing" className="flex items-center gap-2.5 group w-fit">
          <span className="text-lg text-[color:var(--accent-gold)] transition-transform duration-300 group-hover:rotate-12">✦</span>
          <span className="font-editorial text-[20px] font-bold text-deep-teal leading-none">SAATH</span>
        </Link>
        <Link
          href="/consent"
          className="flex items-center gap-2 text-[13px] text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft size={13} />
          Back to consent
        </Link>
      </header>

      {/* ── Hero ── */}
      <div className="px-6 py-14 md:px-10 xl:px-16 border-b border-border-color/40 bg-[color:var(--surface)]/50">
        <div className="max-w-3xl">
          <span className="inline-flex items-center rounded-full border border-border-color bg-[color:var(--surface-subtle)] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-text-secondary mb-5">
            Legal
          </span>
          <h1 className="font-editorial text-[38px] md:text-[52px] xl:text-[58px] leading-[1.06] tracking-tight text-text-primary">
            Privacy<br />
            <em className="text-deep-teal font-normal not-italic">Notice</em>
          </h1>
          <p className="mt-5 text-[16px] text-text-secondary leading-relaxed max-w-[560px]">
            SAATH is designed with privacy as a foundation — not an afterthought. This notice explains what we collect, why, and how you remain in control at every step.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-[color:var(--success-bg)] border border-[color:var(--success)]/30 px-3 py-1.5 text-[12px] font-medium text-[color:var(--success)]">
              <ShieldCheck size={13} />
              Consent-first design
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-[color:var(--info-bg)] border border-[color:var(--info)]/30 px-3 py-1.5 text-[12px] font-medium text-[color:var(--info)]">
              <Lock size={13} />
              End-to-end encrypted
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-[color:var(--warning-bg)] border border-[color:var(--amber)]/30 px-3 py-1.5 text-[12px] font-medium text-[color:var(--amber)]">
              Prototype — synthetic data only
            </span>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="px-6 py-14 md:px-10 xl:px-16">
        <div className="max-w-3xl space-y-0">
          {sections.map(({ icon: Icon, title, body }, i) => (
            <div
              key={title}
              className={`flex flex-col md:flex-row gap-5 py-10 ${i < sections.length - 1 ? "border-b border-border-color/50" : ""}`}
            >
              {/* Icon col */}
              <div className="shrink-0 flex items-start md:w-10">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[color:var(--primary-teal-dark)] border border-[color:var(--primary-teal)]/20">
                  <Icon size={15} className="text-[color:var(--primary-teal)]" />
                </div>
              </div>
              {/* Content col */}
              <div className="flex-1">
                <h2 className="font-editorial text-[20px] md:text-[22px] leading-snug text-text-primary mb-3">
                  {title}
                </h2>
                <div className="text-[14px] text-text-secondary leading-[1.75] whitespace-pre-line">
                  {body}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <div className="mt-12 max-w-3xl rounded-2xl border border-border-color bg-[color:var(--surface)] px-6 py-5">
          <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-text-secondary mb-2">Last updated</p>
          <p className="text-[13px] text-text-primary font-medium">September 2026 — Version 1.0</p>
          <p className="mt-3 text-[12px] text-text-secondary leading-relaxed">
            This Privacy Notice applies to the SAATH prototype application. As SAATH develops, this notice will be updated to reflect any changes. Significant changes will be communicated to you through the application.
          </p>
        </div>

        <div className="mt-8 max-w-3xl">
          <Link
            href="/consent"
            className="inline-flex items-center gap-2 text-[14px] text-deep-teal underline underline-offset-2 hover:no-underline transition-all"
          >
            <ArrowLeft size={14} />
            Return to consent and continue to SAATH
          </Link>
        </div>
      </div>
    </div>
  );
}

