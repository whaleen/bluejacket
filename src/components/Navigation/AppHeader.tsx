import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import { PageContainer } from '@/components/Layout/PageContainer';
import { UserMenu } from '@/components/Navigation/UserMenu';


interface AppHeaderProps {
  title: string;
  actions?: React.ReactNode;
  onSettingsClick?: () => void;
  onMenuClick?: () => void;
}

export function AppHeader({ title, actions, onSettingsClick, onMenuClick }: AppHeaderProps) {
  return (
    <div className="sticky top-0 z-10 border-b border-border bg-background">
      <PageContainer className="py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          {onMenuClick && (
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={onMenuClick}
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
          <h1 className="text-xl font-semibold text-foreground truncate">{title}</h1>
        </div>
        <div className="flex items-center gap-2 sm:shrink-0">
          {actions && (
            <div className="flex items-center gap-2 overflow-x-auto max-w-full pr-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {actions}
            </div>
          )}
          <UserMenu className="hidden lg:inline-flex" onSettingsClick={onSettingsClick} />
        </div>
        </div>
      </PageContainer>
    </div>
  );
}
