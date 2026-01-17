import { useEffect, useState } from 'react';
import supabase from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

type Props = {
  title?: string;
  config?: Record<string, unknown>;
};

type SessionSummary = {
  id: string;
  name: string;
  status: string;
  totalItems: number;
  scannedCount: number;
};

export function ActiveSessionsWidget({ title = 'Active Sessions', config }: Props) {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const locationId = config?.locationId as string | undefined;

  useEffect(() => {
    async function fetchSessions() {
      let query = supabase
        .from('scanning_sessions')
        .select('id, name, status, items, scanned_item_ids')
        .eq('status', 'active');

      if (locationId) {
        query = query.eq('location_id', locationId);
      }

      const { data } = await query.order('created_at', { ascending: false }).limit(5);

      if (data) {
        setSessions(
          data.map((session: { id: string; name: string; status: string; items: unknown[]; scanned_item_ids: unknown[] }) => ({
            id: session.id,
            name: session.name,
            status: session.status,
            totalItems: Array.isArray(session.items) ? session.items.length : 0,
            scannedCount: Array.isArray(session.scanned_item_ids) ? session.scanned_item_ids.length : 0,
          }))
        );
      }
      setLoading(false);
    }

    fetchSessions();
    const interval = setInterval(fetchSessions, 10000);
    return () => clearInterval(interval);
  }, [locationId]);

  return (
    <Card className="p-4 h-full flex flex-col">
      <h2 className="text-lg font-semibold mb-4">{title}</h2>
      <div className="flex-1 flex items-center justify-center">
        {loading ? (
          <p className="text-muted-foreground animate-pulse">Loading...</p>
        ) : sessions.length === 0 ? (
          <p className="text-muted-foreground">No active sessions</p>
        ) : (
          <div className="w-full space-y-4 overflow-auto">
            {sessions.map((session) => {
              const progress = session.totalItems > 0
                ? Math.round((session.scannedCount / session.totalItems) * 100)
                : 0;

              return (
                <div key={session.id} className="bg-muted rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium truncate">{session.name}</p>
                    <span className="text-sm text-muted-foreground">
                      {session.scannedCount}/{session.totalItems}
                    </span>
                  </div>
                  <Progress value={progress} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}
