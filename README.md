# Warehouse - Inventory Management System

A mobile-first React PWA for warehouse inventory management, barcode scanning, load tracking, and product data management with a Supabase backend.

## Project Overview

Warehouse supports:
- Barcode scanning (camera + manual entry)
- Inventory item tracking with scan verification
- Load/batch management (create, merge, rename, status tracking)
- Scanning sessions with progress tracking
- Product database with GE Appliances catalog support
- Serial number tracking for appliances
- Inventory type conversion with audit trail
- Multi-tenant setup (companies + locations, location-scoped data)
- Settings for location-specific DMS SSO credentials
- Simple user manager with admin/user roles

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **UI Framework**: shadcn/ui (Radix primitives) + Tailwind CSS v4
- **Database**: Supabase (PostgreSQL)
- **Barcode Scanning**: html5-qrcode
- **Charts**: recharts
- **CSV Parsing**: papaparse
- **PWA**: vite-plugin-pwa

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

## Project Structure

```
src/
├── components/
│   ├── ui/                 # shadcn/ui components
│   ├── Auth/               # Login, avatar upload
│   ├── Dashboard/          # Metrics overview
│   ├── Inventory/          # Inventory management
│   ├── Navigation/         # Header, user menu, location switcher
│   ├── Products/           # Product search and details
│   ├── Scanner/            # Barcode scanning
│   ├── Session/            # Scanning sessions
│   └── Settings/           # Settings + user manager
├── context/
│   └── AuthContext.tsx     # Authentication state
├── lib/
│   ├── supabase.ts         # Supabase client
│   ├── scanMatcher.ts      # Barcode matching logic
│   ├── sessionManager.ts   # Session persistence
│   ├── sessionScanner.ts   # Session scanning utilities
│   ├── loadManager.ts      # Load CRUD operations
│   ├── inventoryConverter.ts # Inventory type conversion
│   ├── htmlUtils.ts        # HTML entity decoding
│   └── utils.ts            # General utilities
├── types/
│   ├── inventory.ts        # Inventory & product types
│   └── session.ts          # Session types
├── App.tsx
└── main.tsx
```

## Features

### Core Functionality

- **Barcode Scanning** - Camera-based scanner with adjustable scan area and manual fallback
- **Inventory Management** - Full CRUD with search, filter, and bulk operations
- **CSV Upload** - Import inventory from CSV files
- **Load Management** - Create, rename, merge loads; track status (active → staged → in_transit → delivered)
- **Inventory Conversion** - Convert items between types with full audit trail
- **Scanning Sessions** - Track scanning progress with session persistence
- **Product Database** - Search and enrich product catalog
- **Dashboard** - Metrics, load statistics, reorder alerts

### Multi-Tenant + Settings

- **Companies + Locations** - Location-scoped data with a location switcher in the sidebar
- **Settings** - Store DMS SSO credentials per location
- **User Manager** - Simple admin/user roles (prototype mode)

### User Experience

- **Mobile-First Design** - Optimized for warehouse devices
- **Dark Mode** - Theme switching support
- **Responsive PWA** - Installable progressive web app

### Authentication (Development Mode)

- Username/password login
- Avatar upload
- Session persistence

> **Note:** Authentication uses plaintext passwords for rapid prototyping. See `IDGAF_About_Auth_Security.md` for details. Not suitable for production.

## Inventory Types

| Type | Description |
|------|-------------|
| ASIS | As-is/open-box items |
| FG | Finished goods |
| LocalStock | Local warehouse stock |
| Parts | Replacement parts |
| BackHaul | Items being returned |
| Staged | Items staged for delivery |
| Inbound | Incoming shipments |
| WillCall | Customer pickup items |

## CSV Import Format

```csv
serial,cso,model,inventory_type,sub_inventory,date,consumer_customer_name
VA715942,1064836060,GTD58EBSVWS,ASIS,Load-001,2025-12-31,John Smith
```

## Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Production build (TypeScript + Vite)
npm run lint     # ESLint validation
npm run preview  # Preview production build
```

## License

MIT License
