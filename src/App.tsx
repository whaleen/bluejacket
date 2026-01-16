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
import { AppSidebar } from "./components/app-sidebar";
import { getPathForView, parseRoute, type AppView } from "@/lib/routes";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

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

  if (loading) return null;
  if (!user) return <LoginCard />;

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <SidebarProvider>
        <AppSidebar currentView={currentView} onViewChange={navigate} />
        <SidebarInset className="bg-muted/40">
          <div className="flex min-h-screen flex-col min-w-0">
            {currentView === "dashboard" && (
              <DashboardView
                onViewChange={handleViewChange}
              />
            )}
            {currentView === "inventory" && (
              <InventoryView />
            )}
            {currentView === "products" && (
              <ProductEnrichment
              />
            )}
            {currentView === "loads" && (
              <LoadManagementView
                onViewChange={handleViewChange}
              />
            )}
            {currentView === "create-load" && (
              <CreateLoadView
                onViewChange={handleViewChange}
              />
            )}
            {currentView === "create-session" && (
              <CreateSessionView
                onViewChange={handleViewChange}
                sessionId={sessionId}
                onSessionChange={handleSessionChange}
              />
            )}
            {currentView === "settings" && (
              <SettingsView />
            )}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ThemeProvider>
  );
}

export default App;
