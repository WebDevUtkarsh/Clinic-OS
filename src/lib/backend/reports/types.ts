export type RevenueSummaryReport = {
  totalRevenue: number;
  netRevenue: number;
  tax: number;
  discount: number;
  refunds: number;
  writeOff: number;
};

export type FinancialTrendPoint = {
  date: string;
  totalRevenue: number;
  netRevenue: number;
  tax: number;
  discount: number;
  refunds: number;
  writeOff: number;
};

export type DoctorEarningsReportItem = {
  doctorId: string;
  firstName: string | null;
  lastName: string | null;
  totalRevenue: number;
  netRevenue: number;
  totalAppointments: number;
};

export type PaymentMethodReport = {
  cash: number;
  card: number;
  upi: number;
  others: number;
};

export type OutstandingDuesReport = {
  totalPendingAmount: number;
};

export type ReportDateRange = {
  from: string;
  to: string;
  startUtc: Date;
  endUtc: Date;
  dateKeys: string[];
};

export type ReportScope = {
  tenantId: string;
  facilityId: string | null;
  facilityIds: string[];
  organizationId: string | null;
  isSuperAdmin: boolean;
};
