/**
 * Sanity Check Dialog
 *
 * UI for requesting and completing sanity checks
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import type { LoadMetadata } from '@/types/inventory';
import { getSanityCheckParameters, formatSanityCheckParameters, getSanityCheckStage } from '@/lib/sanityCheck';
import { toast } from 'sonner';
import { updateLoadMetadata } from '@/lib/loadManager';
import { useAuth } from '@/context/AuthContext';

interface SanityCheckDialogProps {
  load: LoadMetadata;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  mode: 'request' | 'complete';
}

export function SanityCheckDialog({
  load,
  open,
  onClose,
  onSuccess,
  mode,
}: SanityCheckDialogProps) {
  const { user } = useAuth();
  const userDisplayName = user?.username ?? user?.email ?? 'Unknown';
  const [saving, setSaving] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  const parameters = getSanityCheckParameters(load);
  const checkList = formatSanityCheckParameters(parameters);
  const stage = getSanityCheckStage(load);

  const handleRequest = async () => {
    setSaving(true);
    try {
      const now = new Date().toISOString();
      await updateLoadMetadata(load.inventory_type, load.sub_inventory_name, {
        sanity_check_requested: true,
        sanity_check_requested_at: now,
        sanity_check_requested_by: userDisplayName,
        sanity_check_stage: stage,
        sanity_check_parameters: parameters,
      });

      toast.success('Sanity check requested', {
        description: `${load.friendly_name || load.sub_inventory_name} is now flagged for verification`,
      });

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Failed to request sanity check:', error);
      toast.error('Failed to request sanity check');
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    // Check if all items are checked
    const allChecked = checkList.every((_, idx) => checkedItems[idx]);
    if (!allChecked) {
      toast.error('Please verify all items before completing');
      return;
    }

    setSaving(true);
    try {
      const now = new Date().toISOString();
      await updateLoadMetadata(load.inventory_type, load.sub_inventory_name, {
        sanity_check_requested: false,
        sanity_check_completed_at: now,
        sanity_check_completed_by: userDisplayName,
        sanity_last_checked_at: now,
        sanity_last_checked_by: userDisplayName,
      });

      toast.success('Sanity check complete', {
        description: `${load.friendly_name || load.sub_inventory_name} has been verified`,
      });

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Failed to complete sanity check:', error);
      toast.error('Failed to complete sanity check');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'request' ? 'Request Sanity Check' : 'Complete Sanity Check'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'request'
              ? `Request physical verification for ${load.friendly_name || load.sub_inventory_name}`
              : `Verify all items for ${load.friendly_name || load.sub_inventory_name}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Stage Info */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <div className="font-medium text-sm">
                {stage === 'early' ? 'Early Stage Check' : 'Final Stage Check'}
              </div>
              <div className="text-xs text-muted-foreground">
                {parameters.notes}
              </div>
              <div className="text-xs text-muted-foreground">
                GE Status: {parameters.geStatus || 'Unknown'}
              </div>
            </div>
          </div>

          {/* Checklist */}
          <div className="space-y-3">
            <div className="text-sm font-medium">Verification Checklist:</div>
            <div className="space-y-2">
              {checkList.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  {mode === 'complete' ? (
                    <Checkbox
                      id={`check-${idx}`}
                      checked={checkedItems[idx] || false}
                      onCheckedChange={(checked) =>
                        setCheckedItems((prev) => ({ ...prev, [idx]: !!checked }))
                      }
                    />
                  ) : (
                    <CheckCircle className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  )}
                  <label
                    htmlFor={`check-${idx}`}
                    className="text-sm text-muted-foreground leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {item}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {mode === 'complete' && (
            <div className="text-xs text-muted-foreground p-3 bg-amber-50 dark:bg-amber-950/20 rounded border border-amber-200 dark:border-amber-800">
              <strong>Note:</strong> Check all items above to confirm you have physically verified
              the load meets all requirements.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={mode === 'request' ? handleRequest : handleComplete}
            disabled={saving}
          >
            {saving
              ? 'Saving...'
              : mode === 'request'
                ? 'Request Check'
                : 'Complete Check'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
