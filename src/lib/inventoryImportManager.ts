import supabase from '@/lib/supabase';
import { fetchAsisXlsRows } from '@/lib/asisImport';
import type { InventoryItem } from '@/types/inventory';

export type ProductImportSource = {
  fileName: string;
  baseUrl?: string;
  label: string;
  inventoryType: string;
  csoValue: string;
};

export type InventoryImportStats = {
  totalRows: number;
  processedRows: number;
  crossTypeSkipped: number;
};

type ProductImportRow = {
  'Model #'?: string | null;
  'Serial #'?: string | null;
  'Inv Qty'?: string | number | null;
  'Availability Status'?: string | null;
  'Availability Message'?: string | null;
};

const chunkArray = <T,>(items: T[], size: number) => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

const buildProductLookup = async (models: string[]) => {
  const uniqueModels = Array.from(new Set(models.map((model) => model.trim()).filter(Boolean)));
  const lookup = new Map<string, { id: string; product_type: string }>();

  for (const chunk of chunkArray(uniqueModels, 500)) {
    const { data, error } = await supabase
      .from('products')
      .select('id, model, product_type')
      .in('model', chunk);

    if (error) throw error;

    (data ?? []).forEach((product) => {
      if (product.id && product.product_type) {
        lookup.set(product.model, { id: product.id, product_type: product.product_type });
      }
    });
  }

  return lookup;
};

const findCrossTypeSerials = async (
  serials: string[],
  inventoryType: string,
  locationId: string
) => {
  if (!serials.length) return new Set<string>();
  const conflictSerials = new Set<string>();

  for (const chunk of chunkArray(serials, 500)) {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('serial, inventory_type')
      .eq('location_id', locationId)
      .in('serial', chunk)
      .neq('inventory_type', inventoryType);

    if (error) throw error;

    (data ?? []).forEach((row) => {
      if (row.serial) {
        conflictSerials.add(row.serial);
      }
    });
  }

  return conflictSerials;
};

export async function importInventorySnapshot(params: {
  source: ProductImportSource;
  locationId: string;
  companyId: string;
  batchSize?: number;
}): Promise<InventoryImportStats> {
  const { source, locationId, companyId, batchSize = 500 } = params;

  const rows = await fetchAsisXlsRows<ProductImportRow>(source.fileName, source.baseUrl);
  if (!rows.length) {
    return { totalRows: 0, processedRows: 0, crossTypeSkipped: 0 };
  }

  const models = rows
    .map((row) => String(row['Model #'] ?? '').trim())
    .filter(Boolean);
  const productLookup = await buildProductLookup(models);

  const inventoryItems = rows
    .map((row) => {
      const model = String(row['Model #'] ?? '').trim();
      if (!model) return null;
      const serialValue = String(row['Serial #'] ?? '').trim();
      const qtyValue =
        typeof row['Inv Qty'] === 'number'
          ? row['Inv Qty']
          : parseInt(String(row['Inv Qty'] ?? '').trim(), 10);
      const product = productLookup.get(model);
      return {
        cso: source.csoValue,
        model,
        qty: Number.isFinite(qtyValue) && qtyValue > 0 ? qtyValue : 1,
        serial: serialValue || undefined,
        product_type: product?.product_type ?? 'UNKNOWN',
        product_fk: product?.id,
        inventory_type: source.inventoryType,
        is_scanned: false,
        scanned_at: undefined,
        scanned_by: undefined,
        notes: undefined,
        status: undefined,
        ge_model: model || undefined,
        ge_serial: serialValue || undefined,
        ge_inv_qty: Number.isFinite(qtyValue) ? qtyValue : undefined,
        ge_availability_status: String(row['Availability Status'] ?? '').trim() || undefined,
        ge_availability_message: String(row['Availability Message'] ?? '').trim() || undefined,
        ge_orphaned: false,
        ge_orphaned_at: undefined,
      } as InventoryItem;
    })
    .filter(Boolean) as InventoryItem[];

  const incomingSerials = Array.from(
    new Set(inventoryItems.map((item) => item.serial).filter(Boolean))
  ) as string[];
  const crossTypeSerials = await findCrossTypeSerials(
    incomingSerials,
    source.inventoryType,
    locationId
  );

  const filteredItems = inventoryItems.filter(
    (item) => !item.serial || !crossTypeSerials.has(item.serial)
  );

  const uniqueBySerial = new Map<string, InventoryItem>();
  const itemsWithoutSerial: InventoryItem[] = [];
  filteredItems.forEach((item) => {
    if (!item.serial) {
      itemsWithoutSerial.push(item);
      return;
    }
    if (!uniqueBySerial.has(item.serial)) {
      uniqueBySerial.set(item.serial, item);
    }
  });

  const uniqueItems = [...itemsWithoutSerial, ...uniqueBySerial.values()];

  const { data: existingItems, error: existingError } = await supabase
    .from('inventory_items')
    .select('id, serial')
    .eq('location_id', locationId)
    .eq('inventory_type', source.inventoryType);

  if (existingError) throw existingError;

  const existingBySerial = new Map<string, string>();
  const existingIds = new Set<string>();

  (existingItems ?? []).forEach((item) => {
    if (!item.serial || !item.id) return;
    if (!existingBySerial.has(item.serial)) {
      existingBySerial.set(item.serial, item.id);
    }
    existingIds.add(item.id);
  });

  const matchedIds = new Set<string>();
  const payload = uniqueItems.map((item) => {
    if (!item.serial) {
      return {
        ...item,
        company_id: companyId,
        location_id: locationId,
      };
    }

    const existingId = existingBySerial.get(item.serial);
    if (existingId) {
      matchedIds.add(existingId);
    }

    return {
      ...item,
      id: existingId,
      company_id: companyId,
      location_id: locationId,
    };
  });

  const payloadWithId = payload.filter((item) => item.id);
  const payloadWithoutId = payload
    .filter((item) => !item.id)
    .map((item) => {
      const { id, ...rest } = item;
      void id;
      return rest;
    });

  for (const chunk of chunkArray(payloadWithoutId, batchSize)) {
    if (!chunk.length) continue;
    const { error } = await supabase.from('inventory_items').insert(chunk);
    if (error) throw error;
  }

  for (const chunk of chunkArray(payloadWithId, batchSize)) {
    if (!chunk.length) continue;
    const { error } = await supabase
      .from('inventory_items')
      .upsert(chunk, { onConflict: 'id' });
    if (error) throw error;
  }

  const orphanIds = Array.from(existingIds).filter((id) => !matchedIds.has(id));
  for (const chunk of chunkArray(orphanIds, batchSize)) {
    if (!chunk.length) continue;
    const { error } = await supabase
      .from('inventory_items')
      .update({ status: 'NOT_IN_GE', ge_orphaned: true, ge_orphaned_at: new Date().toISOString() })
      .in('id', chunk);
    if (error) throw error;
  }

  return {
    totalRows: rows.length,
    processedRows: inventoryItems.length,
    crossTypeSkipped: crossTypeSerials.size,
  };
}
