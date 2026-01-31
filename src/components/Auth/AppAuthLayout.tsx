import { WarehouseLogo } from "@/components/Brand/WarehouseLogo";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "./ThemeToggle";

interface AppAuthLayoutProps {
  children: React.ReactNode;
  title: string;
  description: string;
}

export function AppAuthLayout({ children, title, description }: AppAuthLayoutProps) {
  return (
    <div className="min-h-screen bg-muted/40 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        <Card className="p-8">
          <div className="mb-8 text-center">
            <WarehouseLogo className="h-12 w-12 mx-auto mb-4" title="Warehouse" />
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{description}</p>
          </div>

          {children}
        </Card>

        <div className="flex justify-center">
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}
