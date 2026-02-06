# Scanning Sessions - How It Works

## Overview

The inventory scanner now uses a **session-based workflow** where you create ephemeral scanning sessions for physical inventory checks. Progress tracking and scanning only applies within an active session.

---

## Two Modes

### 1. **Browse Mode** (Default)
- View all inventory items from database
- Search & filter by inventory type, sub-inventory, scanned status
- Upload CSV to add new inventory
- **No scanning** - just browse and reference
- Button: **"Start Session"** to begin scanning

### 2. **Scanning Session Mode** (Active Session)
- Create a session with a name (e.g., "Sanity Check - FG")
- Select inventory type to scan
- **localStorage snapshot** of items created
- Progress bar tracks session completion
- Scanner only matches against session items
- When done: Review results, then exit (data stays in localStorage)

---

## Workflow

### Starting a Session

1. Click **"Start Session"** button in Inventory view
2. Enter session name: `Sanity Check - FG`
3. Select inventory type: `FG (Finished Goods)`
4. Optionally filter by sub-inventory/route
5. Preview shows: "5 items will be included in this session"
6. Click **"Start Session"**

### Active Session View

**Header:**
- Session name: "Sanity Check - FG"
- Progress: "3 / 5 scanned"
- Exit button (saves progress)
- End button (discards session)

**Item List:**
- **Pending section** - Unscanned items (gray)
- **Scanned section** - Scanned items (green)

**Scanning:**
- Large "Scan Barcode" button at bottom
- Scans only match against items in this session
- Unique matches → Auto-mark as scanned
- Multiple matches → Selection dialog
- Not found → Error message

**Completion:**
- When all items scanned → "Session Complete!" message
- Option to exit and return to browse mode

---

## Data Storage

### Database (Permanent)
- `inventory_items` table
- Stores all inventory with `is_scanned` flag (from global scans)
- **Note:** Session scans do NOT update the database `is_scanned` field

### localStorage (Ephemeral)
- **Active session data:**
  ```json
  {
    "id": "session_1234567890_abc123",
    "name": "Sanity Check - FG",
    "inventoryType": "FG",
    "createdAt": "2026-01-06T10:30:00Z",
    "items": [...], // Snapshot of items at session start
    "scannedItemIds": ["uuid1", "uuid2", "uuid3"]
  }
  ```

- **Multiple sessions** can be saved in localStorage
- Sessions persist across page refreshes
- Resumable: If you close the app, the session is still there

---

## Use Cases

### Sanity Check (Physical Count)
```
1. Start session: "Sanity Check - FG"
2. Filter: FG (Finished Goods)
3. Walk warehouse with phone
4. Scan all FG items to verify presence
5. Progress: 45/50 scanned
6. Review: 5 items not found physically
7. Exit session (data saved in localStorage for review)
```

### Route Verification
```
1. Start session: "Route CAP-008 Verify"
2. Filter: Staged → Sub-inventory: CAP-008
3. Scan all items staged for this route
4. Confirm all items present before loading truck
5. Progress: 27/27 scanned ✓
6. Exit session
```

### Cycle Count
```
1. Start session: "Weekly Cycle Count - STA"
2. Filter: STA
3. Scan warehouse stock
4. Compare scanned vs. expected
5. Note discrepancies
6. Save session for later review
```

---

## Key Features

### ✅ Session Isolation
- Each session has its own snapshot of items
- Scanning in one session doesn't affect other sessions
- Database remains unchanged

### ✅ Resume Capability
- Close the app mid-session
- Session data persists in localStorage
- Reopen → Automatically resumes active session

### ✅ Multiple Sessions
- Can create multiple sessions
- Switch between sessions
- Review completed sessions later

### ✅ No Database Pollution
- Sessions don't mark items as "scanned" in database
- Database `is_scanned` field only for permanent global scans
- Sessions are ephemeral audits

---

## Future Enhancements (Optional)

### Save Snapshots to Database
```sql
CREATE TABLE scanning_snapshots (
  id uuid PRIMARY KEY,
  session_id text NOT NULL,
  session_name text NOT NULL,
  inventory_type text NOT NULL,
  created_at timestamp NOT NULL,
  completed_at timestamp,
  total_items integer,
  scanned_count integer,
  snapshot_data jsonb -- Full session data
);
```

This would allow:
- Historical session records
- Reporting on inventory accuracy over time
- Export session results to CSV
- Compare sessions (before/after counts)

### Session Sharing
- Export session to QR code
- Share session link with team members
- Multi-user sessions (collaborative scanning)

### Discrepancy Reporting
- Flag items not found
- Add notes per item
- Generate discrepancy report
- Assign follow-up tasks

---

## Technical Implementation

**New Files:**
- `src/types/session.ts` - TypeScript types
- `src/lib/sessionManager.ts` - localStorage CRUD operations
- `src/lib/sessionScanner.ts` - Scan matching within sessions
- `src/components/Session/CreateSessionDialog.tsx` - Start session form
- `src/components/Session/ScanningSessionView.tsx` - Active session UI

**Updated Files:**
- `src/components/Inventory/InventoryView.tsx` - Browse mode + session launcher

**localStorage Keys:**
- `bluejacket_scanning_sessions` - Array of all sessions
- `bluejacket_active_session` - ID of currently active session

---

## Testing the New Workflow

1. **Start a session:**
   ```
   Click "Start Session"
   Name: "Test Session - FG"
   Type: FG (Finished Goods)
   → Should show 5 items preview
   Click "Start Session"
   ```

2. **Scan items:**
   ```
   Scan: FG100201 → Auto-marks refrigerator ✓
   Scan: IG7400004 → Shows 2 gas ranges in dialog
   Select both → Marks 2 items ✓
   Progress: 3/5 scanned
   ```

3. **Complete session:**
   ```
   Scan remaining 2 items
   → "Session Complete!" message
   Click "Exit Session"
   → Returns to browse mode
   ```

4. **Resume session:**
   ```
   Refresh page
   → Session auto-resumes
   Continue scanning where you left off
   ```

---

## Benefits

✅ **Clean separation** - Browse vs. scan modes
✅ **Ephemeral audits** - Don't pollute database
✅ **Offline-friendly** - All in localStorage
✅ **Progress tracking** - Only for active session
✅ **Flexible** - Create sessions for any purpose
✅ **Resumable** - Never lose progress
