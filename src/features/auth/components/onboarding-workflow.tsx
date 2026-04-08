"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
import { useQueryClient } from "@tanstack/react-query";

const facilityTypes = ["CLINIC", "HOSPITAL", "DIAGNOSTIC", "PHARMACY"] as const;

type OnboardingWorkflowProps = {
  session: SessionData;
};

export function OnboardingWorkflow({ session }: OnboardingWorkflowProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [activeStep, setActiveStep] = useState<1 | 2>(session.requiresOrganizationSetup ? 1 : 2);
  const [organizationName, setOrganizationName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    // Sync session requirement state if it updates bounds
    if (session.requiresOrganizationSetup) {
      setActiveStep(1);
    } else if (session.requiresFacilitySetup) {
      setActiveStep(2);
    }
  }, [session.requiresOrganizationSetup, session.requiresFacilitySetup]);

  const handleCreateOrganization = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await createOrganization({ name: organizationName.trim() });
      // Invalidate to fetch new session logic (requiresOrganizationSetup -> false)
      await queryClient.invalidateQueries({ queryKey: ["session"] });
      setActiveStep(2);
    } catch (err) {
      setErrorMsg(err instanceof ApiClientError ? err.message : "Unable to run organization setup.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateFacility = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      // Create is scoped tightly to the active session server side
      const facility = await createFacility({
        organizationId: "self", // Assuming server handles mapping if omitted or explicit logic required
        name: String(formData.get("facilityName") ?? "").trim(),
        type: String(formData.get("facilityType") ?? "CLINIC") as "CLINIC" | "HOSPITAL" | "DIAGNOSTIC" | "PHARMACY",
        address: String(formData.get("facilityAddress") ?? "").trim() || undefined,
      });

      await queryClient.invalidateQueries({ queryKey: ["session"] });
      
      // Redirect seamlessly mapping to the new generated workspace
      window.location.href = `/f/${facility.id}/dashboard?welcome=1`;
    } catch (err) {
      setErrorMsg(err instanceof ApiClientError ? err.message : "Unable to provision facility.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen items-center justify-center py-12 px-5 md:px-0">
      <div className="w-full max-w-lg space-y-8 animate-auth-flow">
        
        <div className="text-center space-y-2">
          <Badge className="mb-2">Setup Workspace</Badge>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Complete your onboarding
          </h1>
          <p className="text-text-secondary text-sm">
            Just a few final strokes to prepare your isolated healthcare environment.
          </p>
        </div>

        {/* Stepper Logic Head */}
        <div className="flex items-center justify-center gap-4">
          <div className={`flex items-center gap-2 text-sm font-semibold transition-colors ${activeStep === 1 ? 'text-primary' : 'text-success'}`}>
            <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs text-white ${activeStep === 1 ? 'bg-primary' : 'bg-success'}`}>
              1
            </span>
            Organization
          </div>
          <div className="h-px w-10 bg-border" />
          <div className={`flex items-center gap-2 text-sm font-semibold transition-colors ${activeStep === 2 ? 'text-primary' : 'text-muted-foreground'}`}>
            <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs text-white ${activeStep === 2 ? 'bg-primary' : 'bg-muted'}`}>
              2
            </span>
            Facility
          </div>
        </div>

        {errorMsg && (
          <div className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger animate-shake">
            {errorMsg}
          </div>
        )}

        <div className="relative">
          {activeStep === 1 ? (
            <Card className="animate-dashboard-fade-up">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 size={18} className="text-primary" />
                  Organization Details
                </CardTitle>
                <CardDescription>
                  Define the primary billing entity that holds your facilities.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateOrganization} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Organization Name</label>
                    <Input
                      value={organizationName}
                      onChange={(e) => setOrganizationName(e.target.value)}
                      placeholder="e.g. Apex Health Systems"
                      disabled={isSubmitting}
                      required
                    />
                  </div>
                  <Button type="submit" disabled={isSubmitting || !organizationName.trim()} className="w-full">
                    {isSubmitting ? "Provisioning..." : "Setup Organization"}
                    {!isSubmitting && <ArrowRight size={16} className="ml-1" />}
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : (
            <Card className="animate-dashboard-fade-up">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Hospital size={18} className="text-primary" />
                  Primary Facility
                </CardTitle>
                <CardDescription>
                  Configure the first physical or virtual care facility. This unlocks your dashboard.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateFacility} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Facility Name</label>
                    <Input name="facilityName" placeholder="e.g. Apex Main Campus" required disabled={isSubmitting} />
                  </div>
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-2 text-sm font-medium text-foreground">
                      Facility Type
                      <select
                        name="facilityType"
                        defaultValue="CLINIC"
                        disabled={isSubmitting}
                        className="h-12 w-full rounded-xl border border-input-border bg-input px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/30 text-foreground"
                      >
                        {facilityTypes.map((type) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </label>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">City / Locale</label>
                      <Input name="facilityAddress" placeholder="e.g. Seattle, WA" disabled={isSubmitting} />
                    </div>
                  </div>

                  <Button type="submit" disabled={isSubmitting} className="w-full">
                    {isSubmitting ? "Activating Sandbox..." : "Activate Facility Workspace"}
                    {!isSubmitting && <ArrowRight size={16} className="ml-1" />}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </div>

      </div>
    </main>
  );
}
