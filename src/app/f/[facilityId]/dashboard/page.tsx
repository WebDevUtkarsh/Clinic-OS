"use client";

import { Building2, TrendingDown, TrendingUp, Users, CalendarDays, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useSession } from "@/features/auth/components/SessionProvider";
import { useFacility } from "@/features/auth/components/FacilityProvider";
import { Can } from "@/hooks/use-can";

export default function DashboardPage() {
  const { session } = useSession();
  const { facilityId } = useFacility();

  const metrics = [
    {
      label: "Total Patients",
      value: "2,481",
      change: "+12.5%",
      trend: "up",
      icon: Users,
    },
    {
      label: "Daily Appointments",
      value: "164",
      change: "+4.2%",
      trend: "up",
      icon: CalendarDays,
    },
    {
      label: "Critical Anomalies",
      value: "3",
      change: "-1.5%",
      trend: "down",
      icon: Activity,
    },
  ];

  const recentActivity = [
    { id: 1, text: "Dr. Chen admitted patient #89021", time: "2m ago" },
    { id: 2, text: "System sync completed successfully", time: "15m ago" },
    { id: 3, text: "Lab results uploaded for Room 4", time: "1h ago" },
  ];

  return (
    <div className="space-y-6 animate-auth-flow">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Facility Overview
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Real-time metrics for Facility {facilityId?.substring(0, 8)}
          </p>
        </div>
        <Can permission="facilities:manage">
           <Button variant="outline" className="gap-2">
            <Building2 size={16} />
            Facility Settings
          </Button>
        </Can>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {metrics.map((metric) => (
          <Card key={metric.label} className="animate-dashboard-fade-up">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-text-secondary">
                {metric.label}
              </CardTitle>
              <metric.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{metric.value}</div>
              <p className={`text-xs mt-1 flex items-center gap-1 ${metric.trend === 'up' ? 'text-success' : 'text-danger'}`}>
                {metric.trend === 'up' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {metric.change} from last month
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4 animate-dashboard-fade-up border dark:border-white/6">
          <CardHeader>
            <CardTitle>Inbound Patient Volume</CardTitle>
            <CardDescription>Metrics spanning the last 30 days locally.</CardDescription>
          </CardHeader>
          <CardContent className="h-75 flex items-center justify-center bg-muted/20 m-6 rounded-lg border border-dashed border-border/50">
            <p className="text-sm text-muted-foreground">Chart Implementation Placeholder</p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 animate-dashboard-fade-up border dark:border-white/6">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Audit trail for this facility.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-4">
                  <div className="mt-1 flex h-2 w-2 rounded-full bg-primary" />
                  <div className="space-y-1">
                    <p className="text-sm leading-none text-foreground">{activity.text}</p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
