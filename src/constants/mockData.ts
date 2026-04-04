type SparkPoint = {
  value: number;
};

export type DashboardStat = {
  key: "revenue" | "appointments" | "patients" | "billing";
  label: string;
  value: string;
  change: string;
  comparison: string;
  tone: "emerald" | "violet" | "red";
  sparkline: SparkPoint[];
};

export type AppointmentBreakdownItem = {
  label: "Completed" | "Upcoming" | "Cancelled";
  value: number;
  color: string;
  tone: "emerald" | "blue" | "red";
};

export const revenueSeries: Array<{ day: string; revenue: number }> = [
  { day: "1", revenue: 8200 },
  { day: "2", revenue: 9100 },
  { day: "3", revenue: 8600 },
  { day: "4", revenue: 9800 },
  { day: "5", revenue: 10300 },
  { day: "6", revenue: 9700 },
  { day: "7", revenue: 11200 },
  { day: "8", revenue: 10900 },
  { day: "9", revenue: 11800 },
  { day: "10", revenue: 12400 },
  { day: "11", revenue: 12100 },
  { day: "12", revenue: 12900 },
  { day: "13", revenue: 13200 },
  { day: "14", revenue: 12800 },
  { day: "15", revenue: 13600 },
  { day: "16", revenue: 14100 },
  { day: "17", revenue: 13800 },
  { day: "18", revenue: 14500 },
  { day: "19", revenue: 14900 },
  { day: "20", revenue: 14300 },
  { day: "21", revenue: 15100 },
  { day: "22", revenue: 15500 },
  { day: "23", revenue: 14800 },
  { day: "24", revenue: 15800 },
  { day: "25", revenue: 16100 },
  { day: "26", revenue: 15400 },
  { day: "27", revenue: 16600 },
  { day: "28", revenue: 15900 },
  { day: "29", revenue: 16800 },
  { day: "30", revenue: 17200 },
] ;

export const dashboardStats: DashboardStat[] = [
  {
    key: "revenue",
    label: "TOTAL REVENUE TODAY",
    value: "$12,450",
    change: "+18.2%",
    comparison: "vs yesterday",
    tone: "emerald",
    sparkline: [
      { value: 20 },
      { value: 28 },
      { value: 24 },
      { value: 31 },
      { value: 35 },
      { value: 41 },
      { value: 46 },
    ],
  },
  {
    key: "appointments",
    label: "APPOINTMENTS TODAY",
    value: "24 / 30",
    change: "+5.4%",
    comparison: "booked / slots",
    tone: "emerald",
    sparkline: [
      { value: 12 },
      { value: 14 },
      { value: 16 },
      { value: 18 },
      { value: 21 },
      { value: 23 },
      { value: 24 },
    ],
  },
  {
    key: "patients",
    label: "ACTIVE PATIENTS",
    value: "1,284",
    change: "+3.1%",
    comparison: "this month",
    tone: "violet",
    sparkline: [
      { value: 1120 },
      { value: 1152 },
      { value: 1170 },
      { value: 1194 },
      { value: 1210 },
      { value: 1258 },
      { value: 1284 },
    ],
  },
  {
    key: "billing",
    label: "PENDING BILLS",
    value: "17",
    change: "-8.3%",
    comparison: "overdue: 4",
    tone: "red",
    sparkline: [
      { value: 31 },
      { value: 29 },
      { value: 28 },
      { value: 25 },
      { value: 22 },
      { value: 19 },
      { value: 17 },
    ],
  },
];

export const appointmentBreakdown: AppointmentBreakdownItem[] = [
  {
    label: "Completed",
    value: 14,
    color: "var(--color-success)",
    tone: "emerald",
  },
  {
    label: "Upcoming",
    value: 7,
    color: "var(--color-primary)",
    tone: "blue",
  },
  {
    label: "Cancelled",
    value: 3,
    color: "var(--color-danger)",
    tone: "red",
  },
];

export const todaysAppointments: Array<{
  time: string;
  patient: string;
  doctor: string;
  status: "Completed" | "In Progress" | "Upcoming" | "Cancelled";
}> = [
  {
    time: "9:00 AM",
    patient: "John Doe",
    doctor: "Dr. Sarah Chen",
    status: "Completed",
  },
  {
    time: "9:30 AM",
    patient: "Maria Garcia",
    doctor: "Dr. Raj Patel",
    status: "Completed",
  },
  {
    time: "10:00 AM",
    patient: "Alex Kim",
    doctor: "Dr. Sarah Chen",
    status: "In Progress",
  },
  {
    time: "10:30 AM",
    patient: "Lisa Wang",
    doctor: "Dr. Emily Ross",
    status: "Upcoming",
  },
  {
    time: "11:00 AM",
    patient: "James Brown",
    doctor: "Dr. Raj Patel",
    status: "Upcoming",
  },
  {
    time: "11:30 AM",
    patient: "Sarah Lee",
    doctor: "Dr. Emily Ross",
    status: "Cancelled",
  },
];

export const dashboardAlerts: Array<{
  type: "Billing" | "Patient" | "Security" | "Medical";
  message: string;
  timeAgo: string;
  tone: "red" | "amber" | "blue";
}> = [
  {
    type: "Billing",
    message: "3 invoices overdue for more than 7 days",
    timeAgo: "2 min ago",
    tone: "red",
  },
  {
    type: "Patient",
    message: "Patient Maria Garcia was a no-show",
    timeAgo: "15 min ago",
    tone: "amber",
  },
  {
    type: "Security",
    message: "Unusual login attempt from new IP address",
    timeAgo: "32 min ago",
    tone: "red",
  },
  {
    type: "Medical",
    message: "Lab results pending review for 2 patients",
    timeAgo: "1 hr ago",
    tone: "blue",
  },
  {
    type: "Billing",
    message: "Insurance claim #4821 was rejected",
    timeAgo: "2 hr ago",
    tone: "red",
  },
];

export const insightCards: Array<{
  label: string;
  value: string;
  tone: "blue" | "emerald" | "amber";
}> = [
  {
    label: "Today's Appointments",
    value: "24",
    tone: "blue",
  },
  {
    label: "Average Wait Time",
    value: "12 min",
    tone: "emerald",
  },
  {
    label: "Pending Reviews",
    value: "5",
    tone: "amber",
  },
];
