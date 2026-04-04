"use client";

import { startTransition, useDeferredValue, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Search, UsersRound } from "lucide-react";
import { ApiClientError } from "@/lib/api/client";
import { usePatientsQuery } from "@/features/patients/api";
import { slideUp, staggerContainer } from "@/lib/utils/motion";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/healthcare/empty-state";
import { SectionHeader } from "@/components/healthcare/section-header";

type PatientsPageProps = {
  facilityId: string;
};

export function PatientsPage({ facilityId }: PatientsPageProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlSearch = searchParams.get("search") ?? "";
  const [search, setSearch] = useState(urlSearch);
  const deferredSearch = useDeferredValue(search);
  const patientsQuery = usePatientsQuery(facilityId, urlSearch);

  useEffect(() => {
    setSearch(urlSearch);
  }, [urlSearch]);

  const handleSearchChange = (value: string) => {
    setSearch(value);

    startTransition(() => {
      const nextParams = new URLSearchParams(searchParams.toString());

      if (value.trim()) {
        nextParams.set("search", value.trim());
      } else {
        nextParams.delete("search");
      }

      const nextSearch = nextParams.toString();
      router.replace(nextSearch ? `${pathname}?${nextSearch}` : pathname);
    });
  };

  const patients = patientsQuery.data?.data ?? [];
  const patientError =
    patientsQuery.error instanceof ApiClientError
      ? patientsQuery.error
      : null;

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Patient module"
        title="Patient Records"
        description="This example page uses a facility-scoped query key and facility-scoped header injection. The URL search param is the single source of truth for filtering."
        action={
          <Button variant="outline" disabled>
            Create patient pattern next
            <ArrowRight size={16} />
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-6">
          <label className="flex items-center gap-3 rounded-xl border border-border bg-background/80 px-3 py-2">
            <Search size={16} className="text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => handleSearchChange(event.target.value)}
              placeholder="Search by patient name, phone, or email"
              className="border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
            />
          </label>
          {deferredSearch !== urlSearch ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Updating results for &quot;{deferredSearch}&quot;.
            </p>
          ) : null}
        </CardContent>
      </Card>

      {patientsQuery.isLoading ? (
        <div className="grid gap-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index}>
              <CardContent className="space-y-3 pt-6">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {patientsQuery.isError ? (
        <Card className="border-red-500/30">
          <CardContent className="space-y-2 pt-6 text-sm text-red-600 dark:text-red-300">
            <div>Unable to load patient records for this facility right now.</div>
            {patientError ? (
              <div className="text-xs text-red-500/90 dark:text-red-300/90">
                {patientError.status === 403
                  ? `Access denied: ${patientError.message}`
                  : patientError.status === 401
                    ? "Your session is no longer authorized for this request."
                    : `${patientError.status || "Request"}: ${patientError.message}`}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {!patientsQuery.isLoading && !patientsQuery.isError && patients.length === 0 ? (
        <EmptyState
          title="No patient records yet"
          description="Start by adding your first patient. This page already demonstrates the safe facility-scoped query pattern the full module should reuse."
          action={
            <Button variant="outline" disabled>
              Patient creation comes next
            </Button>
          }
        />
      ) : null}

      {!patientsQuery.isLoading && !patientsQuery.isError && patients.length > 0 ? (
        <motion.div className="grid gap-4" initial="hidden" animate="show" variants={staggerContainer}>
          {patients.map((patient) => (
            <motion.div key={patient.id} variants={slideUp}>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <UsersRound size={18} className="text-primary" />
                        {patient.name}
                      </CardTitle>
                      <CardDescription>
                        {patient.gender}
                        {patient.dob
                          ? ` · DOB ${new Date(patient.dob).toLocaleDateString()}`
                          : ""}
                      </CardDescription>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Added {new Date(patient.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-xl border border-border bg-background/80 px-4 py-3 text-sm">
                    <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                      Contact
                    </div>
                    <div className="mt-2 text-foreground">
                      {patient.phone || patient.email || "No contact details"}
                    </div>
                  </div>
                  <div className="rounded-xl border border-border bg-background/80 px-4 py-3 text-sm">
                    <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                      Address
                    </div>
                    <div className="mt-2 text-foreground">
                      {patient.address || "No address recorded"}
                    </div>
                  </div>
                  <div className="rounded-xl border border-border bg-background/80 px-4 py-3 text-sm">
                    <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                      Facility scope
                    </div>
                    <div className="mt-2 break-all text-foreground">
                      {patient.facilityId}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      ) : null}
    </div>
  );
}
