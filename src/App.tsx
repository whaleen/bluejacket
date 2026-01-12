import { LoadManagementView } from "@/components/Inventory/LoadManagementView";
import { CreateLoadView } from "@/components/Inventory/CreateLoadView";
import { CreateSessionView } from "@/components/Session/CreateSessionView";
import { ThemeProvider } from "@/components/theme-provider";
import { useAuth } from "@/context/AuthContext";
import { LoginCard } from "@/components/Auth/LoginCard";
import { useEffect, useState } from "react";
import { ProductEnrichment } from "./components/Products/ProductEnrichment";
import { InventoryView } from "./components/Inventory/InventoryView";
import { DashboardView } from "./components/Dashboard/DashboardView";
import { SettingsView } from "./components/Settings/SettingsView";
import { AppSidebar } from "./components/Navigation/AppSidebar";

function App() {
  const { user, loading } = useAuth();

  // Read initial view from URL
  const getInitialView = () => {
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view');
    if (view === 'inventory' || view === 'products' || view === 'settings' || view === 'loads' || view === 'create-load' || view === 'create-session') {
      return view;
    }
    return 'dashboard';
  };

  const [currentView, setCurrentView] = useState<
    "dashboard" | "inventory" | "products" | "settings" | "loads" | "create-load" | "create-session"
  >(getInitialView);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleViewChange = (view: typeof currentView) => {
    setCurrentView(view);
    setSidebarOpen(false);
  };

  // Update URL when view changes
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (currentView === 'dashboard') {
      params.delete('view');
      // Clear filters when going to dashboard
      params.delete('type');
      params.delete('partsTab');
      params.delete('partsStatus');
    } else {
      params.set('view', currentView);
    }
    const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
    window.history.replaceState({}, '', newUrl);
    window.dispatchEvent(new Event('app:locationchange'));
  }, [currentView]);

  const handleSettingsClick = () => {
    setCurrentView("settings");
  };

  if (loading) return null;
  if (!user) return <LoginCard />;

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <div className="min-h-screen bg-muted/40">
        <div className="grid min-h-screen w-full lg:grid-cols-[16rem_1fr]">
          <AppSidebar
            currentView={currentView}
            onViewChange={handleViewChange}
            open={sidebarOpen}
            onOpenChange={setSidebarOpen}
          />
          <div className="flex min-h-screen flex-col">
        {currentView === "dashboard" && (
          <DashboardView
            onSettingsClick={handleSettingsClick}
            onViewChange={handleViewChange}
            onMenuClick={() => setSidebarOpen(true)}
          />
        )}
        {currentView === "inventory" && (
          <InventoryView
            onSettingsClick={handleSettingsClick}
            onViewChange={handleViewChange}
            onMenuClick={() => setSidebarOpen(true)}
          />
        )}
        {currentView === "products" && (
          <ProductEnrichment
            onSettingsClick={handleSettingsClick}
            onMenuClick={() => setSidebarOpen(true)}
          />
        )}
        {currentView === "loads" && (
          <LoadManagementView
            onSettingsClick={handleSettingsClick}
            onViewChange={handleViewChange}
            onMenuClick={() => setSidebarOpen(true)}
          />
        )}
        {currentView === "create-load" && (
          <CreateLoadView
            onSettingsClick={handleSettingsClick}
            onViewChange={handleViewChange}
            onMenuClick={() => setSidebarOpen(true)}
          />
        )}
        {currentView === "create-session" && (
          <CreateSessionView
            onSettingsClick={handleSettingsClick}
            onViewChange={handleViewChange}
            onMenuClick={() => setSidebarOpen(true)}
          />
        )}
        {currentView === "settings" && (
          <SettingsView onSettingsClick={handleSettingsClick} onMenuClick={() => setSidebarOpen(true)} />
        )}
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
}

export default App;
