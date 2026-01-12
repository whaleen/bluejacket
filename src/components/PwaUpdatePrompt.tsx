import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function PwaUpdatePrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { needRefresh, updateServiceWorker } = useRegisterSW({
    onNeedRefresh() {
      setShowPrompt(true);
    },
  });

  useEffect(() => {
    if (needRefresh) {
      setShowPrompt(true);
    }
  }, [needRefresh]);

  if (!showPrompt || !needRefresh) return null;

  const handleReload = async () => {
    setIsRefreshing(true);
    await updateServiceWorker(true);
  };

  return (
    <div className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-lg border bg-background/95 px-4 py-3 shadow-lg backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm">
          <div className="font-semibold">Update available</div>
          <div className="text-muted-foreground">Reload to get the latest version.</div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowPrompt(false)}>
            Later
          </Button>
          <Button size="sm" onClick={handleReload} disabled={isRefreshing}>
            <RefreshCw className={cn('mr-2 h-4 w-4', isRefreshing && 'animate-spin')} />
            Reload
          </Button>
        </div>
      </div>
    </div>
  );
}
