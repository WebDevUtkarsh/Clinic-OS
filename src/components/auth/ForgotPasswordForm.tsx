"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Mail } from "lucide-react";
import { AuthBadge, AuthCard } from "@/components/auth/AuthCard";
import { AuthField } from "@/components/auth/AuthField";
import { validateEmail } from "@/components/auth/auth-validation";

type ForgotPasswordFormProps = {
  initialEmail?: string;
  onBack: () => void;
};

export function ForgotPasswordForm({
  initialEmail = "",
  onBack,
}: ForgotPasswordFormProps) {
  const [email, setEmail] = useState(initialEmail);
  const [emailError, setEmailError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (!submitted || countdown === 0) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setCountdown((current) => current - 1);
    }, 1000);

    return () => window.clearTimeout(timeout);
  }, [countdown, submitted]);

  const resendReady = submitted && countdown === 0;
  const headline = useMemo(
    () => email.trim().toLowerCase() || "owner@clinic.example",
    [email],
  );

  const triggerErrorState = () => {
    setShake(true);
    window.setTimeout(() => setShake(false), 320);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextError = validateEmail(email);
    setEmailError(nextError);

    if (nextError) {
      setSubmitError(nextError);
      triggerErrorState();
      return;
    }

    setSubmitError("");
    setIsSubmitting(true);

    await new Promise((resolve) => window.setTimeout(resolve, 700));

    setIsSubmitting(false);
    setSubmitted(true);
    setCountdown(60);
  };

  if (submitted) {
    return (
      <div className="animate-auth-flow">
        <AuthCard
          badge={<AuthBadge>Account recovery</AuthBadge>}
          topRight={
            <button
              type="button"
              onClick={onBack}
              className="text-sm font-medium text-primary transition-colors hover:underline"
            >
              &larr; Back to login
            </button>
          }
          title="Check your inbox"
          description={`We sent a reset link to ${headline}.`}
          bodyClassName="text-center"
        >
          <div className="space-y-5">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-success animate-auth-check">
              <CheckCircle2 size={30} />
            </div>
            <p className="text-sm leading-6 text-text-secondary">
              Use the secure link in your email to choose a new password.
            </p>
            <button
              type="button"
              disabled={!resendReady}
              onClick={() => setCountdown(60)}
              className="text-sm font-medium text-primary transition-colors disabled:cursor-not-allowed disabled:text-text-muted"
            >
              {resendReady ? "Resend reset link" : `Resend in ${countdown}s`}
            </button>
            <button
              type="button"
              onClick={onBack}
              className="text-sm font-medium text-primary transition-colors hover:underline"
            >
              &larr; Back to login
            </button>
          </div>
        </AuthCard>
      </div>
    );
  }

  return (
    <div className={shake ? "animate-shake" : ""}>
      <AuthCard
        badge={<AuthBadge>Account recovery</AuthBadge>}
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
        title="Reset your password"
        description="Enter your work email and we'll send you a secure reset link."
      >
        {submitError ? (
          <div className="rounded-xl border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-danger">
            {submitError}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-5">
          <AuthField
            id="recovery-email"
            label="Work email"
            value={email}
            onChange={setEmail}
            onBlur={() => setEmailError(validateEmail(email))}
            placeholder="owner@clinic.example"
            type="email"
            autoComplete="email"
            icon={Mail}
            error={emailError}
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
                Send reset link
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>
      </AuthCard>
    </div>
  );
}
