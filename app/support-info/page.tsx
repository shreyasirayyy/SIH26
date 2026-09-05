import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function SupportInfoPage() {
  return (
    <div className="flex-1 flex flex-col px-6 py-10 max-w-md mx-auto w-full">
      <h1 className="text-xl font-semibold">Not registered yet?</h1>
      <p className="mt-2 text-text-secondary">
        SAATH is a support layer for people who have already registered a grievance through an
        approved government channel. It isn&apos;t a place to file a new complaint.
      </p>
      <Card className="mt-6">
        <p className="text-sm text-text-secondary leading-relaxed">
          To register a grievance, please use the NHAA Integrated Portal, the IVRS helpline, or an
          approved support channel in your state. Once you have a docket / reference number, you
          can come back here to connect your case to SAATH.
        </p>
      </Card>
      <Link href="/welcome" className="mt-6">
        <Button variant="secondary" className="w-full">
          Back
        </Button>
      </Link>
    </div>
  );
}
