import { useState, useEffect, type ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, Search, X, Edit, Trash2, Printer } from 'lucide-react';
import { getLoadWithItems, getLoadConflicts, updateLoadMetadata } from '@/lib/loadManager';
import type { LoadMetadata, InventoryItem, LoadConflict } from '@/types/inventory';
import { decodeHTMLEntities } from '@/lib/htmlUtils';
import { InventoryItemCard } from '@/components/Inventory/InventoryItemCard';
import { useToast } from '@/components/ui/toast';
import JsBarcode from 'jsbarcode';
import { Checkbox } from '@/components/ui/checkbox';

interface LoadDetailPanelProps {
  load: LoadMetadata;
  onClose?: () => void;
  onRename?: (load: LoadMetadata) => void;
  onDelete?: (load: LoadMetadata) => void;
  onMetaUpdated?: () => void;
}

export function LoadDetailPanel({
  load,
  onClose,
  onRename,
  onDelete,
  onMetaUpdated,
}: LoadDetailPanelProps) {
  const { toast } = useToast();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [conflicts, setConflicts] = useState<LoadConflict[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [prepTagged, setPrepTagged] = useState(false);
  const [prepWrapped, setPrepWrapped] = useState(false);
  const [pickupDate, setPickupDate] = useState('');
  const [pickupTba, setPickupTba] = useState(false);
  const [savingPrep, setSavingPrep] = useState(false);

  const fetchItems = async () => {
    setLoading(true);
    const [{ data }, { data: conflictData }] = await Promise.all([
      getLoadWithItems(load.inventory_type, load.sub_inventory_name),
      getLoadConflicts(load.inventory_type, load.sub_inventory_name),
    ]);
    if (data) setItems(data.items);
    setConflicts(conflictData);
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
    setSearchTerm('');
  }, [load.inventory_type, load.sub_inventory_name]);

  useEffect(() => {
    setPrepTagged(Boolean(load.prep_tagged));
    setPrepWrapped(Boolean(load.prep_wrapped));
    setPickupDate(load.pickup_date ? load.pickup_date.slice(0, 10) : '');
    setPickupTba(Boolean(load.pickup_tba));
  }, [load.prep_tagged, load.prep_wrapped, load.pickup_date, load.pickup_tba]);

  const filteredItems = items.filter((item) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      item.cso?.toLowerCase().includes(q) ||
      item.serial?.toLowerCase().includes(q) ||
      item.model?.toLowerCase().includes(q) ||
      (item.products as any)?.brand?.toLowerCase().includes(q)
    );
  });

  const uniqueCSOs = new Set(items.map((i) => i.cso).filter(Boolean)).size;
  const productTypeBreakdown = items.reduce((acc, item) => {
    acc[item.product_type] = (acc[item.product_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const getItemStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'available':
        return 'bg-emerald-500';
      case 'reserved':
        return 'bg-amber-500';
      case 'not available':
        return 'bg-red-500';
      case 'picked':
        return 'bg-blue-500';
      case 'shipped':
        return 'bg-purple-500';
      case 'delivered':
        return 'bg-green-500';
      case 'pending':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatPickupDate = (value: string) => {
    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) return value;
    return new Date(year, month - 1, day).toLocaleDateString();
  };

  const createdDate = load.created_at ? new Date(load.created_at).toLocaleDateString() : null;
  const displayName = load.friendly_name || load.sub_inventory_name;
  const normalizedGeStatus = load.ge_source_status?.toLowerCase().trim() ?? '';
  const isSold = normalizedGeStatus.includes('sold');
  const prepCount = (prepTagged ? 1 : 0) + (prepWrapped ? 1 : 0);
  const pickupLabel = pickupTba
    ? 'Pickup: TBA'
    : pickupDate
      ? `Pickup: ${formatPickupDate(pickupDate)}`
      : null;
  const isReadyForPickup =
    isSold && prepTagged && prepWrapped && Boolean(pickupDate || pickupTba);

  const escapeHtml = (value: string) =>
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const normalizeHexColor = (value?: string | null) => {
    if (!value) return null;
    const trimmed = value.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(trimmed) || /^#[0-9a-fA-F]{3}$/.test(trimmed)) {
      return trimmed;
    }
    return null;
  };

  const persistPrepUpdate = async (updates: {
    prep_tagged?: boolean;
    prep_wrapped?: boolean;
    pickup_date?: string | null;
    pickup_tba?: boolean;
  }) => {
    setSavingPrep(true);
    const { success, error } = await updateLoadMetadata(
      load.inventory_type,
      load.sub_inventory_name,
      updates
    );
    if (!success) {
      toast({
        variant: 'error',
        title: 'Failed to update load',
        message: error?.message || 'Unable to save prep details.',
      });
    } else {
      onMetaUpdated?.();
    }
    setSavingPrep(false);
  };

  const deriveCsoFromLoadNumber = (value: string) => {
    if (!value) return '';
    let result = value.trim();
    if (result.startsWith('9SU')) {
      result = result.slice(3);
    }
    if (result.startsWith('2025') || result.startsWith('2026')) {
      result = result.slice(4);
    }
    return result;
  };

  const renderBarcodeSvg = (value: string) => {
    if (!value) return '';
    try {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      JsBarcode(svg, value, {
        format: 'CODE128',
        displayValue: false,
        height: 50,
        margin: 0,
        width: 2,
      });
      svg.setAttribute('preserveAspectRatio', 'xMinYMin meet');
      return svg.outerHTML;
    } catch {
      return '';
    }
  };

  const handleTaggedChange = (checked: boolean | 'indeterminate') => {
    const nextValue = checked === true;
    setPrepTagged(nextValue);
    persistPrepUpdate({ prep_tagged: nextValue });
  };

  const handleWrappedChange = (checked: boolean | 'indeterminate') => {
    const nextValue = checked === true;
    setPrepWrapped(nextValue);
    persistPrepUpdate({ prep_wrapped: nextValue });
  };

  const handlePickupDateChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;
    setPickupDate(nextValue);
    if (pickupTba) {
      setPickupTba(false);
    }
    persistPrepUpdate({
      pickup_date: nextValue ? nextValue : null,
      pickup_tba: false,
    });
  };

  const handlePickupTbaChange = (checked: boolean | 'indeterminate') => {
    const nextValue = checked === true;
    setPickupTba(nextValue);
    if (nextValue) {
      setPickupDate('');
      persistPrepUpdate({ pickup_tba: true, pickup_date: null });
    } else {
      persistPrepUpdate({ pickup_tba: false });
    }
  };

  const handlePrintTags = () => {
    if (!items.length) {
      toast({
        variant: 'error',
        title: 'No items to print',
        message: 'This load has no items yet.',
      });
      return;
    }

    const sortedItems = [...items].sort((a, b) => {
      const modelCompare = (a.model || '').localeCompare(b.model || '');
      if (modelCompare !== 0) return modelCompare;
      return (a.serial || '').localeCompare(b.serial || '');
    });

    const tagColor = normalizeHexColor(load.primary_color);
    const csoValue = deriveCsoFromLoadNumber(load.sub_inventory_name);
    const csoHead = csoValue.length > 4 ? csoValue.slice(0, -4) : '';
    const csoTail = csoValue.length > 4 ? csoValue.slice(-4) : csoValue;

    const tags = sortedItems.map((item, index) => {
      const model = item.model || '';
      const serial = item.serial || '';
      const modelBarcode = renderBarcodeSvg(model);
      const serialBarcode = renderBarcodeSvg(serial);
      return {
        index: index + 1,
        model,
        serial,
        modelBarcode,
        serialBarcode,
      };
    });

    const pages = [];
    for (let i = 0; i < tags.length; i += 2) {
      pages.push([tags[i], tags[i + 1] || null]);
    }

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Load Tags - ${escapeHtml(displayName)}</title>
          <style>
            @page { size: letter landscape; margin: 0.35in; }
            * { box-sizing: border-box; }
            html, body { height: 100%; }
            body { margin: 0; font-family: Helvetica, Arial, sans-serif; color: #111; }
            .page { width: 100%; height: calc(8.5in - 0.7in); display: grid; grid-template-columns: 1fr 1fr; gap: 1in; page-break-after: always; position: relative; padding: 0; }
            .page::after { content: ""; position: absolute; top: 0; bottom: 0; left: 50%; border-left: 2px dotted #e2e2e2; pointer-events: none; }
            .page:last-child { page-break-after: auto; }
            .tag { border: none; padding: 0.3in 0.6in; display: flex; flex-direction: column; justify-content: space-between; height: 100%; }
            .tag.empty { border: none; }
            .tag-top { display: flex; flex-direction: column; gap: 0.25in; }
            .cso-row { display: flex; align-items: center; gap: 0.25in; }
            .color-square { width: 1in; height: 1in; background: ${tagColor ?? 'transparent'}; flex-shrink: 0; }
            .model-content { min-width: 0; }
            .serial-row { display: flex; flex-direction: column; gap: 0.05in; }
            .color-square.empty { background: transparent; }
            .label { font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
            .value { font-size: 20px; font-weight: 700; word-break: break-word; }
            .cso-value { font-size: 44px; font-weight: 700; letter-spacing: 0.04em; }
            .cso-emphasis { font-weight: 800; text-decoration: underline; }
            .barcode { margin-top: 0.1in; display: flex; justify-content: flex-start; align-items: flex-start; text-align: left; }
            .barcode svg { width: auto; max-width: 100%; height: 60px; display: block; margin: 0; }
            .tag-bottom { flex: 1; display: flex; align-items: center; justify-content: center; font-size: 160px; font-weight: 800; }
          </style>
        </head>
        <body>
          ${pages
            .map(
              (pair) => `
                <div class="page">
                  ${pair
                    .map((tag) => {
                      if (!tag) {
                        return '<div class="tag empty"></div>';
                      }
                      return `
                        <div class="tag">
                          <div class="tag-top">
                            <div class="cso-row">
                              <div class="color-square${tagColor ? '' : ' empty'}"></div>
                              <div class="cso-block">
                                <div class="label">CSO</div>
                                <div class="cso-value">${escapeHtml(csoHead)}<span class="cso-emphasis">${escapeHtml(csoTail)}</span></div>
                              </div>
                            </div>
                            <div class="model-content">
                              <div class="label">Model</div>
                              <div class="value">${escapeHtml(tag.model)}</div>
                            </div>
                            <div class="barcode model-barcode">${tag.modelBarcode}</div>
                            <div class="serial-row">
                              <div class="label">Serial</div>
                              <div class="value">${escapeHtml(tag.serial || '—')}</div>
                            </div>
                            ${tag.serial ? `<div class="barcode serial-barcode">${tag.serialBarcode}</div>` : ''}
                          </div>
                          <div class="tag-bottom">${tag.index}</div>
                        </div>
                      `;
                    })
                    .join('')}
                </div>
              `
            )
            .join('')}
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        variant: 'error',
        title: 'Pop-up blocked',
        message: 'Allow pop-ups to open the print view.',
      });
      return;
    }
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  return (
    <>
      <div className="rounded-lg border bg-background p-4 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-semibold">{displayName}</h2>
              {load.category && <Badge variant="secondary">{load.category}</Badge>}
              {load.ge_source_status && (
                <Badge variant="outline">GE: {load.ge_source_status}</Badge>
              )}
              {isReadyForPickup && (
                <Badge className="bg-green-500 text-white">Ready for pickup</Badge>
              )}
            </div>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge variant="outline">{load.inventory_type}</Badge>
              {isSold && <Badge variant="outline">Prep {prepCount}/2</Badge>}
              {createdDate && (
                <span className="text-xs text-muted-foreground">Created {createdDate}</span>
              )}
              <span className="text-xs text-muted-foreground">Load # {load.sub_inventory_name}</span>
              {pickupLabel && (
                <span className="text-xs text-muted-foreground">{pickupLabel}</span>
              )}
            </div>
            {load.notes && (
              <p className="text-sm text-muted-foreground mt-2">{load.notes}</p>
            )}
          </div>
          {onClose && (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={onClose}
              aria-label="Close load details"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="rounded-lg border bg-muted/20 p-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium">Prep checklist</p>
              <p className="text-xs text-muted-foreground">Tagged and wrapped for pickup.</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {savingPrep && <Loader2 className="h-3 w-3 animate-spin" />}
              <span>{prepCount}/2 complete</span>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={prepTagged} onCheckedChange={handleTaggedChange} disabled={savingPrep} />
              Tagged
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={prepWrapped} onCheckedChange={handleWrappedChange} disabled={savingPrep} />
              Wrapped
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">Pickup</span>
              <Input
                type="date"
                value={pickupDate}
                onChange={handlePickupDateChange}
                disabled={savingPrep || pickupTba}
                className="w-[160px]"
              />
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={pickupTba} onCheckedChange={handlePickupTbaChange} disabled={savingPrep} />
                TBA
              </label>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handlePrintTags}
          >
            <Printer className="h-4 w-4" />
            Print tags
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onRename?.(load)}
          >
            <Edit className="h-4 w-4" />
            Edit Details
          </Button>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            onClick={() => onDelete?.(load)}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 gap-4 p-4 bg-muted rounded-lg sm:grid-cols-3">
          <div>
            <div className="text-sm text-muted-foreground">Total Items</div>
            <div className="text-2xl font-bold">{items.length}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Unique CSOs</div>
            <div className="text-2xl font-bold">{uniqueCSOs}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Product Types</div>
            <div className="text-sm mt-1">
              {Object.entries(productTypeBreakdown).map(([type, count]) => (
                <div key={type}>
                  {type}: {count}
                </div>
              ))}
            </div>
          </div>
        </div>
        {conflicts.length > 0 && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
            <div className="font-semibold text-destructive">
              {conflicts.length} serial conflict{conflicts.length === 1 ? '' : 's'}
            </div>
            <p className="text-muted-foreground">
              These serials also appear in another load.
            </p>
            <div className="mt-2 space-y-1">
              {conflicts.slice(0, 6).map(conflict => (
                <div key={conflict.id ?? `${conflict.serial}-${conflict.load_number}`}>
                  <span className="font-medium">{conflict.serial}</span> already in{' '}
                  <span className="font-medium">{conflict.conflicting_load}</span>
                </div>
              ))}
              {conflicts.length > 6 && (
                <div className="text-xs text-muted-foreground">
                  +{conflicts.length - 6} more
                </div>
              )}
            </div>
          </div>
        )}

        {/* Search and selection */}
        <div className="flex flex-wrap items-center gap-2 border-b pb-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Items list */}
        <div className="space-y-2">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              No items found
            </div>
          ) : (
            filteredItems.map((item) => {
              const normalizedItem =
                item.products?.description
                  ? {
                      ...item,
                      products: {
                        ...item.products,
                        description: decodeHTMLEntities(item.products.description)
                      }
                    }
                  : item;

              return (
                <InventoryItemCard
                  key={item.id}
                  item={normalizedItem}
                  showInventoryTypeBadge={false}
                  showRouteBadge={false}
                  showProductMeta
                  showImage={Boolean((normalizedItem.products as any)?.image_url)}
                  badges={(item.ge_availability_status || item.status)
                    ? (
                      <Badge className={getItemStatusColor(item.ge_availability_status ?? item.status ?? '')}>
                        {item.ge_availability_status ?? item.status}
                      </Badge>
                    )
                    : null}
                />
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
