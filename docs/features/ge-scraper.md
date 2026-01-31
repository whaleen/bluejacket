# GE Product Catalog Scraper

## Overview

We found the GE Appliances SearchSpring API which contains **138,007 products** from all GE brands (GE, GE Profile, Café, Monogram, Haier, Hotpoint).

---

## API Details

**Endpoint:**
```
https://q7rntw.a.searchspring.io/api/search/search.json
```

**Parameters:**
- `siteId=q7rntw` - GE's SearchSpring site ID
- `q=*` - Wildcard search (all products)
- `resultsFormat=native` - Full product data
- `page=1` - Page number
- `resultsPerPage=100` - Results per page (max 100)

**Dataset:**
- Total products: 138,007
- Total pages: ~1,380 (at 100 per page)
- Brands: GE, GE Profile, Café, Monogram, Haier, Hotpoint

---

## Product Data Available

Each product includes:

```json
{
  "sku": "UVM9125DYWW",
  "name": "GE Profile™ 1.2 Cu. Ft. Stainless Steel Over the Range Microwave",
  "brand": "GE Profile",
  "price": 499.00,
  "msrp": 549.00,
  "availability": "In Stock",
  "categories_hierarchy": ["Home > Appliances > Microwaves"],
  "imageUrl": "https://...",
  "url": "https://...",
  "rating": 4.5,
  "ratingCount": 234,

  // 40+ spec_* fields
  "spec_width": "29.875",
  "spec_height": "16.5",
  "spec_depth": "15.625",
  "spec_capacity": "1.2 cu ft",
  "spec_color": "Stainless Steel",
  "spec_weight": "65",
  // ... many more specs
}
```

---

## Scraper Script

### Location
`src/scripts/scrapeGEProducts.ts`

### What It Does
1. Fetches all 1,380 pages from SearchSpring API
2. Transforms to our product schema:
   - `model` (from SKU)
   - `product_type` (extracted from categories)
   - `brand`
   - `description` (from name)
   - `weight` (from specs)
   - `dimensions` (width, height, depth from specs)
3. Inserts to Supabase `products` table in batches
4. Uses `upsert` to avoid duplicates

### Run the Scraper

```bash
npm run scrape:ge
```

**Expected output:**
```
🔍 Starting GE product catalog scrape...

📊 Fetching page 1 to get total count...
📈 Estimated 1380 pages to scrape

📄 Fetching page 1/1380...
   ✓ Got 100 products (total: 100)
📄 Fetching page 2/1380...
   ✓ Got 100 products (total: 200)
...
📄 Fetching page 10/1380...
   ✓ Got 100 products (total: 1000)

💾 Inserting batch to database...
   ✅ Inserted 1000 products

...

🎉 Scraping completed!
```

### Estimated Time
- ~1,380 pages
- 0.5 second delay per request (rate limiting)
- **Total time: ~11-12 minutes**

---

## Configuration

### Batch Size
```typescript
const batchSize = 10; // Insert to DB every 10 pages (1,000 products)
```

### Rate Limiting
```typescript
const RATE_LIMIT_MS = 500; // 0.5 second between requests
```

### Results Per Page
```typescript
const RESULTS_PER_PAGE = 100; // Max allowed by API
```

Adjust these if needed for performance or to be more respectful to their servers.

---

## Product Type Mapping

The scraper maps GE categories to your standard types:

```typescript
const typeMap = {
  'DISHWASHERS': 'DISHWASHER',
  'WASHERS': 'WASHER',
  'DRYERS': 'DRYER',
  'REFRIGERATORS': 'REFRIGERATOR',
  'RANGES': 'RANGE',
  'COOKTOPS': 'COOKTOP',
  'OVENS': 'OVEN',
  'MICROWAVES': 'MICROWAVE OVEN',
  'FREEZERS': 'FREEZER',
  'HOODS': 'HOOD',
  'COMPACTORS': 'COMPACTOR',
  'DISPOSERS': 'DISPOSER',
  'WATER HEATERS': 'WATER HEATER'
};
```

---

## Database Impact

### Before Scraping
```sql
SELECT COUNT(*) FROM products;
-- ~50 products (from your CSV seed data)
```

### After Scraping
```sql
SELECT COUNT(*) FROM products;
-- ~138,000 products (entire GE catalog)
```

### Storage
- Estimated size: ~100-200 MB
- Supabase free tier: 500 MB database limit
- **Should fit comfortably**

---

## Testing First

Before scraping all 138k products, test with a smaller sample:

```typescript
// In scrapeGEProducts.ts, change:
const estimatedPages = Math.ceil(138007 / RESULTS_PER_PAGE);

// To:
const estimatedPages = 5; // Just scrape 5 pages (500 products)
```

Run:
```bash
npm run scrape:ge
```

Check database:
```sql
SELECT COUNT(*), brand, product_type
FROM products
GROUP BY brand, product_type
ORDER BY COUNT(*) DESC;
```

---

## Incremental Updates

To update only new products later:

```typescript
// Add a filter for recent products
const url = `${SEARCHSPRING_API}?siteId=q7rntw&q=*&resultsFormat=native&page=${page}&resultsPerPage=${RESULTS_PER_PAGE}&filter.product_first_distribution_date=2024-01-01+TO+*`;
```

Or run full scrape monthly to keep catalog fresh.

---

## Legal & Ethical

✅ **This is OK because:**
- Public API (no authentication required)
- No `robots.txt` blocking this endpoint
- Rate limited (0.5s between requests)
- For internal business use
- Not reselling/redistributing data

⚠️ **Best practices:**
- Only run during off-peak hours
- Keep rate limiting respectful
- Don't hammer the API
- Use data internally only

---

## Next Steps

1. **Test with small sample:**
   ```bash
   # Edit script to limit to 5 pages
   npm run scrape:ge
   ```

2. **Verify data:**
   ```sql
   SELECT * FROM products LIMIT 10;
   ```

3. **Run full scrape (if needed):**
   ```bash
   # Restore full page count
   npm run scrape:ge
   # Go get coffee, takes ~12 minutes
   ```

4. **Use enriched data:**
   - ProductEnrichment component now has full GE catalog
   - Scanning shows complete product details
   - CSV uploads can auto-match to catalog

---

## Alternative: Partial Scrape

If 138k products is too much, you can filter by:

### Category Filter
```typescript
const url = `${SEARCHSPRING_API}?siteId=q7rntw&q=*&resultsFormat=native&page=${page}&filter.categories_hierarchy=Appliances/Washers`;
```

### Brand Filter
```typescript
const url = `${SEARCHSPRING_API}?siteId=q7rntw&q=*&resultsFormat=native&page=${page}&filter.brand=GE`;
```

### Only Your Models
Scrape just the models in your inventory:
```typescript
// Get unique models from your inventory
const yourModels = await supabase
  .from('inventory_items')
  .select('model');

// Search for each model individually
for (const model of yourModels) {
  const url = `${SEARCHSPRING_API}?siteId=q7rntw&q=${model}&resultsFormat=native`;
  // ... fetch and insert
}
```

---

## Troubleshooting

### "Error fetching page X"
- Network timeout
- API rate limit hit
- Solution: Increase `RATE_LIMIT_MS` to 1000ms

### "Error inserting batch"
- Supabase connection issue
- Duplicate key error
- Solution: Check Supabase dashboard logs

### "No products on page X"
- Reached end of results
- API changed
- Solution: Normal, scraper stops automatically

---

You now have access to the **entire GE appliance catalog**! 🎉
