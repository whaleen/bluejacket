import { useMemo, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Package,
  TruckIcon,
  PackageOpen,
  ScanBarcode,
  ArrowRight,
  Check,
  AlertTriangle,
  Calendar,
} from 'lucide-react';
import { useLoadData } from '@/hooks/useLoadData';
import { useSessionSummaries } from '@/hooks/queries/useSessions';
import { useInventoryScanCounts } from '@/hooks/queries/useMap';
import { AppHeader } from '@/components/Navigation/AppHeader';
import { PageContainer } from '@/components/Layout/PageContainer';
import { useIsMobile } from '@/hooks/use-mobile';
import { LoadDisplay } from '@/components/Loads/LoadDisplay';
import type { LoadMetadata } from '@/types/inventory';
import { getPathForView } from '@/lib/routes';

interface ActionItem {
  id: string;
  type: 'sanity' | 'wrap' | 'tag' | 'pickup' | 'session';
  priority: number;
  title: string;
  subtitle?: string;
  description?: string;
  load?: LoadMetadata;
  sessionId?: string;
  icon: typeof AlertTriangle;
  color: string;
  loadColor?: string | null;
  dueDate?: string | null;
  urgency?: 'critical' | 'high' | 'medium' | 'low';
}

export function ActionsView() {
  const isMobile = useIsMobile();
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'critical' | 'scans' | 'prep'>('all');
  const handleFilterChange = (value: string) => {
    if (value === 'all' || value === 'critical' || value === 'scans' || value === 'prep') {
      setSelectedFilter(value);
    }
  };

  // Get data
  const { loads: loadsData, isLoading: loadsLoading } = useLoadData({ inventoryType: 'ASIS', includeDelivered: false });
  const loads = loadsData ?? [];
  const sessionsQuery = useSessionSummaries();
  const scanCountsQuery = useInventoryScanCounts();

  // Navigation
  const navigateToLoad = useCallback((loadNumber: string) => {
    const params = new URLSearchParams(window.location.search);
    params.delete('view');
    params.delete('load');
    params.set('from', 'actions');
    const path = `${getPathForView('loads')}/${encodeURIComponent(loadNumber)}`;
    const newUrl = params.toString() ? `${path}?${params.toString()}` : path;
    window.history.replaceState({}, '', newUrl);
    window.dispatchEvent(new Event('app:locationchange'));
  }, []);

  // Categorize loads by action needed
  const asisActionLoads = useMemo(() => {
    const sanityCheckRequested: LoadMetadata[] = [];
    const forSaleNeedsWrap: LoadMetadata[] = [];
    const soldNeedsTag: LoadMetadata[] = [];
    const soldNeedsWrap: LoadMetadata[] = [];
    const soldNeedsPrep: LoadMetadata[] = [];
    const pickupSoonNeedsPrep: LoadMetadata[] = [];

    loads.forEach((load) => {
      const status = load.ge_source_status?.toLowerCase().trim();
      const csoStatus = load.ge_cso_status?.toLowerCase().trim();
      const isDelivered = csoStatus === 'delivered';

      if (isDelivered) return; // Skip delivered loads

      if (status === 'for sale' || status === 'sold') {
        // Sanity check requested
        if (load.sanity_check_requested) {
          sanityCheckRequested.push(load);
        }

        // For Sale loads that need wrapping
        if (status === 'for sale' && !load.prep_wrapped) {
          forSaleNeedsWrap.push(load);
        }

        // Sold loads that need prep
        if (status === 'sold') {
          const needsTag = !load.prep_tagged;
          const needsWrap = !load.prep_wrapped;

          if (needsTag) soldNeedsTag.push(load);
          if (needsWrap) soldNeedsWrap.push(load);
          if (needsTag || needsWrap) soldNeedsPrep.push(load);

          // Check if pickup is soon (within 3 days)
          const pickupDate = load.pickup_date;
          if (pickupDate && (needsTag || needsWrap)) {
            const daysUntil = Math.ceil(
              (new Date(pickupDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            );
            if (daysUntil <= 3) {
              pickupSoonNeedsPrep.push(load);
            }
          }
        }
      }
    });

    return {
      sanityCheckRequested,
      forSaleNeedsWrap,
      soldNeedsTag,
      soldNeedsWrap,
      soldNeedsPrep,
      pickupSoonNeedsPrep,
    };
  }, [loads]);

  const formatPickupDate = useCallback((pickupDate: string | null) => {
    if (!pickupDate) return 'TBA';
    const [year, month, day] = pickupDate.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString();
  }, []);

  // Generate action items
  const actionItems = useMemo(() => {
    const items: ActionItem[] = [];

    // Unfinished scanning sessions (high priority)
    const sessions = sessionsQuery.data ?? [];
    const activeSessions = sessions.filter(s => s.status === 'active' || s.status === 'draft');
    const loadsMap = new Map(loads.map(l => [l.sub_inventory_name, l]));

    activeSessions.forEach((session) => {
      if (session.subInventory) {
        const load = loadsMap.get(session.subInventory);
        const status = load?.ge_source_status?.toLowerCase().trim();
        const csoStatus = load?.ge_cso_status?.toLowerCase().trim();
        const isDelivered = csoStatus === 'delivered';

        if (!status || (status !== 'for sale' && status !== 'sold') || isDelivered) {
          return;
        }

        const friendly = load?.friendly_name?.trim() || session.subInventory;
        const csoValue = load?.ge_cso?.trim() || '';
        const csoTail = csoValue ? csoValue.slice(-4) : '';
        const loadLabel = csoTail ? `${friendly} · ${csoTail}` : friendly;

        const loadKey = load?.sub_inventory_name ?? session.subInventory;
        const key = `load:${loadKey}`;
        const scanned = scanCountsQuery.data?.scannedByKey.get(key) ?? 0;
        const total = scanCountsQuery.data?.totalByKey.get(key) ?? 0;
        const progress = total > 0 ? Math.round((scanned / total) * 100) : 0;

        items.push({
          id: `session-${session.id}`,
          type: 'session',
          priority: 2,
          title: `Scan ${loadLabel}`,
          subtitle: `${scanned}/${total} items scanned`,
          description: `Complete scanning session for this ${status} load. Current progress: ${progress}%`,
          sessionId: session.id,
          icon: ScanBarcode,
          color: 'text-blue-600 dark:text-blue-400',
          loadColor: load?.primary_color ?? null,
          urgency: progress < 25 ? 'high' : progress < 75 ? 'medium' : 'low',
        });
      }
    });

    // Sanity checks (highest priority)
    asisActionLoads.sanityCheckRequested.forEach((load) => {
      const friendly = load.friendly_name?.trim() || load.sub_inventory_name;
      const csoValue = load.ge_cso?.trim() || '';
      const csoTail = csoValue ? csoValue.slice(-4) : '';
      const loadLabel = csoTail ? `${friendly} · ${csoTail}` : friendly;
      items.push({
        id: `sanity-${load.sub_inventory_name}`,
        type: 'sanity',
        priority: 1,
        title: `Sanity check ${loadLabel}`,
        subtitle: csoTail ? `CSO ${csoTail}` : `Load ${load.sub_inventory_name}`,
        description: 'Review and verify load contents against GE records to ensure accuracy.',
        load,
        icon: AlertTriangle,
        color: 'text-amber-600 dark:text-amber-400',
        loadColor: load.primary_color ?? null,
        urgency: 'critical',
      });
    });

    // Pickup soon needs prep (high priority)
    asisActionLoads.pickupSoonNeedsPrep.forEach((load) => {
      const friendly = load.friendly_name?.trim() || load.sub_inventory_name;
      const csoValue = load.ge_cso?.trim() || '';
      const csoTail = csoValue ? csoValue.slice(-4) : '';
      const loadLabel = csoTail ? `${friendly} · ${csoTail}` : friendly;
      const needsWrap = !load.prep_wrapped;
      const needsTag = !load.prep_tagged;
      const actions = [needsWrap && 'wrap', needsTag && 'tag'].filter(Boolean).join(' & ');

      const pickupDate = load.pickup_date;
      const daysUntil = pickupDate
        ? Math.ceil((new Date(pickupDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null;

      items.push({
        id: `pickup-${load.sub_inventory_name}`,
        type: 'pickup',
        priority: 2,
        title: `Prep ${loadLabel} for pickup`,
        subtitle: `Needs ${actions}`,
        description: daysUntil !== null
          ? `Pickup scheduled in ${daysUntil} day${daysUntil !== 1 ? 's' : ''} on ${formatPickupDate(load.pickup_date ?? null)}`
          : `Pickup date: ${formatPickupDate(load.pickup_date ?? null)}`,
        load,
        icon: TruckIcon,
        color: 'text-red-600 dark:text-red-400',
        loadColor: load.primary_color ?? null,
        dueDate: load.pickup_date,
        urgency: daysUntil !== null && daysUntil <= 1 ? 'critical' : 'high',
      });
    });

    // Tag/wrap sold loads (medium priority)
    asisActionLoads.soldNeedsPrep.forEach((load) => {
      if (asisActionLoads.pickupSoonNeedsPrep.some(p => p.sub_inventory_name === load.sub_inventory_name)) {
        return; // Skip if already in pickup soon
      }
      const friendly = load.friendly_name?.trim() || load.sub_inventory_name;
      const csoValue = load.ge_cso?.trim() || '';
      const csoTail = csoValue ? csoValue.slice(-4) : '';
      const loadLabel = csoTail ? `${friendly} · ${csoTail}` : friendly;
      const needsWrap = !load.prep_wrapped;
      const needsTag = !load.prep_tagged;
      const actions = [needsWrap && 'wrap', needsTag && 'tag'].filter(Boolean).join(' & ');
      items.push({
        id: `prep-${load.sub_inventory_name}`,
        type: 'tag',
        priority: 3,
        title: `Prep ${loadLabel}`,
        subtitle: `Needs ${actions}`,
        description: 'Sold load awaiting preparation. Complete wrapping and tagging before pickup.',
        load,
        icon: Package,
        color: 'text-orange-600 dark:text-orange-400',
        loadColor: load.primary_color ?? null,
        dueDate: load.pickup_date,
        urgency: 'medium',
      });
    });

    // Wrap for sale loads (lower priority)
    asisActionLoads.forSaleNeedsWrap.forEach((load) => {
      const friendly = load.friendly_name?.trim() || load.sub_inventory_name;
      const csoValue = load.ge_cso?.trim() || '';
      const csoTail = csoValue ? csoValue.slice(-4) : '';
      const loadLabel = csoTail ? `${friendly} · ${csoTail}` : friendly;
      items.push({
        id: `wrap-${load.sub_inventory_name}`,
        type: 'wrap',
        priority: 4,
        title: `Wrap ${loadLabel}`,
        subtitle: 'For Sale',
        description: 'Prepare this for-sale load by wrapping it to protect contents and improve presentation.',
        load,
        icon: PackageOpen,
        color: 'text-blue-600 dark:text-blue-400',
        loadColor: load.primary_color ?? null,
        urgency: 'low',
      });
    });

    return items.sort((a, b) => a.priority - b.priority);
  }, [asisActionLoads, formatPickupDate, sessionsQuery.data, loads, scanCountsQuery.data]);

  // Filter items
  const filteredItems = useMemo(() => {
    switch (selectedFilter) {
      case 'critical':
        return actionItems.filter(item => item.urgency === 'critical' || item.urgency === 'high');
      case 'scans':
        return actionItems.filter(item => item.type === 'session');
      case 'prep':
        return actionItems.filter(item => ['wrap', 'tag', 'pickup'].includes(item.type));
      default:
        return actionItems;
    }
  }, [actionItems, selectedFilter]);

  const criticalCount = actionItems.filter(item => item.urgency === 'critical' || item.urgency === 'high').length;
  const scanCount = actionItems.filter(item => item.type === 'session').length;
  const prepCount = actionItems.filter(item => ['wrap', 'tag', 'pickup'].includes(item.type)).length;

  const handleItemClick = (item: ActionItem) => {
    if (item.load) {
      navigateToLoad(item.load.sub_inventory_name);
    }
  };

  if (loadsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center space-x-2">
          <Package className="h-6 w-6 animate-pulse" />
          <span>Loading actions...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {!isMobile && <AppHeader title="Action Items" />}

      <PageContainer className="py-4 space-y-6 pb-24">
        {/* Header Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{actionItems.length}</div>
              <p className="text-xs text-muted-foreground">Total Actions</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">{criticalCount}</div>
              <p className="text-xs text-muted-foreground">Critical/High</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{scanCount}</div>
              <p className="text-xs text-muted-foreground">Scan Sessions</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{prepCount}</div>
              <p className="text-xs text-muted-foreground">Prep Tasks</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Tabs value={selectedFilter} onValueChange={handleFilterChange} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">All ({actionItems.length})</TabsTrigger>
            <TabsTrigger value="critical">Critical ({criticalCount})</TabsTrigger>
            <TabsTrigger value="scans">Scans ({scanCount})</TabsTrigger>
            <TabsTrigger value="prep">Prep ({prepCount})</TabsTrigger>
          </TabsList>

          <TabsContent value={selectedFilter} className="mt-6">
            {filteredItems.length === 0 ? (
              <Card className="p-12 text-center">
                <Check className="h-16 w-16 mx-auto mb-4 text-green-500" />
                <h3 className="text-lg font-semibold mb-2">All caught up!</h3>
                <p className="text-sm text-muted-foreground">
                  {selectedFilter === 'all'
                    ? 'No action items at this time.'
                    : `No ${selectedFilter} items at this time.`}
                </p>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredItems.map((item) => {
                  if (item.load) {
                    return (
                      <Card key={item.id} className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleItemClick(item)}>
                        <CardContent className="p-0">
                          <div className="flex items-start gap-4 p-4">
                            <div className={`mt-1 flex-shrink-0`}>
                              <item.icon className={`h-6 w-6 ${item.color}`} />
                            </div>
                            <div className="flex-1 min-w-0 space-y-3">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-semibold text-base">{item.title}</h3>
                                  {item.urgency && (
                                    <Badge variant={
                                      item.urgency === 'critical' ? 'destructive' :
                                      item.urgency === 'high' ? 'default' :
                                      'secondary'
                                    }>
                                      {item.urgency}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">{item.subtitle}</p>
                                {item.description && (
                                  <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                                )}
                                {item.dueDate && (
                                  <div className="flex items-center gap-1.5 mt-2 text-sm text-muted-foreground">
                                    <Calendar className="h-3.5 w-3.5" />
                                    <span>Due: {formatPickupDate(item.dueDate ?? null)}</span>
                                  </div>
                                )}
                              </div>
                              <LoadDisplay
                                load={item.load}
                                variant="compact"
                                showProgress={true}
                                showActions={false}
                              />
                            </div>
                            <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
                          </div>
                        </CardContent>
                      </Card>
                    );
                  }

                  return (
                    <Card key={item.id} className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleItemClick(item)}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className={`mt-1 flex-shrink-0`}>
                            <item.icon className={`h-6 w-6 ${item.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-base">{item.title}</h3>
                              {item.urgency && (
                                <Badge variant={
                                  item.urgency === 'critical' ? 'destructive' :
                                  item.urgency === 'high' ? 'default' :
                                  'secondary'
                                }>
                                  {item.urgency}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{item.subtitle}</p>
                            {item.description && (
                              <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                            )}
                          </div>
                          <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </PageContainer>
    </div>
  );
}
