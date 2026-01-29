import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  importInventorySnapshot,
  type InventoryImportProgress,
  type ProductImportSource,
} from '@/lib/inventoryImportManager';
import { queryKeys } from '@/lib/queryKeys';
import { getActiveLocationContext } from '@/lib/tenant';

export function useImportInventorySnapshot() {
  const queryClient = useQueryClient();
  const { locationId, companyId } = getActiveLocationContext();

  return useMutation({
    mutationFn: ({
      source,
      locationId: overrideLocationId,
      companyId: overrideCompanyId,
      onProgress,
    }: {
      source: ProductImportSource;
      locationId?: string;
      companyId?: string;
      onProgress?: (progress: InventoryImportProgress) => void;
    }) => {
      const resolvedLocationId = overrideLocationId ?? locationId;
      const resolvedCompanyId = overrideCompanyId ?? companyId;
      if (!resolvedLocationId || !resolvedCompanyId) {
        throw new Error('Missing location or company context');
      }
      return importInventorySnapshot({
        source,
        locationId: resolvedLocationId,
        companyId: resolvedCompanyId,
        onProgress,
      });
    },
    onSuccess: () => {
      if (locationId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all(locationId) });
      }
    },
  });
}
