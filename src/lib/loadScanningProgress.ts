/**
 * Load Scanning Progress Tracking
 *
 * Automatically updates scanning progress counts when items are scanned/mapped
 */

import supabase from './supabase';
import { getActiveLocationContext } from './tenant';

/**
 * Update scanning progress for a load after scanning an item
 * Call this after successfully logging a product location
 */
export async function updateLoadScanningProgress(loadName: string): Promise<void> {
  const { locationId } = getActiveLocationContext();
  if (!locationId || !loadName) return;

  try {
    // Get total items in load
    const { count: totalCount, error: totalError } = await supabase
      .from('inventory_items')
      .select('*', { count: 'exact', head: true })
      .eq('location_id', locationId)
      .eq('sub_inventory', loadName);

    if (totalError) {
      console.error('Failed to count total items in load:', totalError);
      return;
    }

    // Get count of scanned items (items with location history)
    const { data: scannedItemIds, error: scannedError } = await supabase
      .from('product_location_history')
      .select('inventory_item_id')
      .eq('location_id', locationId)
      .not('inventory_item_id', 'is', null);

    if (scannedError) {
      console.error('Failed to count scanned items:', scannedError);
      return;
    }

    // Get unique scanned item IDs for this load
    const { data: loadItems, error: loadItemsError } = await supabase
      .from('inventory_items')
      .select('id')
      .eq('location_id', locationId)
      .eq('sub_inventory', loadName);

    if (loadItemsError) {
      console.error('Failed to get load items:', loadItemsError);
      return;
    }

    const loadItemIds = new Set((loadItems || []).map(item => item.id).filter(Boolean));
    const scannedIds = new Set(
      (scannedItemIds || []).map(row => row.inventory_item_id).filter(Boolean)
    );

    const scannedCount = Array.from(loadItemIds).filter(id => scannedIds.has(id)).length;
    const scanningComplete = scannedCount === (totalCount || 0) && (totalCount || 0) > 0;

    // Update load metadata
    const { error: updateError } = await supabase
      .from('load_metadata')
      .update({
        items_scanned_count: scannedCount,
        items_total_count: totalCount || 0,
        scanning_complete: scanningComplete,
      })
      .eq('location_id', locationId)
      .eq('sub_inventory_name', loadName);

    if (updateError) {
      console.error('Failed to update load scanning progress:', updateError);
    } else {
      console.log(`✅ Updated scanning progress for ${loadName}: ${scannedCount}/${totalCount}`);
    }
  } catch (error) {
    console.error('Error updating load scanning progress:', error);
  }
}

/**
 * Bulk update scanning progress for all loads at a location
 * Useful for recalculating progress after bulk operations
 */
export async function recalculateAllLoadScanningProgress(): Promise<void> {
  const { locationId } = getActiveLocationContext();
  if (!locationId) return;

  try {
    // Get all loads
    const { data: loads, error: loadsError } = await supabase
      .from('load_metadata')
      .select('sub_inventory_name')
      .eq('location_id', locationId);

    if (loadsError) {
      console.error('Failed to fetch loads:', loadsError);
      return;
    }

    // Update each load
    for (const load of loads || []) {
      await updateLoadScanningProgress(load.sub_inventory_name);
    }

    console.log(`✅ Recalculated scanning progress for ${loads?.length || 0} loads`);
  } catch (error) {
    console.error('Error recalculating load scanning progress:', error);
  }
}
