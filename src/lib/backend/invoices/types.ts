import type {
  BillingItemTypeValue,
  BillingStatusValue,
  PaymentMethodValue,
  PaymentStatusValue,
} from "@/lib/backend/billing/types";

export type InvoiceSnapshotItem = {
  id: string;
  type: BillingItemTypeValue;
  name: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
  metadata: Record<string, unknown> | null;
};

export type InvoiceSnapshotPayment = {
  id: string;
  amount: string;
  method: PaymentMethodValue;
  referenceId: string | null;
  status: PaymentStatusValue;
  createdAt: string;
};

export type InvoiceTaxSummary = {
  label: string;
  amount: string;
  rate: string | null;
  cgstAmount: string | null;
  sgstAmount: string | null;
};

export type InvoiceSnapshot = {
  invoiceId: string;
  invoiceNumber: string;
  generatedAt: string;
  billing: {
    id: string;
    status: BillingStatusValue;
    appointmentId: string | null;
    createdAt: string;
  };
  patient: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
  };
  doctor: {
    id: string;
    fullName: string;
    specialization: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  facility: {
    id: string;
    code: string;
    name: string;
    type: string;
    address: string | null;
    organizationId: string;
    gstNumber: string | null;
  };
  items: InvoiceSnapshotItem[];
  payments: InvoiceSnapshotPayment[];
  totals: {
    subtotal: string;
    discount: string;
    tax: string;
    total: string;
    paid: string;
    refund: string;
    writeOff: string;
    due: string;
  };
  taxSummary: InvoiceTaxSummary[];
  metadata: {
    tenantId: string;
    facilityId: string;
    organizationId: string;
    generatedBy: string;
    terms: string[];
    gstNote: string;
  };
};

export type InvoiceResponse = {
  id: string;
  billingId: string;
  facilityId: string;
  invoiceNumber: string;
  createdAt: string;
  snapshot: InvoiceSnapshot;
};
