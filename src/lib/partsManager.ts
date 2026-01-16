import supabase from './supabase';
import type {
  TrackedPart,
  TrackedPartWithDetails,
  InventoryCount,
  InventoryCountWithProduct,
  ReorderAlert,
  Product
} from '@/types/inventory';
import { getActiveLocationContext } from '@/lib/tenant';

/**
 * Get all tracked parts with their current quantities from inventory_items
 */
export async function getTrackedParts(): Promise<{
  data: TrackedPartWithDetails[] | null;
  error: any
}> {
  const { locationId } = getActiveLocationContext();
  // First get all tracked parts with product info
  const { data: trackedParts, error: trackedError } = await supabase
    .from('tracked_parts')
    .select(`
      *,
      products:product_id (
        id,
        model,
        product_type,
        brand,
        description,
        image_url
      )
    `)
    .eq('is_active', true)
    .eq('location_id', locationId)
    .order('created_at', { ascending: false });

  if (trackedError || !trackedParts) {
    return { data: null, error: trackedError };
  }

  // Get current quantities from inventory_items for these products
  const productIds = trackedParts.map(tp => tp.product_id);

  const { data: inventoryItems, error: invError } = await supabase
    .from('inventory_items')
    .select('id, product_fk, qty')
    .eq('location_id', locationId)
    .eq('inventory_type', 'Parts')
    .in('product_fk', productIds);

  if (invError) {
    return { data: null, error: invError };
  }

  // Create a map of product_id -> { qty, inventory_item_id }
  const qtyMap = new Map<string, { qty: number; id: string }>();
  inventoryItems?.forEach(item => {
    if (item.product_fk) {
      qtyMap.set(item.product_fk, { qty: item.qty || 0, id: item.id });
    }
  });

  // Merge the data
  const result: TrackedPartWithDetails[] = trackedParts.map(tp => ({
    ...tp,
    products: tp.products as Product,
    current_qty: qtyMap.get(tp.product_id)?.qty ?? 0,
    inventory_item_id: qtyMap.get(tp.product_id)?.id
  }));

  return { data: result, error: null };
}

/**
 * Add a part to tracking
 */
export async function addTrackedPart(
  productId: string,
  reorderThreshold: number = 5,
  createdBy?: string
): Promise<{ data: TrackedPart | null; error: any }> {
  const { locationId, companyId } = getActiveLocationContext();
  const { data, error } = await supabase
    .from('tracked_parts')
    .insert({
      company_id: companyId,
      location_id: locationId,
      product_id: productId,
      reorder_threshold: reorderThreshold,
      is_active: true,
      created_by: createdBy
    })
    .select()
    .single();

  return { data, error };
}

/**
 * Update reorder threshold for a tracked part
 */
export async function updateThreshold(
  trackedPartId: string,
  threshold: number
): Promise<{ success: boolean; error: any }> {
  const { locationId } = getActiveLocationContext();
  const { error } = await supabase
    .from('tracked_parts')
    .update({
      reorder_threshold: threshold,
      updated_at: new Date().toISOString()
    })
    .eq('id', trackedPartId)
    .eq('location_id', locationId);

  return { success: !error, error };
}

/**
 * Remove a part from tracking (soft delete - sets is_active to false)
 */
export async function removeTrackedPart(
  trackedPartId: string
): Promise<{ success: boolean; error: any }> {
  const { locationId } = getActiveLocationContext();
  const { error } = await supabase
    .from('tracked_parts')
    .update({
      is_active: false,
      updated_at: new Date().toISOString()
    })
    .eq('id', trackedPartId)
    .eq('location_id', locationId);

  return { success: !error, error };
}

/**
 * Mark a part as reordered (suppresses alert on dashboard)
 */
export async function markAsReordered(
  trackedPartId: string
): Promise<{ success: boolean; error: any }> {
  const { locationId } = getActiveLocationContext();
  const { error } = await supabase
    .from('tracked_parts')
    .update({
      reordered_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', trackedPartId)
    .eq('location_id', locationId);

  return { success: !error, error };
}

/**
 * Clear reordered status for a part
 */
export async function clearReorderedStatus(
  trackedPartId: string
): Promise<{ success: boolean; error: any }> {
  const { locationId } = getActiveLocationContext();
  const { error } = await supabase
    .from('tracked_parts')
    .update({
      reordered_at: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', trackedPartId)
    .eq('location_id', locationId);

  return { success: !error, error };
}

/**
 * Update part count - updates inventory_items.qty and creates a snapshot
 */
export async function updatePartCount(
  productId: string,
  newQty: number,
  countedBy?: string,
  notes?: string,
  reason?: 'usage' | 'return' | 'restock'
): Promise<{ success: boolean; error: any }> {
  const { locationId, companyId } = getActiveLocationContext();
  // Get current qty from inventory_items
  const { data: currentItem, error: fetchError } = await supabase
    .from('inventory_items')
    .select('id, qty')
    .eq('location_id', locationId)
    .eq('product_fk', productId)
    .eq('inventory_type', 'Parts')
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') {
    // PGRST116 is "no rows returned" - that's OK, we'll create one
    return { success: false, error: fetchError };
  }

  const previousQty = currentItem?.qty ?? 0;

  // Get the tracked_part_id for this product (with threshold and reordered status)
  const { data: trackedPart } = await supabase
    .from('tracked_parts')
    .select('id, reorder_threshold, reordered_at')
    .eq('product_id', productId)
    .eq('is_active', true)
    .eq('location_id', locationId)
    .single();

  // Update or create the inventory_items record
  if (currentItem) {
    const { error: updateError } = await supabase
      .from('inventory_items')
      .update({
        qty: newQty,
        updated_at: new Date().toISOString()
      })
      .eq('id', currentItem.id)
      .eq('location_id', locationId);

    if (updateError) {
      return { success: false, error: updateError };
    }
  } else {
    // Need to get product info to create inventory item
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('model, product_type')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return { success: false, error: productError || 'Product not found' };
    }

    const { error: insertError } = await supabase
      .from('inventory_items')
      .insert({
        company_id: companyId,
        location_id: locationId,
        product_fk: productId,
        model: product.model,
        product_type: product.product_type,
        qty: newQty,
        inventory_type: 'Parts',
        cso: `PART-${product.model}`,
        is_scanned: false
      });

    if (insertError) {
      return { success: false, error: insertError };
    }
  }

  // Create snapshot in inventory_counts
  const { error: snapshotError } = await supabase
    .from('inventory_counts')
    .insert({
      company_id: companyId,
      location_id: locationId,
      product_id: productId,
      tracked_part_id: trackedPart?.id,
      qty: newQty,
      previous_qty: previousQty,
      count_reason: reason ?? null,
      counted_by: countedBy,
      notes: notes
    });

  if (snapshotError) {
    console.error('Failed to create count snapshot:', snapshotError);
    // Don't fail the operation - the count was updated successfully
  }

  // If qty is now above threshold and part was marked as reordered, clear the status
  if (trackedPart && trackedPart.reordered_at && newQty > trackedPart.reorder_threshold) {
    await supabase
      .from('tracked_parts')
      .update({
        reordered_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', trackedPart.id)
      .eq('location_id', locationId);
  }

  return { success: true, error: null };
}

/**
 * Get count history for charts
 */
export async function getCountHistory(
  productId?: string,
  days: number = 30
): Promise<{ data: InventoryCount[] | null; error: any }> {
  const { locationId } = getActiveLocationContext();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  let query = supabase
    .from('inventory_counts')
    .select('*')
    .eq('location_id', locationId)
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: true });

  if (productId) {
    query = query.eq('product_id', productId);
  }

  const { data, error } = await query;

  return { data, error };
}

/**
 * Get count history with product pricing details
 */
export async function getCountHistoryWithProducts(
  productId?: string,
  days: number = 90
): Promise<{ data: InventoryCountWithProduct[] | null; error: any }> {
  const { locationId } = getActiveLocationContext();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  let query = supabase
    .from('inventory_counts')
    .select(`
      id,
      product_id,
      tracked_part_id,
      qty,
      previous_qty,
      delta,
      count_reason,
      counted_by,
      notes,
      created_at,
      products:product_id (
        model,
        price,
        msrp
      )
    `)
    .eq('location_id', locationId)
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: true });

  if (productId) {
    query = query.eq('product_id', productId);
  }

  const { data, error } = await query;

  return { data: data as InventoryCountWithProduct[] | null, error };
}

/**
 * Get all reorder alerts (parts below threshold)
 */
export async function getReorderAlerts(): Promise<{
  data: ReorderAlert[] | null;
  error: any
}> {
  const { locationId } = getActiveLocationContext();
  // Get all active tracked parts with product info
  const { data: trackedParts, error: trackedError } = await supabase
    .from('tracked_parts')
    .select(`
      id,
      product_id,
      reorder_threshold,
      reordered_at,
      products:product_id (
        model,
        description
      )
    `)
    .eq('is_active', true)
    .eq('location_id', locationId);

  if (trackedError || !trackedParts) {
    return { data: null, error: trackedError };
  }

  // Get current quantities
  const productIds = trackedParts.map(tp => tp.product_id);

  const { data: inventoryItems, error: invError } = await supabase
    .from('inventory_items')
    .select('product_fk, qty')
    .eq('location_id', locationId)
    .eq('inventory_type', 'Parts')
    .in('product_fk', productIds);

  if (invError) {
    return { data: null, error: invError };
  }

  // Create qty map
  const qtyMap = new Map<string, number>();
  inventoryItems?.forEach(item => {
    if (item.product_fk) {
      qtyMap.set(item.product_fk, item.qty || 0);
    }
  });

  // Filter to only parts below threshold
  const alerts: ReorderAlert[] = trackedParts
    .map(tp => {
      const currentQty = qtyMap.get(tp.product_id) ?? 0;
      // Handle both object and array responses from Supabase
      const rawProducts = tp.products;
      const products = Array.isArray(rawProducts) ? rawProducts[0] : rawProducts;

      return {
        tracked_part_id: tp.id,
        product_id: tp.product_id,
        model: products?.model ?? 'Unknown',
        description: products?.description,
        current_qty: currentQty,
        reorder_threshold: tp.reorder_threshold,
        is_critical: currentQty === 0,
        reordered_at: tp.reordered_at
      };
    })
    .filter(alert => alert.current_qty <= alert.reorder_threshold)
    .sort((a, b) => {
      // Sort critical (out of stock) first, then by qty ascending
      if (a.is_critical !== b.is_critical) {
        return a.is_critical ? -1 : 1;
      }
      return a.current_qty - b.current_qty;
    });

  return { data: alerts, error: null };
}

/**
 * Get all parts available to track (products where is_part=true or product_category='part')
 * that are not already being tracked
 */
export async function getAvailablePartsToTrack(options?: {
  searchTerm?: string;
  limit?: number;
}): Promise<{
  data: Product[] | null;
  error: any;
  meta?: {
    trackedMatches?: Product[];
  };
}> {
  const { locationId } = getActiveLocationContext();
  const searchTerm = options?.searchTerm?.trim();
  const limit = options?.limit ?? 1000;

  // Get already tracked product IDs
  const { data: tracked } = await supabase
    .from('tracked_parts')
    .select('product_id')
    .eq('is_active', true)
    .eq('location_id', locationId);

  const trackedIds = tracked?.map(t => t.product_id) ?? [];
  const trackedIdSet = new Set(trackedIds);

  // Get parts not already tracked
  let query = supabase
    .from('products')
    .select('id, model, product_type, brand, description, image_url')
    .order('model')
    .limit(limit);

  if (searchTerm) {
    // When searching, show any matching product (even if not flagged as a part)
    query = query.or(
      `model.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,brand.ilike.%${searchTerm}%`
    );
  } else {
    // Default list only includes parts
    query = query.or('is_part.eq.true,product_category.eq.part');
  }

  if (trackedIds.length > 0) {
    // Supabase doesn't have a NOT IN, so we filter client-side
    const { data, error } = await query;

    if (error) {
      return { data: null, error };
    }

    const filtered =
      data?.filter(p => !p.id || !trackedIdSet.has(p.id)) ?? [];
    const trackedMatches = searchTerm
      ? data?.filter(p => p.id && trackedIdSet.has(p.id)) ?? []
      : [];

    return { data: filtered, error: null, meta: { trackedMatches } };
  }

  const { data, error } = await query;
  const trackedMatches = searchTerm ? [] : [];
  return { data, error, meta: { trackedMatches } };
}

/**
 * Create snapshot records for the current quantities of tracked parts.
 */
export async function snapshotTrackedParts(
  parts: TrackedPartWithDetails[],
  countedBy?: string,
  notes: string = 'snapshot: manual'
): Promise<{ success: boolean; error: any; inserted: number }> {
  const { locationId, companyId } = getActiveLocationContext();
  if (parts.length === 0) {
    return { success: true, error: null, inserted: 0 };
  }

  const createdAt = new Date().toISOString();
  const rows = parts.map(part => ({
    company_id: companyId,
    location_id: locationId,
    product_id: part.product_id,
    tracked_part_id: part.id,
    qty: part.current_qty,
    previous_qty: part.current_qty,
    counted_by: countedBy,
    notes,
    created_at: createdAt
  }));

  const chunkSize = 500;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase.from('inventory_counts').insert(chunk);
    if (error) {
      return { success: false, error, inserted: i };
    }
  }

  return { success: true, error: null, inserted: rows.length };
}
