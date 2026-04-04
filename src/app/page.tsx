import Link from "next/link";
import { ArrowRight, Building2, ShieldCheck, Stethoscope } from "lucide-react";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getServerSession } from "@/features/auth/server";
import { resolvePostAuthRoute } from "@/features/auth/types";

export default async function HomePage() {
  const session = await getServerSession();

  if (session) {
    redirect(resolvePostAuthRoute(session));
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-5 py-12 md:px-8">
      <div className="grid w-full gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            ClinicOS
          </div>
          <div className="space-y-4">
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
              Public access for the healthcare workspace, without leaking protected routes.
            </h1>
            <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
              Sign in when you are ready, create a tenant if you are getting started,
              and keep facility-scoped workspaces protected under `/f/[facilityId]/*`.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/login">
                Sign in
                <ArrowRight size={16} />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/register">Create tenant</Link>
            </Button>
          </div>
        </section>

        <div className="grid gap-4">
          {[
            {
              title: "Public entry",
              description:
                "The landing page, sign-in, registration, and onboarding can render without an authenticated cookie.",
              icon: ShieldCheck,
            },
            {
              title: "Protected workspace",
              description:
                "Only facility routes enforce authentication, keeping business data behind the URL-driven boundary.",
              icon: Building2,
            },
            {
              title: "Healthcare-safe routing",
              description:
                "Session restoration and redirects only happen where they belong, not across every public page.",
              icon: Stethoscope,
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
