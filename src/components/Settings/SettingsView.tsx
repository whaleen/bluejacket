import { AppHeader } from '@/components/Navigation/AppHeader';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Settings as SettingsIcon } from 'lucide-react';

interface SettingsViewProps {
  onSettingsClick: () => void;
}

export function SettingsView({ onSettingsClick }: SettingsViewProps) {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="Settings" onSettingsClick={onSettingsClick} />

      <div className="max-w-2xl mx-auto p-6 space-y-6">
        {/* Placeholder content */}
        <Card className="p-6 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-border">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <SettingsIcon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Application Settings</h2>
              <p className="text-sm text-muted-foreground">Manage your preferences and configurations</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="user-name">User Name</Label>
              <Input
                id="user-name"
                type="text"
                placeholder="Enter your name"
                disabled
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="user-email">Email</Label>
              <Input
                id="user-email"
                type="email"
                placeholder="Enter your email"
                disabled
              />
            </div>

            <div className="pt-4">
              <Button disabled>
                Save Changes
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold text-foreground mb-4">About</h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>BlueJacket Inventory Scanner</p>
            <p>Version 1.0.0</p>
            <p className="pt-2 text-xs">Settings page placeholder - functionality coming soon</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
