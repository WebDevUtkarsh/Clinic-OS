"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  Stethoscope,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { ApiClientError } from "@/lib/api/client";
import {
  loginWithPassword,
  registerTenant,
} from "@/features/auth/api";
import { createFacility, createOrganization } from "@/features/facilities/api";
import { AuthField } from "@/components/auth/AuthField";
import {
  mapOrganizationTypeToFacilityType,
  validateConfirmPassword,
  validateEmail,
  validatePassword,
  validateRequired,
} from "@/components/auth/auth-validation";

type OnboardingWizardProps = {
  onBackToLogin: () => void;
};

const steps = [
  "Create your organization",
  "Add your first facility",
  "Invite your first doctor",
] as const;

const organizationTypes = [
  "Hospital",
  "Clinic",
  "Diagnostic Center",
  "Multi-specialty",
] as const;

type StepIndex = 1 | 2 | 3 | 4;

export function OnboardingWizard({ onBackToLogin }: OnboardingWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState<StepIndex>(1);
  const [organizationName, setOrganizationName] = useState("");
  const [organizationType, setOrganizationType] = useState<string>(
    organizationTypes[1],
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [facilityName, setFacilityName] = useState("");
  const [facilityAddress, setFacilityAddress] = useState("");
  const [city, setCity] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [doctorEmail, setDoctorEmail] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shake, setShake] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [organizationId, setOrganizationId] = useState("");
  const [facilityId, setFacilityId] = useState("");

  const ownerName = useMemo(
    () => organizationName.trim() || "Clinic Owner",
    [organizationName],
  );

  useEffect(() => {
    if (step !== 4 || !facilityId) {
      return;
    }

    const timeout = window.setTimeout(() => {
      router.replace(`/f/${facilityId}/dashboard?welcome=1`);
    }, 2500);

    return () => window.clearTimeout(timeout);
  }, [facilityId, router, step]);

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

  const validateStepOne = () => {
    const nextErrors = {
      organizationName: validateRequired(organizationName, "Organization name"),
      email: validateEmail(email),
      password: validatePassword(password),
      confirmPassword: validateConfirmPassword(password, confirmPassword),
    };

    setErrors((current) => ({
      ...current,
      ...nextErrors,
    }));

    return Object.values(nextErrors).every((value) => !value);
  };

  const validateStepTwo = () => {
    const nextErrors = {
      facilityName: validateRequired(facilityName, "Facility name"),
      facilityAddress: validateRequired(facilityAddress, "Facility address"),
      city: validateRequired(city, "City"),
      phoneNumber: validateRequired(phoneNumber, "Phone number"),
    };

    setErrors((current) => ({
      ...current,
      ...nextErrors,
    }));

    return Object.values(nextErrors).every((value) => !value);
  };

  const validateStepThree = () => {
    if (!doctorEmail && !specialization) {
      return true;
    }

    const nextErrors = {
      doctorEmail: validateEmail(doctorEmail),
      specialization: validateRequired(specialization, "Specialization"),
    };

    setErrors((current) => ({
      ...current,
      ...nextErrors,
    }));

    return Object.values(nextErrors).every((value) => !value);
  };

  const handleStepOne = async () => {
    if (sessionReady) {
      setSubmitError("");
      setStep(2);
      return;
    }

    if (!validateStepOne()) {
      setSubmitError("Review the highlighted fields before continuing.");
      triggerErrorState();
      return;
    }

    setSubmitError("");
    setIsSubmitting(true);

    try {
      await registerTenant({
        name: ownerName,
        email: email.trim().toLowerCase(),
        password,
        tenantName: organizationName.trim(),
      });

      const loginResult = await loginWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if ("requiresTenantSelection" in loginResult) {
        throw new Error("Tenant selection is not supported in this flow yet.");
      }

      setSessionReady(true);
      setStep(2);
    } catch (error) {
      if (error instanceof ApiClientError) {
        setSubmitError(error.message || "Unable to initialize your workspace.");
      } else if (error instanceof Error) {
        setSubmitError(error.message);
      } else {
        setSubmitError("Unable to initialize your workspace.");
      }

      triggerErrorState();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStepTwo = async () => {
    if (facilityId) {
      setSubmitError("");
      setStep(3);
      return;
    }

    if (!validateStepTwo()) {
      setSubmitError("Review the highlighted facility details before continuing.");
      triggerErrorState();
      return;
    }

    setSubmitError("");
    setIsSubmitting(true);

    try {
      const resolvedOrganizationId =
        organizationId ||
        (
          await createOrganization({
            name: organizationName.trim(),
          })
        ).id;

      if (!organizationId) {
        setOrganizationId(resolvedOrganizationId);
      }

      const facility = await createFacility({
        organizationId: resolvedOrganizationId,
        name: facilityName.trim(),
        type: mapOrganizationTypeToFacilityType(organizationType),
        address: `${facilityAddress.trim()}, ${city.trim()} | ${phoneNumber.trim()}`,
      });

      setFacilityId(facility.id);
      setStep(3);
    } catch (error) {
      if (error instanceof ApiClientError) {
        setSubmitError(error.message || "Unable to create the first facility.");
      } else {
        setSubmitError("Unable to create the first facility.");
      }

      triggerErrorState();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinish = async (skipInvite = false) => {
    if (!skipInvite && !validateStepThree()) {
      setSubmitError("Review the doctor details before finishing setup.");
      triggerErrorState();
      return;
    }

    setSubmitError("");
    setIsSubmitting(true);
    await new Promise((resolve) => window.setTimeout(resolve, 500));
    setIsSubmitting(false);
    setStep(4);
  };

  return (
    <div className={shake ? "animate-shake" : ""}>
      <div className="animate-auth-flow rounded-[28px] border border-border bg-card p-6 shadow-[0_32px_90px_-45px_rgba(15,23,42,0.65)] md:p-8">
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-badge-foreground">
                Clinic OS onboarding
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                {step === 4 ? `You're all set, ${ownerName}!` : "Create your workspace"}
              </h1>
            </div>
            <button
              type="button"
              onClick={onBackToLogin}
              className="text-sm font-medium text-primary transition-colors hover:underline"
            >
              Back to login
            </button>
          </div>

          {step !== 4 ? (
            <div className="grid gap-3 md:grid-cols-3">
              {steps.map((item, index) => {
                const stepNumber = index + 1;
                const isDone = stepNumber < step;
                const isActive = stepNumber === step;

                return (
                  <div
                    key={item}
                    className={`rounded-full border px-4 py-3 text-sm transition-colors ${
                      isDone
                        ? "border-success/30 bg-success/10 text-success"
                        : isActive
                          ? "border-primary/30 bg-primary/10 text-primary"
                          : "border-border bg-background text-text-secondary"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                          isDone
                            ? "bg-success text-white"
                            : isActive
                              ? "bg-primary text-white"
                              : "bg-muted text-text-secondary"
                        }`}
                      >
                        {isDone ? <Check size={14} /> : stepNumber}
                      </span>
                      <span>{item}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}

          {submitError ? (
            <div className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
              {submitError}
            </div>
          ) : null}

          {step === 1 ? (
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-2 lg:col-span-2">
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                  Set up your organization
                </h2>
              </div>

              <AuthField
                label="Organization name"
                value={organizationName}
                onChange={setOrganizationName}
                onBlur={() =>
                  setFieldError(
                    "organizationName",
                    validateRequired(organizationName, "Organization name"),
                  )
                }
                placeholder="Downtown Clinic Group"
                icon={Building2}
                error={errors.organizationName}
                disabled={sessionReady}
              />

              <div className="space-y-2">
                <label className="text-[13px] font-medium uppercase tracking-[0.05em] text-text-secondary">
                  Organization type
                </label>
                <select
                  value={organizationType}
                  onChange={(event) => setOrganizationType(event.target.value)}
                  disabled={sessionReady}
                  className="h-12 w-full rounded-xl border border-input-border bg-input px-4 text-[15px] text-foreground outline-none transition-all duration-200 ease-out focus:border-primary focus:ring-2 focus:ring-ring disabled:opacity-70"
                >
                  {organizationTypes.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <AuthField
                label="Your work email"
                value={email}
                onChange={setEmail}
                onBlur={() => setFieldError("email", validateEmail(email))}
                placeholder="owner@clinic.example"
                type="email"
                autoComplete="email"
                icon={Mail}
                error={errors.email}
                disabled={sessionReady}
              />

              <AuthField
                label="Password"
                value={password}
                onChange={setPassword}
                onBlur={() => setFieldError("password", validatePassword(password))}
                placeholder="Minimum 8 characters"
                type="password"
                autoComplete="new-password"
                icon={LockKeyhole}
                revealable
                error={errors.password}
                disabled={sessionReady}
              />

              <AuthField
                label="Confirm password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                onBlur={() =>
                  setFieldError(
                    "confirmPassword",
                    validateConfirmPassword(password, confirmPassword),
                  )
                }
                placeholder="Repeat password"
                type="password"
                autoComplete="new-password"
                icon={LockKeyhole}
                revealable
                error={errors.confirmPassword}
                disabled={sessionReady}
              />

              <div className="lg:col-span-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => void handleStepOne()}
                  disabled={isSubmitting}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-[15px] font-semibold text-primary-foreground transition-all duration-200 ease-out hover:bg-primary-hover disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : (
                    <>
                      Continue
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-2 lg:col-span-2">
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                  Add your first facility
                </h2>
                <p className="text-sm leading-6 text-text-secondary">
                  You can add more facilities from the dashboard.
                </p>
              </div>

              <AuthField
                label="Facility name"
                value={facilityName}
                onChange={setFacilityName}
                onBlur={() =>
                  setFieldError(
                    "facilityName",
                    validateRequired(facilityName, "Facility name"),
                  )
                }
                placeholder="Downtown Main Campus"
                icon={Building2}
                error={errors.facilityName}
                disabled={Boolean(facilityId)}
              />

              <AuthField
                label="Facility address"
                value={facilityAddress}
                onChange={setFacilityAddress}
                onBlur={() =>
                  setFieldError(
                    "facilityAddress",
                    validateRequired(facilityAddress, "Facility address"),
                  )
                }
                placeholder="221 Residency Road"
                icon={MapPin}
                error={errors.facilityAddress}
                disabled={Boolean(facilityId)}
              />

              <AuthField
                label="City"
                value={city}
                onChange={setCity}
                onBlur={() => setFieldError("city", validateRequired(city, "City"))}
                placeholder="Bangalore"
                icon={MapPin}
                error={errors.city}
                disabled={Boolean(facilityId)}
              />

              <AuthField
                label="Phone number"
                value={phoneNumber}
                onChange={setPhoneNumber}
                onBlur={() =>
                  setFieldError(
                    "phoneNumber",
                    validateRequired(phoneNumber, "Phone number"),
                  )
                }
                placeholder="+91 98765 43210"
                icon={Phone}
                error={errors.phoneNumber}
                disabled={Boolean(facilityId)}
              />

              <div className="flex items-center justify-between lg:col-span-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="inline-flex items-center gap-2 text-sm font-medium text-primary transition-colors hover:underline"
                >
                  <ArrowLeft size={14} />
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => void handleStepTwo()}
                  disabled={isSubmitting}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-[15px] font-semibold text-primary-foreground transition-all duration-200 ease-out hover:bg-primary-hover disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : (
                    <>
                      Continue
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-2 lg:col-span-2">
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                  Invite a doctor
                </h2>
                <p className="text-sm leading-6 text-text-secondary">
                  This step is optional. You can invite doctors from the dashboard
                  too.
                </p>
              </div>

              <AuthField
                label="Doctor's email"
                value={doctorEmail}
                onChange={setDoctorEmail}
                onBlur={() =>
                  setFieldError(
                    "doctorEmail",
                    doctorEmail ? validateEmail(doctorEmail) : "",
                  )
                }
                placeholder="doctor@clinic.example"
                type="email"
                autoComplete="email"
                icon={Mail}
                error={errors.doctorEmail}
              />

              <AuthField
                label="Specialization"
                value={specialization}
                onChange={setSpecialization}
                onBlur={() =>
                  setFieldError(
                    "specialization",
                    specialization
                      ? validateRequired(specialization, "Specialization")
                      : "",
                  )
                }
                placeholder="Cardiology"
                icon={Stethoscope}
                error={errors.specialization}
              />

              <div className="flex items-center justify-between lg:col-span-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="inline-flex items-center gap-2 text-sm font-medium text-primary transition-colors hover:underline"
                >
                  <ArrowLeft size={14} />
                  Back
                </button>
                <div className="flex flex-col items-end gap-3">
                  <button
                    type="button"
                    onClick={() => void handleFinish()}
                    disabled={isSubmitting}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-[15px] font-semibold text-primary-foreground transition-all duration-200 ease-out hover:bg-primary-hover disabled:opacity-60"
                  >
                    {isSubmitting ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    ) : (
                      <>
                        Finish setup
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleFinish(true)}
                    className="text-sm text-text-secondary transition-colors hover:text-foreground"
                  >
                    Skip for now &rarr;
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {step === 4 ? (
            <div className="space-y-8 py-8 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-success/10 text-success animate-auth-check">
                <Check size={34} />
              </div>
              <div className="space-y-3">
                <h2 className="text-[28px] font-bold tracking-tight text-foreground">
                  You&apos;re all set, {ownerName}!
                </h2>
                <p className="text-base text-text-secondary">
                  Taking you to your dashboard...
                </p>
              </div>
              <div className="mx-auto h-2 w-full max-w-md overflow-hidden rounded-full bg-muted">
                <div className="h-full w-1/3 rounded-full bg-success animate-auth-progress" />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
