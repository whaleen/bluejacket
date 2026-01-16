import { useTheme } from '@/components/theme-provider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { User, Settings, LogOut, Sun, Moon, ChevronDown } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

interface UserMenuProps {
  align?: 'start' | 'end';
  variant?: 'icon' | 'row';
  className?: string;
  onSettingsClick?: () => void;
}

export function UserMenu({ align = 'end', variant = 'icon', className, onSettingsClick }: UserMenuProps) {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const trigger =
    variant === 'row' ? (
      <Button variant="ghost" className={cn('w-full justify-start gap-3 px-2', className)}>
        <div className="h-8 w-8 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center">
          {user?.image ? (
            <img
              src={user.image}
              alt={user.username}
              className="h-full w-full object-cover"
            />
          ) : (
            <User className="h-4 w-4 text-primary" />
          )}
        </div>
        <div className="flex-1 text-left">
          <div className="text-sm font-medium text-foreground">
            {user?.username ?? 'My Account'}
          </div>
          <div className="text-xs text-muted-foreground">Account</div>
        </div>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </Button>
    ) : (
      <Button variant="ghost" size="icon" className={cn('rounded-full', className)}>
        <div className="h-8 w-8 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center">
          {user?.image ? (
            <img
              src={user.image}
              alt={user.username}
              className="h-full w-full object-cover"
            />
          ) : (
            <User className="h-4 w-4 text-primary" />
          )}
        </div>
      </Button>
    );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {trigger}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-56">
        <DropdownMenuLabel>
          {user?.username ?? 'My Account'}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={toggleTheme}>
          {theme === 'dark' ? (
            <>
              <Sun className="mr-2 h-4 w-4" />
              <span>Light Mode</span>
            </>
          ) : (
            <>
              <Moon className="mr-2 h-4 w-4" />
              <span>Dark Mode</span>
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onSettingsClick}>
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={logout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
