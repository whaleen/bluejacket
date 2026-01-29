import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getActiveLocationContext } from '@/lib/tenant';
import { queryKeys } from '@/lib/queryKeys';
import {
  exportInventoryCsv,
  getInventoryBrands,
  getInventoryItemDetail,
  getInventoryPage,
  getSubInventoryOptions,
  nukeInventoryItems,
  type InventoryExportColumn,
  type InventoryFilters,
  type InventorySort,
  type InventorySubInventoryOption,
  type InventoryTypeFilter,
} from '@/lib/inventoryManager';

export function useInventoryItemDetail(itemId: string, enabled: boolean = true) {
  const { locationId } = getActiveLocationContext();

  return useQuery({
    queryKey: queryKeys.inventory.item(locationId ?? 'missing', itemId),
    queryFn: () => {
      if (!locationId) {
        throw new Error('No active location selected');
      }
      return getInventoryItemDetail({ locationId, itemId });
    },
    enabled: enabled && !!itemId && !!locationId,
  });
}

export function useInventoryBrands() {
  return useQuery({
    queryKey: queryKeys.inventory.brands(),
    queryFn: getInventoryBrands,
  });
}

export function useInventorySubInventories(inventoryType: InventoryTypeFilter) {
  const { locationId } = getActiveLocationContext();

  return useQuery<InventorySubInventoryOption[]>({
    queryKey: queryKeys.inventory.subInventories(locationId ?? 'missing', inventoryType),
    queryFn: () => {
      if (!locationId) {
        throw new Error('No active location selected');
      }
      return getSubInventoryOptions({ locationId, inventoryType });
    },
    enabled: !!locationId && inventoryType !== 'all',
  });
}

export function useInventoryPages(
  filters: InventoryFilters,
  sort: InventorySort,
  pageSize: number
) {
  const { locationId } = getActiveLocationContext();

  return useInfiniteQuery({
    queryKey: queryKeys.inventory.list(locationId ?? 'missing', filters, sort, pageSize),
    queryFn: ({ pageParam = 0 }) => {
      if (!locationId) {
        throw new Error('No active location selected');
      }
      return getInventoryPage({
        locationId,
        filters,
        sort,
        pageIndex: pageParam,
        pageSize,
      });
    },
    enabled: !!locationId,
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      const count = lastPage.count;
      if (typeof count === 'number') {
        const nextIndex = lastPage.pageIndex + 1;
        if (nextIndex * pageSize < count) {
          return nextIndex;
        }
        return undefined;
      }
      return lastPage.items.length === pageSize ? lastPage.pageIndex + 1 : undefined;
    },
  });
}

export function useInventoryExport() {
  return useMutation({
    mutationFn: ({
      locationId,
      filters,
      sort,
      columns,
      includeRowNumbers,
      batchSize,
      onProgress,
    }: {
      locationId: string;
      filters: InventoryFilters;
      sort: InventorySort;
      columns: InventoryExportColumn[];
      includeRowNumbers: boolean;
      batchSize: number;
      onProgress?: (count: number) => void;
    }) =>
      exportInventoryCsv({
        locationId,
        filters,
        sort,
        columns,
        includeRowNumbers,
        batchSize,
        onProgress,
      }),
  });
}

export function useNukeInventory() {
  const queryClient = useQueryClient();
  const { locationId } = getActiveLocationContext();

  return useMutation({
    mutationFn: ({ inventoryTypes, locationId: overrideLocationId }: { inventoryTypes: string[]; locationId?: string }) => {
      const resolvedLocationId = overrideLocationId ?? locationId;
      if (!resolvedLocationId) {
        throw new Error('No active location selected');
      }
      return nukeInventoryItems({ locationId: resolvedLocationId, inventoryTypes });
    },
    onSuccess: () => {
      if (locationId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all(locationId) });
      }
    },
  });
}
