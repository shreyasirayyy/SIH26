import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function WelcomePage() {
  return (
    <div className="flex-1 flex flex-col justify-between bg-gradient-to-b from-pale-sage/60 to-warm-cream px-6 py-10">
      <div className="max-w-md mx-auto w-full text-center pt-10">
        <div className="mx-auto mb-6 h-16 w-16 rounded-full bg-deep-teal flex items-center justify-center text-2xl">
          <span className="text-greenish-cream" aria-hidden>
            🌿
          </span>
        </div>
        <h1 className="text-2xl font-semibold text-text-primary">Welcome to SAATH</h1>
        <p className="mt-3 text-text-secondary leading-relaxed">
          If you have already registered a grievance, you can connect your existing case here.
          SAATH won&apos;t ask you to explain everything from the beginning.
        </p>
      </div>

      <div className="max-w-md mx-auto w-full space-y-3 pb-6">
        <Link href="/connect-case" className="block">
          <Button size="lg" className="w-full">
            Connect My Registered Case
          </Button>
        </Link>
        <Link href="/support-info" className="block">
          <Button size="lg" variant="secondary" className="w-full">
            I don&apos;t have a registered case
          </Button>
        </Link>
        <Link href="/staff-login" className="block text-center text-sm text-text-secondary underline pt-4">
          Counsellor / Admin sign in
        </Link>
      </div>
    </div>
  );
}
