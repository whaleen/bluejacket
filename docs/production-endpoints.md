# Production Endpoints

## GE Sync Service

**Base URL:** `https://warehouse-production-02e6.up.railway.app`

### Health Check
```bash
curl https://warehouse-production-02e6.up.railway.app/health
```

### Authentication Status
```bash
curl "https://warehouse-production-02e6.up.railway.app/auth/status?locationId=YOUR_LOCATION_UUID" \
  -H "X-API-Key: YOUR_API_KEY"
```

### Force Re-Authentication
```bash
curl -X POST https://warehouse-production-02e6.up.railway.app/auth/refresh \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{"locationId": "YOUR_LOCATION_UUID"}'
```

### Sync ASIS Inventory
```bash
curl -X POST https://warehouse-production-02e6.up.railway.app/sync/asis \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{"locationId": "YOUR_LOCATION_UUID"}'
```

### Sync FG (Finished Goods) Inventory
```bash
curl -X POST https://warehouse-production-02e6.up.railway.app/sync/fg \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{"locationId": "YOUR_LOCATION_UUID"}'
```

### Sync STA (Staged) Inventory
```bash
curl -X POST https://warehouse-production-02e6.up.railway.app/sync/sta \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{"locationId": "YOUR_LOCATION_UUID"}'
```

## Environment Variables

### Frontend (Warehouse App)
Set in Doppler and injected at build time:

```bash
VITE_GE_SYNC_URL=https://warehouse-production-02e6.up.railway.app
VITE_GE_SYNC_API_KEY=<your-api-key>
```

**Note:** After changing these values in Doppler, you must rebuild the frontend for Vite to bake them in.

### Backend (GE Sync Service)
Set in Railway environment or Doppler:

```bash
SUPABASE_URL=<your-supabase-url>
SUPABASE_SERVICE_KEY=<your-service-key>
API_KEY=<your-api-key>
PORT=3001
NODE_ENV=production
```

## Quick Test (All Syncs)

```bash
# Set your credentials
export API_KEY="your-api-key-here"
export LOCATION_ID="your-location-uuid-here"

# Run all syncs
curl -X POST https://warehouse-production-02e6.up.railway.app/sync/asis \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d "{\"locationId\": \"$LOCATION_ID\"}"

curl -X POST https://warehouse-production-02e6.up.railway.app/sync/fg \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d "{\"locationId\": \"$LOCATION_ID\"}"

curl -X POST https://warehouse-production-02e6.up.railway.app/sync/sta \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d "{\"locationId\": \"$LOCATION_ID\"}"
```

## Monitoring

### Railway Logs
View real-time logs:
```bash
# Via Railway dashboard
https://railway.app/project/<your-project-id>/service/<service-id>/logs

# Or via Railway CLI
railway logs
```

### Check Sync Results in Database
```sql
-- Recent changes logged
SELECT * FROM ge_changes
ORDER BY detected_at DESC
LIMIT 20;

-- Inventory counts by type
SELECT
  inventory_type,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE is_scanned = true) as scanned_count
FROM inventory_items
WHERE location_id = 'YOUR_LOCATION_UUID'
GROUP BY inventory_type;

-- Recent syncs (check ge_changes table)
SELECT
  inventory_type,
  source,
  COUNT(*) as change_count,
  MAX(detected_at) as last_sync
FROM ge_changes
WHERE location_id = 'YOUR_LOCATION_UUID'
GROUP BY inventory_type, source
ORDER BY last_sync DESC;
```
