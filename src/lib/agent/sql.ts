import supabase from '@/lib/supabase';

// Database schema exposed to the agent
export const DATABASE_SCHEMA = `
-- Main inventory table
CREATE TABLE inventory_items (
  id uuid PRIMARY KEY,
  location_id uuid REFERENCES locations(id),
  product_fk uuid REFERENCES products(id),
  serial_number text,
  cso_number text,
  model text,
  product_type text,
  sub_inventory text,
  description text,
  status text,
  created_at timestamptz,
  updated_at timestamptz
);

-- Products reference table
CREATE TABLE products (
  id uuid PRIMARY KEY,
  location_id uuid REFERENCES locations(id),
  product_type text,
  model text,
  description text,
  created_at timestamptz
);

-- Product locations (GPS data from scans)
CREATE TABLE product_locations (
  id uuid PRIMARY KEY,
  location_id uuid REFERENCES locations(id),
  product_id uuid REFERENCES products(id),
  inventory_item_id uuid REFERENCES inventory_items(id),
  scanning_session_id uuid REFERENCES scanning_sessions(id),
  raw_lat numeric,
  raw_lng numeric,
  accuracy numeric,
  scanned_by text,
  product_type text,
  sub_inventory text,
  created_at timestamptz
);

-- Scanning sessions
CREATE TABLE scanning_sessions (
  id uuid PRIMARY KEY,
  location_id uuid REFERENCES locations(id),
  name text,
  status text, -- 'open', 'closed'
  session_type text,
  inventory_type text,
  sub_inventory text,
  created_at timestamptz,
  updated_at timestamptz
);

-- Session items (what was scanned in each session)
CREATE TABLE session_items (
  id uuid PRIMARY KEY,
  session_id uuid REFERENCES scanning_sessions(id),
  inventory_item_id uuid REFERENCES inventory_items(id),
  scanned_at timestamptz
);
`;

// Dangerous SQL keywords that are not allowed
const DANGEROUS_KEYWORDS = [
  'DROP',
  'DELETE',
  'UPDATE',
  'INSERT',
  'ALTER',
  'CREATE',
  'TRUNCATE',
  'REPLACE',
  'MERGE',
  'GRANT',
  'REVOKE',
  'EXEC',
  'EXECUTE',
  'CALL',
];

/**
 * Validates that a SQL query is safe to execute
 * - Must start with SELECT
 * - Cannot contain dangerous keywords
 * - Cannot have multiple statements
 */
export function validateSQLQuery(query: string): { valid: boolean; error?: string } {
  const trimmed = query.trim().toUpperCase();

  // Must start with SELECT
  if (!trimmed.startsWith('SELECT')) {
    return { valid: false, error: 'Query must start with SELECT' };
  }

  // Check for dangerous keywords
  for (const keyword of DANGEROUS_KEYWORDS) {
    if (trimmed.includes(keyword)) {
      return { valid: false, error: `Dangerous keyword not allowed: ${keyword}` };
    }
  }

  // Check for multiple statements (semicolons)
  const semicolonCount = (query.match(/;/g) || []).length;
  if (semicolonCount > 1 || (semicolonCount === 1 && !query.trim().endsWith(';'))) {
    return { valid: false, error: 'Multiple statements not allowed' };
  }

  return { valid: true };
}

/**
 * Executes a validated SQL query and returns results
 */
export async function executeSQLQuery(query: string): Promise<{ data: Record<string, unknown>[] | null; error: string | null }> {
  // Validate query first
  const validation = validateSQLQuery(query);
  if (!validation.valid) {
    return { data: null, error: validation.error || 'Invalid query' };
  }

  try {
    // Execute via database function (see migration 20260131000001)
    const { data, error } = await supabase.rpc('execute_readonly_query', {
      query_text: query,
    });

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data || [], error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Query execution failed';
    return { data: null, error: message };
  }
}

/**
 * Helper to format query results for the agent
 */
export function formatQueryResults(data: Record<string, unknown>[]): string {
  if (!data || data.length === 0) {
    return 'No results found.';
  }

  // If single row with single column, return the value
  if (data.length === 1 && Object.keys(data[0]).length === 1) {
    const value = Object.values(data[0])[0];
    return String(value);
  }

  // Otherwise return JSON
  return JSON.stringify(data, null, 2);
}
