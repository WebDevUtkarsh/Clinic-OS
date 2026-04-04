"use client";

import { useActionState, useEffect, useOptimistic } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, KeyRound, ShieldCheck } from "lucide-react";
import { ApiClientError } from "@/lib/api/client";
import { loginWithPassword } from "@/features/auth/api";
import { resolvePostAuthRoute, type LoginTenantOption } from "@/features/auth/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type LoginActionState =
  | {
      status: "idle";
      message: null;
      redirectTo: null;
      tenants: LoginTenantOption[];
    }
  | {
      status: "error";
      message: string;
      redirectTo: null;
      tenants: LoginTenantOption[];
    }
  | {
      status: "tenant-selection";
      message: string;
      redirectTo: null;
      tenants: LoginTenantOption[];
    }
  | {
      status: "success";
      message: null;
      redirectTo: string;
      tenants: LoginTenantOption[];
    };

const initialState: LoginActionState = {
  status: "idle",
  message: null,
  redirectTo: null,
  tenants: [],
};

async function submitLogin(
  _previousState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  try {
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");
    const result = await loginWithPassword({ email, password });

    if ("requiresTenantSelection" in result) {
      return {
        status: "tenant-selection",
        message:
          "Multiple tenants are available for this account. The backend correctly detected them, but tenant selection is not exposed in this repository yet.",
        redirectTo: null,
        tenants: result.tenants,
      };
    }

    return {
      status: "success",
      message: null,
      redirectTo: resolvePostAuthRoute(result),
      tenants: [],
    };
  } catch (error) {
    if (error instanceof ApiClientError) {
      if (error.status === 401) {
        return {
          status: "error",
          message: "Invalid email or password.",
          redirectTo: null,
          tenants: [],
        };
      }

      if (error.status === 429) {
        return {
          status: "error",
          message: error.message || "Too many sign-in attempts.",
          redirectTo: null,
          tenants: [],
        };
      }

      return {
        status: "error",
        message: error.message || "Unable to start the secure session.",
        redirectTo: null,
        tenants: [],
      };
    }

    return {
      status: "error",
      message: "Unable to start the secure session.",
      redirectTo: null,
      tenants: [],
    };
  }
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, formAction, isPending] = useActionState(submitLogin, initialState);
  const [optimisticEmail, setOptimisticEmail] = useOptimistic(
    "",
    (_current, nextEmail: string) => nextEmail,
  );

  useEffect(() => {
    if (state.status === "success" && state.redirectTo) {
      router.replace(state.redirectTo);
    }
  }, [router, state]);

  const registered = searchParams.get("registered") === "1";
  const initialEmail = searchParams.get("email") ?? "";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-5 py-12 md:px-8">
      <div className="grid w-full gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-6">
          <Badge className="uppercase tracking-[0.24em]">Secure access</Badge>
          <div className="space-y-4">
            <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
              Production login for a facility-scoped healthcare workspace.
            </h1>
            <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
              ClinicOS keeps tenant and facility isolation in the request path, not
              in browser memory. The frontend restores your session with
              credentials-based requests and routes you into the correct onboarding
              or facility dashboard flow.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShieldCheck size={18} className="text-primary" />
                  HttpOnly session model
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Tokens never touch Zustand or local storage. Every API call uses
                  `credentials: &apos;include&apos;`.
                </CardDescription>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <KeyRound size={18} className="text-primary" />
                  URL-driven facility scope
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  After sign-in, the facility in the URL becomes the source of
                  truth for data fetching and query isolation.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </section>

        <Card className="overflow-hidden">
          <CardHeader className="space-y-4 border-b border-border/80 bg-card/95">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="uppercase tracking-[0.24em]">
                Clinical identity
              </Badge>
              <Link
                href="/register"
                className="text-sm font-medium text-primary transition-colors hover:text-primary/80"
              >
                Create tenant
              </Link>
            </div>
            <div className="space-y-2">
              <CardTitle className="text-2xl">Sign in to continue</CardTitle>
              <CardDescription>
                Your authenticated route will be chosen from backend onboarding
                flags and the first accessible facility.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 pt-6">
            {registered ? (
              <div className="rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary">
                Tenant provisioning completed. Sign in to continue into onboarding.
              </div>
            ) : null}

            {state.message ? (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-200">
                {state.message}
              </div>
            ) : null}

            <form
              action={(formData) => {
                setOptimisticEmail(
                  String(formData.get("email") ?? "").trim().toLowerCase(),
                );
                return formAction(formData);
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="email">
                  Work email
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  defaultValue={initialEmail}
                  placeholder="owner@clinic.example"
                  required
                />
              </div>

              <div className="space-y-2">
                <label
                  className="text-sm font-medium text-foreground"
                  htmlFor="password"
                >
                  Password
                </label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  required
                />
              </div>

              {isPending ? (
                <div className="rounded-xl border border-border bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
                  Securing the session for {optimisticEmail || "your account"}.
                </div>
              ) : null}

              <Button type="submit" className="w-full" size="lg" disabled={isPending}>
                Continue to workspace
                <ArrowRight size={16} />
              </Button>
            </form>

            {state.tenants.length ? (
              <div className="space-y-3 rounded-2xl border border-border bg-muted/55 p-4">
                <div className="text-sm font-medium text-foreground">
                  Accessible tenants
                </div>
                <div className="space-y-2">
                  {state.tenants.map((tenant) => (
                    <div
                      key={tenant.tenantId}
                      className="rounded-xl border border-border bg-card px-3 py-3 text-sm"
                    >
                      <div className="font-medium text-foreground">{tenant.name}</div>
                      <div className="mt-1 text-muted-foreground">
                        {tenant.role} · {tenant.slug} · {tenant.status}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
