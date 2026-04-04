"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  LockKeyhole,
  ShieldCheck,
  Ticket,
  UserRound,
} from "lucide-react";
import { ApiClientError, apiRequest } from "@/lib/api/client";
import { AuthBadge, AuthCard } from "@/components/auth/AuthCard";
import { AuthField } from "@/components/auth/AuthField";
import {
  passwordStrengthSegments,
  validateConfirmPassword,
  validatePassword,
  validateRequired,
} from "@/components/auth/auth-validation";

type DoctorInviteFormProps = {
  initialToken?: string;
  clinicName?: string;
  invitedBy?: string;
  onBack: () => void;
  onActivated: (message: string) => void;
};

const strengthStyles = [
  "bg-danger",
  "bg-orange-400",
  "bg-yellow-400",
  "bg-success",
];

export function DoctorInviteForm({
  initialToken = "",
  clinicName = "Downtown Clinic",
  invitedBy = "Dr. Sarah Chen",
  onBack,
  onActivated,
}: DoctorInviteFormProps) {
  const [token, setToken] = useState(initialToken);
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shake, setShake] = useState(false);
  const segments = passwordStrengthSegments(password);

  const inviteSummary = useMemo(
    () => `${invitedBy} | ${clinicName}`,
    [clinicName, invitedBy],
  );

  const setFieldError = (field: string, value: string) => {
    setErrors((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const triggerErrorState = () => {
    setShake(true);
    window.setTimeout(() => setShake(false), 320);
  };

  const validateForm = () => {
    const nextErrors = {
      token: validateRequired(token, "Invite token"),
      fullName: validateRequired(fullName, "Full name"),
      password: validatePassword(password, "New password"),
      confirmPassword: validateConfirmPassword(password, confirmPassword),
    };

    setErrors(nextErrors);
    return Object.values(nextErrors).every((value) => !value);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validateForm()) {
      setSubmitError("Review the highlighted fields before continuing.");
      triggerErrorState();
      return;
    }

    setSubmitError("");
    setIsSubmitting(true);

    try {
      await apiRequest("/api/invites/accept", {
        method: "POST",
        body: {
          token: token.trim(),
          password,
        },
      });

      onActivated("Invitation accepted. Sign in to continue.");
    } catch (error) {
      if (error instanceof ApiClientError) {
        setSubmitError(error.message || "Unable to activate this invite.");
      } else {
        setSubmitError("Unable to activate this invite.");
      }

      triggerErrorState();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={shake ? "animate-shake" : ""}>
      <AuthCard
        badge={<AuthBadge>Doctor invite</AuthBadge>}
        topRight={
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 text-sm font-medium text-primary transition-colors hover:underline"
          >
            <ArrowLeft size={14} />
            Back to login
          </button>
        }
        title="Accept your invitation"
        description={
          <>
            You&apos;ve been invited to join {clinicName}. Set up your account to get
            started.
          </>
        }
      >
        <div className="rounded-xl bg-primary/8 px-4 py-3 text-sm text-badge-foreground">
          Invite details: {inviteSummary}
        </div>

        {submitError ? (
          <div className="rounded-xl border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-danger">
            {submitError}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-5">
          <AuthField
            id="invite-token"
            label="Invite token / code"
            value={token}
            onChange={setToken}
            onBlur={() => setFieldError("token", validateRequired(token, "Invite token"))}
            placeholder="tenantid.your-secure-token"
            icon={Ticket}
            error={errors.token}
          />

          <AuthField
            id="invite-name"
            label="Full name"
            value={fullName}
            onChange={setFullName}
            onBlur={() => setFieldError("fullName", validateRequired(fullName, "Full name"))}
            placeholder="Dr. Alex Morgan"
            icon={UserRound}
            error={errors.fullName}
          />

          <div className="space-y-3">
            <AuthField
              id="invite-password"
              label="New password"
              value={password}
              onChange={setPassword}
              onBlur={() => setFieldError("password", validatePassword(password, "New password"))}
              placeholder="Create a secure password"
              type="password"
              autoComplete="new-password"
              icon={LockKeyhole}
              revealable
              error={errors.password}
            />
            <div className="space-y-2">
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className={`h-1.5 rounded-full ${
                      index < segments ? strengthStyles[Math.max(segments - 1, 0)] : "bg-border"
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs text-text-muted">
                Use 8+ characters with upper/lowercase, a number, and a symbol.
              </p>
            </div>
          </div>

          <AuthField
            id="invite-confirm-password"
            label="Confirm password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            onBlur={() =>
              setFieldError(
                "confirmPassword",
                validateConfirmPassword(password, confirmPassword),
              )
            }
            placeholder="Repeat your password"
            type="password"
            autoComplete="new-password"
            icon={ShieldCheck}
            revealable
            error={errors.confirmPassword}
          />

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-[15px] font-semibold text-primary-foreground transition-all duration-200 ease-out hover:bg-primary-hover disabled:opacity-60"
          >
            {isSubmitting ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <>
                Activate my account
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-sm text-text-secondary">
          Already have an account?{" "}
          <button
            type="button"
            onClick={onBack}
            className="font-medium text-primary transition-colors hover:underline"
          >
            Sign in
          </button>
        </p>
      </AuthCard>
    </div>
  );
}
