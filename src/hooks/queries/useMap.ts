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

      // Get delivered load names to exclude their items from count
      const { data: deliveredLoads } = await supabase
        .from('load_metadata')
        .select('sub_inventory_name')
        .eq('location_id', locationId)
        .eq('ge_cso_status', 'Delivered');

      const deliveredLoadNames = deliveredLoads?.map(l => l.sub_inventory_name) ?? [];

      // If no delivered loads, use simple count
      if (deliveredLoadNames.length === 0) {
        const { count, error } = await supabase
          .from('inventory_items')
          .select('id', { count: 'exact', head: true })
          .eq('location_id', locationId);

        if (error) throw error;
        return count ?? 0;
      }

      // Otherwise, fetch all items and filter
      const { data, error } = await supabase
        .from('inventory_items')
        .select('id, sub_inventory')
        .eq('location_id', locationId);

      if (error) throw error;

      return (data ?? []).filter(
        item => !item.sub_inventory || !deliveredLoadNames.includes(item.sub_inventory)
      ).length;
    },
  });
}

export function useInventoryScanCounts() {
  const { locationId } = getActiveLocationContext();

  return useQuery({
    queryKey: ['inventory-scan-counts-v4', locationId ?? 'none'], // v4: pagination to fetch all rows
    enabled: !!locationId,
    staleTime: 0, // Force refetch
    gcTime: 0, // Don't cache
    queryFn: async () => {
      if (!locationId) {
        return { totalByKey: new Map<string, number>(), scannedByKey: new Map<string, number>() };
      }

      // Use database functions to get counts efficiently
      const { data: totalCounts, error: totalError } = await supabase
        .rpc('get_inventory_counts', { p_location_id: locationId });

      if (totalError) throw totalError;

      const { data: scannedCounts, error: scannedError } = await supabase
        .rpc('get_scanned_counts', { p_location_id: locationId });

      if (scannedError) throw scannedError;

      // Convert to Maps
      const totalByKey = new Map<string, number>();
      for (const row of totalCounts ?? []) {
        totalByKey.set(row.key, Number(row.total_count));
      }

      const scannedByKey = new Map<string, number>();
      for (const row of scannedCounts ?? []) {
        scannedByKey.set(row.key, Number(row.scanned_count));
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
