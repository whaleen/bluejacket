import { useMutation, useQueryClient } from '@tanstack/react-query';
import { syncGeInventory, type GeSyncType } from '@/lib/geSync';
import { createSessionsFromSync } from '@/lib/sessionManager';
import { getActiveLocationContext } from '@/lib/tenant';
import { queryKeys } from '@/lib/queryKeys';

export function useGeSync() {
  const queryClient = useQueryClient();
  const { locationId } = getActiveLocationContext();

  return useMutation({
    mutationFn: async ({
      type,
      locationId: overrideLocationId,
      options,
    }: { type: GeSyncType; locationId?: string; options?: Record<string, unknown> }) => {
      const targetLocationId = overrideLocationId ?? locationId;
      if (!targetLocationId) {
        throw new Error('No active location selected');
      }
      const result = await syncGeInventory(type, targetLocationId, options);

      // Create sessions from sync results
      if (type === 'inventory') {
        // Unified sync: create sessions for all three types
        for (const syncType of ['asis', 'fg', 'sta'] as const) {
          const sessionResult = await createSessionsFromSync(syncType);
          if (!sessionResult.success) {
            console.error(`Failed to create sessions for ${syncType}:`, sessionResult.error);
            // Don't throw - continue with other types
          }
        }
      } else if (type !== 'inbound' && type !== 'orders') {
        // Individual sync: create sessions for that type
        const sessionResult = await createSessionsFromSync(type);
        if (!sessionResult.success) {
          throw sessionResult.error instanceof Error
            ? sessionResult.error
            : new Error('Failed to create sessions from GE sync');
        }
      }

      return result;
    },
    onSuccess: () => {
      if (locationId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all(locationId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.loads.all(locationId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.items(locationId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.conflicts(locationId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all(locationId) });
      }
    },
  });
}
