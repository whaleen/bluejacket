import { Button } from '@/components/ui/button';
import { Image as ImageIcon, List } from 'lucide-react';
import type { PartsListView } from '@/hooks/usePartsListView';

interface PartsListViewToggleProps {
  view: PartsListView;
  onChange: (view: PartsListView) => void;
}

export function PartsListViewToggle({ view, onChange }: PartsListViewToggleProps) {
  return (
    <div className="inline-flex items-center gap-1">
      <Button
        type="button"
        size="sm"
        variant={view === 'compact' ? 'secondary' : 'outline'}
        onClick={() => onChange('compact')}
        className="gap-1"
      >
        <List className="h-4 w-4" />
        List
      </Button>
      <Button
        type="button"
        size="sm"
        variant={view === 'images' ? 'secondary' : 'outline'}
        onClick={() => onChange('images')}
        className="gap-1"
      >
        <ImageIcon className="h-4 w-4" />
        Images
      </Button>
    </div>
  );
}
