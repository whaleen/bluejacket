/**
 * Scanning Progress Updates
 * Updates server, Realtime broadcasts changes, UI updates via query invalidation (100-300ms)
 */

import { updateLoadScanningProgress } from '@/lib/loadScanningProgress';

/**
 * Update scanning progress when an item is scanned
 * Server updates, Realtime invalidates queries, UI refreshes automatically
 */
export async function optimisticScanItem(loadName: string) {
  if (!loadName) return;

  try {
    await updateLoadScanningProgress(loadName);
    // Realtime will invalidate queries → TanStack Query refetches → UI updates
  } catch (error) {
    console.error('Failed to sync scanning progress:', error);
  }
}

/**
 * Update when an item is unscanned/deleted
 */
export async function optimisticUnscanItem(loadName: string) {
  if (!loadName) return;

  try {
    await updateLoadScanningProgress(loadName);
  } catch (error) {
    console.error('Failed to sync scanning progress:', error);
  }
}

/**
 * Batch update multiple loads (for bulk operations)
 */
export async function optimisticBatchScan(loadNames: string[]) {
  const uniqueLoads = [...new Set(loadNames)];

  try {
    await Promise.all(
      uniqueLoads.map(loadName => updateLoadScanningProgress(loadName))
    );
  } catch (error) {
    console.error('Failed to sync batch scanning progress:', error);
  }
}
