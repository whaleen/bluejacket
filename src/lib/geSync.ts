/**
 * GE Data Sync Utility
 *
 * Handles reconciliation between GE DMS data and our database.
 * - Preserves custom fields (is_scanned, scanned_at, scanned_by)
 * - Sets sub_inventory based on load assignments
 * - Detects orphans (items in DB but not in GE)
 */

import { SupabaseClient } from '@supabase/supabase-js';
import type { InventoryItem } from '@/types/inventory';

// GE JSON file types
interface GEInventoryItem {
  'Model #': string;
  'Serial #': string;
  'Inv Qty': string;
  'Availability Status': string;
  'Availability Message': string;
}

interface GELoadMetadata {
  'Load Number': string;
  Units: string;
  Notes: string;
  'Scanned Date/Time': string;
  Status: string;
}

interface GELoadItem {
  ORDC: string;
  MODELS: string;
  SERIALS: string;
  QTY: string;
  'LOAD NUMBER': string;
}

interface GEReportHistoryItem {
  'Inv Org': string;
  'Load Number': string;
  'Submitted Date': string;
  CSO: string;
  Status: string;
  Pricing: string;
  'CSO Status': string;
  Units: string;
}

export interface GESyncStats {
  totalGEItems: number;
  itemsInLoads: number;
  unassignedItems: number;
  newItems: number;
  updatedItems: number;
  orphanedItems: number;
  forSaleLoads: number;
  pickedLoads: number;
}

export interface GELoadInfo {
  loadNumber: string;
  status: string;
  csoStatus: string;
  units: number;
  notes?: string;
  submittedDate?: string;
  cso?: string;
}

export interface GESyncResult {
  stats: GESyncStats;
  itemsToUpsert: Partial<InventoryItem>[];
  orphanIds: string[];
  loadInfo: GELoadInfo[];
}

const GE_BASE_URL = '/ASIS';

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${GE_BASE_URL}/${path}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}: ${response.status}`);
  }
  return response.json();
}

/**
 * Fetches all GE data and builds a mapping of serial -> load assignment
 */
export async function fetchGEData(): Promise<{
  inventory: GEInventoryItem[];
  serialToLoad: Map<string, string>;
  loadInfo: GELoadInfo[];
}> {
  // Fetch master inventory and load metadata in parallel
  const [inventory, loadMetadata, reportHistory] = await Promise.all([
    fetchJson<GEInventoryItem[]>('ASIS.json'),
    fetchJson<GELoadMetadata[]>('ASISLoadData.json'),
    fetchJson<GEReportHistoryItem[]>('ASISReportHistoryData.json'),
  ]);

  // Build load info from report history (has more details like CSO status)
  const loadInfoMap = new Map<string, GELoadInfo>();
  for (const load of reportHistory) {
    loadInfoMap.set(load['Load Number'], {
      loadNumber: load['Load Number'],
      status: load.Status,
      csoStatus: load['CSO Status'],
      units: parseInt(load.Units, 10) || 0,
      submittedDate: load['Submitted Date'] || undefined,
      cso: load.CSO || undefined,
    });
  }

  // Merge notes from ASISLoadData (only has FOR SALE loads)
  for (const load of loadMetadata) {
    const existing = loadInfoMap.get(load['Load Number']);
    if (existing) {
      existing.notes = load.Notes;
    }
  }

  const loadInfo = Array.from(loadInfoMap.values());

  // Identify loads that are still on the floor (FOR SALE or SOLD+Picked)
  const loadsOnFloor = loadInfo.filter(
    (l) => l.status === 'FOR SALE' || (l.status === 'SOLD' && l.csoStatus === 'Picked')
  );

  // Fetch item lists for all on-floor loads
  const serialToLoad = new Map<string, string>();

  // Load items from ASISReportHistoryData directory (has all loads)
  const loadItemPromises = loadsOnFloor.map(async (load) => {
    try {
      const items = await fetchJson<GELoadItem[]>(
        `ASISReportHistoryData/${load.loadNumber}.json`
      );
      return { loadNumber: load.loadNumber, items };
    } catch {
      // Try ASISLoadData directory as fallback (FOR SALE loads only)
      try {
        const items = await fetchJson<GELoadItem[]>(
          `ASISLoadData/${load.loadNumber}.json`
        );
        return { loadNumber: load.loadNumber, items };
      } catch {
        console.warn(`Could not fetch items for load ${load.loadNumber}`);
        return { loadNumber: load.loadNumber, items: [] };
      }
    }
  });

  const loadItemResults = await Promise.all(loadItemPromises);

  for (const { loadNumber, items } of loadItemResults) {
    for (const item of items) {
      const serial = item.SERIALS?.trim();
      if (serial) {
        serialToLoad.set(serial, loadNumber);
      }
    }
  }

  return { inventory, serialToLoad, loadInfo };
}

/**
 * Calculates sync stats without modifying the database
 * Useful for showing unassigned count in UI
 */
export async function calculateGESyncStats(): Promise<{
  totalItems: number;
  itemsInLoads: number;
  unassignedItems: number;
  forSaleLoads: number;
  pickedLoads: number;
  loadInfo: GELoadInfo[];
}> {
  const { inventory, serialToLoad, loadInfo } = await fetchGEData();

  const totalItems = inventory.length;
  let itemsInLoads = 0;

  for (const item of inventory) {
    const serial = item['Serial #']?.trim();
    if (serial && serialToLoad.has(serial)) {
      itemsInLoads++;
    }
  }

  const forSaleLoads = loadInfo.filter((l) => l.status === 'FOR SALE').length;
  const pickedLoads = loadInfo.filter(
    (l) => l.status === 'SOLD' && l.csoStatus === 'Picked'
  ).length;

  return {
    totalItems,
    itemsInLoads,
    unassignedItems: totalItems - itemsInLoads,
    forSaleLoads,
    pickedLoads,
    loadInfo,
  };
}

/**
 * Prepares a full sync operation, returning what would be changed
 */
export async function prepareGESync(
  supabase: SupabaseClient,
  companyId: string,
  locationId: string,
  productLookup: Map<string, { id: string; product_type: string }>
): Promise<GESyncResult> {
  const { inventory, serialToLoad, loadInfo } = await fetchGEData();

  // Fetch existing ASIS items from DB
  const { data: existingItems, error } = await supabase
    .from('inventory_items')
    .select('id, serial, sub_inventory, is_scanned, scanned_at, scanned_by, notes, status')
    .eq('company_id', companyId)
    .eq('location_id', locationId)
    .eq('inventory_type', 'ASIS');

  if (error) {
    throw new Error(`Failed to fetch existing items: ${error.message}`);
  }

  // Build map of existing items keyed by serial (single record per serial)
  const existingBySerial = new Map<string, string>();
  const existingIds = new Set<string>();

  for (const item of existingItems || []) {
    if (!item.serial || !item.id) continue;
    if (!existingBySerial.has(item.serial)) {
      existingBySerial.set(item.serial, item.id);
    }
    existingIds.add(item.id);
  }

  // Build upsert payload
  const itemsToUpsert: Partial<InventoryItem>[] = [];
  let newItems = 0;
  let updatedItems = 0;
  let itemsInLoads = 0;
  const matchedIds = new Set<string>();

  for (const geItem of inventory) {
    const serial = geItem['Serial #']?.trim();
    if (!serial) continue;

    const model = geItem['Model #']?.trim() || '';
    const product = productLookup.get(model);
    const loadNumber = serialToLoad.get(serial);
    const existingId = existingBySerial.get(serial);

    if (loadNumber) {
      itemsInLoads++;
    }

    if (existingId) {
      matchedIds.add(existingId);
      updatedItems++;
    } else {
      newItems++;
    }

    const qtyValue = parseInt(geItem['Inv Qty'], 10);
    itemsToUpsert.push({
      id: existingId,
      company_id: companyId,
      location_id: locationId,
      serial,
      model,
      cso: 'ASIS',
      qty: Number.isFinite(qtyValue) && qtyValue > 0 ? qtyValue : 1,
      product_type: product?.product_type ?? 'UNKNOWN',
      product_fk: product?.id,
      inventory_type: 'ASIS',
      sub_inventory: loadNumber || undefined,
      ge_model: model || undefined,
      ge_serial: serial,
      ge_inv_qty: Number.isFinite(qtyValue) ? qtyValue : undefined,
      is_scanned: false,
      scanned_at: undefined,
      scanned_by: undefined,
      notes: undefined,
      status: undefined,
      ge_orphaned: false,
      ge_orphaned_at: undefined,
      // GE-sourced fields
      ge_availability_status: geItem['Availability Status']?.trim() || undefined,
      ge_availability_message: geItem['Availability Message']?.trim() || undefined,
    });
  }

  // Find orphans (existing items not matched to incoming rows)
  const orphanIds: string[] = [];
  for (const id of existingIds) {
    if (!matchedIds.has(id)) {
      orphanIds.push(id);
    }
  }

  const forSaleLoads = loadInfo.filter((l) => l.status === 'FOR SALE').length;
  const pickedLoads = loadInfo.filter(
    (l) => l.status === 'SOLD' && l.csoStatus === 'Picked'
  ).length;

  return {
    stats: {
      totalGEItems: inventory.length,
      itemsInLoads,
      unassignedItems: inventory.length - itemsInLoads,
      newItems,
      updatedItems,
      orphanedItems: orphanIds.length,
      forSaleLoads,
      pickedLoads,
    },
    itemsToUpsert,
    orphanIds,
    loadInfo,
  };
}

/**
 * Executes the sync, upserting items and optionally handling orphans
 */
export async function executeGESync(
  supabase: SupabaseClient,
  syncResult: GESyncResult,
  options: {
    batchSize?: number;
    markOrphans?: boolean;
    orphanStatus?: string;
  } = {}
): Promise<void> {
  const { batchSize = 500, markOrphans = false, orphanStatus = 'NOT_IN_GE' } = options;

  const itemsWithId = syncResult.itemsToUpsert.filter((item) => item.id);
  const itemsWithoutId = syncResult.itemsToUpsert
    .filter((item) => !item.id)
    .map(({ id, ...rest }) => rest);

  // Insert new items (no id yet)
  for (let i = 0; i < itemsWithoutId.length; i += batchSize) {
    const chunk = itemsWithoutId.slice(i, i + batchSize);
    const { error } = await supabase
      .from('inventory_items')
      .insert(chunk);

    if (error) {
      throw new Error(`Failed to insert batch ${i / batchSize + 1}: ${error.message}`);
    }
  }

  // Upsert existing items (by id)
  for (let i = 0; i < itemsWithId.length; i += batchSize) {
    const chunk = itemsWithId.slice(i, i + batchSize);
    const { error } = await supabase
      .from('inventory_items')
      .upsert(chunk, { onConflict: 'id' });

    if (error) {
      throw new Error(`Failed to upsert batch ${i / batchSize + 1}: ${error.message}`);
    }
  }

  // Optionally mark orphans
  if (syncResult.orphanIds.length > 0) {
    if (markOrphans) {
      const { error } = await supabase
        .from('inventory_items')
        .update({ status: orphanStatus, ge_orphaned: true, ge_orphaned_at: new Date().toISOString() })
        .in('id', syncResult.orphanIds);

      if (error) {
        throw new Error(`Failed to mark orphans: ${error.message}`);
      }
    }
  }
}
