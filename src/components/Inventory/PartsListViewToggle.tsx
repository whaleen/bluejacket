import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Image as ImageIcon, List, Table2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { PartsListView } from '@/hooks/usePartsListView';

interface PartsListViewToggleProps {
  view: PartsListView;
  onChange: (view: PartsListView) => void;
  showTable?: boolean;
  grouped?: boolean;
  className?: string;
  buttonClassName?: string;
  triggerClassName?: string;
  variant?: 'buttons' | 'dropdown';
  triggerSize?: 'xs' | 'sm' | 'default' | 'responsive';
}

export function PartsListViewToggle({
  view,
  onChange,
  showTable = false,
  grouped = false,
  className,
  buttonClassName,
  triggerClassName,
  variant = 'buttons',
  triggerSize = 'sm',
}: PartsListViewToggleProps) {
  const sharedButtonClassName = cn('gap-1', buttonClassName);
  const activeLabel = view === 'compact' ? 'List' : view === 'images' ? 'Images' : 'Table';
  const ActiveIcon = view === 'compact' ? List : view === 'images' ? ImageIcon : Table2;

  if (variant === 'dropdown') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size={triggerSize} variant="outline" className={cn('gap-2', triggerClassName)}>
            <ActiveIcon className="h-4 w-4" />
            View
            <span className="hidden md:inline text-muted-foreground">· {activeLabel}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuRadioGroup
            value={view}
            onValueChange={(value) => onChange(value as PartsListView)}
          >
            <DropdownMenuRadioItem value="compact">
              <List className="h-4 w-4" />
              List
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="images">
              <ImageIcon className="h-4 w-4" />
              Images
            </DropdownMenuRadioItem>
            {showTable && (
              <DropdownMenuRadioItem value="table">
                <Table2 className="h-4 w-4" />
                Table
              </DropdownMenuRadioItem>
            )}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  const content = (
    <>
      <Button
        type="button"
        size="responsive"
        variant={view === 'compact' ? 'secondary' : 'outline'}
        onClick={() => onChange('compact')}
        className={sharedButtonClassName}
      >
        <List className="h-4 w-4" />
        List
      </Button>
      <Button
        type="button"
        size="responsive"
        variant={view === 'images' ? 'secondary' : 'outline'}
        onClick={() => onChange('images')}
        className={sharedButtonClassName}
      >
        <ImageIcon className="h-4 w-4" />
        Images
      </Button>
      {showTable && (
        <Button
          type="button"
          size="responsive"
          variant={view === 'table' ? 'secondary' : 'outline'}
          onClick={() => onChange('table')}
          className={sharedButtonClassName}
        >
          <Table2 className="h-4 w-4" />
          Table
        </Button>
      )}
    </>
  );

  if (grouped) return content;

  return <div className={cn('inline-flex items-center gap-1', className)}>{content}</div>;
}
