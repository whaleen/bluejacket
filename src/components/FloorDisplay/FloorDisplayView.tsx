import { useEffect, useState, useCallback } from 'react';
import {
  getDisplayByIdPublic,
  pairDisplay,
  subscribeToDisplay,
  recordHeartbeat,
} from '@/lib/displayManager';
import type { FloorDisplay, DisplayState } from '@/types/display';
import { LoadsSummaryWidget } from './widgets/LoadsSummaryWidget';
import { PartsAlertsWidget } from './widgets/PartsAlertsWidget';
import { ActiveSessionsWidget } from './widgets/ActiveSessionsWidget';
import { ClockWidget } from './widgets/ClockWidget';
import { TextWidget } from './widgets/TextWidget';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Props = {
  displayId: string | null;
};

export function FloorDisplayView({ displayId }: Props) {
  const [display, setDisplay] = useState<FloorDisplay | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState('');
  const [pairing, setPairing] = useState(false);

  const loadDisplay = useCallback(async (id: string) => {
    setLoading(true);
    const { data, error } = await getDisplayByIdPublic(id);
    if (error || !data) {
      setError('Display not found');
      setLoading(false);
      return;
    }
    setDisplay(data);
    setLoading(false);

    localStorage.setItem('floor_display_id', id);
  }, []);

  useEffect(() => {
    const storedId = localStorage.getItem('floor_display_id');
    const idToLoad = displayId || storedId;

    if (idToLoad) {
      loadDisplay(idToLoad);
    } else {
      setLoading(false);
    }
  }, [displayId, loadDisplay]);

  useEffect(() => {
    if (!display) return;

    const unsubscribe = subscribeToDisplay(display.id, (updatedDisplay) => {
      setDisplay(updatedDisplay);
    });

    return unsubscribe;
  }, [display?.id]);

  useEffect(() => {
    if (!display) return;

    const interval = setInterval(() => {
      recordHeartbeat(display.id);
    }, 30000);

    recordHeartbeat(display.id);

    return () => clearInterval(interval);
  }, [display?.id]);

  const handlePair = async () => {
    if (!pairingCode || pairingCode.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setPairing(true);
    setError(null);

    const { data, error } = await pairDisplay(pairingCode);
    if (error || !data) {
      setError('Invalid pairing code or display already paired');
      setPairing(false);
      return;
    }

    setDisplay(data);
    localStorage.setItem('floor_display_id', data.id);
    setPairing(false);
  };

  const handleUnpair = () => {
    localStorage.removeItem('floor_display_id');
    setDisplay(null);
    setPairingCode('');
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-2xl text-muted-foreground animate-pulse">Loading...</p>
      </div>
    );
  }

  // Pairing screen - matches LoginCard pattern exactly
  if (!display) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md p-6 space-y-6">
          <div className="flex flex-col items-center justify-center gap-2 pb-2">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                <rect width="20" height="14" x="2" y="3" rx="2"/>
                <line x1="8" x2="16" y1="21" y2="21"/>
                <line x1="12" x2="12" y1="17" y2="21"/>
              </svg>
            </div>
            <h1 className="text-2xl font-bold">Floor Display</h1>
            <p className="text-sm text-muted-foreground text-center">
              Enter the 6-digit pairing code from your mobile device
            </p>
          </div>

          <div className="space-y-2">
            <Label>Pairing Code</Label>
            <Input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={pairingCode}
              onChange={(e) => setPairingCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="text-center text-2xl font-mono tracking-widest"
            />
          </div>

          {error && <p className="text-sm text-destructive text-center">{error}</p>}

          <Button
            className="w-full"
            onClick={handlePair}
            disabled={pairing || pairingCode.length !== 6}
          >
            {pairing ? 'Pairing...' : 'Pair Display'}
          </Button>
        </Card>
      </div>
    );
  }

  // Main display view
  const state: DisplayState = display.stateJson ?? {};
  const layout = state.layout ?? { columns: 2, rows: 2, widgets: [] };
  const widgets = layout.widgets ?? [];
  const columns = layout.columns ?? 2;

  return (
    <div className="min-h-screen bg-background p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-foreground">
          {state.title || display.name}
        </h1>
        <Button variant="ghost" size="sm" onClick={handleUnpair}>
          Unpair
        </Button>
      </div>

      {/* Widget Grid */}
      <div
        className="grid gap-4"
        style={{
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          height: 'calc(100vh - 80px)',
        }}
      >
        {widgets.map((widget) => {
          switch (widget.type) {
            case 'loads-summary':
              return (
                <LoadsSummaryWidget
                  key={widget.id}
                  title={widget.title}
                  config={widget.config}
                />
              );
            case 'parts-alerts':
              return (
                <PartsAlertsWidget
                  key={widget.id}
                  title={widget.title}
                  config={widget.config}
                />
              );
            case 'active-sessions':
              return (
                <ActiveSessionsWidget
                  key={widget.id}
                  title={widget.title}
                  config={widget.config}
                />
              );
            case 'clock':
              return (
                <ClockWidget
                  key={widget.id}
                  title={widget.title}
                  config={widget.config}
                />
              );
            case 'text':
              return (
                <TextWidget
                  key={widget.id}
                  title={widget.title}
                  config={widget.config}
                />
              );
            default:
              return null;
          }
        })}
      </div>
    </div>
  );
}
