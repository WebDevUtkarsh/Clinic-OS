import Link from "next/link";
import { ArrowRight, Building2, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { OnboardingWorkflow } from "@/features/auth/components/onboarding-workflow";
import { getServerSession } from "@/features/auth/server";
import { resolvePostAuthRoute } from "@/features/auth/types";

export default async function OnboardingPage() {
  const session = await getServerSession();

  if (!session) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-5 py-12 md:px-8">
        <div className="grid w-full gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Onboarding
            </div>
            <div className="space-y-4">
              <h1 className="text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
                Organization and facility setup starts after secure sign-in.
              </h1>
              <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
                This route stays public so people can understand the setup flow, but
                creating an organization or care facility still requires an active
                authenticated session.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/login">
                  Sign in to continue
                  <ArrowRight size={16} />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/register">Create tenant first</Link>
              </Button>
            </div>
          </section>

          <div className="grid gap-4">
            {[
              {
                title: "Step 1",
                description: "Create the healthcare organization inside the current tenant.",
                icon: Building2,
              },
              {
                title: "Step 2",
                description: "Activate the first care facility and route into `/f/[facilityId]/dashboard`.",
                icon: ShieldCheck,
              },
            ].map((item) => (
              <Card key={item.title}>
                <CardHeader className="space-y-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <item.icon size={18} />
                  </div>
                  <CardTitle>{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{item.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (!session.requiresOrganizationSetup && !session.requiresFacilitySetup) {
    redirect(resolvePostAuthRoute(session));
  }

  return <OnboardingWorkflow session={session} />;
}
