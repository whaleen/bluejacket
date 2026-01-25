import { useEffect, useState } from 'react';
import { AppHeader } from '@/components/Navigation/AppHeader';
import { PageContainer } from '@/components/Layout/PageContainer';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Loader2 } from 'lucide-react';
import supabase from '@/lib/supabase';
import { getActiveLocationContext } from '@/lib/tenant';

type ActivityLogEntry = {
  id: string;
  action: string;
  entity_type?: string | null;
  entity_id?: string | null;
  details?: Record<string, any> | null;
  actor_name?: string | null;
  actor_image?: string | null;
  created_at: string;
};

const PAGE_SIZE = 50;

export function ActivityLogView() {
  const { locationId } = getActiveLocationContext();
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const formatActivityDate = (value: string) =>
    new Date(value).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

  const formatActivityMessage = (entry: ActivityLogEntry) => {
    if (entry.action === 'asis_sync') {
      const total = entry.details?.stats?.totalGEItems ?? entry.details?.stats?.totalItems;
      return total ? `Synced ASIS (${total} items)` : 'Synced ASIS from GE';
    }
    if (entry.action === 'asis_wipe') {
      return 'Wiped ASIS data';
    }
    if (entry.action === 'load_update') {
      const loadNumber = entry.details?.loadNumber ?? entry.entity_id ?? '';
      const friendly = entry.details?.friendlyName ?? '';
      const fields = Array.isArray(entry.details?.fields) ? entry.details?.fields : [];
      const fieldLabels: Record<string, string> = {
        friendly_name: 'friendly name',
        notes: 'notes',
        primary_color: 'color',
        category: 'salvage',
        prep_tagged: 'tagged',
        prep_wrapped: 'wrapped',
        pickup_date: 'pickup date',
        pickup_tba: 'pickup TBA',
      };
      const fieldsLabel = fields.length
        ? ` (${fields.map((field: string) => fieldLabels[field] ?? field).join(', ')})`
        : '';
      const label = friendly ? `${friendly} (${loadNumber})` : loadNumber;
      return `Updated load ${label}${fieldsLabel}`;
    }
    return entry.action.replace(/_/g, ' ');
  };

  const fetchLogs = async (page: number, append = false) => {
    if (loading || loadingMore) return;
    append ? setLoadingMore(true) : setLoading(true);

    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from('activity_log')
      .select('id, action, entity_type, entity_id, details, actor_name, actor_image, created_at')
      .eq('location_id', locationId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Failed to load activity log:', error);
    } else {
      setLogs(prev => (append ? [...prev, ...(data ?? [])] : data ?? []));
      setHasMore((data ?? []).length === PAGE_SIZE);
    }

    append ? setLoadingMore(false) : setLoading(false);
  };

  useEffect(() => {
    fetchLogs(0);
  }, [locationId]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="Activity Log" />
      <PageContainer className="py-4 pb-24 space-y-4">
        <Card className="p-4">
          <div className="space-y-3">
            {loading && logs.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading activity…
              </div>
            ) : logs.length === 0 ? (
              <div className="text-sm text-muted-foreground">No activity yet.</div>
            ) : (
              logs.map((entry) => (
                <div key={entry.id} className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-full overflow-hidden bg-muted flex items-center justify-center text-xs font-semibold">
                    {entry.actor_image ? (
                      <img
                        src={entry.actor_image}
                        alt={entry.actor_name ?? 'User'}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span>{(entry.actor_name ?? 'U').slice(0, 2).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{entry.actor_name ?? 'Unknown'}</div>
                    <div className="text-sm text-foreground">{formatActivityMessage(entry)}</div>
                    <div className="text-xs text-muted-foreground">{formatActivityDate(entry.created_at)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
          {hasMore && (
            <div className="pt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchLogs(Math.floor(logs.length / PAGE_SIZE), true)}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading…
                  </>
                ) : (
                  <>
                    Load more
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          )}
        </Card>
      </PageContainer>
    </div>
  );
}
