import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { InventoryItemCard } from '@/components/Inventory/InventoryItemCard';
import type { InventoryItem } from '@/types/inventory';

interface ItemSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: InventoryItem[];
  matchedField: 'serial' | 'cso' | 'model';
  matchedValue: string;
  onConfirm: (selectedIds: string[]) => void;
}

export function ItemSelectionDialog({
  open,
  onOpenChange,
  items,
  matchedField,
  matchedValue,
  onConfirm
}: ItemSelectionDialogProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedIds(newSelection);
  };

  const selectAll = () => {
    setSelectedIds(new Set(items.map(item => item.id!)));
  };

  const clearAll = () => {
    setSelectedIds(new Set());
  };

  const handleConfirm = () => {
    onConfirm(Array.from(selectedIds));
    setSelectedIds(new Set());
    onOpenChange(false);
  };

  const fieldLabel = {
    serial: 'Serial Number',
    cso: 'CSO',
    model: 'Model Number'
  }[matchedField];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Multiple Items Found</DialogTitle>
          <div className="text-sm text-gray-600 mt-2">
            Found {items.length} items matching <span className="font-semibold">{fieldLabel}</span>:{' '}
            <span className="font-mono bg-gray-100 px-2 py-1 rounded">{matchedValue}</span>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Select All / Clear All */}
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={selectAll}>
              Select All
            </Button>
            <Button size="sm" variant="outline" onClick={clearAll}>
              Clear All
            </Button>
            <div className="ml-auto text-sm text-gray-600">
              {selectedIds.size} of {items.length} selected
            </div>
          </div>

          {/* Item List */}
          <div className="space-y-2">
            {items.map((item) => (
              <InventoryItemCard
                key={item.id}
                item={item}
                leading={(
                  <Checkbox
                    checked={selectedIds.has(item.id!)}
                    onCheckedChange={() => toggleSelection(item.id!)}
                    onClick={(event) => event.stopPropagation()}
                  />
                )}
                onClick={() => toggleSelection(item.id!)}
                selected={selectedIds.has(item.id!)}
                showInventoryTypeBadge
                showProductMeta={false}
                showCustomer
                routeValue={item.sub_inventory ?? item.route_id}
              />
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={selectedIds.size === 0}>
            Mark {selectedIds.size} as Scanned
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
