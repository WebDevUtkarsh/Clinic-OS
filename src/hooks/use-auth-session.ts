"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getAuthSession } from "@/features/auth/api";
import { type SessionData } from "@/features/auth/types";
import { ApiClientError } from "@/lib/api/client";
import { isPublicRoute } from "@/lib/utils/routes";

type AuthSessionState =
  | {
      status: "loading";
      session: null;
      error: null;
    }
  | {
      status: "authenticated";
      session: SessionData;
      error: null;
    }
  | {
      status: "unauthenticated";
      session: null;
      error: string | null;
    };

type UseAuthSessionResult = AuthSessionState & {
  refresh: () => Promise<void>;
};

type UseAuthSessionOptions = {
  requireAuth?: boolean;
};

function toUnauthenticatedState(error: unknown): Extract<AuthSessionState, { status: "unauthenticated" }> {
  return {
    status: "unauthenticated",
    session: null,
    error:
      error instanceof ApiClientError && error.status === 401
        ? null
        : error instanceof Error
          ? error.message
          : "Failed to load session",
  };
}

export function useAuthSession(
  options: UseAuthSessionOptions = {},
): UseAuthSessionResult {
  const pathname = usePathname();
  const router = useRouter();
  const [state, setState] = useState<AuthSessionState>({
    status: "loading",
    session: null,
    error: null,
  });
  const shouldRequireAuth =
    options.requireAuth ?? (pathname ? !isPublicRoute(pathname) : false);

  const refresh = useCallback(async () => {
    setState({
      status: "loading",
      session: null,
      error: null,
    });

    try {
      const session = await getAuthSession();
      setState({
        status: "authenticated",
        session,
        error: null,
      });
    } catch (error) {
      setState(toUnauthenticatedState(error));

      if (shouldRequireAuth) {
        router.replace("/login");
      }
    }
  }, [router, shouldRequireAuth]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const session = await getAuthSession();

        if (cancelled) {
          return;
        }

        setState({
          status: "authenticated",
          session,
          error: null,
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        setState(toUnauthenticatedState(error));

        if (shouldRequireAuth) {
          router.replace("/login");
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [router, shouldRequireAuth]);

  return {
    ...state,
    refresh,
  };
}
