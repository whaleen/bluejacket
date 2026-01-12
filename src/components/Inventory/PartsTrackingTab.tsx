import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Trash2, Plus, Package } from 'lucide-react';
import {
  getTrackedParts,
  updateThreshold,
  removeTrackedPart
} from '@/lib/partsManager';
import { PartsTrackingDialog } from './PartsTrackingDialog';
import type { TrackedPartWithDetails } from '@/types/inventory';
import { usePartsListView } from '@/hooks/usePartsListView';
import { PartsListViewToggle } from './PartsListViewToggle';

interface PartsTrackingTabProps {
  onPartsChanged?: () => void;
}

export function PartsTrackingTab({ onPartsChanged }: PartsTrackingTabProps) {
  const [parts, setParts] = useState<TrackedPartWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [editingThresholdId, setEditingThresholdId] = useState<string | null>(null);
  const [thresholdValue, setThresholdValue] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const { view, setView, isImageView } = usePartsListView();

  const fetchParts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await getTrackedParts();
    if (error) {
      console.error('Failed to fetch tracked parts:', error);
    }
    setParts(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchParts();
  }, [fetchParts]);

  const handleStartEditThreshold = (part: TrackedPartWithDetails) => {
    setEditingThresholdId(part.id);
    setThresholdValue(part.reorder_threshold.toString());
  };

  const handleCancelEditThreshold = () => {
    setEditingThresholdId(null);
    setThresholdValue('');
  };

  const handleSaveThreshold = async (part: TrackedPartWithDetails) => {
    const newThreshold = parseInt(thresholdValue, 10);
    if (isNaN(newThreshold) || newThreshold < 0) {
      handleCancelEditThreshold();
      return;
    }

    if (newThreshold === part.reorder_threshold) {
      handleCancelEditThreshold();
      return;
    }

    setUpdating(part.id);
    const { success, error } = await updateThreshold(part.id, newThreshold);

    if (success) {
      setParts(prev =>
        prev.map(p =>
          p.id === part.id ? { ...p, reorder_threshold: newThreshold } : p
        )
      );
      onPartsChanged?.();
    } else {
      console.error('Failed to update threshold:', error);
    }

    setUpdating(null);
    handleCancelEditThreshold();
  };

  const handleRemovePart = async (part: TrackedPartWithDetails) => {
    if (!confirm(`Stop tracking ${part.products?.model ?? 'this part'}?`)) {
      return;
    }

    setUpdating(part.id);
    const { success, error } = await removeTrackedPart(part.id);

    if (success) {
      setParts(prev => prev.filter(p => p.id !== part.id));
      onPartsChanged?.();
    } else {
      console.error('Failed to remove tracked part:', error);
    }

    setUpdating(null);
  };

  const handleThresholdKeyDown = (
    e: React.KeyboardEvent,
    part: TrackedPartWithDetails
  ) => {
    if (e.key === 'Enter') {
      handleSaveThreshold(part);
    } else if (e.key === 'Escape') {
      handleCancelEditThreshold();
    }
  };

  const handlePartAdded = () => {
    fetchParts();
    onPartsChanged?.();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Loading tracked parts...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <PartsListViewToggle view={view} onChange={setView} />
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Parts
        </Button>
      </div>

      {parts.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground mb-4">
            No parts are being tracked yet.
          </p>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Part
          </Button>
        </Card>
      ) : (
        <div className="space-y-2">
          {parts.map(part => (
            <Card key={part.id} className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {isImageView && (
                    <div className="h-10 w-10 rounded bg-muted flex items-center justify-center overflow-hidden shrink-0">
                      {part.products?.image_url ? (
                        <img
                          src={part.products.image_url}
                          alt={part.products?.model ?? 'Part image'}
                          className="h-full w-full object-contain"
                          loading="lazy"
                        />
                      ) : (
                        <Package className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono font-medium truncate">
                        {part.products?.model ?? 'Unknown'}
                      </span>
                      {part.products?.brand && (
                        <Badge variant="outline" className="shrink-0">
                          {part.products.brand}
                        </Badge>
                      )}
                    </div>
                    {part.products?.description && (
                      <p className="text-sm text-muted-foreground truncate">
                        {part.products.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                      Reorder at:
                    </span>
                    {editingThresholdId === part.id ? (
                      <Input
                        type="number"
                        min="0"
                        value={thresholdValue}
                        onChange={e => setThresholdValue(e.target.value)}
                        onKeyDown={e => handleThresholdKeyDown(e, part)}
                        onBlur={() => handleSaveThreshold(part)}
                        autoFocus
                        className="w-16 text-center"
                        disabled={updating === part.id}
                      />
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStartEditThreshold(part)}
                        className="w-16 font-mono"
                      >
                        {part.reorder_threshold}
                      </Button>
                    )}
                  </div>

                  <div className="text-sm">
                    <span className="text-muted-foreground">Current: </span>
                    <span className="font-mono font-medium">
                      {part.current_qty}
                    </span>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemovePart(part)}
                    disabled={updating === part.id}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    {updating === part.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <PartsTrackingDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onPartAdded={handlePartAdded}
      />
    </div>
  );
}
