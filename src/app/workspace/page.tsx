import { redirect } from "next/navigation";
import { requireServerSession } from "@/features/auth/server";
import { resolvePostAuthRoute } from "@/features/auth/types";

export default async function WorkspacePage() {
  const session = await requireServerSession();
  redirect(resolvePostAuthRoute(session));
}
