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

      const [{ count: totalItems }, { count: unassignedItems }, loadsResult] = await Promise.all([
        supabase
          .from('inventory_items')
          .select('*', { head: true, count: 'exact' })
          .eq('location_id', locationId)
          .eq('inventory_type', 'ASIS'),
        supabase
          .from('inventory_items')
          .select('*', { head: true, count: 'exact' })
          .eq('location_id', locationId)
          .eq('inventory_type', 'ASIS')
          .or('sub_inventory.is.null,sub_inventory.eq.""'),
        supabase
          .from('load_metadata')
          .select('ge_source_status, ge_cso_status')
          .eq('location_id', locationId)
          .eq('inventory_type', 'ASIS'),
      ]);

      const loads = loadsResult.data ?? [];

      const forSaleLoads = loads.filter(
        (load) => normalize(load.ge_source_status) === 'for sale'
      ).length;
      const pickedLoads = loads.filter(
        (load) =>
          normalize(load.ge_source_status) === 'sold' &&
          normalize(load.ge_cso_status) === 'picked'
      ).length;
      const onFloorLoads = forSaleLoads + pickedLoads;

      return {
        totalItems: totalItems ?? 0,
        unassignedItems: unassignedItems ?? 0,
        onFloorLoads,
        forSaleLoads,
        pickedLoads,
      };
    },
    enabled: !!locationId,
  });
}
