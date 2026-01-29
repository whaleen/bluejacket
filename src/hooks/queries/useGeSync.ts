import { useMutation, useQueryClient } from '@tanstack/react-query';
import { syncGeInventory, type GeSyncType } from '@/lib/geSync';
import { getActiveLocationContext } from '@/lib/tenant';
import { queryKeys } from '@/lib/queryKeys';

export function useGeSync() {
  const queryClient = useQueryClient();
  const { locationId } = getActiveLocationContext();

  return useMutation({
    mutationFn: ({ type, locationId: overrideLocationId }: { type: GeSyncType; locationId?: string }) => {
      const targetLocationId = overrideLocationId ?? locationId;
      if (!targetLocationId) {
        throw new Error('No active location selected');
      }
      return syncGeInventory(type, targetLocationId);
    },
    onSuccess: () => {
      if (locationId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all(locationId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.loads.all(locationId) });
      }
    },
  });
}
