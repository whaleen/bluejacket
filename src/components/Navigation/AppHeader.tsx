import { PageContainer } from '@/components/Layout/PageContainer';
import { SidebarTrigger } from '@/components/ui/sidebar';


interface AppHeaderProps {
  title: string;
  actions?: React.ReactNode;
  onMenuClick?: () => void;
}

export function AppHeader({ title, actions, onMenuClick }: AppHeaderProps) {
  return (
    <div className="sticky top-0 z-10 border-b border-border bg-background">
      <PageContainer className="py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <SidebarTrigger className="lg:hidden" onClick={onMenuClick} />
          <h1 className="text-xl font-semibold text-foreground truncate">{title}</h1>
        </div>
        <div className="flex items-center gap-2 sm:shrink-0">
          {actions && (
            <div className="flex items-center gap-2 overflow-x-auto max-w-full pr-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {actions}
            </div>
          )}
        </div>
        </div>
      </PageContainer>
    </div>
  );
}
