"use client";

import { useActionState, useEffect, useMemo, useOptimistic, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Building2, Hospital } from "lucide-react";
import { ApiClientError } from "@/lib/api/client";
import { type SessionData } from "@/features/auth/types";
import {
  createFacility,
  createOrganization,
} from "@/features/facilities/api";
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

type OrganizationActionState = {
  status: "idle" | "error" | "success";
  message: string | null;
  organizationId: string | null;
};

type FacilityActionState = {
  status: "idle" | "error" | "success";
  message: string | null;
  redirectTo: string | null;
};

const initialOrganizationState: OrganizationActionState = {
  status: "idle",
  message: null,
  organizationId: null,
};

const initialFacilityState: FacilityActionState = {
  status: "idle",
  message: null,
  redirectTo: null,
};

const facilityTypes = [
  "CLINIC",
  "HOSPITAL",
  "DIAGNOSTIC",
  "PHARMACY",
] as const;

async function submitOrganization(
  _previousState: OrganizationActionState,
  formData: FormData,
): Promise<OrganizationActionState> {
  try {
    const organization = await createOrganization({
      name: String(formData.get("organizationName") ?? "").trim(),
    });

    return {
      status: "success",
      message: "Organization saved. You can now create the first care facility.",
      organizationId: organization.id,
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof ApiClientError
          ? error.message
          : "Unable to create the organization.",
      organizationId: null,
    };
  }
}

async function submitFacility(
  _previousState: FacilityActionState,
  formData: FormData,
): Promise<FacilityActionState> {
  try {
    const facility = await createFacility({
      organizationId: String(formData.get("organizationId") ?? "").trim(),
      name: String(formData.get("facilityName") ?? "").trim(),
      type: String(formData.get("facilityType") ?? "CLINIC") as
        | "CLINIC"
        | "HOSPITAL"
        | "DIAGNOSTIC"
        | "PHARMACY",
      address: String(formData.get("facilityAddress") ?? "").trim() || undefined,
    });

    return {
      status: "success",
      message: "Care facility activated.",
      redirectTo: `/f/${facility.id}/dashboard?welcome=1`,
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof ApiClientError
          ? error.message
          : "Unable to create the care facility.",
      redirectTo: null,
    };
  }
}

type OnboardingWorkflowProps = {
  session: SessionData;
};

export function OnboardingWorkflow({ session }: OnboardingWorkflowProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [manualOrganizationName, setManualOrganizationName] = useState("");
  const [organizationState, organizationAction, organizationPending] =
    useActionState(submitOrganization, initialOrganizationState);
  const [facilityState, facilityAction, facilityPending] = useActionState(
    submitFacility,
    initialFacilityState,
  );
  const [optimisticFacilityName, setOptimisticFacilityName] = useOptimistic(
    "",
    (_current, nextName: string) => nextName,
  );

  useEffect(() => {
    if (organizationState.status === "success") {
      const nextParams = new URLSearchParams(searchParams.toString());

      if (organizationState.organizationId) {
        nextParams.set("organizationId", organizationState.organizationId);
      }

      const submittedName = manualOrganizationName.trim();
      if (submittedName) {
        nextParams.set("organizationName", submittedName);
      }

      const nextSearch = nextParams.toString();
      router.replace(nextSearch ? `/onboarding?${nextSearch}` : "/onboarding");
    }
  }, [manualOrganizationName, organizationState, router, searchParams]);

  useEffect(() => {
    if (facilityState.status === "success" && facilityState.redirectTo) {
      router.replace(facilityState.redirectTo);
    }
  }, [facilityState, router]);

  const selectedOrganizationId = useMemo(
    () =>
      organizationState.organizationId || searchParams.get("organizationId") || "",
    [organizationState.organizationId, searchParams],
  );
  const selectedOrganizationName =
    manualOrganizationName || searchParams.get("organizationName") || "";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-5 py-12 md:px-8">
      <div className="grid w-full gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="space-y-6">
          <Badge className="uppercase tracking-[0.24em]">Onboarding</Badge>
          <div className="space-y-4">
            <h1 className="text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
              Activate your first organization and care facility.
            </h1>
            <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
              Facility scope is the center of the product. Once the first facility
              exists, the frontend can route into `/f/[facilityId]/*` and keep all
              data operations tenant-safe by design.
            </p>
          </div>

          <div className="grid gap-4">
            {[
              {
                title: "Tenant",
                value: session.tenant.name,
              },
              {
                title: "Role",
                value: session.role,
              },
              {
                title: "Permissions",
                value: `${session.permissions.length} granted`,
              },
            ].map((item) => (
              <Card key={item.title}>
                <CardContent className="flex items-center justify-between pt-6">
                  <div>
                    <div className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
                      {item.title}
                    </div>
                    <div className="mt-2 text-lg font-semibold text-foreground">
                      {item.value}
                    </div>
                  </div>
                  <Badge variant="secondary">{item.title}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 size={18} className="text-primary" />
                Step 1: Organization
              </CardTitle>
              <CardDescription>
                Create the tenant&apos;s first healthcare organization. This remains
                tenant-safe and does not introduce facility scope yet.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {organizationState.message ? (
                <div className="rounded-xl border border-border bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
                  {organizationState.message}
                </div>
              ) : null}

              <form
                action={(formData) => {
                  setManualOrganizationName(
                    String(formData.get("organizationName") ?? "").trim(),
                  );
                  return organizationAction(formData);
                }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <label
                    className="text-sm font-medium text-foreground"
                    htmlFor="organizationName"
                  >
                    Organization name
                  </label>
                  <Input
                    id="organizationName"
                    name="organizationName"
                    placeholder="Sunrise Healthcare Group"
                    required
                  />
                </div>
                <Button type="submit" disabled={organizationPending}>
                  Save organization
                  <ArrowRight size={16} />
                </Button>
              </form>

              {selectedOrganizationId ? (
                <div className="space-y-2 rounded-2xl border border-border bg-background/80 p-4">
                  <div className="text-sm font-medium text-foreground">
                    Current organization
                  </div>
                  <div className="rounded-xl border border-border px-3 py-3 text-sm">
                    <div className="font-medium text-foreground">
                      {selectedOrganizationName || "Recently created organization"}
                    </div>
                    <div className="mt-1 break-all text-muted-foreground">
                      {selectedOrganizationId}
                    </div>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hospital size={18} className="text-primary" />
                Step 2: Care Facility
              </CardTitle>
              <CardDescription>
                The first facility unlocks the main URL-driven workspace and sets up
                the primary access boundary for patient and audit data.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {facilityState.message ? (
                <div className="rounded-xl border border-border bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
                  {facilityState.message}
                </div>
              ) : null}

              {facilityPending ? (
                <div className="rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary">
                  Preparing {optimisticFacilityName || "your care facility"}.
                </div>
              ) : null}

              <form
                action={(formData) => {
                  setOptimisticFacilityName(String(formData.get("facilityName") ?? ""));
                  return facilityAction(formData);
                }}
                className="space-y-4"
              >
                <input
                  type="hidden"
                  name="organizationId"
                  value={selectedOrganizationId}
                />

                <div className="space-y-2">
                  <label
                    className="text-sm font-medium text-foreground"
                    htmlFor="facilityName"
                  >
                    Facility name
                  </label>
                  <Input
                    id="facilityName"
                    name="facilityName"
                    placeholder="Downtown Care Facility"
                    required
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 text-sm font-medium text-foreground">
                    Facility type
                    <select
                      name="facilityType"
                      defaultValue="CLINIC"
                      className="h-11 w-full rounded-xl border border-border bg-background/80 px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                    >
                      {facilityTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="space-y-2">
                    <label
                      className="text-sm font-medium text-foreground"
                      htmlFor="facilityAddress"
                    >
                      Address
                    </label>
                    <Input
                      id="facilityAddress"
                      name="facilityAddress"
                      placeholder="12 MG Road, Bangalore"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={facilityPending || !selectedOrganizationId}
                >
                  Activate facility workspace
                  <ArrowRight size={16} />
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
