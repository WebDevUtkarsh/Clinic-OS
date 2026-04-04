import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/LoginForm";
import { getServerSession } from "@/features/auth/server";
import { resolvePostAuthRoute } from "@/features/auth/types";

export const metadata: Metadata = {
  title: "Sign in · Clinic OS",
};

export default async function LoginPage() {
  const session = await getServerSession();

  if (session) {
    redirect(resolvePostAuthRoute(session));
  }

  return <LoginForm />;
}
