import { useEffect, useMemo, useState, type ComponentProps } from "react"
import type { ComponentType } from "react"
import {
  AlertTriangle,
  BarChart3,
  ClipboardList,
  Database,
  History,
  LayoutDashboard,
  ListChecks,
  Package,
  ScanBarcode,
  Settings,
  TruckIcon,
} from "lucide-react"

import type { AppView } from "@/lib/routes"
import { LocationSwitcher } from "@/components/Navigation/LocationSwitcher"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar"

interface AppSidebarProps extends ComponentProps<typeof Sidebar> {
  currentView: AppView
  onViewChange: (view: AppView, options?: { params?: URLSearchParams; sessionId?: string | null; replace?: boolean }) => void
}

interface NavItem {
  label: string
  icon: ComponentType<{ className?: string }>
  view: AppView
  applyParams?: (params: URLSearchParams) => void
  isActive: (currentView: AppView, params: URLSearchParams) => boolean
}

interface NavSection {
  title: string
  items: NavItem[]
}

const clearPartsParams = (params: URLSearchParams) => {
  params.delete("type")
  params.delete("partsTab")
  params.delete("partsStatus")
}

const navSections: NavSection[] = [
  {
    title: "Overview",
    items: [
      {
        label: "Dashboard",
        icon: LayoutDashboard,
        view: "dashboard",
        applyParams: clearPartsParams,
        isActive: (currentView) => currentView === "dashboard",
      },
    ],
  },
  {
    title: "Operations",
    items: [
      {
        label: "Inventory",
        icon: ClipboardList,
        view: "inventory",
        applyParams: clearPartsParams,
        isActive: (currentView, params) =>
          currentView === "inventory" && params.get("type") !== "Parts",
      },
      {
        label: "Loads",
        icon: TruckIcon,
        view: "loads",
        applyParams: clearPartsParams,
        isActive: (currentView) => currentView === "loads" || currentView === "create-load",
      },
      {
        label: "Scanning Sessions",
        icon: ScanBarcode,
        view: "create-session",
        applyParams: clearPartsParams,
        isActive: (currentView) => currentView === "create-session",
      },
    ],
  },
  {
    title: "Parts",
    items: [
      {
        label: "Parts Inventory",
        icon: Package,
        view: "inventory",
        applyParams: (params) => {
          params.set("type", "Parts")
          params.set("partsTab", "inventory")
          params.delete("partsStatus")
        },
        isActive: (currentView, params) =>
          currentView === "inventory" &&
          params.get("type") === "Parts" &&
          (params.get("partsTab") ?? "inventory") === "inventory" &&
          params.get("partsStatus") !== "reorder",
      },
      {
        label: "Parts Tracking",
        icon: ListChecks,
        view: "inventory",
        applyParams: (params) => {
          params.set("type", "Parts")
          params.set("partsTab", "tracked")
          params.delete("partsStatus")
        },
        isActive: (currentView, params) =>
          currentView === "inventory" &&
          params.get("type") === "Parts" &&
          params.get("partsTab") === "tracked",
      },
      {
        label: "Parts History",
        icon: History,
        view: "inventory",
        applyParams: (params) => {
          params.set("type", "Parts")
          params.set("partsTab", "history")
          params.delete("partsStatus")
        },
        isActive: (currentView, params) =>
          currentView === "inventory" &&
          params.get("type") === "Parts" &&
          params.get("partsTab") === "history",
      },
      {
        label: "Parts Reports",
        icon: BarChart3,
        view: "inventory",
        applyParams: (params) => {
          params.set("type", "Parts")
          params.set("partsTab", "reports")
          params.delete("partsStatus")
        },
        isActive: (currentView, params) =>
          currentView === "inventory" &&
          params.get("type") === "Parts" &&
          params.get("partsTab") === "reports",
      },
      {
        label: "Reorder Alerts",
        icon: AlertTriangle,
        view: "inventory",
        applyParams: (params) => {
          params.set("type", "Parts")
          params.set("partsTab", "inventory")
          params.set("partsStatus", "reorder")
        },
        isActive: (currentView, params) =>
          currentView === "inventory" &&
          params.get("type") === "Parts" &&
          params.get("partsStatus") === "reorder",
      },
    ],
  },
  {
    title: "Data",
    items: [
      {
        label: "Products",
        icon: Database,
        view: "products",
        applyParams: clearPartsParams,
        isActive: (currentView) => currentView === "products",
      },
    ],
  },
  {
    title: "Settings",
    items: [
      {
        label: "Settings",
        icon: Settings,
        view: "settings",
        applyParams: clearPartsParams,
        isActive: (currentView) => currentView === "settings",
      },
    ],
  },
]

export function AppSidebar({ currentView, onViewChange, ...props }: AppSidebarProps) {
  const { isMobile, setOpenMobile } = useSidebar()
  const [search, setSearch] = useState(() => window.location.search)

  useEffect(() => {
    const handleChange = () => setSearch(window.location.search)
    window.addEventListener("app:locationchange", handleChange)
    window.addEventListener("popstate", handleChange)
    return () => {
      window.removeEventListener("app:locationchange", handleChange)
      window.removeEventListener("popstate", handleChange)
    }
  }, [])

  const params = useMemo(() => new URLSearchParams(search), [search])

  const handleNavigate = (item: NavItem) => {
    const nextParams = new URLSearchParams(window.location.search)
    item.applyParams?.(nextParams)
    onViewChange(item.view, { params: nextParams })
    if (isMobile) {
      setOpenMobile(false)
    }
  }

  const handleOpenSettings = () => {
    const nextParams = new URLSearchParams(window.location.search)
    clearPartsParams(nextParams)
    onViewChange("settings", { params: nextParams })
    if (isMobile) {
      setOpenMobile(false)
    }
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <LocationSwitcher onManageLocations={handleOpenSettings} />
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        {navSections.map((section) => (
          <SidebarGroup key={section.title}>
            <SidebarGroupLabel>{section.title}</SidebarGroupLabel>
            <SidebarMenu>
              {section.items.map((item) => {
                const Icon = item.icon
                const isActive = item.isActive(currentView, params)
                return (
                  <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton
                      tooltip={item.label}
                      isActive={isActive}
                      onClick={() => handleNavigate(item)}
                    >
                      <Icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <NavUser onSettingsClick={handleOpenSettings} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
