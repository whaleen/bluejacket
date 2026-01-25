import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Upload, ArrowLeft, Trash2 } from 'lucide-react';
import { getAllLoads, getLoadItemCount, getLoadConflictCount, deleteLoad } from '@/lib/loadManager';
import type { LoadMetadata } from '@/types/inventory';
import { LoadDetailPanel } from './LoadDetailPanel';
import { AppHeader } from '@/components/Navigation/AppHeader';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import { PageContainer } from '@/components/Layout/PageContainer';
import { Switch } from '@/components/ui/switch';
import supabase from '@/lib/supabase';
import { getActiveLocationContext } from '@/lib/tenant';
import { useAuth } from '@/context/AuthContext';
import { logActivity } from '@/lib/activityLog';

interface LoadWithCount extends LoadMetadata {
  item_count: number;
  conflict_count: number;
}

const GE_SYNC_URL =
  (import.meta.env.VITE_GE_SYNC_URL as string | undefined) ?? 'http://localhost:3001';
const GE_SYNC_API_KEY = import.meta.env.VITE_GE_SYNC_API_KEY as string | undefined;

interface LoadManagementViewProps {
  onMenuClick?: () => void;
}

export function LoadManagementView({ onMenuClick }: LoadManagementViewProps) {
  const { locationId, companyId } = getActiveLocationContext();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loads, setLoads] = useState<LoadWithCount[]>([]);
  const [loading, setLoading] = useState(false);
  const [importingLoads, setImportingLoads] = useState(false);
  const [syncConfirmOpen, setSyncConfirmOpen] = useState(false);
  const [wipeConfirmOpen, setWipeConfirmOpen] = useState(false);
  const [wipingAsis, setWipingAsis] = useState(false);
  const [preserveCustomFields, setPreserveCustomFields] = useState(true);
  const [pendingLoadSelection, setPendingLoadSelection] = useState<string | null>(null);

  // Filter state
  type LoadFilter = 'all' | 'for_sale' | 'picked' | 'shipped' | 'delivered';
  const [loadFilter, setLoadFilter] = useState<LoadFilter>('all');

  // Dialog states
  const [selectedLoadForDetail, setSelectedLoadForDetail] = useState<LoadMetadata | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [loadPendingDelete, setLoadPendingDelete] = useState<LoadMetadata | null>(null);

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

  const wipeAsisData = async () => {
    const { error: conflictError } = await supabase
      .from('load_conflicts')
      .delete()
      .eq('location_id', locationId)
      .eq('inventory_type', 'ASIS');
    if (conflictError) throw conflictError;

    const { error: loadError } = await supabase
      .from('load_metadata')
      .delete()
      .eq('location_id', locationId)
      .eq('inventory_type', 'ASIS');
    if (loadError) throw loadError;

    const { error: itemError } = await supabase
      .from('inventory_items')
      .delete()
      .eq('location_id', locationId)
      .eq('inventory_type', 'ASIS');
    if (itemError) throw itemError;

    const { error: changesError } = await supabase
      .from('ge_changes')
      .delete()
      .eq('location_id', locationId)
      .eq('inventory_type', 'ASIS');
    if (changesError) {
      console.warn('Failed to delete ge_changes for ASIS:', changesError.message);
    }
  };

  const fetchCustomLoadFields = async () => {
    const { data, error } = await supabase
      .from('load_metadata')
      .select(
        'sub_inventory_name, friendly_name, notes, primary_color, category, prep_tagged, prep_wrapped, pickup_date, pickup_tba'
      )
      .eq('location_id', locationId)
      .eq('inventory_type', 'ASIS');

    if (error) throw error;

    const map = new Map<string, {
      friendly_name: string | null;
      notes: string | null;
      primary_color: string | null;
      category: string | null;
      prep_tagged: boolean | null;
      prep_wrapped: boolean | null;
      pickup_date: string | null;
      pickup_tba: boolean | null;
    }>();

    (data ?? []).forEach((row) => {
      map.set(row.sub_inventory_name, {
        friendly_name: row.friendly_name ?? null,
        notes: row.notes ?? null,
        primary_color: row.primary_color ?? null,
        category: row.category ?? null,
        prep_tagged: row.prep_tagged ?? null,
        prep_wrapped: row.prep_wrapped ?? null,
        pickup_date: row.pickup_date ?? null,
        pickup_tba: row.pickup_tba ?? null,
      });
    });

    return map;
  };

  const restoreCustomLoadFields = async (map: Map<string, {
    friendly_name: string | null;
    notes: string | null;
    primary_color: string | null;
    category: string | null;
    prep_tagged: boolean | null;
    prep_wrapped: boolean | null;
    pickup_date: string | null;
    pickup_tba: boolean | null;
  }>) => {
    let restored = 0;
    for (const [loadNumber, fields] of map) {
      const { error } = await supabase
        .from('load_metadata')
        .update({ ...fields, updated_at: new Date().toISOString() })
        .eq('location_id', locationId)
        .eq('inventory_type', 'ASIS')
        .eq('sub_inventory_name', loadNumber);
      if (!error) restored += 1;
    }
    return restored;
  };

  const handleSyncAsis = async () => {
    if (importingLoads) return;
    setImportingLoads(true);
  
    try {
      const customFields = preserveCustomFields ? await fetchCustomLoadFields() : null;
      await wipeAsisData();

      const response = await fetch(`${GE_SYNC_URL}/sync/asis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(GE_SYNC_API_KEY ? { 'X-API-Key': GE_SYNC_API_KEY } : {}),
        },
        body: JSON.stringify({ locationId }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.success) {
        const errorMessage = payload?.error || response.statusText || 'Failed to sync loads';
        throw new Error(errorMessage);
      }

      const stats = payload.stats ?? {};
      const summary = [
        `Total items: ${stats.totalGEItems ?? 0}.`,
        `In loads: ${stats.itemsInLoads ?? 0}.`,
        `Unassigned: ${stats.unassignedItems ?? 0}.`,
        `New: ${stats.newItems ?? 0}.`,
        `Updated: ${stats.updatedItems ?? 0}.`,
        `For Sale loads: ${stats.forSaleLoads ?? 0}.`,
        `Picked loads: ${stats.pickedLoads ?? 0}.`,
      ].join(' ');

      if (customFields && customFields.size > 0) {
        const restored = await restoreCustomLoadFields(customFields);
        if (restored > 0) {
          toast({
            title: 'Custom fields restored',
            message: `${restored} load${restored === 1 ? '' : 's'} updated with preserved fields.`,
          });
        }
      }

      toast({
        title: 'ASIS synced',
        message: summary,
        duration: Infinity,
        dismissible: true,
      });

      const { error: activityError } = await logActivity({
        companyId,
        locationId,
        user,
        action: 'asis_sync',
        entityType: 'ASIS',
        details: {
          stats,
        },
      });
      if (activityError) {
        console.warn('Failed to log activity (asis_sync):', activityError.message);
      }
  
      fetchLoads();
    } catch (err) {
      console.error('Failed to sync ASIS:', err);
      toast({
        variant: 'error',
        title: 'ASIS sync failed',
        message: err instanceof Error ? err.message : 'Unable to sync ASIS.',
      });
    } finally {
      setImportingLoads(false);
      setSyncConfirmOpen(false);
    }
  };

  const handleWipeAsis = async () => {
    if (wipingAsis) return;
    setWipingAsis(true);
    try {
      await wipeAsisData();

      toast({
        title: 'ASIS cleared',
        message: 'All ASIS items, loads, conflicts, and changes were removed.',
      });

      const { error: activityError } = await logActivity({
        companyId,
        locationId,
        user,
        action: 'asis_wipe',
        entityType: 'ASIS',
      });
      if (activityError) {
        console.warn('Failed to log activity (asis_wipe):', activityError.message);
      }
      fetchLoads();
    } catch (err) {
      console.error('Failed to wipe ASIS:', err);
      toast({
        variant: 'error',
        title: 'Wipe failed',
        message: err instanceof Error ? err.message : 'Unable to wipe ASIS.',
      });
    } finally {
      setWipingAsis(false);
      setWipeConfirmOpen(false);
    }
  };
  

  useEffect(() => {
    fetchLoads();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const loadParam = params.get('load');
    if (loadParam) {
      setPendingLoadSelection(loadParam);
    }
  }, []);

  useEffect(() => {
    if (!pendingLoadSelection || loads.length === 0) return;
    const match = loads.find((load) => load.sub_inventory_name === pendingLoadSelection);
    if (match) {
      setSelectedLoadForDetail(match);
      setPendingLoadSelection(null);
    }
  }, [pendingLoadSelection, loads]);

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
                size="responsive"
                variant="outline"
                onClick={() => setSyncConfirmOpen(true)}
                disabled={importingLoads || wipingAsis}
              >
                {importingLoads ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                Sync ASIS
              </Button>
              <Button
                size="responsive"
                variant="destructive"
                onClick={() => setWipeConfirmOpen(true)}
                disabled={importingLoads || wipingAsis}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Wipe ASIS
              </Button>
            </div>
          }
        />

        <PageContainer className="py-4 space-y-4 pb-24">
          {/* Filter Tabs */}
          {!loading && loads.length > 0 && (
            <div className={`flex flex-wrap gap-2 ${selectedLoadForDetail ? 'hidden lg:flex' : ''}`}>
              {([
                { key: 'all', label: 'All' },
                { key: 'for_sale', label: 'For Sale' },
                { key: 'picked', label: 'Picked' },
                { key: 'shipped', label: 'Shipped' },
                { key: 'delivered', label: 'Delivered' },
              ] as const).map(({ key, label }) => {
                const count = loads.filter((load) => {
                  if (key === 'all') return true;
                  if (key === 'for_sale') return normalizeGeStatus(load.ge_source_status) === 'for sale';
                  return (
                    normalizeGeStatus(load.ge_source_status) === 'sold' &&
                    normalizeGeStatus(load.ge_cso_status) === key
                  );
                }).length;
                return (
                  <Button
                    key={key}
                    size="responsive"
                    variant={loadFilter === key ? 'default' : 'outline'}
                    onClick={() => setLoadFilter(key)}
                    className="h-8"
                  >
                    {label}
                    <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                      {count}
                    </Badge>
                  </Button>
                );
              })}
            </div>
          )}

          {/* Load List */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : loads.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <p>No loads found</p>
              <p className="text-sm mt-2">Sync ASIS to pull loads from GE.</p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
              {/* Load List - hidden on mobile when a load is selected */}
              <div className={`space-y-2 ${selectedLoadForDetail ? 'hidden lg:block' : ''}`}>
                {loads
                  .filter((load) => {
                    if (loadFilter === 'all') return true;
                    if (loadFilter === 'for_sale') return normalizeGeStatus(load.ge_source_status) === 'for sale';
                    return (
                      normalizeGeStatus(load.ge_source_status) === 'sold' &&
                      normalizeGeStatus(load.ge_cso_status) === loadFilter
                    );
                  })
                  .map((load) => {
                  const isSold = isSoldStatus(load.ge_source_status);
                  const prepCount = getPrepCount(load);
                  const readyForPickup = isReadyForPickup(load);
                  const pickupLabel = load.pickup_tba
                    ? 'Pickup: TBA'
                    : load.pickup_date
                      ? `Pickup: ${formatPickupDate(load.pickup_date)}`
                      : '';
                  const csoValue = load.ge_cso?.trim() || '';
                  const csoHead = csoValue.length > 4 ? csoValue.slice(0, -4) : '';
                  const csoTail = csoValue.length > 4 ? csoValue.slice(-4) : csoValue;
                  const listTitle = load.friendly_name || load.sub_inventory_name;
                  const notesValue = load.notes?.trim() ? { label: null, value: load.notes } : null;

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
                        <div className="flex items-start gap-2 flex-wrap">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              {load.primary_color && (
                                <span
                                  className="h-4 w-4 rounded-sm border border-border/60"
                                  style={{ backgroundColor: load.primary_color }}
                                  aria-hidden="true"
                                />
                              )}
                              <h3 className="font-semibold">{listTitle}</h3>
                            </div>
                            {csoValue && (
                              <div className="text-sm font-medium text-foreground">
                                <span className="text-muted-foreground">CSO </span>
                                {csoHead && <span className="font-light text-muted-foreground">{csoHead}</span>}
                                <span className="font-semibold underline decoration-dotted underline-offset-2">
                                  {csoTail}
                                </span>
                              </div>
                            )}
                          </div>
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
                        {notesValue && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {notesValue.value}
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                );
                })}
              </div>

              {/* Load Detail Panel - on mobile, shown with back button when selected */}
              <div className={`min-h-[200px] ${selectedLoadForDetail ? '' : 'hidden lg:block'}`}>
                {selectedLoadForDetail ? (
                  <div className="space-y-3">
                    {/* Back button - mobile only */}
                    <Button
                      variant="ghost"
                      size="responsive"
                      className="lg:hidden -ml-2"
                      onClick={() => setSelectedLoadForDetail(null)}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to loads
                    </Button>
                    <LoadDetailPanel
                      load={selectedLoadForDetail}
                      allLoads={loads}
                      onClose={() => setSelectedLoadForDetail(null)}
                      onDelete={handleDeleteClick}
                      onMetaUpdated={(updates) => {
                        setLoads((prev) =>
                          prev.map((entry) =>
                            entry.id === selectedLoadForDetail.id
                              ? { ...entry, ...updates }
                              : entry
                          )
                        );
                        setSelectedLoadForDetail((prev) =>
                          prev ? { ...prev, ...updates } : prev
                        );
                      }}
                    />
                  </div>
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

      <ConfirmDialog
        open={syncConfirmOpen}
        onOpenChange={setSyncConfirmOpen}
        title="Sync ASIS from GE?"
        description="This will delete all ASIS items, loads, conflicts, and change logs for this location, then fetch fresh ASIS data from GE."
        confirmText={importingLoads ? 'Syncing...' : 'Sync ASIS'}
        cancelText="Cancel"
        destructive
        onConfirm={handleSyncAsis}
      >
        <div className="flex items-start gap-3">
          <Switch
            id="preserve-custom-fields"
            checked={preserveCustomFields}
            onCheckedChange={setPreserveCustomFields}
            disabled={importingLoads}
          />
          <div className="space-y-1">
            <label htmlFor="preserve-custom-fields" className="text-sm font-medium">
              Preserve custom load fields
            </label>
            <p className="text-xs text-muted-foreground">
              Keeps friendly name, notes, primary color, salvage, prep, and pickup details.
            </p>
          </div>
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={wipeConfirmOpen}
        onOpenChange={setWipeConfirmOpen}
        title="Wipe all ASIS data?"
        description="This deletes all ASIS items, loads, conflicts, and change logs for this location. This cannot be undone."
        confirmText={wipingAsis ? 'Wiping...' : 'Wipe ASIS'}
        cancelText="Cancel"
        destructive
        onConfirm={handleWipeAsis}
      />
    </>
  );
}
