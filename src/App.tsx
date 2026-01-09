import { useState } from "react";
import { DashboardView } from "@/components/Dashboard/DashboardView";
import { InventoryView } from "@/components/Inventory/InventoryView";
import { ProductEnrichment } from "@/components/Products/ProductEnrichment";
import { SettingsView } from "@/components/Settings/SettingsView";
import { BottomNav } from "@/components/Navigation/BottomNav";
import { ThemeProvider } from "@/components/theme-provider"

function App() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'inventory' | 'products' | 'settings'>('dashboard');

  const handleSettingsClick = () => {
    setCurrentView('settings');
  };

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <div className="min-h-screen bg-background pb-16">
        {currentView === 'dashboard' && <DashboardView onSettingsClick={handleSettingsClick} />}
        {currentView === 'inventory' && <InventoryView onSettingsClick={handleSettingsClick} />}
        {currentView === 'products' && <ProductEnrichment onSettingsClick={handleSettingsClick} />}
        {currentView === 'settings' && <SettingsView onSettingsClick={handleSettingsClick} />}
        <BottomNav currentView={currentView} onViewChange={setCurrentView} />
      </div>
    </ThemeProvider>
  );
}

export default App
