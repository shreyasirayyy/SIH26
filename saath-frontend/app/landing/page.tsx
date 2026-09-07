import Link from "next/link";
import {
  ArrowRight,
  HeartHandshake,
  ShieldCheck,
  Sparkles,
  Lock,
  Smile,
  Globe2,
  Users,
  LineChart,
} from "lucide-react";

const PORTALS = [
  {
    label: "Victim / User App",
    badge: "bg-deep-teal",
    title: "For survivors",
    description:
      "A calm, private space to check in, feel supported, and move at your own pace — with or without a registered case.",
    cta: "Continue as a survivor",
    href: "/welcome",
    icon: HeartHandshake,
  },
  {
    label: "Counsellor Dashboard",
    badge: "bg-calm-blue",
    title: "For counsellors",
    description:
      "Actionable, prioritised insight into the people you support — flagged concerns, trends, and follow-ups in one view.",
    cta: "Counsellor sign in",
    href: "/staff-login",
    icon: Users,
  },
  {
    label: "District / State Admin",
    badge: "bg-muted-plum",
    title: "For administrators",
    description:
      "Aggregated, anonymised decision intelligence across districts — case load, response times, and improvement trends.",
    cta: "Admin sign in",
    href: "/staff-login",
    icon: LineChart,
  },
];

const PRINCIPLES = [
  { title: "Compassionate", desc: "Every interaction feels caring and non-judgmental.", icon: HeartHandshake },
  { title: "Safe & Private", desc: "Your data, your choice. Always in control.", icon: Lock },
  { title: "Calming & Simple", desc: "Clean layouts, gentle visuals, and clutter-free.", icon: Sparkles },
  { title: "Empowering", desc: "We support your choices, your pace.", icon: Smile },
  { title: "Inclusive & Accessible", desc: "Multilingual, voice-first, and low-literacy friendly.", icon: Globe2 },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_90%_0%,rgba(220,235,221,.8),transparent_30%),var(--warm-cream)] px-5 py-7 md:px-10 xl:px-16">
      {/* Nav */}
      <nav className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl text-amber" aria-hidden>
            ✦
          </span>
          <span className="font-display text-3xl font-bold text-deep-teal">SAATH</span>
          <span className="hidden text-[10px] font-bold uppercase tracking-[.2em] text-text-secondary sm:inline">
            with you, over time
          </span>
        </div>
        <div className="flex items-center gap-5">
          <Link href="/about" className="hidden text-sm font-semibold text-text-secondary sm:inline">
            About
          </Link>
          <Link
            href="/staff-login"
            className="rounded-full border border-border-color bg-white/70 px-5 py-2.5 text-sm font-bold text-deep-teal"
          >
            Counsellor / Admin sign in
          </Link>
        </div>
      </nav>

{/* Hero */}
<section className="mx-auto max-w-5xl py-20 text-center md:py-28">
  <span className="inline-flex items-center gap-2 rounded-full bg-pale-sage/60 px-4 py-1.5 text-xs font-bold uppercase tracking-[.14em] text-deep-teal">
    Supportive monitoring, by consent
  </span>
  <h1 className="mx-auto mt-6 max-w-3xl font-display text-5xl leading-[1.05] md:text-7xl">
    <span className="block text-text-primary">You don&apos;t have to</span>
    <span className="block text-warm-peach">go through it alone.</span>
  </h1>
  <p className="mx-auto mt-7 max-w-xl text-lg leading-relaxed text-text-secondary/90">
    SAATH walks with survivors of atrocities — with compassion, respect, and privacy. We
    notice when you might need support, and help you take the next step, at your own pace.
  </p>
  <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
    <Link
      href="/welcome"
      className="inline-flex items-center gap-2 rounded-full bg-deep-teal px-7 py-3.5 text-sm font-bold text-white shadow-sm"
    >
      Get started <ArrowRight size={16} />
    </Link>
    <Link
      href="/about"
      className="inline-flex items-center gap-2 rounded-full border border-border-color bg-white/70 px-7 py-3.5 text-sm font-bold text-deep-teal"
    >
      Learn more
    </Link>
  </div>
</section>
      {/* Portals */}
      <section className="mx-auto max-w-6xl">
        <div className="grid gap-5 md:grid-cols-3">
          {PORTALS.map(({ label, badge, title, description, cta, href, icon: Icon }) => (
            <div key={label} className="surface flex flex-col rounded-3xl p-7">
              <span
                className={`inline-flex w-fit items-center rounded-full ${badge} px-3.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white`}
              >
                {label}
              </span>
              <Icon className="mt-7 text-deep-teal" size={22} />
              <h3 className="mt-4 font-display text-2xl text-text-primary">{title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-text-secondary">{description}</p>
              <Link
                href={href}
                className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-deep-teal"
              >
                {cta} <ArrowRight size={14} />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Design principles */}
      <section className="mx-auto mt-10 max-w-6xl rounded-[30px] bg-deep-teal p-8 text-white md:p-12">
        <p className="text-xs font-bold uppercase tracking-[.18em] text-pale-sage">Why SAATH?</p>
        <h2 className="mt-4 max-w-2xl font-display text-3xl leading-snug md:text-4xl">
          Built to feel safe from the very first tap.
        </h2>
        <div className="mt-9 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
          {PRINCIPLES.map(({ title, desc, icon: Icon }) => (
            <div key={title}>
              <Icon className="text-pale-sage" size={20} />
              <h3 className="mt-3 text-sm font-bold">{title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-white/70">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer band */}
      <section className="mx-auto mt-10 max-w-6xl rounded-[30px] bg-greenish-cream p-6 text-center md:p-8">
        <p className="inline-flex items-center gap-2 text-sm font-semibold text-text-primary">
          <ShieldCheck size={16} className="text-deep-teal" />
          SAATH is built with privacy, dignity and choice at its core. You&apos;re in control, always.
        </p>
      </section>
    </main>
  );
}