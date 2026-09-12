import Link from "next/link";
import { ArrowRight, HeartHandshake, ShieldCheck, Sparkles, FileText, Lock, MessageSquareHeart } from "lucide-react";

const options = [
  {
    title: "Connect with Docket ID",
    href: "/connect-case",
    variant: "primary",
    icon: FileText,
  },
  {
    title: "Explore support without a case",
    href: "/support-info",
    variant: "secondary",
    icon: HeartHandshake,
  },
];

export default function WelcomePage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_90%_0%,rgba(220,235,221,.8),transparent_30%),var(--warm-cream)] px-5 py-10 md:px-8 xl:px-16">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:py-10">
        <section className="mx-auto w-full max-w-xl text-left">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full bg-sage/60 px-3.5 py-1.5 text-[12px] font-bold uppercase tracking-[.18em] text-deep-teal">
            {/* <Sparkles size={12} /> */}
            WHY CHOOSE SAATH
          </p>

          <h1 className="font-display text-5xl leading-[0.95] text-text-primary md:text-6xl">
            Welcome to <span className="text-warm-peach">SAATH</span>
          </h1>

          <p className="mt-5 max-w-xl text-[1.02rem] font-medium leading-8 text-text-secondary/90">
            SAATH connects people affected by distress with the right support, at the right time.
          </p>

          <p className="mt-4 max-w-xl text-base leading-7 text-text-secondary/90">
            From your first check-in to your recovery journey, SAATH helps you stay connected to care,
            understand changes in your wellbeing, and reach support when you need it.
          </p>

          <ul className="mt-8 space-y-4 text-base text-text-secondary">
            <li className="flex items-start gap-3">
              <span className="mt-1 inline-flex h-2.5 w-2.5 rounded-full bg-deep-teal" aria-hidden />
              <span>
                <strong className="font-semibold text-text-primary"></strong> Continue your support journey without starting over.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 inline-flex h-2.5 w-2.5 rounded-full bg-deep-teal" aria-hidden />
              <span>
                <strong className="font-semibold text-text-primary"></strong> Share how you’re doing through simple, private check-ins.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 inline-flex h-2.5 w-2.5 rounded-full bg-deep-teal" aria-hidden />
              <span>
                <strong className="font-semibold text-text-primary"></strong> Connect with counsellors and relevant services when needed.
              </span>
            </li>
          </ul>

          {/* <p className="mt-8 max-w-lg border-l-2 border-pale-sage pl-4 text-base leading-7 text-text-secondary">
            <strong className="text-text-primary">Built to support individuals today and help shape better support systems for tomorrow.</strong>
          </p> */}
        </section>

        <aside className="w-full rounded-[30px] border border-border-color/70 bg-[rgba(13,59,74,0.97)] p-5 shadow-[0_20px_60px_rgba(18,46,60,0.18)] md:p-7">
          <div className="mb-5 flex items-center justify-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#b8d8d1]/40 bg-white/5 px-4 py-2 text-sm font-semibold text-white/90">
              <HeartHandshake size={18} className="text-pale-sage" />
              Survivor portal
            </span>
          </div>

          <div className="space-y-3">
            {options.map(({ title, href, variant, icon: Icon }) => (
              <Link key={title} href={href} className="block">
                <button
                  type="button"
                  className={[
                    "flex w-full items-center justify-between rounded-2xl px-4 py-3.5 text-left text-base font-semibold transition-all duration-200",
                    variant === "primary"
                      ? "bg-deep-teal text-white shadow-sm hover:brightness-105"
                      : "border border-white/20 bg-white/5 text-white/90 hover:bg-white/10",
                  ].join(" ")}
                >
                  <span className="flex items-center gap-3">
                    <span
                      className={[
                        "flex h-9 w-9 items-center justify-center rounded-full",
                        variant === "primary" ? "bg-white/10 text-white" : "bg-white/10 text-pale-sage",
                      ].join(" ")}
                    >
                      <Icon size={16} />
                    </span>
                    <span>{title}</span>
                  </span>
                  <ArrowRight size={16} className={variant === "primary" ? "text-white" : "text-white/80"} />
                </button>
              </Link>
            ))}
          </div>

          <div className="mt-6 border-t border-white/10 pt-5 text-center">
            <Link href="/staff-login" className="text-sm font-medium text-pale-sage underline-offset-4 hover:underline">
              Counsellor / Admin sign in
            </Link>
          </div>
        </aside>
      </div>
    </main>
  );
}
