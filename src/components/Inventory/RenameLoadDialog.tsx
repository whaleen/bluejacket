import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { updateLoadMetadata } from '@/lib/loadManager';
import type { LoadMetadata } from '@/types/inventory';
import { cn } from '@/lib/utils';

const COLOR_OPTIONS = [
  { label: 'Red', value: '#E53935' },
  { label: 'Red-Orange', value: '#F4511E' },
  { label: 'Orange', value: '#FB8C00' },
  { label: 'Yellow-Orange', value: '#F9A825' },
  { label: 'Yellow', value: '#FDD835' },
  { label: 'Yellow-Green', value: '#C0CA33' },
  { label: 'Green', value: '#43A047' },
  { label: 'Blue-Green', value: '#009688' },
  { label: 'Blue', value: '#1E88E5' },
  { label: 'Blue-Violet', value: '#5E35B1' },
  { label: 'Violet', value: '#8E24AA' },
  { label: 'Red-Violet', value: '#D81B60' },
];

interface RenameLoadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  load: LoadMetadata;
  onSuccess?: () => void;
}

export function RenameLoadDialog({ open, onOpenChange, load, onSuccess }: RenameLoadDialogProps) {
  const [friendlyName, setFriendlyName] = useState('');
  const [category, setCategory] = useState('none');
  const [primaryColor, setPrimaryColor] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const paletteOptions = useMemo(() => {
    const normalized = (primaryColor || '').toLowerCase();
    const paletteValues = new Set(COLOR_OPTIONS.map((option) => option.value.toLowerCase()));
    if (normalized && !paletteValues.has(normalized)) {
      return [...COLOR_OPTIONS, { label: 'Custom', value: primaryColor }];
    }
    return COLOR_OPTIONS;
  }, [primaryColor]);

  useEffect(() => {
    if (open) {
      setFriendlyName(load.friendly_name || '');
      setCategory(load.category || 'none');
      setPrimaryColor(load.primary_color || '');
      setError(null);
    }
  }, [open, load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedCategory = category === 'none' ? '' : category;
    const nextFriendlyName = friendlyName.trim();
    const nextPrimaryColor = primaryColor.trim();
    const friendlyNameChanged = nextFriendlyName !== (load.friendly_name || '');
    const categoryChanged = normalizedCategory.trim() !== (load.category || '');
    const colorChanged = nextPrimaryColor !== (load.primary_color || '');

    if (!friendlyNameChanged && !categoryChanged && !colorChanged) {
      setError('No changes to save');
      return;
    }

    setLoading(true);
    setError(null);

    const { success, error: updateError } = await updateLoadMetadata(
      load.inventory_type,
      load.sub_inventory_name,
      {
        category: normalizedCategory.trim() || undefined,
        friendly_name: nextFriendlyName ? nextFriendlyName : null,
        primary_color: nextPrimaryColor ? nextPrimaryColor : null,
      }
    );

    if (!success) {
      setError(updateError || 'Failed to update load details');
      setLoading(false);
      return;
    }

    setLoading(false);

    // Success
    onOpenChange(false);
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Load Details</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-name">Load Number</Label>
            <Input id="current-name" value={load.sub_inventory_name} disabled />
          </div>

          <div className="space-y-2">
            <Label htmlFor="friendly-name">Friendly Name (Optional)</Label>
            <Input
              id="friendly-name"
              value={friendlyName}
              onChange={(e) => setFriendlyName(e.target.value)}
              placeholder="Enter a display name..."
            />
            <p className="text-xs text-muted-foreground">
              Friendly names do not change the underlying load number.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="primary-color">Primary Color</Label>
            <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
              {paletteOptions.map((option) => {
                const isSelected = option.value.toLowerCase() === (primaryColor || '').toLowerCase();
                return (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => setPrimaryColor(option.value)}
                    className={cn(
                      'flex h-12 w-12 items-center justify-center rounded-md ring-2 ring-transparent transition',
                      isSelected && 'ring-primary'
                    )}
                    style={{ background: option.value }}
                    aria-label={option.label}
                  />
                );
              })}
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{primaryColor ? `Selected: ${primaryColor}` : 'No color selected.'}</span>
              {primaryColor && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setPrimaryColor('')}>
                  Clear
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Used for print tag color blocks.
            </p>
          </div>

          {load.ge_source_status && (
            <div className="space-y-2">
              <Label htmlFor="ge-status">GE Status (Read-only)</Label>
              <Input id="ge-status" value={load.ge_source_status} disabled />
              <p className="text-xs text-muted-foreground">
                Imported from GE and not editable here.
              </p>
            </div>
          )}

          {(load.inventory_type === 'ASIS' || load.inventory_type === 'FG') && (
            <div className="space-y-2">
              <Label htmlFor="category">Category (Manual)</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="category">
                <SelectValue placeholder="Select category..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {load.inventory_type === 'ASIS' && (
                  <>
                      <SelectItem value="Regular">Regular</SelectItem>
                      <SelectItem value="Salvage">Salvage</SelectItem>
                    </>
                  )}
                  {load.inventory_type === 'FG' && (
                    <SelectItem value="Back Haul">Back Haul</SelectItem>
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {load.inventory_type === 'ASIS'
                  ? 'Categorize as Regular or Salvage ASIS load'
                  : 'Categorize as Back Haul load'}
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
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
