"use client";

import { ShieldAlert } from "lucide-react";
import { AUDIT_TIMELINE_UNAVAILABLE_REASON } from "@/features/audit/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/healthcare/empty-state";
import { SectionHeader } from "@/components/healthcare/section-header";

type AuditPageProps = {
  facilityId: string;
};

export function AuditPage({ facilityId }: AuditPageProps) {
  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Security insights"
        title="Activity Timeline"
        description="This screen is hardened to avoid cross-facility leakage. Until the backend exposes a stable facility-scoped audit read contract, the frontend will not request tenant-wide audit data here."
      />

      <Card className="border-amber-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-200">
            <ShieldAlert size={18} />
            Facility safety guard
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-relaxed text-muted-foreground">
          {AUDIT_TIMELINE_UNAVAILABLE_REASON}
        </CardContent>
      </Card>

      <EmptyState
        title="Facility timeline is awaiting a stable backend contract"
        description={`Current facility: ${facilityId}. This route stays URL-scoped, but the frontend will not fetch a tenant-wide audit feed and filter it client-side.`}
      />
    </div>
  );
}
