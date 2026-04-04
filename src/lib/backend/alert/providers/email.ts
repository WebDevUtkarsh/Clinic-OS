import { Resend } from "resend";
import type { AlertPayload } from "../types";

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function sendEmailAlert(alert: AlertPayload) {
  try {
    await resend.emails.send({
      from: "alerts@yourapp.com",
      to: "admin@tenant.com", // later dynamic
      subject: `🚨 ${alert.type}`,
      html: `
        <h3>${alert.type}</h3>
        <p>${alert.message}</p>
        <p>Severity: ${alert.severity}</p>
        <p>User: ${alert.userId}</p>
      `,
    });
  } catch (err) {
    console.error("Email alert failed:", err);
  }
}