import { QueryClient } from "@tanstack/react-query";

const THREE_MINUTES = 3 * 60 * 1000;
const THIRTY_MINUTES = 30 * 60 * 1000;

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        refetchOnMount: false,
        refetchOnReconnect: true,
        refetchOnWindowFocus: false,
        staleTime: THIRTY_MINUTES,
        gcTime: 60 * 60 * 1000,
      },
    },
  });
}

export const STALE_TIME = {
  live: THREE_MINUTES,
  historical: THIRTY_MINUTES,
  charts: 15 * 60 * 1000,
};
