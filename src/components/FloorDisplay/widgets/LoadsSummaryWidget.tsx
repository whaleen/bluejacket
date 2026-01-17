import { useEffect, useState } from 'react';
import supabase from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type Props = {
  title?: string;
  config?: Record<string, unknown>;
};

type LoadSummary = {
  status: string;
  count: number;
};

export function LoadsSummaryWidget({ title = 'Active Loads', config }: Props) {
  const [summary, setSummary] = useState<LoadSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const locationId = config?.locationId as string | undefined;

  useEffect(() => {
    async function fetchLoads() {
      let query = supabase
        .from('load_metadata')
        .select('status');

      if (locationId) {
        query = query.eq('location_id', locationId);
      }

      const { data } = await query;

      if (data) {
        const counts: Record<string, number> = {};
        data.forEach((load: { status: string }) => {
          counts[load.status] = (counts[load.status] || 0) + 1;
        });

        setSummary(
          Object.entries(counts).map(([status, count]) => ({
            status,
            count,
          }))
        );
      }
      setLoading(false);
    }

    fetchLoads();
    const interval = setInterval(fetchLoads, 30000);
    return () => clearInterval(interval);
  }, [locationId]);

  const statusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'active': return 'default';
      case 'staged': return 'secondary';
      case 'in_transit': return 'default';
      case 'delivered': return 'outline';
      default: return 'secondary';
    }
  };

  return (
    <Card className="p-4 h-full flex flex-col">
      <h2 className="text-lg font-semibold mb-4">{title}</h2>
      <div className="flex-1 flex items-center justify-center">
        {loading ? (
          <p className="text-muted-foreground animate-pulse">Loading...</p>
        ) : summary.length === 0 ? (
          <p className="text-muted-foreground">No loads</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 w-full">
            {summary.map(({ status, count }) => (
              <div
                key={status}
                className="bg-muted rounded-lg p-4 flex flex-col items-center justify-center"
              >
                <span className="text-3xl font-bold">{count}</span>
                <Badge variant={statusVariant(status)} className="mt-2">
                  {status.replace(/_/g, ' ')}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
