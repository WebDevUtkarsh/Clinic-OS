"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Building2,
  Loader2,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { SessionLoader } from "@/components/auth/session-loader";
import {
  ApiError,
  registerTenant,
  resolvePostAuthRoute,
} from "@/lib/frontend/auth-client";
import { useAuthSession } from "@/hooks/use-auth-session";

type RegisterFormState = {
  name: string;
  email: string;
  tenantName: string;
  password: string;
  confirmPassword: string;
};

const initialForm: RegisterFormState = {
  name: "",
  email: "",
  tenantName: "",
  password: "",
  confirmPassword: "",
};

export default function RegisterPage() {
  const router = useRouter();
  const auth = useAuthSession({ requireAuth: false });
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (auth.status === "authenticated") {
      router.replace(resolvePostAuthRoute(auth.session));
    }
  }, [auth, router]);

  const passwordHint = useMemo(() => {
    if (!form.password) return "Use at least 6 characters to match the backend policy.";
    if (form.password.length < 6) return "Password must be at least 6 characters.";
    if (form.password !== form.confirmPassword && form.confirmPassword) {
      return "Passwords need to match before provisioning can start.";
    }

    return "Credentials and tenant metadata will be provisioned in one flow.";
  }, [form.confirmPassword, form.password]);

  const handleChange = <K extends keyof RegisterFormState>(
    key: K,
    value: RegisterFormState[K],
  ) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await registerTenant({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        tenantName: form.tenantName.trim(),
      });

      router.push(
        `/login?registered=1&email=${encodeURIComponent(
          form.email.trim().toLowerCase(),
        )}`,
      );
    } catch (submissionError) {
      if (submissionError instanceof ApiError) {
        setError(submissionError.message || "Registration failed.");
      } else {
        setError("Registration failed.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (auth.status === "loading") {
    return (
      <SessionLoader
        title="Checking for an existing account session"
        description="If you already have a secure cookie, we’ll route you directly into the right environment."
      />
    );
  }

  return (
    <AuthShell
      eyebrow="Tenant provisioning flow"
      title="Initialize your healthcare control plane."
      description="Create the owner identity, bootstrap a tenant, and provision the first isolated environment without changing any backend behavior."
      topAction={{ href: "/login", label: "Existing session" }}
      sideContent={
        <div className="space-y-4">
          {[
            {
              label: "Control user",
              text: "Owner identity is created in the control plane first.",
              icon: UserRound,
            },
            {
              label: "Tenant bootstrap",
              text: "A dedicated tenant is provisioned and marked ONBOARDING.",
              icon: Building2,
            },
            {
              label: "Credential policy",
              text: "The frontend respects the existing backend schema and password minimums.",
              icon: LockKeyhole,
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-3xl border border-white/10 bg-white/[0.04] p-5"
            >
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/12 text-indigo-300">
                <item.icon size={18} />
              </div>
              <div className="text-sm font-semibold tracking-tight">{item.label}</div>
              <p className="mt-2 text-sm leading-relaxed text-white/45">{item.text}</p>
            </div>
          ))}
        </div>
      }
    >
      <div className="rounded-[2rem] border border-white/10 bg-[#09090B]/95 p-8 shadow-[0_0_100px_rgba(79,70,229,0.16)] backdrop-blur-xl md:p-10">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/25 bg-indigo-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-indigo-300">
            <Sparkles size={12} />
            Production-ready signup
          </div>
          <h2 className="mt-4 text-3xl font-bold tracking-tight">Create owner access</h2>
          <p className="mt-2 text-sm leading-relaxed text-white/45">
            This frontend writes only to the existing auth and provisioning APIs. No backend auth flow is modified.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <label className="block">
            <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.22em] text-white/38">
              Full name
            </span>
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-4">
              <UserRound size={16} className="text-white/25" />
              <input
                required
                value={form.name}
                onChange={(event) => handleChange("name", event.target.value)}
                placeholder="Clinic owner"
                className="w-full bg-transparent text-sm outline-hidden placeholder:text-white/18"
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.22em] text-white/38">
              Email
            </span>
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-4">
              <Mail size={16} className="text-white/25" />
              <input
                type="email"
                required
                value={form.email}
                onChange={(event) => handleChange("email", event.target.value)}
                placeholder="owner@clinic.example"
                className="w-full bg-transparent text-sm outline-hidden placeholder:text-white/18"
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.22em] text-white/38">
              Tenant name
            </span>
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-4">
              <Building2 size={16} className="text-white/25" />
              <input
                required
                value={form.tenantName}
                onChange={(event) => handleChange("tenantName", event.target.value)}
                placeholder="Sunrise Health"
                className="w-full bg-transparent text-sm outline-hidden placeholder:text-white/18"
              />
            </div>
          </label>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.22em] text-white/38">
                Password
              </span>
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-4">
                <LockKeyhole size={16} className="text-white/25" />
                <input
                  type="password"
                  required
                  value={form.password}
                  onChange={(event) => handleChange("password", event.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full bg-transparent text-sm outline-hidden placeholder:text-white/18"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.22em] text-white/38">
                Confirm password
              </span>
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-4">
                <ShieldCheck size={16} className="text-white/25" />
                <input
                  type="password"
                  required
                  value={form.confirmPassword}
                  onChange={(event) =>
                    handleChange("confirmPassword", event.target.value)
                  }
                  placeholder="Repeat password"
                  className="w-full bg-transparent text-sm outline-hidden placeholder:text-white/18"
                />
              </div>
            </label>
          </div>

          <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-white/45">
            {passwordHint}
          </div>

          {error ? (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-white px-5 py-4 text-sm font-black uppercase tracking-[0.24em] text-black transition-transform hover:scale-[1.01] disabled:opacity-65"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Provisioning
              </>
            ) : (
              <>
                Create tenant
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-white/35">
          Already provisioned?{" "}
          <Link href="/login" className="font-semibold text-indigo-300 hover:text-indigo-200">
            Sign in to continue
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
