export type BillingStatusValue =
  | "DRAFT"
  | "GENERATED"
  | "PARTIALLY_PAID"
  | "PAID"
  | "CANCELLED";

export type BillingItemTypeValue =
  | "CONSULTATION"
  | "TREATMENT"
  | "LAB"
  | "MEDICATION"
  | "PACKAGE"
  | "OTHER";

export type LedgerTypeValue =
  | "CHARGE"
  | "PAYMENT"
  | "REFUND"
  | "DISCOUNT"
  | "TAX"
  | "WRITE_OFF";

export type PaymentMethodValue = "CASH" | "CARD" | "UPI" | "ONLINE";
export type PaymentStatusValue = "SUCCESS" | "FAILED" | "REFUNDED";

export type BillingTotalsResponse = {
  subtotal: number;
  discount: number;
  tax: number;
  paid: number;
  refund: number;
  writeOff: number;
  total: number;
  due: number;
};

export type BillingItemResponse = {
  id: string;
  type: BillingItemTypeValue;
  name: string;
  quantity: number;
  unitPrice: number;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

export type LedgerEntryResponse = {
  id: string;
  type: LedgerTypeValue;
  amount: number;
  referenceType: string;
  referenceId: string | null;
  metadata: Record<string, unknown> | null;
  createdBy: string;
  createdAt: string;
};

export type PaymentResponse = {
  id: string;
  amount: number;
  method: PaymentMethodValue;
  referenceId: string | null;
  idempotencyKey: string | null;
  status: PaymentStatusValue;
  createdAt: string;
};

export type BillingListItemResponse = {
  id: string;
  patientId: string;
  doctorId: string | null;
  facilityId: string;
  appointmentId: string | null;
  status: BillingStatusValue;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  patient: {
    id: string;
    name: string;
    isDeleted: boolean;
  };
  doctor: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  appointment: {
    id: string;
    startTime: string;
    status: string;
  } | null;
  totals: BillingTotalsResponse;
};

export type BillingResponse = BillingListItemResponse & {
  items: BillingItemResponse[];
  payments: PaymentResponse[];
  ledgerEntries: LedgerEntryResponse[];
};
