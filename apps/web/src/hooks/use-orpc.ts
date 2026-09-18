import { useRouter } from "@tanstack/react-router";

/** Reads the request-scoped API utilities and query cache from router context. */
export function useOrpc() {
  return useRouter().options.context.orpc;
}

export function useAppQueryClient() {
  return useRouter().options.context.queryClient;
}
