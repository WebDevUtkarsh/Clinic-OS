"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Building2, Shield, UsersRound } from "lucide-react";
import { slideUp, staggerContainer } from "@/lib/utils/motion";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SectionHeader } from "@/components/healthcare/section-header";

type DashboardOverviewProps = {
  facilityId: string;
  welcome: boolean;
};

export function DashboardOverview({
  facilityId,
  welcome,
}: DashboardOverviewProps) {
  return (
    <motion.div className="space-y-6" initial="hidden" animate="show" variants={staggerContainer}>
      <SectionHeader
        eyebrow="Facility dashboard"
        title="Care Facility Dashboard"
        description="This route is driven by the facility id in the URL. Any feature module mounted under this shell inherits facility-safe query keys and header injection."
        action={
          <Button asChild variant="outline">
            <Link href={`/f/${facilityId}/patients`}>
              Review patient records
              <ArrowRight size={16} />
            </Link>
          </Button>
        }
      />

      {welcome ? (
        <Card className="border-primary/20 bg-primary/10">
          <CardContent className="pt-6 text-sm text-primary">
            Your first care facility is active. Future feature modules now route
            through `/f/{facilityId}` and refetch automatically when the facility
            changes.
          </CardContent>
        </Card>
      ) : null}

      <motion.div className="grid gap-4 md:grid-cols-3" variants={staggerContainer}>
        {[
          {
            title: "Facility scope",
            value: facilityId,
            icon: Building2,
            description: "All business data is isolated to this facility id.",
          },
          {
            title: "Patient module",
            value: "Ready",
            icon: UsersRound,
            description: "Patient records use facility-keyed TanStack Query entries.",
          },
          {
            title: "Security model",
            value: "Cookie + RBAC",
            icon: Shield,
            description: "401s are handled globally and permissions stay server-side.",
          },
        ].map((item) => (
          <motion.div key={item.title} variants={slideUp}>
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <item.icon size={18} className="text-primary" />
                  <Badge variant="secondary">{item.title}</Badge>
                </div>
                <CardTitle className="pt-4">{item.value}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      <motion.div variants={slideUp}>
        <Card>
          <CardHeader>
            <CardTitle>Foundation guarantees</CardTitle>
            <CardDescription>
              The dashboard shell is intentionally thin. Its main job is to enforce
              safe primitives that future healthcare modules can reuse.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {[
              "Every facility-scoped request attaches the facility id header.",
              "Facility changes clear old facility queries before new pages render.",
              "TanStack Query owns server state, while Zustand mirrors UI-only state.",
              "Loading, empty, and error states are first-class citizens in every page.",
            ].map((item) => (
              <div
                key={item}
                className="rounded-xl border border-border bg-background/70 px-4 py-4 text-sm text-muted-foreground"
              >
                {item}
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
