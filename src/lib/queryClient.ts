import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,      // 5 minutes (inventory changes slowly)
      gcTime: 1000 * 60 * 30,        // 30 minutes cache retention
      retry: 1,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
      refetchOnWindowFocus: false,   // Warehouse kiosks stay open
    },
    mutations: {
      retry: 0,
    },
  },
});
