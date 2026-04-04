import axios from "axios";

const webhook = process.env.SLACK_WEBHOOK_URL!;

export async function sendSlackAlert(payload: {
  tenantId: string;
  userId: string;
  type: string;
  severity: string;
  message: string;
}) {
  if (!webhook) return;

  const color =
    payload.severity === "CRITICAL"
      ? "#ff0000"
      : payload.severity === "HIGH"
      ? "#ff9900"
      : "#36a64f";

  await axios.post(webhook, {
    attachments: [
      {
        color,
        title: `🚨 ${payload.type}`,
        fields: [
          { title: "Tenant", value: payload.tenantId, short: true },
          { title: "User", value: payload.userId, short: true },
          { title: "Severity", value: payload.severity, short: true },
        ],
        text: payload.message,
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  });
}