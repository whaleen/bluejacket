import { useEffect, useState } from 'react';
import supabase from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type Props = {
  title?: string;
  config?: Record<string, unknown>;
};

type PartAlert = {
  id: string;
  productId: string;
  productName: string;
  currentQty: number;
  threshold: number;
};

export function PartsAlertsWidget({ title = 'Parts Alerts', config }: Props) {
  const [alerts, setAlerts] = useState<PartAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const locationId = config?.locationId as string | undefined;

  useEffect(() => {
    async function fetchAlerts() {
      let query = supabase
        .from('tracked_parts')
        .select('id, product_id, reorder_threshold, current_quantity');

      if (locationId) {
        query = query.eq('location_id', locationId);
      }

      const { data } = await query;

      if (data) {
        const alertsData = data
          .filter((part: { current_quantity: number; reorder_threshold: number }) =>
            part.current_quantity <= part.reorder_threshold
          )
          .map((part: { id: string; product_id: string; current_quantity: number; reorder_threshold: number }) => ({
            id: part.id,
            productId: part.product_id,
            productName: part.product_id,
            currentQty: part.current_quantity,
            threshold: part.reorder_threshold,
          }));

        setAlerts(alertsData);
      }
      setLoading(false);
    }

    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, [locationId]);

  return (
    <Card className="p-4 h-full flex flex-col">
      <h2 className="text-lg font-semibold mb-4">{title}</h2>
      <div className="flex-1 flex items-center justify-center">
        {loading ? (
          <p className="text-muted-foreground animate-pulse">Loading...</p>
        ) : alerts.length === 0 ? (
          <div className="text-center">
            <p className="text-xl font-medium text-green-500">All parts stocked</p>
          </div>
        ) : (
          <div className="w-full space-y-3 overflow-auto">
            {alerts.slice(0, 5).map((alert) => (
              <div
                key={alert.id}
                className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-center justify-between"
              >
                <div>
                  <p className="font-medium">{alert.productName}</p>
                  <p className="text-sm text-muted-foreground">
                    Threshold: {alert.threshold}
                  </p>
                </div>
                <Badge variant="destructive" className="text-xl px-3 py-1">
                  {alert.currentQty}
                </Badge>
              </div>
            ))}
            {alerts.length > 5 && (
              <p className="text-center text-muted-foreground text-sm">
                +{alerts.length - 5} more alerts
              </p>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
