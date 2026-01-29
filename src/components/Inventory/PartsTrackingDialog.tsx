import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Loader2, Search, Package } from 'lucide-react';
import { usePartsListView } from '@/hooks/usePartsListView';
import { PartsListViewToggle } from './PartsListViewToggle';
import { useAddTrackedPart, useAvailablePartsToTrack } from '@/hooks/queries/useParts';

interface PartsTrackingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPartAdded: () => void;
}

export function PartsTrackingDialog({
  open,
  onOpenChange,
  onPartAdded
}: PartsTrackingDialogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [defaultThreshold, setDefaultThreshold] = useState(5);
  const [adding, setAdding] = useState(false);
  const { view, setView } = usePartsListView();
  const effectiveView = view === 'table' ? 'compact' : view;
  const isImageView = effectiveView === 'images';
  const addTrackedPartMutation = useAddTrackedPart();
  const { data, isLoading } = useAvailablePartsToTrack(debouncedSearch, open);
  const trackedMatches = data?.trackedMatches ?? [];
  const parts = data?.parts ?? [];

  useEffect(() => {
    if (open) {
      setSelectedIds(new Set());
      setSearchTerm('');
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const timeoutId = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [open, searchTerm]);

  const handleToggle = (partId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(partId)) {
        next.delete(partId);
      } else {
        next.add(partId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === parts.length) {
      setSelectedIds(new Set());
    } else {
      const allIds = parts
        .map(part => part.id)
        .filter((id): id is string => Boolean(id));
      setSelectedIds(new Set(allIds));
    }
  };

  const handleAdd = async () => {
    if (selectedIds.size === 0) return;

    setAdding(true);
    let successCount = 0;

    for (const productId of selectedIds) {
      try {
        await addTrackedPartMutation.mutateAsync({
          productId,
          reorderThreshold: defaultThreshold,
        });
        successCount++;
      } catch (error) {
        console.error('Failed to add part:', error);
      }
    }

    setAdding(false);

    if (successCount > 0) {
      onPartAdded();
      onOpenChange(false);
    }
  };

  const filteredParts = parts;
  const trimmedSearch = searchTerm.trim();
  const hasSearch = trimmedSearch.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Parts to Track</DialogTitle>
          <DialogDescription>
            Select parts you want to monitor for inventory counts.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 min-h-0 flex flex-col">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1">
              <Label htmlFor="search" className="sr-only">
                Search
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search parts..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-32">
              <Label htmlFor="threshold" className="text-xs text-muted-foreground">
                Default threshold
              </Label>
              <Input
                id="threshold"
                type="number"
                min="0"
                value={defaultThreshold}
                onChange={e => setDefaultThreshold(parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="ml-auto">
              <PartsListViewToggle view={effectiveView} onChange={setView} />
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12 gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Loading parts...</span>
            </div>
          ) : parts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              {hasSearch && trackedMatches.length > 0 ? (
                <>
                  <h3 className="text-lg font-medium mb-2">
                    Already tracked
                  </h3>
                  <p className="text-muted-foreground text-sm max-w-sm">
                    You&apos;re already tracking {trackedMatches.length}{' '}
                    part{trackedMatches.length !== 1 ? 's' : ''} that match
                    &nbsp;&quot;{trimmedSearch}&quot;.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 mt-3">
                    {trackedMatches.slice(0, 6).map(match => (
                      <Badge key={match.id ?? match.model} variant="secondary">
                        {match.model}
                      </Badge>
                    ))}
                    {trackedMatches.length > 6 && (
                      <Badge variant="outline">
                        +{trackedMatches.length - 6} more
                      </Badge>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-medium mb-2">
                    {hasSearch ? 'No Matching Parts' : 'No Parts Available'}
                  </h3>
                  <p className="text-muted-foreground text-sm max-w-sm">
                    {hasSearch
                      ? `No parts match "${trimmedSearch}". Try a different search.`
                      : 'All parts are already being tracked, or no parts exist in your product catalog.'}
                  </p>
                </>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="select-all"
                    checked={
                      filteredParts.length > 0 &&
                      selectedIds.size === filteredParts.length
                    }
                    onCheckedChange={handleSelectAll}
                  />
                  <Label htmlFor="select-all" className="text-sm">
                    Select all ({filteredParts.length})
                  </Label>
                </div>
                <span className="text-sm text-muted-foreground">
                  {selectedIds.size} selected
                </span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
                {filteredParts.map(part => (
                  <Card
                    key={part.id}
                    className={`p-3 cursor-pointer transition ${
                      selectedIds.has(part.id!)
                        ? 'ring-2 ring-primary'
                        : 'hover:bg-accent'
                    }`}
                    onClick={() => handleToggle(part.id!)}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={selectedIds.has(part.id!)}
                        onCheckedChange={() => handleToggle(part.id!)}
                        onClick={e => e.stopPropagation()}
                      />
                      {isImageView && (
                        <div className="h-10 w-10 rounded bg-muted flex items-center justify-center overflow-hidden shrink-0">
                          {part.image_url ? (
                            <img
                              src={part.image_url}
                              alt={part.model}
                              className="h-full w-full object-contain"
                              loading="lazy"
                            />
                          ) : (
                            <Package className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-medium">
                            {part.model}
                          </span>
                          {part.brand && (
                            <Badge variant="outline">{part.brand}</Badge>
                          )}
                        </div>
                        {part.description && (
                          <p className="text-sm text-muted-foreground truncate">
                            {part.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAdd}
              disabled={selectedIds.size === 0 || adding}
            >
              {adding ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                `Add ${selectedIds.size} Part${selectedIds.size !== 1 ? 's' : ''}`
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
