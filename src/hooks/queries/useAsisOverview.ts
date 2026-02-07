import { useQuery } from '@tanstack/react-query';
import supabase from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';

type OverviewStats = {
  totalItems: number;
  unassignedItems: number;
  onFloorLoads: number;
  forSaleLoads: number;
  pickedLoads: number;
};

const normalize = (value?: string | null) => value?.toLowerCase().trim() ?? '';

export function useAsisOverview(locationId?: string | null) {
  return useQuery<OverviewStats | null>({
    queryKey: queryKeys.inventory.asisOverview(locationId ?? 'missing'),
    queryFn: async () => {
      if (!locationId) return null;

      // Get delivered load names to exclude their items from counts
      const { data: deliveredLoads } = await supabase
        .from('load_metadata')
        .select('sub_inventory_name')
        .eq('location_id', locationId)
        .eq('inventory_type', 'ASIS')
        .eq('ge_cso_status', 'Delivered');

      const deliveredLoadNames = deliveredLoads?.map(l => l.sub_inventory_name) ?? [];

      // Get all ASIS items to filter by delivered loads
      const { data: allAsisItems } = await supabase
        .from('inventory_items')
        .select('id, sub_inventory')
        .eq('location_id', locationId)
        .eq('inventory_type', 'ASIS');

      // Filter out items from delivered loads
      const activeItems = allAsisItems?.filter(
        item => !item.sub_inventory || !deliveredLoadNames.includes(item.sub_inventory)
      ) ?? [];

      const totalItems = activeItems.length;
      const unassignedItems = activeItems.filter(
        item => !item.sub_inventory || item.sub_inventory === ''
      ).length;

      // Get load counts (exclude delivered loads)
      const { data: loads } = await supabase
        .from('load_metadata')
        .select('ge_source_status, ge_cso_status')
        .eq('location_id', locationId)
        .eq('inventory_type', 'ASIS')
        .or('ge_cso_status.is.null,ge_cso_status.neq.Delivered');

      const forSaleLoads = (loads ?? []).filter(
        (load) => normalize(load.ge_source_status) === 'for sale'
      ).length;
      const pickedLoads = (loads ?? []).filter(
        (load) =>
          normalize(load.ge_source_status) === 'sold' &&
          normalize(load.ge_cso_status) === 'picked'
      ).length;
      const onFloorLoads = forSaleLoads + pickedLoads;

      return {
        totalItems,
        unassignedItems,
        onFloorLoads,
        forSaleLoads,
        pickedLoads,
      };
    },
    enabled: !!locationId,
  });
}
