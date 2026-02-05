import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteProductLocation, getProductLocations } from '@/lib/mapManager';
import { getActiveLocationContext } from '@/lib/tenant';
import supabase from '@/lib/supabase';

export function useProductLocations() {
  const { locationId } = getActiveLocationContext();

  return useQuery({
    queryKey: ['product-locations', locationId ?? 'none'],
    enabled: !!locationId,
    queryFn: async () => {
      const { data, error } = await getProductLocations();
      if (error) throw error;
      return data;
    },
  });
}

export function useDeleteProductLocation() {
  const queryClient = useQueryClient();
  const { locationId } = getActiveLocationContext();

  return useMutation({
    mutationFn: async (locationIdToDelete: string) => {
      const { error } = await deleteProductLocation(locationIdToDelete);
      if (error) throw error;
      return locationIdToDelete;
    },
    onSuccess: () => {
      if (locationId) {
        queryClient.invalidateQueries({ queryKey: ['product-locations', locationId] });
      }
    },
  });
}

export function useClearAllScans() {
  const queryClient = useQueryClient();
  const { locationId } = getActiveLocationContext();

  return useMutation({
    mutationFn: async () => {
      if (!locationId) throw new Error('Location required');
      const { error } = await supabase
        .from('product_location_history')
        .delete()
        .eq('location_id', locationId);

      if (error) throw error;
    },
    onSuccess: () => {
      if (locationId) {
        queryClient.invalidateQueries({ queryKey: ['product-locations', locationId] });
      }
    },
  });
}

export function useInventoryItemCount() {
  const { locationId } = getActiveLocationContext();

  return useQuery({
    queryKey: ['inventory-item-count', locationId ?? 'none'],
    enabled: !!locationId,
    queryFn: async () => {
      if (!locationId) return 0;
      const { count, error } = await supabase
        .from('inventory_items')
        .select('id', { count: 'exact', head: true })
        .eq('location_id', locationId);

      if (error) throw error;
      return count ?? 0;
    },
  });
}

export function useInventoryScanCounts() {
  const { locationId } = getActiveLocationContext();

  return useQuery({
    queryKey: ['inventory-scan-counts', locationId ?? 'none'],
    enabled: !!locationId,
    queryFn: async () => {
      if (!locationId) {
        return { totalByKey: new Map<string, number>(), scannedByKey: new Map<string, number>() };
      }

      const { data: inventoryItems, error: inventoryError } = await supabase
        .from('inventory_items')
        .select('id, sub_inventory, inventory_type')
        .eq('location_id', locationId);

      if (inventoryError) throw inventoryError;

      const totalByKey = new Map<string, number>();
      const itemMap = new Map<string, { sub_inventory: string | null; inventory_type: string | null }>();

      for (const item of inventoryItems ?? []) {
        if (!item.id) continue;
        const isLoadItem = Boolean(item.sub_inventory);
        if (isLoadItem && item.inventory_type !== 'ASIS') {
          continue;
        }
        const key = item.sub_inventory
          ? `load:${item.sub_inventory}`
          : `type:${item.inventory_type ?? 'unknown'}`;
        totalByKey.set(key, (totalByKey.get(key) ?? 0) + 1);
        itemMap.set(item.id, {
          sub_inventory: item.sub_inventory ?? null,
          inventory_type: item.inventory_type ?? null,
        });
      }

      const { data: scanRows, error: scanError } = await supabase
        .from('product_location_history')
        .select('inventory_item_id')
        .eq('location_id', locationId)
        .not('inventory_item_id', 'is', null);

      if (scanError) throw scanError;

      const scannedByKey = new Map<string, number>();
      const scannedIds = new Set<string>();
      for (const row of scanRows ?? []) {
        if (row.inventory_item_id) scannedIds.add(row.inventory_item_id);
      }

      for (const id of scannedIds) {
        const item = itemMap.get(id);
        if (!item) continue;
        const key = item.sub_inventory
          ? `load:${item.sub_inventory}`
          : `type:${item.inventory_type ?? 'unknown'}`;
        scannedByKey.set(key, (scannedByKey.get(key) ?? 0) + 1);
      }

      return { totalByKey, scannedByKey };
    },
  });
}

export function useDeleteSessionScans() {
  const queryClient = useQueryClient();
  const { locationId } = getActiveLocationContext();

  return useMutation({
    mutationFn: async (locationIds: string[]) => {
      if (!locationId) throw new Error('Location required');
      if (locationIds.length === 0) return;

      const { error } = await supabase
        .from('product_location_history')
        .delete()
        .eq('location_id', locationId)
        .in('id', locationIds);

      if (error) throw error;
    },
    onSuccess: () => {
      if (locationId) {
        queryClient.invalidateQueries({ queryKey: ['product-locations', locationId] });
      }
    },
  });
}
