import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Upload } from 'lucide-react';
import { getAllLoads, getLoadItemCount, getLoadConflictCount, deleteLoad } from '@/lib/loadManager';
import type { LoadMetadata, InventoryItem } from '@/types/inventory';
import { RenameLoadDialog } from './RenameLoadDialog';
import { LoadDetailPanel } from './LoadDetailPanel';
import { AppHeader } from '@/components/Navigation/AppHeader';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import { PageContainer } from '@/components/Layout/PageContainer';
import supabase from '@/lib/supabase';
import { fetchAsisCsvRows, fetchAsisXlsRows } from '@/lib/asisImport';
import { getActiveLocationContext } from '@/lib/tenant';

interface LoadWithCount extends LoadMetadata {
  item_count: number;
  conflict_count: number;
}

type AsisLoadRow = {
  'Load Number': string;
  Units: string | number;
  Notes?: string;
  'Scanned Date/Time'?: string;
  Status?: string;
};

type AsisLoadItemRow = {
  ORDC: string;
  MODELS: string;
  SERIALS: string;
  QTY: string | number;
  'LOAD NUMBER': string;
};

type NormalizedAsisLoad = {
  loadNumber: string;
  units: number;
  notes: string;
  scannedAt: string;
  status: string;
};

const IMPORT_BATCH_SIZE = 500;

const chunkArray = <T,>(items: T[], size: number) => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

const parseAsisTimestamp = (value: string) => {
  if (!value) return 0;
  const match = value.match(/^(\d{4})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/);
  if (!match) return 0;
  const [, year, month, day, hour, minute, second] = match;
  return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`).getTime();
};

interface LoadManagementViewProps {
  onViewChange: (view: 'dashboard' | 'inventory' | 'products' | 'settings' | 'loads' | 'create-load') => void;
  onMenuClick?: () => void;
}

export function LoadManagementView({ onViewChange, onMenuClick }: LoadManagementViewProps) {
  const { locationId, companyId } = getActiveLocationContext();
  const { toast } = useToast();
  const [loads, setLoads] = useState<LoadWithCount[]>([]);
  const [loading, setLoading] = useState(false);
  const [importingLoads, setImportingLoads] = useState(false);

  // Dialog states
  const [selectedLoadForDetail, setSelectedLoadForDetail] = useState<LoadMetadata | null>(null);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [selectedLoadForRename, setSelectedLoadForRename] = useState<LoadMetadata | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [loadPendingDelete, setLoadPendingDelete] = useState<LoadMetadata | null>(null);

  const buildProductLookup = useCallback(async (models: string[]) => {
    const uniqueModels = Array.from(new Set(models.map(model => model.trim()).filter(Boolean)));
    const lookup = new Map<string, { id?: string; product_type?: string }>();
    for (const chunk of chunkArray(uniqueModels, 500)) {
      const { data, error } = await supabase
        .from('products')
        .select('id, model, product_type')
        .in('model', chunk);
      if (error) throw error;
      (data ?? []).forEach(product => {
        lookup.set(product.model, { id: product.id, product_type: product.product_type });
      });
    }
    return lookup;
  }, []);

  const fetchLoads = async () => {
    setLoading(true);
    const { data, error } = await getAllLoads();

    if (!error && data) {
      // Fetch item counts for each load
      const loadsWithCounts = await Promise.all(
        data.map(async (load) => {
          const [{ count: itemCount }, { count: conflictCount }] = await Promise.all([
            getLoadItemCount(load.inventory_type, load.sub_inventory_name),
            getLoadConflictCount(load.inventory_type, load.sub_inventory_name),
          ]);
          return { ...load, item_count: itemCount, conflict_count: conflictCount };
        })
      );
      setLoads(loadsWithCounts);
    }

    setLoading(false);
  };

  const handleImportLoads = async () => {
    if (importingLoads) return;
    setImportingLoads(true);
    try {
      const loadRows = await fetchAsisXlsRows<AsisLoadRow>('ASISLoadData.xls');
      const normalizedLoads: NormalizedAsisLoad[] = loadRows
        .map(row => {
          const loadNumber = String(row['Load Number'] ?? '').trim();
          if (!loadNumber) return null;
          const unitsValue = typeof row.Units === 'number' ? row.Units : parseInt(String(row.Units).trim(), 10);
          return {
            loadNumber,
            units: Number.isFinite(unitsValue) ? unitsValue : 0,
            notes: String(row.Notes ?? '').trim(),
            scannedAt: String(row['Scanned Date/Time'] ?? '').trim(),
            status: String(row.Status ?? '').trim(),
          };
        })
        .filter(Boolean) as NormalizedAsisLoad[];

      if (!normalizedLoads.length) {
        toast({
          title: 'No ASIS loads found',
          message: 'ASISLoadData.xls did not return any rows.',
        });
        return;
      }

      const loadNumbers = normalizedLoads.map(load => load.loadNumber);
      let existingLoadNumbers = new Set<string>();
      const existingLoadMap = new Map<string, { notes?: string | null; category?: string | null; ge_source_status?: string | null }>();
      if (loadNumbers.length) {
        const { data, error } = await supabase
          .from('load_metadata')
          .select('sub_inventory_name, notes, category, ge_source_status')
          .eq('location_id', locationId)
          .eq('inventory_type', 'ASIS')
          .in('sub_inventory_name', loadNumbers);
        if (error) throw error;
        existingLoadNumbers = new Set((data ?? []).map(load => load.sub_inventory_name));
        (data ?? []).forEach(load => {
          existingLoadMap.set(load.sub_inventory_name, {
            notes: load.notes,
            category: load.category,
            ge_source_status: load.ge_source_status,
          });
        });
      }

      const newLoads = normalizedLoads
        .filter(load => !existingLoadNumbers.has(load.loadNumber))
        .map(load => ({
          company_id: companyId,
          location_id: locationId,
          inventory_type: 'ASIS',
          sub_inventory_name: load.loadNumber,
          ge_source_status: load.status ? load.status : null,
          status: 'active',
          notes: [load.notes, load.scannedAt].filter(Boolean).join(' • ') || null,
        }));

      if (newLoads.length) {
        const { error } = await supabase.from('load_metadata').insert(newLoads);
        if (error) throw error;
      }

      let updatedLoadsCount = 0;
      if (existingLoadNumbers.size > 0) {
        for (const load of normalizedLoads) {
          if (!existingLoadNumbers.has(load.loadNumber)) continue;
          const existing = existingLoadMap.get(load.loadNumber);
          const updates: Record<string, string | null> = {};
          if (load.status) {
            updates.ge_source_status = load.status;
          }
          const incomingNotes = [load.notes, load.scannedAt].filter(Boolean).join(' • ') || null;
          if ((!existing?.notes || existing.notes.trim() === '') && incomingNotes) {
            updates.notes = incomingNotes;
          }

          const shouldUpdate =
            (updates.ge_source_status !== undefined &&
              updates.ge_source_status !== (existing?.ge_source_status ?? null)) ||
            (updates.notes !== undefined);

          if (shouldUpdate) {
            const { error: updateError } = await supabase
              .from('load_metadata')
              .update({ ...updates, updated_at: new Date().toISOString() })
              .eq('location_id', locationId)
              .eq('inventory_type', 'ASIS')
              .eq('sub_inventory_name', load.loadNumber);
            if (updateError) throw updateError;
            updatedLoadsCount += 1;
          }
        }
      }

      if (loadNumbers.length) {
        const { error: unassignError } = await supabase
          .from('inventory_items')
          .update({ sub_inventory: null, updated_at: new Date().toISOString() })
          .eq('location_id', locationId)
          .eq('inventory_type', 'ASIS')
          .in('sub_inventory', loadNumbers);
        if (unassignError) throw unassignError;
      }

      const loadItemRows: Array<{ row: AsisLoadItemRow; load: NormalizedAsisLoad }> = [];
      const loadErrors: string[] = [];
      const loadIndexByNumber = new Map<string, number>();
      const loadTimestampByNumber = new Map<string, number>();
      normalizedLoads.forEach((load, index) => {
        loadIndexByNumber.set(load.loadNumber, index);
        loadTimestampByNumber.set(load.loadNumber, parseAsisTimestamp(load.scannedAt));
      });
      for (const load of normalizedLoads) {
        try {
          const rows = await fetchAsisCsvRows<AsisLoadItemRow>(`${load.loadNumber}.csv`);
          rows.forEach(row => loadItemRows.push({ row, load }));
        } catch (err) {
          loadErrors.push(`${load.loadNumber}: ${err instanceof Error ? err.message : 'Failed to load CSV.'}`);
        }
      }

      const loadModels = loadItemRows
        .map(item => String(item.row.MODELS ?? '').trim())
        .filter(Boolean);
      const productLookup = await buildProductLookup(loadModels);

      const serialCandidates = new Map<
        string,
        Array<{
          item: InventoryItem;
          loadNumber: string;
          loadIndex: number;
          loadTimestamp: number;
        }>
      >();
      const noSerialItems: InventoryItem[] = [];
      const conflictRows: Array<{ serial: string; loadNumber: string; conflictingLoad: string }> = [];
      loadItemRows.forEach(({ row, load }) => {
        const model = String(row.MODELS ?? '').trim();
        if (!model) return;
        const serialValue = String(row.SERIALS ?? '').trim();
        const qtyValue = typeof row.QTY === 'number' ? row.QTY : parseInt(String(row.QTY).trim(), 10);
        const product = productLookup.get(model);
        const item: InventoryItem = {
          cso: String(row.ORDC ?? '').trim() || 'ASIS',
          model,
          qty: Number.isFinite(qtyValue) && qtyValue > 0 ? qtyValue : 1,
          serial: serialValue || undefined,
          product_type: product?.product_type ?? 'UNKNOWN',
          product_fk: product?.id,
          notes: load.notes || undefined,
          inventory_type: 'ASIS',
          sub_inventory: load.loadNumber,
          is_scanned: false,
        };

        if (!serialValue) {
          noSerialItems.push(item);
          return;
        }

        const candidates = serialCandidates.get(serialValue) ?? [];
        candidates.push({
          item,
          loadNumber: load.loadNumber,
          loadIndex: loadIndexByNumber.get(load.loadNumber) ?? 0,
          loadTimestamp: loadTimestampByNumber.get(load.loadNumber) ?? 0,
        });
        serialCandidates.set(serialValue, candidates);
      });

      const dedupedItems: InventoryItem[] = [...noSerialItems];
      serialCandidates.forEach((candidates, serial) => {
        let canonical = candidates[0];
        candidates.forEach(candidate => {
          if (candidate.loadTimestamp > canonical.loadTimestamp) {
            canonical = candidate;
            return;
          }
          if (
            candidate.loadTimestamp === canonical.loadTimestamp &&
            candidate.loadIndex > canonical.loadIndex
          ) {
            canonical = candidate;
          }
        });

        dedupedItems.push(canonical.item);
        const uniqueLoads = new Set(candidates.map(candidate => candidate.loadNumber));
        if (uniqueLoads.size > 1) {
          candidates.forEach(candidate => {
            if (candidate.loadNumber !== canonical.loadNumber) {
              conflictRows.push({
                serial,
                loadNumber: candidate.loadNumber,
                conflictingLoad: canonical.loadNumber,
              });
            }
          });
        }
      });

      const payload = dedupedItems.map(item => ({
        ...item,
        company_id: companyId,
        location_id: locationId,
      }));

      for (const chunk of chunkArray(payload, IMPORT_BATCH_SIZE)) {
        const { error } = await supabase
          .from('inventory_items')
          .upsert(chunk, { onConflict: 'serial' });
        if (error) throw error;
      }

      if (loadNumbers.length) {
        const { error } = await supabase
          .from('load_conflicts')
          .delete()
          .eq('location_id', locationId)
          .eq('inventory_type', 'ASIS')
          .in('load_number', loadNumbers);
        if (error) throw error;
      }

      if (conflictRows.length > 0) {
        const conflictPayload = conflictRows.map(conflict => ({
          company_id: companyId,
          location_id: locationId,
          inventory_type: 'ASIS',
          load_number: conflict.loadNumber,
          serial: conflict.serial,
          conflicting_load: conflict.conflictingLoad,
          status: 'open',
        }));
        for (const chunk of chunkArray(conflictPayload, IMPORT_BATCH_SIZE)) {
          const { error } = await supabase
            .from('load_conflicts')
            .upsert(chunk, { onConflict: 'location_id,load_number,serial' });
          if (error) throw error;
        }
      }

      const existingLoadsCount = normalizedLoads.length - newLoads.length;
      const summaryBase = [
        `Loads in file: ${normalizedLoads.length}.`,
        `Existing loads: ${existingLoadsCount}.`,
        `New loads: ${newLoads.length}.`,
        `Updated loads: ${updatedLoadsCount}.`,
        `Items processed: ${dedupedItems.length}.`,
      ].join(' ');
      const noChanges = newLoads.length === 0 && updatedLoadsCount === 0;
      const summaryMessage = noChanges
        ? `${summaryBase} No new load metadata from GE.`
        : summaryBase;

      toast({
        title: 'ASIS loads imported',
        message: summaryMessage,
        duration: Infinity,
        dismissible: true,
      });

      if (conflictRows.length > 0) {
        toast({
          variant: 'error',
          title: 'Serial conflicts detected',
          message: `${conflictRows.length} conflict${conflictRows.length === 1 ? '' : 's'} logged.`,
        });
      }

      if (loadErrors.length) {
        toast({
          variant: 'error',
          title: 'Some load CSVs failed',
          message: `${loadErrors.length} CSV files could not be read.`,
        });
      }

      fetchLoads();
    } catch (err) {
      console.error('Failed to import ASIS loads:', err);
      toast({
        variant: 'error',
        title: 'Load import failed',
        message: err instanceof Error ? err.message : 'Unable to import ASIS loads.',
      });
    } finally {
      setImportingLoads(false);
    }
  };

  useEffect(() => {
    fetchLoads();
  }, []);

  useEffect(() => {
    if (!selectedLoadForDetail) return;
    const updated = loads.find((load) => load.id === selectedLoadForDetail.id);
    if (!updated) {
      setSelectedLoadForDetail(null);
      return;
    }
    if (updated !== selectedLoadForDetail) {
      setSelectedLoadForDetail(updated);
    }
  }, [loads, selectedLoadForDetail]);

  const normalizeGeStatus = (status?: string | null) => status?.toLowerCase().trim() ?? '';
  const isSoldStatus = (status?: string | null) => {
    const normalized = normalizeGeStatus(status);
    return normalized.includes('sold');
  };
  const formatPickupDate = (value?: string | null) => {
    if (!value) return '';
    const base = value.slice(0, 10);
    const [year, month, day] = base.split('-').map(Number);
    if (!year || !month || !day) return base;
    return new Date(year, month - 1, day).toLocaleDateString();
  };

  const handleLoadClick = (load: LoadMetadata) => {
    setSelectedLoadForDetail((prev) => (prev?.id === load.id ? null : load));
  };

  const handleRenameClick = (load: LoadMetadata) => {
    setSelectedLoadForRename(load);
    setRenameDialogOpen(true);
  };

  const handleDeleteClick = (load: LoadMetadata) => {
    setLoadPendingDelete(load);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!loadPendingDelete) return;

    const { success, error } = await deleteLoad(
      loadPendingDelete.inventory_type,
      loadPendingDelete.sub_inventory_name,
      true // clearItems - set sub_inventory to null
    );

    if (success) {
      toast({
        message: `Deleted load "${loadPendingDelete.friendly_name || loadPendingDelete.sub_inventory_name}".`,
        variant: 'success',
      });
      if (selectedLoadForDetail?.id === loadPendingDelete.id) {
        setSelectedLoadForDetail(null);
      }
      fetchLoads();
    } else {
      toast({
        message: `Failed to delete load: ${error?.message || 'Unknown error'}`,
        variant: 'error',
      });
    }

    setLoadPendingDelete(null);
  };

  const getPrepCount = (load: LoadMetadata) =>
    (load.prep_tagged ? 1 : 0) + (load.prep_wrapped ? 1 : 0);

  const isReadyForPickup = (load: LoadMetadata) =>
    isSoldStatus(load.ge_source_status) &&
    Boolean(load.prep_tagged) &&
    Boolean(load.prep_wrapped) &&
    (Boolean(load.pickup_date) || Boolean(load.pickup_tba));

  return (
    <>
      <div className="min-h-screen bg-background">
        <AppHeader
          title="Load Management"
          onMenuClick={onMenuClick}
          actions={
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleImportLoads}
                disabled={importingLoads}
              >
                {importingLoads ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                Import loads
              </Button>
              <Button size="sm" onClick={() => onViewChange('create-load')}>
                <Plus className="mr-2 h-4 w-4" />
                New Load
              </Button>
            </div>
          }
        />

        <PageContainer className="py-4 space-y-4 pb-24">
          {/* Load List */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : loads.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <p>No loads found</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => onViewChange('create-load')}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create First Load
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
              <div className="space-y-2">
                {loads.map((load) => {
                  const isSold = isSoldStatus(load.ge_source_status);
                  const prepCount = getPrepCount(load);
                  const readyForPickup = isReadyForPickup(load);
                  const pickupLabel = load.pickup_tba
                    ? 'Pickup: TBA'
                    : load.pickup_date
                      ? `Pickup: ${formatPickupDate(load.pickup_date)}`
                      : '';

                  return (
                  <Card
                    key={load.id}
                    className={`p-4 transition cursor-pointer ${
                      selectedLoadForDetail?.id === load.id
                        ? 'border-primary/50 bg-primary/5'
                        : 'hover:bg-accent/30'
                    }`}
                    onClick={() => handleLoadClick(load)}
                    role="button"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {load.primary_color && (
                            <span
                              className="h-4 w-4 rounded-sm border border-border/60"
                              style={{ backgroundColor: load.primary_color }}
                              aria-hidden="true"
                            />
                          )}
                          <h3 className="font-semibold">{load.friendly_name || load.sub_inventory_name}</h3>
                          <Badge variant="outline">{load.inventory_type}</Badge>
                          {load.category && (
                            <Badge variant="secondary">{load.category}</Badge>
                          )}
                          {load.ge_source_status && (
                            <Badge variant="outline">GE: {load.ge_source_status}</Badge>
                          )}
                          {isSold && (
                            <Badge variant="outline">Prep {prepCount}/2</Badge>
                          )}
                          {readyForPickup && (
                            <Badge className="bg-green-500 text-white">Ready for pickup</Badge>
                          )}
                          {load.conflict_count > 0 && (
                            <Badge variant="destructive">
                              {load.conflict_count} conflict{load.conflict_count === 1 ? '' : 's'}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span>{load.item_count} items</span>
                          <span>Load # {load.sub_inventory_name}</span>
                          <span>Created {new Date(load.created_at!).toLocaleDateString()}</span>
                          {pickupLabel && <span>{pickupLabel}</span>}
                        </div>
                        {load.notes && (
                          <p className="text-sm text-muted-foreground mt-1">{load.notes}</p>
                        )}
                      </div>
                    </div>
                  </Card>
                );
                })}
              </div>

              <div className="min-h-[200px]">
                {selectedLoadForDetail ? (
                  <LoadDetailPanel
                    load={selectedLoadForDetail}
                    onClose={() => setSelectedLoadForDetail(null)}
                    onRename={handleRenameClick}
                    onDelete={handleDeleteClick}
                    onMetaUpdated={fetchLoads}
                  />
                ) : (
                  <Card className="p-6 text-sm text-muted-foreground">
                    Select a load to view details.
                  </Card>
                )}
              </div>
            </div>
          )}
        </PageContainer>
      </div>

      {selectedLoadForRename && (
        <RenameLoadDialog
          open={renameDialogOpen}
          onOpenChange={setRenameDialogOpen}
          load={selectedLoadForRename}
          onSuccess={fetchLoads}
        />
      )}

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) setLoadPendingDelete(null);
        }}
        title={
          loadPendingDelete
            ? `Delete load "${loadPendingDelete.friendly_name || loadPendingDelete.sub_inventory_name}"?`
            : "Delete load?"
        }
        description={
          loadPendingDelete
            ? `This removes the load metadata but keeps all ${loadPendingDelete.inventory_type} items. Items will no longer be assigned to this load.`
            : undefined
        }
        confirmText="Delete Load"
        cancelText="Keep Load"
        destructive
        onConfirm={confirmDelete}
      />
    </>
  );
}
