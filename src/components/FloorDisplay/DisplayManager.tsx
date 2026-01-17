import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Monitor, Trash2, Copy, Check } from 'lucide-react';
import {
  getAllDisplays,
  createDisplay,
  deleteDisplay,
} from '@/lib/displayManager';
import type { FloorDisplaySummary } from '@/types/display';

export function DisplayManager() {
  const [displays, setDisplays] = useState<FloorDisplaySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [newDisplayName, setNewDisplayName] = useState('');
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchDisplays = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await getAllDisplays();
    if (error) {
      setError('Failed to load displays');
      setDisplays([]);
    } else {
      setDisplays(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDisplays();
  }, []);

  const handleCreate = async () => {
    setCreating(true);
    setError(null);
    setSuccess(null);

    const { data, error } = await createDisplay({
      name: newDisplayName.trim() || undefined,
    });

    if (error || !data) {
      setError('Failed to create display');
      setCreating(false);
      return;
    }

    setSuccess(`Display created with pairing code: ${data.pairingCode}`);
    setNewDisplayName('');
    setCreating(false);
    await fetchDisplays();
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setError(null);
    setSuccess(null);

    const { success, error } = await deleteDisplay(id);

    if (error || !success) {
      setError('Failed to delete display');
      setDeletingId(null);
      return;
    }

    setSuccess('Display deleted');
    setDeletingId(null);
    await fetchDisplays();
  };

  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const displayUrl = `${window.location.origin}/display`;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(displayUrl);
    setCopiedId('url');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      <Card className="p-6 space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-border">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Monitor className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Floor Displays</h2>
            <p className="text-sm text-muted-foreground">
              Create and manage TV displays for your warehouse floor.
            </p>
          </div>
        </div>

        {/* Instructions */}
        <div className="rounded-lg bg-slate-800/50 p-4 space-y-3">
          <div className="text-sm font-medium">To set up a TV display:</div>
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Create a display below to get a pairing code</li>
            <li>On the TV, navigate to: <code className="bg-slate-700 px-2 py-0.5 rounded font-mono">/display</code></li>
            <li>Enter the 6-digit pairing code</li>
          </ol>
          <div className="flex items-center gap-2 pt-2">
            <span className="text-xs text-muted-foreground">Full URL:</span>
            <code className="bg-slate-700 px-2 py-1 rounded text-sm font-mono">{displayUrl}</code>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2"
              onClick={handleCopyUrl}
            >
              {copiedId === 'url' ? (
                <Check className="h-3 w-3 text-emerald-500" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Create Display</h3>
          <div className="flex gap-3">
            <div className="flex-1 space-y-2">
              <Label htmlFor="new-display-name">Display Name (optional)</Label>
              <Input
                id="new-display-name"
                value={newDisplayName}
                onChange={(e) => setNewDisplayName(e.target.value)}
                placeholder="e.g. Shipping Area TV"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm">
              {error && <span className="text-destructive">{error}</span>}
              {!error && success && <span className="text-emerald-600">{success}</span>}
            </div>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? 'Creating...' : 'Create Display'}
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Existing Displays</h3>
            <Button variant="outline" size="sm" onClick={fetchDisplays}>
              Refresh
            </Button>
          </div>

          {loading ? (
            <div className="text-sm text-muted-foreground">Loading displays...</div>
          ) : displays.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No displays yet. Create one above.
            </div>
          ) : (
            <div className="space-y-3">
              {displays.map((display) => (
                <div
                  key={display.id}
                  className="rounded-lg border border-border/60 bg-background/60 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-foreground">{display.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {display.paired ? (
                          <span className="text-emerald-500">Paired</span>
                        ) : (
                          <span className="text-yellow-500">Awaiting pairing</span>
                        )}
                        {display.lastHeartbeat && (
                          <span className="ml-2">
                            Last seen: {new Date(display.lastHeartbeat).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(display.id)}
                      disabled={deletingId === display.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Pairing Code</Label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-slate-800 px-4 py-3 rounded text-3xl font-mono tracking-[0.3em] text-center">
                        {display.pairingCode}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopyCode(display.pairingCode, display.id)}
                      >
                        {copiedId === display.id ? (
                          <Check className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Created: {new Date(display.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
