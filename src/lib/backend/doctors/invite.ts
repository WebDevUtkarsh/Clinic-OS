import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { Resend } from "resend";

const INVITE_SECRET_BYTES = 32;
const INVITE_EXPIRY_HOURS = 24;
const TOKEN_PATTERN = /^[a-z0-9]+\.[a-f0-9]{64}$/;

type InviteTokenParts = {
  tenantId: string;
  secret: string;
};

type GenerateInviteTokenResult = {
  publicToken: string;
  tokenHash: string;
  expiresAt: Date;
};

type DoctorInviteEmailInput = {
  to: string;
  doctorName: string;
  organizationName: string;
  acceptToken: string;
  expiresAt: Date;
};

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export function generateDoctorInviteToken(tenantId: string): GenerateInviteTokenResult {
  const secret = randomBytes(INVITE_SECRET_BYTES).toString("hex");
  const publicToken = `${tenantId}.${secret}`;

  return {
    publicToken,
    tokenHash: hashInviteToken(publicToken),
    expiresAt: new Date(Date.now() + INVITE_EXPIRY_HOURS * 60 * 60 * 1000),
  };
}

export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function parseInviteToken(token: string): InviteTokenParts | null {
  const normalized = token.trim();
  if (!TOKEN_PATTERN.test(normalized)) {
    return null;
  }

  const [tenantId, secret] = normalized.split(".", 2);
  if (!tenantId || !secret) {
    return null;
  }

  return { tenantId, secret };
}

export function compareInviteHashes(
  expectedHash: string,
  actualHash: string,
): boolean {
  try {
    const expectedBuffer = Buffer.from(expectedHash, "hex");
    const actualBuffer = Buffer.from(actualHash, "hex");

    if (expectedBuffer.length !== actualBuffer.length) {
      return false;
    }

    return timingSafeEqual(expectedBuffer, actualBuffer);
  } catch {
    return false;
  }
}

export async function sendDoctorInviteEmail(
  input: DoctorInviteEmailInput,
): Promise<void> {
  if (!resend) {
    throw new Error("RESEND_API_KEY_MISSING");
  }

  const from = process.env.RESEND_FROM_EMAIL ?? process.env.RESEND_FROM;
  if (!from) {
    throw new Error("RESEND_FROM_EMAIL_MISSING");
  }

  const acceptUrl = buildInviteAcceptUrl(input.acceptToken);
  const html = buildDoctorInviteEmailHtml({
    doctorName: input.doctorName,
    organizationName: input.organizationName,
    acceptUrl,
    expiresAt: input.expiresAt,
  });

  const result = await resend.emails.send({
    from,
    to: input.to,
    subject: "You're invited to join ClinicOS",
    html,
  });

  if (result.error) {
    throw new Error(result.error.message);
  }
}

function buildInviteAcceptUrl(token: string): string {
  const baseUrl =
    process.env.APP_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000";

  const normalizedBaseUrl = baseUrl.endsWith("/")
    ? baseUrl.slice(0, -1)
    : baseUrl;

  return `${normalizedBaseUrl}/invite/accept?token=${encodeURIComponent(token)}`;
}

function buildDoctorInviteEmailHtml(input: {
  doctorName: string;
  organizationName: string;
  acceptUrl: string;
  expiresAt: Date;
}): string {
  const doctorName = escapeHtml(input.doctorName);
  const organizationName = escapeHtml(input.organizationName);
  const acceptUrl = escapeHtml(input.acceptUrl);
  const expiresLabel = escapeHtml(input.expiresAt.toUTCString());

  return `
  <div style="margin:0;padding:32px 16px;background:#f4f7fb;font-family:Arial,sans-serif;color:#10243e;">
    <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 16px 40px rgba(16,36,62,0.12);">
      <div style="padding:40px 40px 24px;background:linear-gradient(135deg,#0b5fff,#0f9d8a);color:#ffffff;">
        <div style="font-size:12px;letter-spacing:0.12em;text-transform:uppercase;opacity:0.88;">ClinicOS</div>
        <h1 style="margin:16px 0 12px;font-size:30px;line-height:1.2;font-weight:700;">You're invited to join</h1>
        <p style="margin:0;font-size:16px;line-height:1.6;opacity:0.94;">${doctorName}, you have been invited to access ${organizationName} on ClinicOS.</p>
      </div>
      <div style="padding:32px 40px 40px;">
        <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#36506f;">
          Complete your account setup to access your assigned facilities, collaborate securely with your team, and start using ClinicOS.
        </p>
        <div style="margin:32px 0;">
          <a href="${acceptUrl}" style="display:inline-block;padding:14px 24px;border-radius:999px;background:#0b5fff;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;">
            Accept invitation
          </a>
        </div>
        <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#5f7692;">If the button does not work, use this link:</p>
        <p style="margin:0 0 24px;font-size:13px;line-height:1.8;word-break:break-all;">
          <a href="${acceptUrl}" style="color:#0b5fff;text-decoration:none;">${acceptUrl}</a>
        </p>
        <div style="padding:16px 18px;border-radius:14px;background:#eef4ff;font-size:13px;line-height:1.7;color:#36506f;">
          This invitation expires on ${expiresLabel} and can only be used once.
        </div>
      </div>
    </div>
  </div>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
