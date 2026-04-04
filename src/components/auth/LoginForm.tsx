"use client";

import { useMemo, useState } from "react";
import { ArrowRight, LockKeyhole, Mail } from "lucide-react";
import {
  useRouter,
  useSearchParams,
  type ReadonlyURLSearchParams,
} from "next/navigation";
import { ApiClientError } from "@/lib/api/client";
import { loginWithPassword } from "@/features/auth/api";
import {
  resolvePostAuthRoute,
  type LoginTenantOption,
} from "@/features/auth/types";
import { AuthCard, AuthBadge, AuthDivider } from "@/components/auth/AuthCard";
import { AuthField } from "@/components/auth/AuthField";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { DoctorInviteForm } from "@/components/auth/DoctorInviteForm";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { OnboardingWizard } from "@/components/auth/OnboardingWizard";
import {
  validateEmail,
  validatePassword,
} from "@/components/auth/auth-validation";

type ActiveFlow =
  | "login"
  | "doctorInvite"
  | "staff"
  | "forgotPassword"
  | "onboarding";

function createInitialFlow(searchParams: ReadonlyURLSearchParams): ActiveFlow {
  if (searchParams.get("token")) {
    return "doctorInvite";
  }

  if (searchParams.get("role") === "staff") {
    return "staff";
  }

  return "login";
}

type LoginPanelProps = {
  mode: "login" | "staff";
  email: string;
  password: string;
  emailError: string;
  passwordError: string;
  isSubmitting: boolean;
  submitError: string;
  bannerMessage: string;
  tenantOptions: LoginTenantOption[];
  shake: boolean;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onEmailBlur: () => void;
  onPasswordBlur: () => void;
  onForgotPassword: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onCreateTenant: () => void;
  onOpenDoctorInvite: () => void;
};

function TenantList({ tenants }: { tenants: LoginTenantOption[] }) {
  if (!tenants.length) {
    return null;
  }

  return (
    <div className="space-y-3 rounded-xl border border-badge-border bg-badge px-4 py-4">
      <div className="text-sm font-medium text-foreground">Accessible tenants</div>
      <div className="space-y-2">
        {tenants.map((tenant) => (
          <div
            key={tenant.tenantId}
            className="rounded-xl border border-border bg-card px-3 py-3 text-sm"
          >
            <div className="font-medium text-foreground">{tenant.name}</div>
            <div className="mt-1 text-text-secondary">
              {tenant.role} | {tenant.slug} | {tenant.status}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LoginPanel({
  mode,
  email,
  password,
  emailError,
  passwordError,
  isSubmitting,
  submitError,
  bannerMessage,
  tenantOptions,
  shake,
  onEmailChange,
  onPasswordChange,
  onEmailBlur,
  onPasswordBlur,
  onForgotPassword,
  onSubmit,
  onCreateTenant,
  onOpenDoctorInvite,
}: LoginPanelProps) {
  const isStaff = mode === "staff";
  const badgeLabel = isStaff ? "Staff access" : "Clinical identity";
  const title = isStaff ? "Staff sign in" : "Sign in to continue";
  const description = isStaff
    ? "Front desk and clinic staff login portal."
    : "Your route is chosen from backend onboarding flags and your first accessible facility.";
  const buttonLabel = isStaff ? "Sign in to facility" : "Continue to workspace";

  return (
    <div className={shake ? "animate-shake" : ""}>
      <AuthCard
        badge={<AuthBadge>{badgeLabel}</AuthBadge>}
        topRight={
          !isStaff ? (
            <button
              type="button"
              onClick={onCreateTenant}
              className="text-sm font-medium text-primary transition-colors hover:underline"
            >
              Register &rarr;
            </button>
          ) : undefined
        }
        title={title}
        description={description}
      >
        {bannerMessage ? (
          <div className="rounded-xl border border-success/20 bg-success/10 px-4 py-3 text-sm text-success">
            {bannerMessage}
          </div>
        ) : null}

        {submitError ? (
          <div className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
            {submitError}
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="space-y-5">
          <AuthField
            id={`${mode}-email`}
            label="Work email"
            value={email}
            onChange={onEmailChange}
            onBlur={onEmailBlur}
            placeholder="owner@clinic.example"
            type="email"
            autoComplete="email"
            icon={Mail}
            error={emailError}
          />

          <div className="space-y-2">
            <AuthField
              id={`${mode}-password`}
              label="Password"
              value={password}
              onChange={onPasswordChange}
              onBlur={onPasswordBlur}
              placeholder="Enter your password"
              type="password"
              autoComplete="current-password"
              icon={LockKeyhole}
              revealable
              error={passwordError}
            />
            {!isStaff ? (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={onForgotPassword}
                  className="text-sm font-medium text-primary transition-colors hover:underline"
                >
                  Forgot password?
                </button>
              </div>
            ) : null}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-[15px] font-semibold text-primary-foreground transition-all duration-200 ease-out hover:bg-primary-hover disabled:opacity-60"
          >
            {isSubmitting ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <>
                {buttonLabel}
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {!isStaff ? (
          <>
            <AuthDivider label="or continue with" />
            <div className="space-y-3 text-center">
              <button
                type="button"
                onClick={onOpenDoctorInvite}
                className="text-sm text-text-secondary transition-colors hover:text-primary"
              >
                Invited as a doctor? Accept your invite &rarr;
              </button>
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-border bg-background px-4 py-3 text-xs leading-5 text-text-muted">
            Secure notice: Access is scoped to your assigned facility only.
          </div>
        )}

        <TenantList tenants={tenantOptions} />
      </AuthCard>
    </div>
  );
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeFlow, setActiveFlow] = useState<ActiveFlow>(() =>
    createInitialFlow(searchParams),
  );
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tenantOptions, setTenantOptions] = useState<LoginTenantOption[]>([]);
  const [shake, setShake] = useState(false);
  const [localBanner, setLocalBanner] = useState("");

  const bannerMessage = useMemo(() => {
    if (localBanner) {
      return localBanner;
    }

    if (searchParams.get("registered") === "1") {
      return "Tenant provisioning completed. Sign in to continue into onboarding.";
    }

    return "";
  }, [localBanner, searchParams]);

  const triggerErrorState = () => {
    setShake(true);
    window.setTimeout(() => setShake(false), 320);
  };

  const resetLoginFeedback = () => {
    setSubmitError("");
    setTenantOptions([]);
    setLocalBanner("");
  };

  const validateLogin = () => {
    const nextEmailError = validateEmail(email);
    const nextPasswordError = validatePassword(password);

    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);

    return !nextEmailError && !nextPasswordError;
  };

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetLoginFeedback();

    if (!validateLogin()) {
      setSubmitError("Review the highlighted fields before continuing.");
      triggerErrorState();
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await loginWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if ("requiresTenantSelection" in result) {
        setSubmitError(
          "Multiple tenants are available for this account. Tenant selection is not exposed in this flow yet.",
        );
        setTenantOptions(result.tenants);
        triggerErrorState();
        return;
      }

      router.replace(resolvePostAuthRoute(result));
    } catch (error) {
      if (error instanceof ApiClientError) {
        if (error.status === 401) {
          setSubmitError("Invalid email or password.");
        } else if (error.status === 429) {
          setSubmitError(error.message || "Too many sign-in attempts.");
        } else {
          setSubmitError(error.message || "Unable to start the secure session.");
        }
      } else {
        setSubmitError("Unable to start the secure session.");
      }

      triggerErrorState();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (activeFlow === "onboarding") {
    return (
      <AuthLayout fullWidth>
        <OnboardingWizard onBackToLogin={() => setActiveFlow("login")} />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      {activeFlow === "forgotPassword" ? (
        <ForgotPasswordForm
          initialEmail={email}
          onBack={() => setActiveFlow(searchParams.get("role") === "staff" ? "staff" : "login")}
        />
      ) : null}

      {activeFlow === "doctorInvite" ? (
        <DoctorInviteForm
          initialToken={searchParams.get("token") ?? ""}
          clinicName={searchParams.get("clinic") ?? "Downtown Clinic"}
          invitedBy={searchParams.get("invitedBy") ?? "Dr. Sarah Chen"}
          onBack={() => setActiveFlow("login")}
          onActivated={(message) => {
            setLocalBanner(message);
            setPassword("");
            setSubmitError("");
            setActiveFlow("login");
          }}
        />
      ) : null}

      {activeFlow === "login" || activeFlow === "staff" ? (
        <LoginPanel
          mode={activeFlow}
          email={email}
          password={password}
          emailError={emailError}
          passwordError={passwordError}
          isSubmitting={isSubmitting}
          submitError={submitError}
          bannerMessage={bannerMessage}
          tenantOptions={tenantOptions}
          shake={shake}
          onEmailChange={(value) => {
            setEmail(value);
            setEmailError("");
          }}
          onPasswordChange={(value) => {
            setPassword(value);
            setPasswordError("");
          }}
          onEmailBlur={() => setEmailError(validateEmail(email))}
          onPasswordBlur={() => setPasswordError(validatePassword(password))}
          onForgotPassword={() => setActiveFlow("forgotPassword")}
          onSubmit={handleLogin}
          onCreateTenant={() => setActiveFlow("onboarding")}
          onOpenDoctorInvite={() => setActiveFlow("doctorInvite")}
        />
      ) : null}
    </AuthLayout>
  );
}
