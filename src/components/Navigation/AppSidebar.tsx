import { useEffect, useMemo, useState } from 'react';
import type { ComponentType } from 'react';
import {
  Package,
  LayoutDashboard,
  ScanBarcode,
  TruckIcon,
  Database,
  Settings,
  X,
  ClipboardList,
  ListChecks,
  History,
  BarChart3,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { AppView } from '@/lib/routes';

interface AppSidebarProps {
  currentView: AppView;
  onViewChange: (view: AppView, options?: { params?: URLSearchParams; sessionId?: string | null; replace?: boolean }) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface NavItem {
  label: string;
  icon: ComponentType<{ className?: string }>;
  view: AppView;
  applyParams?: (params: URLSearchParams) => void;
  isActive: (currentView: AppView, params: URLSearchParams) => boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const clearPartsParams = (params: URLSearchParams) => {
  params.delete('type');
  params.delete('partsTab');
  params.delete('partsStatus');
};

const navSections: NavSection[] = [
  {
    title: 'Overview',
    items: [
      {
        label: 'Dashboard',
        icon: LayoutDashboard,
        view: 'dashboard',
        applyParams: clearPartsParams,
        isActive: (currentView) => currentView === 'dashboard'
      }
    ]
  },
  {
    title: 'Operations',
    items: [
      {
        label: 'Inventory',
        icon: ClipboardList,
        view: 'inventory',
        applyParams: clearPartsParams,
        isActive: (currentView, params) =>
          currentView === 'inventory' && params.get('type') !== 'Parts'
      },
      {
        label: 'Loads',
        icon: TruckIcon,
        view: 'loads',
        applyParams: clearPartsParams,
        isActive: (currentView) => currentView === 'loads' || currentView === 'create-load'
      },
      {
        label: 'Scanning Sessions',
        icon: ScanBarcode,
        view: 'create-session',
        applyParams: clearPartsParams,
        isActive: (currentView) => currentView === 'create-session'
      }
    ]
  },
  {
    title: 'Parts',
    items: [
      {
        label: 'Parts Inventory',
        icon: Package,
        view: 'inventory',
        applyParams: params => {
          params.set('type', 'Parts');
          params.set('partsTab', 'inventory');
          params.delete('partsStatus');
        },
        isActive: (currentView, params) =>
          currentView === 'inventory' &&
          params.get('type') === 'Parts' &&
          (params.get('partsTab') ?? 'inventory') === 'inventory' &&
          params.get('partsStatus') !== 'reorder'
      },
      {
        label: 'Parts Tracking',
        icon: ListChecks,
        view: 'inventory',
        applyParams: params => {
          params.set('type', 'Parts');
          params.set('partsTab', 'tracked');
          params.delete('partsStatus');
        },
        isActive: (currentView, params) =>
          currentView === 'inventory' &&
          params.get('type') === 'Parts' &&
          params.get('partsTab') === 'tracked'
      },
      {
        label: 'Parts History',
        icon: History,
        view: 'inventory',
        applyParams: params => {
          params.set('type', 'Parts');
          params.set('partsTab', 'history');
          params.delete('partsStatus');
        },
        isActive: (currentView, params) =>
          currentView === 'inventory' &&
          params.get('type') === 'Parts' &&
          params.get('partsTab') === 'history'
      },
      {
        label: 'Parts Reports',
        icon: BarChart3,
        view: 'inventory',
        applyParams: params => {
          params.set('type', 'Parts');
          params.set('partsTab', 'reports');
          params.delete('partsStatus');
        },
        isActive: (currentView, params) =>
          currentView === 'inventory' &&
          params.get('type') === 'Parts' &&
          params.get('partsTab') === 'reports'
      },
      {
        label: 'Reorder Alerts',
        icon: AlertTriangle,
        view: 'inventory',
        applyParams: params => {
          params.set('type', 'Parts');
          params.set('partsTab', 'inventory');
          params.set('partsStatus', 'reorder');
        },
        isActive: (currentView, params) =>
          currentView === 'inventory' &&
          params.get('type') === 'Parts' &&
          params.get('partsStatus') === 'reorder'
      }
    ]
  },
  {
    title: 'Data',
    items: [
      {
        label: 'Products',
        icon: Database,
        view: 'products',
        applyParams: clearPartsParams,
        isActive: (currentView) => currentView === 'products'
      }
    ]
  },
  {
    title: 'Settings',
    items: [
      {
        label: 'Settings',
        icon: Settings,
        view: 'settings',
        applyParams: clearPartsParams,
        isActive: (currentView) => currentView === 'settings'
      }
    ]
  }
];

function SidebarContent({
  currentView,
  onViewChange,
  onClose,
  showClose,
  params
}: {
  currentView: AppView;
  onViewChange: (view: AppView, options?: { params?: URLSearchParams; sessionId?: string | null; replace?: boolean }) => void;
  onClose?: () => void;
  showClose?: boolean;
  params: URLSearchParams;
}) {
  const handleNavigate = (item: NavItem) => {
    const nextParams = new URLSearchParams(window.location.search);
    item.applyParams?.(nextParams);
    onViewChange(item.view, { params: nextParams });
    onClose?.();
  };

  return (
    <div className="flex h-full flex-col min-h-0">
      <div className="flex items-center justify-between border-b px-4 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Package className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="text-sm font-semibold">Warehouse</div>
            <div className="text-xs text-muted-foreground">Operations</div>
          </div>
        </div>
        {showClose && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-4">
        {navSections.map(section => (
          <div key={section.title} className="space-y-2">
            <div className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {section.title}
            </div>
            <div className="space-y-1">
              {section.items.map(item => {
                const isActive = item.isActive(currentView, params);
                const Icon = item.icon;
                return (
                  <Button
                    key={item.label}
                    variant={isActive ? 'secondary' : 'ghost'}
                    className={cn('w-full justify-start gap-2', isActive && 'font-semibold')}
                    onClick={() => handleNavigate(item)}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t px-4 py-3 text-xs text-muted-foreground">
        Warehouse Inventory
      </div>
    </div>
  );
}

export function AppSidebar({ currentView, onViewChange, open, onOpenChange }: AppSidebarProps) {
  const [search, setSearch] = useState(() => window.location.search);

  useEffect(() => {
    const handleChange = () => setSearch(window.location.search);
    window.addEventListener('app:locationchange', handleChange);
    window.addEventListener('popstate', handleChange);
    return () => {
      window.removeEventListener('app:locationchange', handleChange);
      window.removeEventListener('popstate', handleChange);
    };
  }, []);

  const params = useMemo(() => new URLSearchParams(search), [search]);

  return (
    <>
      <aside className="hidden lg:flex lg:h-screen lg:w-64 lg:flex-col lg:sticky lg:top-0 border-r bg-muted/40">
        <SidebarContent currentView={currentView} onViewChange={onViewChange} params={params} />
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => onOpenChange(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-background shadow-lg">
            <SidebarContent
              currentView={currentView}
              onViewChange={onViewChange}
              params={params}
              onClose={() => onOpenChange(false)}
              showClose
            />
          </aside>
        </div>
      )}
    </>
  );
}
