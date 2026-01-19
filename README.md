# Warehouse - Inventory Management System

A mobile-first React PWA for warehouse inventory management, load tracking, and verification scanning with a Supabase backend.

## MVP Vision

This is an internal tool for warehouse operations. The core workflow:

1. **Product data comes from external systems** - Not entered via scanning. Currently using static files in `/public/` as a stand-in for future GE system integration (CSV/XLS sync).

2. **Loads are managed and prepped** - Create loads, assign items, track status through the lifecycle (active → staged → in_transit → delivered). Loads have a prep checklist for pickup readiness.

3. **Scanning is for verification ("sanity checks")** - When a load is ready for pickup, start a scanning session to verify all items are present. Think of it as a "job": boss says "let's confirm Load Q is all there" → scan each item → get final count → done. This sanity count is part of the prep checklist, typically done day-of pickup as a final stamp of approval.

4. **Floor displays show live status** - TV screens on the warehouse floor showing load summaries, parts alerts, and active sessions via Supabase Realtime.

## Feature Status

### Done
- [x] Load management (create, rename, merge, status tracking)
- [x] Load prep checklist (tagged, wrapped, pickup date)
- [x] Barcode scanning (camera + manual entry)
- [x] Scanning sessions for verification counts
- [x] Product database with search
- [x] Floor displays with 6-digit pairing (public, unauthenticated)
- [x] Floor display widgets (loads summary, parts alerts, active sessions, clock, text)
- [x] Supabase Realtime for live updates
- [x] Multi-tenant (companies + locations)
- [x] Dark mode + mobile-first PWA

### In Progress
- [ ] GE system integration (currently using static files in `/public/`)
- [ ] Sanity count as explicit prep checklist item
- [ ] Floor display UI polish

### Planned
- [ ] GE API sync for product/inventory data
- [ ] Enhanced load conflict tracking
- [ ] Reporting/analytics

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **UI Framework**: shadcn/ui (Radix primitives) + Tailwind CSS v4
- **Database**: Supabase (PostgreSQL + Realtime)
- **Barcode Scanning**: html5-qrcode
- **Charts**: recharts
- **CSV Parsing**: papaparse
- **PWA**: vite-plugin-pwa
- **Legacy Browser Support**: @vitejs/plugin-legacy (for Samsung TV)

## Quick Start

### Prerequisites

- Node.js 18+
- npm
- Supabase account

### 1. Environment Setup

Create a `.env.local` file:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
# Optional for initial tenancy
VITE_ACTIVE_COMPANY_ID=your_company_uuid
VITE_ACTIVE_LOCATION_ID=your_location_uuid
# Optional for unlocking company/location manager in Settings
VITE_SUPERADMIN_USERNAME=your_admin_username
VITE_SUPERADMIN_PASSWORD=your_admin_password
```

### 2. Install & Run

```bash
npm install
npm run dev
```

### 3. Database Setup

Run the SQL in `migrations/` in order, or use `warehouse.sql` as a reference schema.

**Key tables:**
- `companies`, `locations`, `settings`
- `inventory_items`, `products`, `load_metadata`, `inventory_conversions`
- `scanning_sessions`, `tracked_parts`, `inventory_counts`, `trucks`, `users`
- `floor_displays` (with Realtime enabled)

## Project Structure

```
src/
├── components/
│   ├── ui/                 # shadcn/ui components
│   ├── Auth/               # Login, avatar upload
│   ├── Dashboard/          # Metrics overview
│   ├── FloorDisplay/       # TV display + widgets
│   ├── Inventory/          # Inventory management
│   ├── Loads/              # Load management
│   ├── Navigation/         # Header, user menu, location switcher
│   ├── Products/           # Product search and details
│   ├── Scanner/            # Barcode scanning
│   ├── Session/            # Scanning sessions
│   └── Settings/           # Settings + user manager + display manager
├── context/
│   └── AuthContext.tsx     # Authentication state
├── lib/
│   ├── supabase.ts         # Supabase client
│   ├── displayManager.ts   # Floor display CRUD + Realtime
│   ├── loadManager.ts      # Load CRUD operations
│   ├── sessionManager.ts   # Session persistence
│   ├── scanMatcher.ts      # Barcode matching logic
│   └── utils.ts            # General utilities
├── types/
│   ├── inventory.ts        # Inventory & product types
│   ├── session.ts          # Session types
│   └── display.ts          # Floor display types
├── App.tsx
└── main.tsx
```

## Floor Display Setup

Floor displays are public screens that show live warehouse data without authentication.

1. **Create a display** - Go to Settings → Displays → Create Display
2. **Get the pairing code** - Note the 6-digit code shown
3. **On the TV** - Navigate to `/display` and enter the pairing code
4. **Configure widgets** - Back in Settings, configure which widgets appear

Supported widgets:
- **Loads Summary** - Count of loads by status
- **Parts Alerts** - Low stock warnings
- **Active Sessions** - Current scanning sessions
- **Clock** - Date and time
- **Text** - Custom message

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│  External Systems (GE)                                       │
│  - CSV/XLS files exported from GE application                │
│  - Currently: static files in /public/ASIS/, /public/FG/     │
│  - Future: API sync                                          │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Supabase (PostgreSQL)                                       │
│  - products, inventory_items, load_metadata                  │
│  - Realtime enabled for floor_displays                       │
└──────────────────────────┬──────────────────────────────────┘
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
┌─────────────────────────┐   ┌─────────────────────────┐
│  Mobile App (Auth)       │   │  Floor Display (Public)  │
│  - Load management       │   │  - /display route        │
│  - Scanning sessions     │   │  - 6-digit pairing       │
│  - Inventory CRUD        │   │  - Realtime widgets      │
│  - Display configuration │   │  - No auth required      │
└─────────────────────────┘   └─────────────────────────┘
```

## Inventory Types

| Type | Description |
|------|-------------|
| ASIS | As-is/open-box items |
| FG | Finished goods |
| LocalStock | Local warehouse stock |
| Parts | Replacement parts (no loads) |
| BackHaul | Items being returned |
| Staged | Items staged for delivery |
| Inbound | Incoming shipments |
| WillCall | Customer pickup items |

## Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Production build (TypeScript + Vite)
npm run lint     # ESLint validation
npm run preview  # Preview production build
```

## Production Deployment (Floor Display)

For Samsung TV or other legacy browsers:

```bash
npm run build
npx serve dist -s   # -s flag for SPA routing
```

The build includes legacy browser support via `@vitejs/plugin-legacy`.

## License

MIT License
