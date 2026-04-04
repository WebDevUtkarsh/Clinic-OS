import jwt, { JwtPayload } from "jsonwebtoken";

export type AuthTokenPayload = {
  userId: string;
  activeTenantId: string;
};

const TOKEN_EXPIRES_IN = "7d";
const ISSUER = "tenorix";
const AUDIENCE = "tenorix-users";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not set");
  }
  return secret;
}

export function signAuthToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: TOKEN_EXPIRES_IN,
    issuer: ISSUER,
    audience: AUDIENCE,
  });
}

export function verifyAuthToken(token: string): AuthTokenPayload {
  const decoded = jwt.verify(token, getJwtSecret(), {
    issuer: ISSUER,
    audience: AUDIENCE,
  });

  if (typeof decoded === "string") {
    throw new Error("Invalid token payload");
  }

  return validatePayload(decoded);
}

function validatePayload(decoded: JwtPayload): AuthTokenPayload {
  if (typeof decoded.userId !== "string") {
    throw new Error("Invalid token structure");
  }

  const activeTenantId =
    typeof decoded.activeTenantId === "string"
      ? decoded.activeTenantId
      : typeof decoded.tenantId === "string"
        ? decoded.tenantId
        : null;

  if (!activeTenantId) {
    throw new Error("Invalid token structure");
  }

  return {
    userId: decoded.userId,
    activeTenantId,
  };
}
