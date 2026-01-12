import { useState, useEffect, useMemo } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, TrendingUp, BarChart3 } from 'lucide-react';
import { getCountHistory, getTrackedParts } from '@/lib/partsManager';
import type { InventoryCount, TrackedPartWithDetails } from '@/types/inventory';

export function PartsHistoryChart() {
  const [history, setHistory] = useState<InventoryCount[]>([]);
  const [trackedParts, setTrackedParts] = useState<TrackedPartWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProductId, setSelectedProductId] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<number>(30);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const [historyResult, partsResult] = await Promise.all([
        getCountHistory(
          selectedProductId === 'all' ? undefined : selectedProductId,
          timeRange
        ),
        getTrackedParts()
      ]);

      if (historyResult.error) {
        console.error('Failed to fetch count history:', historyResult.error);
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

  const chartData = useMemo(() => {
    if (history.length === 0) return [];

    // Group by date and aggregate
    const dateMap = new Map<string, { qty: number; delta: number; count: number }>();

    history.forEach(item => {
      const date = new Date(item.created_at).toLocaleDateString();
      const existing = dateMap.get(date) || { qty: 0, delta: 0, count: 0 };
      dateMap.set(date, {
        qty: item.qty, // Use the last qty for the day
        delta: existing.delta + (item.delta ?? 0),
        count: existing.count + 1
      });
    });

    return Array.from(dateMap.entries())
      .map(([date, data]) => ({
        date,
        qty: data.qty,
        delta: data.delta,
        counts: data.count
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [history]);

  const productName = useMemo(() => {
    if (selectedProductId === 'all') return 'All Tracked Parts';
    const part = trackedParts.find(p => p.product_id === selectedProductId);
    return part?.products?.model ?? 'Unknown Part';
  }, [selectedProductId, trackedParts]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Loading history...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Select value={timeRange.toString()} onValueChange={v => setTimeRange(parseInt(v))}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="14">Last 14 days</SelectItem>
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

      {chartData.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">
            No count history available for the selected filters.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Start recording inventory counts to see trends here.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Quantity Over Time */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Stock Level - {productName}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
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
                    <Line
                      type="monotone"
                      dataKey="qty"
                      name="Quantity"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Movement (Delta) Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Daily Movement - {productName}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
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
                      dataKey="delta"
                      name="Change"
                      fill="hsl(var(--chart-1))"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Stats summary */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">Total Counts</p>
              <p className="text-2xl font-bold">{history.length}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">Current Stock</p>
              <p className="text-2xl font-bold">
                {chartData.length > 0 ? chartData[chartData.length - 1].qty : 0}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">Net Change</p>
              <p className="text-2xl font-bold">
                {chartData.reduce((sum, d) => sum + d.delta, 0)}
              </p>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
