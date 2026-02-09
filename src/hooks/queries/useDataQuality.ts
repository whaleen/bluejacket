import { useQuery } from '@tanstack/react-query';
import supabase from '@/lib/supabase';
import { getActiveLocationContext } from '@/lib/tenant';

export interface DataQualityMetrics {
  inventoryIntegrity: {
    totalItems: number; // Deduplicated count
    asisStaDuplicates: number; // Expected duplicates
    duplicateSerials: number; // BAD - data corruption
    orphanedItems: number; // Disappeared from GE
  };
  productCatalog: {
    totalModels: number;
    modelsWithProduct: number;
    modelsMissingProduct: number;
    coveragePercent: number;
  };
  orderLinkage: {
    itemsWithCso: number;
    csosMatchedToOrders: number;
    orphanedCsos: number; // Items have CSO but no order record
    coveragePercent: number;
  };
  loadAssignments: {
    totalLoads: number;
    itemsWithLoads: number;
    loadsWithMetadata: number;
    orphanedLoadAssignments: number; // Items in non-existent loads
  };
  scanCoverage: {
    totalItems: number;
    itemsWithScans: number;
    scannedLast30Days: number;
    neverScanned: number;
    coveragePercent: number;
  };
  syncHealth: {
    lastSyncAsisAt: string | null;
    lastSyncStaAt: string | null;
    lastSyncFgAt: string | null;
    lastSyncInboundAt: string | null;
    lastSyncOrdersAt: string | null;
  };
}

async function fetchDataQuality(
  companyId: string | null,
  locationId: string | null
): Promise<DataQualityMetrics> {
  if (!companyId || !locationId) {
    throw new Error('Company ID and Location ID are required');
  }

  // Fetch ALL inventory items
  const { data: allItems, error: fetchError } = await supabase
    .from('inventory_items')
    .select('*')
    .eq('company_id', companyId)
    .eq('location_id', locationId);

  if (fetchError) throw fetchError;

  // Count ASIS/STA duplicates and deduplicate
  const bySerial = new Map<string, typeof allItems[0][]>();
  for (const item of allItems || []) {
    if (!item.serial) continue;
    const existing = bySerial.get(item.serial) || [];
    existing.push(item);
    bySerial.set(item.serial, existing);
  }

  let asisStaDuplicates = 0;
  let duplicateSerials = 0;
  const deduplicated: typeof allItems = [];

  for (const itemsWithSerial of bySerial.values()) {
    if (itemsWithSerial.length === 1) {
      deduplicated.push(itemsWithSerial[0]);
      continue;
    }

    const staItem = itemsWithSerial.find(i => i.inventory_type === 'STA');
    const asisItem = itemsWithSerial.find(i => i.inventory_type === 'ASIS');

    if (staItem && asisItem) {
      // Expected ASIS/STA duplicate
      asisStaDuplicates++;
      deduplicated.push(staItem);
    } else {
      // Unexpected duplicate (data corruption)
      duplicateSerials++;
      deduplicated.push(itemsWithSerial[0]);
    }
  }

  const withoutSerial = (allItems || []).filter(i => !i.serial);
  deduplicated.push(...withoutSerial);

  const inventoryItems = deduplicated;

  // 1. Inventory Integrity
  const orphanedItems = inventoryItems.filter(i => i.ge_orphaned === true).length;
  const inventoryIntegrity = {
    totalItems: inventoryItems.length,
    asisStaDuplicates,
    duplicateSerials,
    orphanedItems,
  };

  // 2. Product Catalog
  const uniqueModels = new Set(inventoryItems.map(i => i.model));
  const modelsWithProduct = new Set(
    inventoryItems.filter(i => i.product_fk).map(i => i.model)
  );
  const productCatalog = {
    totalModels: uniqueModels.size,
    modelsWithProduct: modelsWithProduct.size,
    modelsMissingProduct: uniqueModels.size - modelsWithProduct.size,
    coveragePercent: uniqueModels.size > 0
      ? Math.round((modelsWithProduct.size / uniqueModels.size) * 100)
      : 0,
  };

  // 3. Order Linkage
  const itemsWithCso = inventoryItems.filter(i => i.cso && i.cso !== '').length;
  const uniqueCsos = new Set(
    inventoryItems.filter(i => i.cso && i.cso !== '').map(i => i.cso)
  );

  const { data: orders } = await supabase
    .from('orders')
    .select('cso')
    .eq('company_id', companyId)
    .eq('location_id', locationId);

  const orderCsos = new Set((orders || []).map(o => o.cso));
  const csosMatchedToOrders = Array.from(uniqueCsos).filter(cso => orderCsos.has(cso)).length;
  const orphanedCsos = uniqueCsos.size - csosMatchedToOrders;

  const orderLinkage = {
    itemsWithCso,
    csosMatchedToOrders,
    orphanedCsos,
    coveragePercent: uniqueCsos.size > 0
      ? Math.round((csosMatchedToOrders / uniqueCsos.size) * 100)
      : 0,
  };

  // 4. Load Assignments
  const { data: loads } = await supabase
    .from('load_metadata')
    .select('sub_inventory_name')
    .eq('company_id', companyId)
    .eq('location_id', locationId);

  const loadNames = new Set(
    (loads || []).map(l => l.sub_inventory_name)
  );
  const itemsWithLoads = inventoryItems.filter(i => i.sub_inventory).length;
  const orphanedLoadAssignments = inventoryItems.filter(
    i => i.sub_inventory && !loadNames.has(i.sub_inventory)
  ).length;

  const loadAssignments = {
    totalLoads: loads?.length || 0,
    itemsWithLoads,
    loadsWithMetadata: loads?.length || 0,
    orphanedLoadAssignments,
  };

  // 5. Scan Coverage - query product_location_history table
  const { data: scans } = await supabase
    .from('product_location_history')
    .select('inventory_item_id, created_at')
    .eq('company_id', companyId)
    .eq('location_id', locationId)
    .not('inventory_item_id', 'is', null);

  const scannedItemIds = new Set(
    (scans || []).map(s => s.inventory_item_id).filter(Boolean)
  );

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const scannedItemIdsLast30Days = new Set(
    (scans || [])
      .filter(s => new Date(s.created_at) > thirtyDaysAgo)
      .map(s => s.inventory_item_id)
      .filter(Boolean)
  );

  const itemsWithScans = inventoryItems.filter(i => scannedItemIds.has(i.id)).length;
  const scannedLast30Days = inventoryItems.filter(i => scannedItemIdsLast30Days.has(i.id)).length;
  const neverScanned = inventoryItems.length - itemsWithScans;

  const scanCoverage = {
    totalItems: inventoryItems.length,
    itemsWithScans,
    scannedLast30Days,
    neverScanned,
    coveragePercent: inventoryItems.length > 0
      ? Math.round((itemsWithScans / inventoryItems.length) * 100)
      : 0,
  };

  // 6. Sync Health
  const { data: settings } = await supabase
    .from('settings')
    .select('last_sync_asis_at, last_sync_sta_at, last_sync_fg_at, last_sync_inbound_at, last_sync_orders_at')
    .eq('company_id', companyId)
    .eq('location_id', locationId)
    .single();

  const syncHealth = {
    lastSyncAsisAt: settings?.last_sync_asis_at || null,
    lastSyncStaAt: settings?.last_sync_sta_at || null,
    lastSyncFgAt: settings?.last_sync_fg_at || null,
    lastSyncInboundAt: settings?.last_sync_inbound_at || null,
    lastSyncOrdersAt: settings?.last_sync_orders_at || null,
  };

  return {
    inventoryIntegrity,
    productCatalog,
    orderLinkage,
    loadAssignments,
    scanCoverage,
    syncHealth,
  };
}

export function useDataQuality() {
  const { companyId, locationId } = getActiveLocationContext();

  return useQuery({
    queryKey: ['dataQuality', companyId, locationId],
    queryFn: () => fetchDataQuality(companyId, locationId),
    enabled: !!companyId && !!locationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 60 * 1000, // Refresh every minute
  });
}
