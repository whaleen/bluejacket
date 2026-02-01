-- Function to execute read-only SQL queries safely
-- Only allows SELECT statements, no mutations
CREATE OR REPLACE FUNCTION execute_readonly_query(query_text text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  query_upper text;
BEGIN
  -- Normalize query to uppercase for validation
  query_upper := upper(trim(query_text));

  -- Validate: must start with SELECT
  IF NOT query_upper LIKE 'SELECT%' THEN
    RAISE EXCEPTION 'Only SELECT queries are allowed';
  END IF;

  -- Validate: no dangerous keywords
  IF query_upper ~ '(DROP|DELETE|UPDATE|INSERT|ALTER|CREATE|TRUNCATE|REPLACE|MERGE|GRANT|REVOKE|EXEC)' THEN
    RAISE EXCEPTION 'Query contains dangerous keywords';
  END IF;

  -- Validate: no multiple statements (semicolons in middle)
  IF position(';' in substring(query_text from 1 for length(query_text)-1)) > 0 THEN
    RAISE EXCEPTION 'Multiple statements not allowed';
  END IF;

  -- Strip trailing semicolon if present (causes syntax error when wrapped)
  query_text := rtrim(query_text, ';');

  -- Execute query and return as JSON
  EXECUTE format('SELECT jsonb_agg(row_to_json(t)) FROM (%s) t', query_text) INTO result;

  -- Return empty array if no results
  IF result IS NULL THEN
    result := '[]'::jsonb;
  END IF;

  RETURN result;
END;
$$;

-- Grant execute to authenticated users only
GRANT EXECUTE ON FUNCTION execute_readonly_query(text) TO authenticated;

-- Revoke from public/anon
REVOKE EXECUTE ON FUNCTION execute_readonly_query(text) FROM public;
REVOKE EXECUTE ON FUNCTION execute_readonly_query(text) FROM anon;
