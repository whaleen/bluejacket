import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { getAllLoads } from '@/lib/loadManager';
import supabase from '@/lib/supabase';
import type { InventoryType, LoadMetadata } from '@/types/inventory';
import { getActiveLocationContext } from '@/lib/tenant';

interface MoveItemsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inventoryType: InventoryType;
  currentLoadName?: string;
  selectedItemIds: string[];
  onSuccess?: () => void;
}

export function MoveItemsDialog({
  open,
  onOpenChange,
  inventoryType,
  currentLoadName,
  selectedItemIds,
  onSuccess,
}: MoveItemsDialogProps) {
  const { locationId } = getActiveLocationContext();
  const [moveType, setMoveType] = useState<'existing' | 'remove'>('existing');
  const [targetLoadName, setTargetLoadName] = useState('');
  const [availableLoads, setAvailableLoads] = useState<LoadMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchLoads();
      setMoveType('existing');
      setTargetLoadName('');
      setError(null);
    }
  }, [open, inventoryType]);

  const fetchLoads = async () => {
    const { data } = await getAllLoads(inventoryType);
    if (data) {
      // Filter out the current load
      const filtered = currentLoadName
        ? data.filter((l) => l.sub_inventory_name !== currentLoadName)
        : data;
      setAvailableLoads(filtered);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (moveType === 'existing' && !targetLoadName) {
      setError('Please select a target load');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let finalLoadName: string | null = targetLoadName;

      // Handle remove from load
      if (moveType === 'remove') {
        finalLoadName = null;
      }

      // Update items' sub_inventory
      const { error: updateError } = await supabase
        .from('inventory_items')
        .update({
          sub_inventory: finalLoadName,
          updated_at: new Date().toISOString(),
        })
        .in('id', selectedItemIds)
        .eq('location_id', locationId);

      if (updateError) {
        setError(updateError.message || 'Failed to update items');
        setLoading(false);
        return;
      }

      // Success
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move {selectedItemIds.length} Items</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <RadioGroup value={moveType} onValueChange={(v) => setMoveType(v as 'existing' | 'remove')}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="existing" id="existing" />
              <Label htmlFor="existing">Move to existing load</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="remove" id="remove" />
              <Label htmlFor="remove">Remove from load</Label>
            </div>
          </RadioGroup>

          {moveType === 'existing' ? (
            <div className="space-y-2">
              <Label htmlFor="target-load">Target Load</Label>
              {availableLoads.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No other loads available. Sync ASIS to pull loads from GE.
                </p>
              ) : (
                <Select value={targetLoadName} onValueChange={setTargetLoadName}>
                  <SelectTrigger id="target-load">
                    <SelectValue placeholder="Select a load..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableLoads.map((load) => (
                      <SelectItem key={load.id} value={load.sub_inventory_name}>
                        {load.friendly_name ? `${load.friendly_name} (Load # ${load.sub_inventory_name})` : load.sub_inventory_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          ) : (
            <div className="p-4 bg-muted rounded-lg text-sm">
              <p className="text-muted-foreground">
                {selectedItemIds.length} item{selectedItemIds.length !== 1 ? 's' : ''} will be removed from {currentLoadName || 'the current load'}.
                The items will remain in the {inventoryType} inventory but won't be assigned to any load.
              </p>
            </div>
          )}

          {error && <div className="text-sm text-destructive">{error}</div>}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {moveType === 'remove' ? 'Remove from Load' : 'Move Items'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
