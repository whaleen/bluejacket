import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ArrowRight, Package, Loader2, Check, ShoppingCart } from 'lucide-react';
import { getReorderAlerts, markAsReordered } from '@/lib/partsManager';
import type { ReorderAlert } from '@/types/inventory';

interface ReorderAlertsCardProps {
  onViewParts?: () => void;
}

export function ReorderAlertsCard({ onViewParts }: ReorderAlertsCardProps) {
  const [alerts, setAlerts] = useState<ReorderAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingId, setMarkingId] = useState<string | null>(null);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    setLoading(true);
    const { data, error } = await getReorderAlerts();
    if (error) {
      console.error('Failed to fetch reorder alerts:', error);
    }
    setAlerts(data ?? []);
    setLoading(false);
  };

  const handleMarkReordered = async (alert: ReorderAlert) => {
    setMarkingId(alert.tracked_part_id);
    const { success, error } = await markAsReordered(alert.tracked_part_id);

    if (success) {
      // Update local state
      setAlerts(prev =>
        prev.map(a =>
          a.tracked_part_id === alert.tracked_part_id
            ? { ...a, reordered_at: new Date().toISOString() }
            : a
        )
      );
    } else {
      console.error('Failed to mark as reordered:', error);
    }
    setMarkingId(null);
  };

  if (loading) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading alerts...</span>
        </div>
      </Card>
    );
  }

  // Filter out reordered items from the active alerts count
  const activeAlerts = alerts.filter(a => !a.reordered_at);
  const reorderedAlerts = alerts.filter(a => a.reordered_at);

  if (alerts.length === 0) {
    return null;
  }

  const criticalCount = activeAlerts.filter(a => a.is_critical).length;
  const lowCount = activeAlerts.filter(a => !a.is_critical).length;

  return (
    <Card className={`p-4 ${activeAlerts.length > 0 ? 'border-yellow-500/50 bg-yellow-500/5' : 'border-green-500/50 bg-green-500/5'}`}>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {activeAlerts.length > 0 ? (
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
            ) : (
              <Check className="h-5 w-5 text-green-500" />
            )}
            <h3 className="font-semibold">
              {activeAlerts.length > 0 ? 'Reorder Alerts' : 'All Parts Reordered'}
            </h3>
            {activeAlerts.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {activeAlerts.length}
              </Badge>
            )}
          </div>
          {onViewParts && (
            <Button variant="ghost" size="sm" onClick={onViewParts}>
              View All
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>

        {activeAlerts.length > 0 && (criticalCount > 0 || lowCount > 0) && (
          <div className="flex gap-3 text-sm">
            {criticalCount > 0 && (
              <span className="text-destructive font-medium">
                {criticalCount} out of stock
              </span>
            )}
            {lowCount > 0 && (
              <span className="text-yellow-600 dark:text-yellow-500 font-medium">
                {lowCount} low stock
              </span>
            )}
          </div>
        )}

        {/* Active alerts (not yet reordered) */}
        {activeAlerts.length > 0 && (
          <div className="space-y-2">
            {activeAlerts.slice(0, 5).map(alert => (
              <div
                key={alert.tracked_part_id}
                className="flex items-center justify-between py-2 border-b last:border-0"
              >
                <div className="flex items-center gap-3">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <span className="font-mono text-sm">{alert.model}</span>
                    {alert.description && (
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {alert.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono">
                    {alert.current_qty} / {alert.reorder_threshold}
                  </span>
                  {alert.is_critical ? (
                    <Badge variant="destructive">OUT</Badge>
                  ) : (
                    <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">
                      LOW
                    </Badge>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleMarkReordered(alert)}
                    disabled={markingId === alert.tracked_part_id}
                    className="ml-1"
                  >
                    {markingId === alert.tracked_part_id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <ShoppingCart className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>
            ))}

            {activeAlerts.length > 5 && (
              <p className="text-sm text-muted-foreground text-center pt-2">
                +{activeAlerts.length - 5} more alerts
              </p>
            )}
          </div>
        )}

        {/* Reordered items */}
        {reorderedAlerts.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <p className="text-xs text-muted-foreground font-medium">Awaiting Delivery</p>
            {reorderedAlerts.slice(0, 3).map(alert => (
              <div
                key={alert.tracked_part_id}
                className="flex items-center justify-between py-1 opacity-60"
              >
                <div className="flex items-center gap-3">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="font-mono text-sm">{alert.model}</span>
                </div>
                <Badge variant="outline" className="text-green-600 border-green-600">
                  Reordered
                </Badge>
              </div>
            ))}
            {reorderedAlerts.length > 3 && (
              <p className="text-xs text-muted-foreground text-center">
                +{reorderedAlerts.length - 3} more awaiting delivery
              </p>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
