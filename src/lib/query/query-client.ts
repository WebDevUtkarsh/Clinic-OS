import {
  MutationCache,
  QueryCache,
  QueryClient,
  type DefaultOptions,
} from "@tanstack/react-query";
import { ApiClientError } from "@/lib/api/client";

function handleQueryError(error: Error) {
  if (error instanceof ApiClientError && error.status === 401) {
    return;
  }

  console.error("Query error:", error);
}

const defaultOptions: DefaultOptions = {
  queries: {
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry(failureCount, error) {
      if (error instanceof ApiClientError && error.status < 500) {
        return false;
      }

      return failureCount < 1;
    },
    refetchOnWindowFocus: false,
  },
  mutations: {
    retry(failureCount, error) {
      if (error instanceof ApiClientError && error.status < 500) {
        return false;
      }

      return failureCount < 1;
    },
  },
};

export function createQueryClient() {
  return new QueryClient({
    defaultOptions,
    queryCache: new QueryCache({
      onError: handleQueryError,
    }),
    mutationCache: new MutationCache({
      onError: handleQueryError,
    }),
  });
}
