import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Loader2,
  TrendingDown,
  RotateCcw,
  Truck,
  DollarSign,
  Info,
  Activity,
  BatteryWarning
} from 'lucide-react';
import { getCountHistoryWithProducts, getTrackedParts } from '@/lib/partsManager';
import type { InventoryCountWithProduct, TrackedPartWithDetails } from '@/types/inventory';

type Reason = 'usage' | 'return' | 'restock';

function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

function getUnitsForReason(row: InventoryCountWithProduct, reason: Reason) {
  const prev = row.previous_qty ?? 0;
  const qty = row.qty ?? 0;

  if (reason === 'usage') {
    return Math.max(0, prev - qty);
  }

  return Math.max(0, qty - prev);
}

function formatDate(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString();
}

function stdDev(values: number[]) {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance =
    values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

export function PartsReportsTab() {
  const [history, setHistory] = useState<InventoryCountWithProduct[]>([]);
  const [trackedParts, setTrackedParts] = useState<TrackedPartWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProductId, setSelectedProductId] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<number>(90);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const [historyResult, partsResult] = await Promise.all([
        getCountHistoryWithProducts(
          selectedProductId === 'all' ? undefined : selectedProductId,
          timeRange
        ),
        getTrackedParts()
      ]);

      if (historyResult.error) {
        console.error('Failed to fetch report history:', historyResult.error);
      }
      if (partsResult.error) {
        console.error('Failed to fetch tracked parts:', partsResult.error);
      }

      setHistory(historyResult.data ?? []);
      setTrackedParts(partsResult.data ?? []);
      setLoading(false);
    };

    fetchData();
  }, [selectedProductId, timeRange]);

  const weeksInRange = Math.max(1, Math.ceil(timeRange / 7));

  const trackedMap = useMemo(() => {
    return new Map(trackedParts.map(part => [part.product_id, part]));
  }, [trackedParts]);

  const summary = useMemo(() => {
    let usageUnits = 0;
    let returnUnits = 0;
    let restockUnits = 0;
    let unclassified = 0;
    let usageCost = 0;

    let lowStockSnapshots = 0;
    let stockoutSnapshots = 0;
    let thresholdSnapshots = 0;

    const pricedProducts = new Set<string>();
    const usageProducts = new Set<string>();
    const partsWithData = new Set<string>();

    history.forEach(row => {
      partsWithData.add(row.product_id);

      if (row.qty === 0) {
        stockoutSnapshots += 1;
      }

      const tracked = trackedMap.get(row.product_id);
      const threshold = tracked?.reorder_threshold;
      if (typeof threshold === 'number') {
        thresholdSnapshots += 1;
        if (row.qty <= threshold) {
          lowStockSnapshots += 1;
        }
      }

      const reason = row.count_reason;
      if (reason !== 'usage' && reason !== 'return' && reason !== 'restock') {
        unclassified += 1;
        return;
      }

      const units = getUnitsForReason(row, reason);
      if (reason === 'usage') usageUnits += units;
      if (reason === 'return') returnUnits += units;
      if (reason === 'restock') restockUnits += units;

      if (reason === 'usage') {
        usageProducts.add(row.product_id);
        const price = toNumber(row.products?.price) ?? toNumber(row.products?.msrp);
        if (price !== null) {
          pricedProducts.add(row.product_id);
          usageCost += units * price;
        }
      }
    });

    const priceCoverage =
      usageProducts.size === 0
        ? '0/0'
        : `${pricedProducts.size}/${usageProducts.size}`;

    const lowStockRate =
      thresholdSnapshots > 0 ? lowStockSnapshots / thresholdSnapshots : null;

    return {
      usageUnits,
      returnUnits,
      restockUnits,
      unclassified,
      usageCost,
      priceCoverage,
      partsWithData: partsWithData.size,
      lowStockRate,
      stockoutSnapshots
    };
  }, [history, trackedMap]);

  const chartData = useMemo(() => {
    if (history.length === 0) return [];

    const dateMap = new Map<
      string,
      { date: string; usage: number; return: number; restock: number }
    >();

    history.forEach(row => {
      const reason = row.count_reason;
      if (reason !== 'usage' && reason !== 'return' && reason !== 'restock') {
        return;
      }

      const dateKey = new Date(row.created_at).toISOString().slice(0, 10);
      const existing = dateMap.get(dateKey) || {
        date: dateKey,
        usage: 0,
        return: 0,
        restock: 0
      };

      const units = getUnitsForReason(row, reason);
      if (reason === 'usage') existing.usage += units;
      if (reason === 'return') existing.return += units;
      if (reason === 'restock') existing.restock += units;

      dateMap.set(dateKey, existing);
    });

    return Array.from(dateMap.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [history]);

  const perProductStats = useMemo(() => {
    const map = new Map<
      string,
      {
        product_id: string;
        model: string;
        brand?: string;
        currentQty: number;
        reorderThreshold: number | null;
        snapshots: number;
        firstQty: number | null;
        lastQty: number | null;
        lastCountDate?: string;
        usageUnits: number;
        returnUnits: number;
        restockUnits: number;
        usageSamples: number[];
        lowStockCount: number;
        stockoutCount: number;
        price: number | null;
      }
    >();

    trackedParts.forEach(part => {
      map.set(part.product_id, {
        product_id: part.product_id,
        model: part.products?.model ?? 'Unknown',
        brand: part.products?.brand,
        currentQty: part.current_qty ?? 0,
        reorderThreshold:
          typeof part.reorder_threshold === 'number' ? part.reorder_threshold : null,
        snapshots: 0,
        firstQty: null,
        lastQty: null,
        lastCountDate: undefined,
        usageUnits: 0,
        returnUnits: 0,
        restockUnits: 0,
        usageSamples: [],
        lowStockCount: 0,
        stockoutCount: 0,
        price: null
      });
    });

    history.forEach(row => {
      const entry =
        map.get(row.product_id) ??
        {
          product_id: row.product_id,
          model: row.products?.model ?? 'Unknown',
          brand: undefined,
          currentQty: row.qty ?? 0,
          reorderThreshold: null,
          snapshots: 0,
          firstQty: null,
          lastQty: null,
          lastCountDate: undefined,
          usageUnits: 0,
          returnUnits: 0,
          restockUnits: 0,
          usageSamples: [],
          lowStockCount: 0,
          stockoutCount: 0,
          price: null
        };

      entry.snapshots += 1;
      if (entry.firstQty === null) {
        entry.firstQty = row.qty ?? 0;
      }
      entry.lastQty = row.qty ?? 0;
      entry.lastCountDate = row.created_at;

      if (row.qty === 0) {
        entry.stockoutCount += 1;
      }

      if (typeof entry.reorderThreshold === 'number') {
        if ((row.qty ?? 0) <= entry.reorderThreshold) {
          entry.lowStockCount += 1;
        }
      }

      const price = toNumber(row.products?.price) ?? toNumber(row.products?.msrp);
      if (price !== null) {
        entry.price = price;
      }

      const reason = row.count_reason;
      if (reason === 'usage' || reason === 'return' || reason === 'restock') {
        const units = getUnitsForReason(row, reason);
        if (reason === 'usage') {
          entry.usageUnits += units;
          entry.usageSamples.push(units);
        }
        if (reason === 'return') entry.returnUnits += units;
        if (reason === 'restock') entry.restockUnits += units;
      }

      map.set(row.product_id, entry);
    });

    const filtered = Array.from(map.values()).filter(entry =>
      selectedProductId === 'all' ? true : entry.product_id === selectedProductId
    );

    return filtered.map(entry => {
      const avgWeeklyUsage = entry.usageUnits / weeksInRange;
      const weeksOfSupply =
        avgWeeklyUsage > 0 ? entry.currentQty / avgWeeklyUsage : null;
      const lowStockRate =
        entry.snapshots > 0 && typeof entry.reorderThreshold === 'number'
          ? entry.lowStockCount / entry.snapshots
          : null;
      const netChange =
        entry.firstQty === null || entry.lastQty === null
          ? 0
          : entry.lastQty - entry.firstQty;

      return {
        ...entry,
        avgWeeklyUsage,
        weeksOfSupply,
        lowStockRate,
        netChange,
        volatility: stdDev(entry.usageSamples),
        usageCost: entry.price !== null ? entry.usageUnits * entry.price : null
      };
    });
  }, [history, trackedParts, selectedProductId, weeksInRange]);

  const usageRows = useMemo(() => {
    return [...perProductStats]
      .filter(entry => entry.usageUnits > 0)
      .sort((a, b) => b.usageUnits - a.usageUnits)
      .slice(0, 15);
  }, [perProductStats]);

  const stockHealthRows = useMemo(() => {
    return [...perProductStats]
      .sort((a, b) => {
        const aRate = a.lowStockRate ?? -1;
        const bRate = b.lowStockRate ?? -1;
        if (aRate !== bRate) return bRate - aRate;
        return a.currentQty - b.currentQty;
      })
      .slice(0, 15);
  }, [perProductStats]);

  const volatilityRows = useMemo(() => {
    return [...perProductStats]
      .filter(entry => entry.volatility > 0)
      .sort((a, b) => b.volatility - a.volatility)
      .slice(0, 10);
  }, [perProductStats]);

  const formatter = useMemo(() => new Intl.NumberFormat('en-US'), []);
  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 2
      }),
    []
  );

  const productName = useMemo(() => {
    if (selectedProductId === 'all') return 'All Tracked Parts';
    const part = trackedParts.find(p => p.product_id === selectedProductId);
    return part?.products?.model ?? 'Unknown Part';
  }, [selectedProductId, trackedParts]);

  const partsInScope =
    selectedProductId === 'all' ? trackedParts.length : Math.max(summary.partsWithData, 1);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Loading reports...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <Select value={timeRange.toString()} onValueChange={v => setTimeRange(parseInt(v))}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="60">Last 60 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedProductId} onValueChange={setSelectedProductId}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Select a part" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tracked Parts</SelectItem>
            {trackedParts.map(part => (
              <SelectItem key={part.product_id} value={part.product_id}>
                {part.products?.model ?? 'Unknown'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {history.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">
            No report data available for the selected filters.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Add a reason when changing counts to populate usage, return, and restock metrics.
          </p>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingDown className="h-4 w-4" />
                Usage Units
              </div>
              <p className="text-2xl font-bold">{formatter.format(summary.usageUnits)}</p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <RotateCcw className="h-4 w-4" />
                Returns
              </div>
              <p className="text-2xl font-bold">{formatter.format(summary.returnUnits)}</p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Truck className="h-4 w-4" />
                Restocks
              </div>
              <p className="text-2xl font-bold">{formatter.format(summary.restockUnits)}</p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                Est. Usage Cost
              </div>
              <p className="text-2xl font-bold">
                {currencyFormatter.format(summary.usageCost)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Price coverage: {summary.priceCoverage}
              </p>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <Card className="p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Activity className="h-4 w-4" />
                Avg Weekly Usage
              </div>
              <p className="text-2xl font-bold">
                {formatter.format(summary.usageUnits / weeksInRange)}
              </p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Info className="h-4 w-4" />
                Parts w/ Data
              </div>
              <p className="text-2xl font-bold">
                {summary.partsWithData}/{partsInScope}
              </p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <BatteryWarning className="h-4 w-4" />
                Low Stock Rate
              </div>
              <p className="text-2xl font-bold">
                {summary.lowStockRate === null
                  ? '-'
                  : `${Math.round(summary.lowStockRate * 100)}%`}
              </p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <BatteryWarning className="h-4 w-4" />
                Stockouts
              </div>
              <p className="text-2xl font-bold">
                {formatter.format(summary.stockoutSnapshots)}
              </p>
            </Card>
          </div>

          {summary.unclassified > 0 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Info className="h-3 w-3" />
              {formatter.format(summary.unclassified)} snapshot
              {summary.unclassified !== 1 ? 's' : ''} without a reason were
              excluded from movement totals.
            </div>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                Weekly Movement by Reason — {productName}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Info className="h-4 w-4" />
                  No reason-tagged snapshots in this range.
                </div>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '6px'
                        }}
                      />
                      <Legend />
                      <Bar
                        dataKey="usage"
                        name="Usage"
                        stackId="movement"
                        fill="hsl(var(--chart-2))"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="return"
                        name="Return"
                        stackId="movement"
                        fill="hsl(var(--chart-3))"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="restock"
                        name="Restock"
                        stackId="movement"
                        fill="hsl(var(--chart-4))"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Top Usage (estimated)</CardTitle>
            </CardHeader>
            <CardContent>
              {usageRows.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No usage-tagged snapshots yet.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Model</TableHead>
                      <TableHead>Usage</TableHead>
                      <TableHead>Returns</TableHead>
                      <TableHead>Restocks</TableHead>
                      <TableHead>Avg / Week</TableHead>
                      <TableHead>Est. Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usageRows.map(entry => (
                      <TableRow key={entry.product_id}>
                        <TableCell className="font-mono">{entry.model}</TableCell>
                        <TableCell>{formatter.format(entry.usageUnits)}</TableCell>
                        <TableCell>{formatter.format(entry.returnUnits)}</TableCell>
                        <TableCell>{formatter.format(entry.restockUnits)}</TableCell>
                        <TableCell>{formatter.format(entry.avgWeeklyUsage)}</TableCell>
                        <TableCell>
                          {entry.usageCost === null
                            ? '-'
                            : currencyFormatter.format(entry.usageCost)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Stock Health</CardTitle>
            </CardHeader>
            <CardContent>
              {stockHealthRows.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No tracked parts found for this range.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Model</TableHead>
                      <TableHead>Current</TableHead>
                      <TableHead>Reorder At</TableHead>
                      <TableHead>Weeks of Supply</TableHead>
                      <TableHead>Low Stock %</TableHead>
                      <TableHead>Stockouts</TableHead>
                      <TableHead>Last Count</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stockHealthRows.map(entry => (
                      <TableRow key={entry.product_id}>
                        <TableCell className="font-mono">{entry.model}</TableCell>
                        <TableCell>{formatter.format(entry.currentQty)}</TableCell>
                        <TableCell>
                          {entry.reorderThreshold === null
                            ? '-'
                            : formatter.format(entry.reorderThreshold)}
                        </TableCell>
                        <TableCell>
                          {entry.weeksOfSupply === null
                            ? '∞'
                            : entry.weeksOfSupply.toFixed(1)}
                        </TableCell>
                        <TableCell>
                          {entry.lowStockRate === null
                            ? '-'
                            : `${Math.round(entry.lowStockRate * 100)}%`}
                        </TableCell>
                        <TableCell>{formatter.format(entry.stockoutCount)}</TableCell>
                        <TableCell>{formatDate(entry.lastCountDate)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Most Volatile Usage</CardTitle>
            </CardHeader>
            <CardContent>
              {volatilityRows.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No usage variance available yet.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Model</TableHead>
                      <TableHead>Usage Std Dev</TableHead>
                      <TableHead>Avg / Week</TableHead>
                      <TableHead>Net Change</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {volatilityRows.map(entry => (
                      <TableRow key={entry.product_id}>
                        <TableCell className="font-mono">{entry.model}</TableCell>
                        <TableCell>{entry.volatility.toFixed(2)}</TableCell>
                        <TableCell>{formatter.format(entry.avgWeeklyUsage)}</TableCell>
                        <TableCell>{formatter.format(entry.netChange)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
