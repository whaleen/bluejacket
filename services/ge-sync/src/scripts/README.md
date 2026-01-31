# GE DMS Exploration Scripts

Scripts for exploring and documenting the GE Dealer Management System.

**IMPORTANT**: Read `../../docs/EXPLORATION_GUIDE.md` before using these scripts.

---

## Available Scripts

### `exploreLink.ts`

Navigate to a GE DMS page by clicking a dashboard link.

**Usage**:
```bash
npx tsx src/scripts/exploreLink.ts "Link Text"
```

**Examples**:
```bash
npx tsx src/scripts/exploreLink.ts "ASIS"
npx tsx src/scripts/exploreLink.ts "Order Download"
npx tsx src/scripts/exploreLink.ts "Check In - Audit"
```

**What it does**:
1. Authenticates with GE SSO using credentials from Supabase
2. Navigates to GE DMS dashboard
3. Clicks the specified link text
4. Takes full-page screenshot → `/tmp/ge-{timestamp}.png`
5. Saves page content (text) → `/tmp/ge-content-{timestamp}.txt`
6. Detects export buttons (Spreadsheet, Excel, CSV, Download)
7. Keeps browser open for continued exploration

**Notes**:
- Browser stays open - press Ctrl+C to close
- Detects new tab opens (some links open external pages)
- Link text must match exactly (case-sensitive)

---

### `navigateDirect.ts`

Navigate directly to a specific GE DMS URL path.

**Usage**:
```bash
npx tsx src/scripts/navigateDirect.ts "/dms/path"
```

**Examples**:
```bash
npx tsx src/scripts/navigateDirect.ts "/dms/newasis"
npx tsx src/scripts/navigateDirect.ts "/dms/orderdata"
npx tsx src/scripts/navigateDirect.ts "/dms/checkin/downloadsindex"
```

**What it does**:
1. Authenticates with GE SSO
2. Navigates directly to specified URL path
3. Screenshots and saves content (same as exploreLink)
4. Detects export buttons
5. Keeps browser open

**Use when**:
- You know the exact URL
- Link clicking isn't working
- Testing specific page access

---

### `navigateTo.ts`

Legacy script - template for custom navigation logic.

**Purpose**: Historical reference, not actively used.

**Contains**: Example navigation to "ERP On Hand Qty" with multiple selector attempts.

**Use**: Modify for custom exploration needs.

---

### `explore.ts`

Generic exploration template.

**Purpose**: Base template for custom exploration scripts.

**Contains**: Authentication + page documentation helper functions.

**Use**: Copy and modify for specific exploration tasks.

---

## Output Files

All scripts output to `/tmp/` directory:

- **Screenshots**: `/tmp/ge-{timestamp}.png`
  - Full-page PNG screenshot
  - Includes all visible content (may be very tall)

- **Page Content**: `/tmp/ge-content-{timestamp}.txt`
  - Extracted text content from `document.body.innerText`
  - Useful for searching/analyzing page structure
  - Does not include HTML markup

**Cleanup**:
```bash
# List recent exploration files
ls -lt /tmp/ge-* | head -20

# Clean up old files (optional)
rm /tmp/ge-*.png /tmp/ge-content-*.txt
```

---

## Authentication

All scripts authenticate using credentials from Supabase:

1. **Environment**: `.env` file must have `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`
2. **Database**: `location_configs` table must have entry for location ID `00000000-0000-0000-0000-000000000001`
3. **Fields**: `ssoUsername` and `ssoPassword` must be populated

**Verify credentials**:
```bash
cd services/ge-sync
npx tsx -e "import { getLocationConfig } from './src/db/supabase.js'; getLocationConfig('00000000-0000-0000-0000-000000000001').then(c => console.log('✅ Found:', !!c.ssoUsername, !!c.ssoPassword))"
```

If credentials missing, see `../../docs/auth.md` for setup.

---

## Browser Management

### Headless vs Headed

Scripts run with `headless: false` to allow visual debugging.

```typescript
browser = await chromium.launch({
  headless: false, // Browser window visible
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});
```

**Change to headless**:
- Set `headless: true` for background execution
- Useful for automated runs
- Cannot visually debug issues

### Browser Stays Open

All scripts keep browser open with:
```typescript
await new Promise(() => {}); // Infinite wait
```

**Why**: Allows continued exploration without re-authenticating.

**To close**: Press Ctrl+C in terminal.

**Check for orphaned browsers**:
```bash
ps aux | grep chromium | grep headless=false
```

**Kill all test browsers**:
```bash
pkill -f "chromium.*headless=false"
```

---

## Export Button Detection

Scripts automatically detect common export button patterns:

```typescript
const exportButtons = await page.$$eval(
  'input[value*="SpreadSheet"], input[value*="Spreadsheet"], input[value*="Excel"], input[value*="Download"], button:has-text("Export"), button:has-text("Download")',
  els => els.map(el => (el as HTMLInputElement).value || el.textContent?.trim() || '')
);
```

**Detected patterns**:
- `<input value="Excel Spreadsheet">`
- `<input value="CSV Spreadsheet">`
- `<button>Export</button>`
- `<button>Download</button>`
- Variations: "SpreadSheet", "Spreadsheet", etc.

**Outputs**: List of detected export buttons to console.

---

## Common Issues

### Issue: "SSO credentials not configured"

**Solution**: Check Supabase credentials (see Authentication section above).

### Issue: "Could not find link: X"

**Solution**:
1. Check exact link text (case-sensitive)
2. Use `navigateDirect.ts` with known URL instead
3. Take screenshot to see actual link text

### Issue: Browser hangs/navigation timeout

**Solution**:
1. Check screenshot to see current state
2. Page may have opened in new tab (script can't detect all tabs)
3. Try direct URL navigation

### Issue: Page content empty

**Solution**:
- Page may be dynamic/JavaScript-heavy
- Content loads after initial navigation
- Check screenshot to verify page loaded

---

## Development

### Modify Scripts

Scripts use:
- **Playwright**: Browser automation
- **TypeScript**: Type safety
- **tsx**: Direct TS execution

**Run with modifications**:
```bash
npx tsx src/scripts/your-script.ts
```

**No compilation needed** - `tsx` executes TypeScript directly.

### Add New Scripts

1. Copy `explore.ts` as template
2. Modify navigation logic
3. Keep authentication and documentation helpers
4. Document in this README

### Helper Functions

**`documentPage()`** - Captures page state:
- Screenshot
- Text content
- Export button detection
- Returns: `{ url, title, screenshot, contentFile }`

**`authenticate()`** - GE SSO login:
- Fetches credentials from Supabase
- Navigates to GE DMS
- Handles SSO redirect
- Sets up popup listener

---

## Production Safety

### DO NOT

- ❌ Click destructive buttons (Delete, Cancel, etc.)
- ❌ POST/PUT operations (only read/GET)
- ❌ Modify data in GE DMS
- ❌ Use production credentials for testing

### DO

- ✅ Read-only operations (screenshots, exports)
- ✅ Document findings before implementing
- ✅ Test in isolation from production sync service
- ✅ Clean up browser instances when done

---

## See Also

- **EXPLORATION_GUIDE.md** - Complete exploration workflow
- **GE_DMS_PAGES.md** - Catalog of documented pages
- **GE_DMS_SYSTEM_OVERVIEW.md** - Business processes and terminology
- **auth.md** - Credential setup instructions
