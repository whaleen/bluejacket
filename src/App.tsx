import { LoadManagementView } from "@/components/Inventory/LoadManagementView";
import { CreateLoadView } from "@/components/Inventory/CreateLoadView";
import { CreateSessionView } from "@/components/Session/CreateSessionView";
import { ThemeProvider } from "@/components/theme-provider";
import { useAuth } from "@/context/AuthContext";
import { LoginCard } from "@/components/Auth/LoginCard";
import { useCallback, useEffect, useState } from "react";
import { ProductEnrichment } from "./components/Products/ProductEnrichment";
import { InventoryView } from "./components/Inventory/InventoryView";
import { DashboardView } from "./components/Dashboard/DashboardView";
import { SettingsView } from "./components/Settings/SettingsView";
import { AppSidebar } from "./components/Navigation/AppSidebar";
import { getPathForView, parseRoute, type AppView } from "@/lib/routes";

function App() {
  const { user, loading } = useAuth();

  const getRouteFromLocation = useCallback(() => {
    const route = parseRoute(window.location.pathname);
    const params = new URLSearchParams(window.location.search);
    const legacyView = params.get('view');
    if (
      route.view === 'dashboard' &&
      legacyView &&
      ['inventory', 'products', 'settings', 'loads', 'create-load', 'create-session'].includes(legacyView)
    ) {
      return { view: legacyView as AppView, sessionId: null };
    }
    return route;
  }, []);

  const initialRoute = getRouteFromLocation();

  const [currentView, setCurrentView] = useState<AppView>(initialRoute.view);
  const [sessionId, setSessionId] = useState<string | null>(initialRoute.sessionId ?? null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigate = useCallback((view: AppView, options?: { params?: URLSearchParams; sessionId?: string | null; replace?: boolean }) => {
    const params = options?.params ?? new URLSearchParams(window.location.search);
    const nextSessionId = options?.sessionId ?? null;
    params.delete('view');
    if (view === 'dashboard') {
      params.delete('type');
      params.delete('partsTab');
      params.delete('partsStatus');
    }
    const path = getPathForView(view, nextSessionId ?? undefined);
    const query = params.toString();
    const nextUrl = query ? `${path}?${query}` : path;
    if (options?.replace) {
      window.history.replaceState({}, '', nextUrl);
    } else {
      window.history.pushState({}, '', nextUrl);
    }
    window.dispatchEvent(new Event('app:locationchange'));
    setCurrentView(view);
    setSessionId(nextSessionId);
    setSidebarOpen(false);
  }, []);

  const handleViewChange = (view: AppView) => {
    navigate(view);
  };

  const handleSessionChange = (nextSessionId: string | null) => {
    navigate('create-session', { sessionId: nextSessionId });
  };

  useEffect(() => {
    const syncRoute = () => {
      const route = getRouteFromLocation();
      setCurrentView(route.view);
      setSessionId(route.sessionId ?? null);
    };
    window.addEventListener('popstate', syncRoute);
    return () => window.removeEventListener('popstate', syncRoute);
  }, [getRouteFromLocation]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('view')) {
      const route = getRouteFromLocation();
      navigate(route.view, { params, sessionId: route.sessionId ?? null, replace: true });
    }
  }, [getRouteFromLocation, navigate]);

  const handleSettingsClick = () => {
    navigate('settings');
  };

  if (loading) return null;
  if (!user) return <LoginCard />;

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <div className="min-h-screen bg-muted/40">
        <div className="grid min-h-screen w-full lg:grid-cols-[16rem_1fr]">
          <AppSidebar
            currentView={currentView}
            onViewChange={navigate}
            open={sidebarOpen}
            onOpenChange={setSidebarOpen}
          />
          <div className="flex min-h-screen flex-col min-w-0">
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
            sessionId={sessionId}
            onSessionChange={handleSessionChange}
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
