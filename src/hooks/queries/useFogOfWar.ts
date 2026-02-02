import { useQuery } from '@tanstack/react-query';
import supabase from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { getActiveLocationContext } from '@/lib/tenant';

export type FogOfWarStats = {
  totalItems: number;
  mappedItems: number;
  coveragePercent: number;
  recentScans: Array<{
    id: string;
    productType: string | null;
    subInventory: string | null;
    scannedBy: string | null;
    createdAt: string;
  }>;
};

export function useFogOfWar() {
  const { locationId } = getActiveLocationContext();

  return useQuery<FogOfWarStats>({
    queryKey: queryKeys.map.fogOfWar(locationId ?? 'missing'),
    queryFn: async () => {
      if (!locationId) {
        throw new Error('No active location selected');
      }

      // Get total inventory count
      const { count: totalCount, error: totalError } = await supabase
        .from('inventory_items')
        .select('id', { count: 'exact', head: true })
        .eq('location_id', locationId)
        .neq('inventory_type', 'Parts'); // Exclude parts from warehouse mapping

      if (totalError) throw totalError;

      // Get unique mapped items (items with position data)
      const { data: mappedData, error: mappedError } = await supabase
        .from('product_location_history')
        .select('inventory_item_id')
        .eq('location_id', locationId)
        .not('inventory_item_id', 'is', null);

      if (mappedError) throw mappedError;

      const uniqueMappedItems = new Set(
        (mappedData ?? [])
          .map(r => r.inventory_item_id)
          .filter(Boolean)
      );

      const mappedCount = uniqueMappedItems.size;
      const total = totalCount ?? 0;
      const coverage = total > 0 ? Math.round((mappedCount / total) * 100) : 0;

      // Get recent scans (last 10)
      const { data: recentScans, error: scansError } = await supabase
        .from('product_location_history')
        .select('id, product_type, sub_inventory, scanned_by, created_at')
        .eq('location_id', locationId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (scansError) throw scansError;

      return {
        totalItems: total,
        mappedItems: mappedCount,
        coveragePercent: coverage,
        recentScans: (recentScans ?? []).map(scan => ({
          id: scan.id,
          productType: scan.product_type,
          subInventory: scan.sub_inventory,
          scannedBy: scan.scanned_by,
          createdAt: scan.created_at,
        })),
      };
    },
    enabled: !!locationId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}
