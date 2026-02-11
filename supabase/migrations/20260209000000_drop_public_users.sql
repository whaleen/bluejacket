-- Drop legacy public.users table (Supabase Auth is the source of truth)
-- Clean up policies that still reference public.users
DROP POLICY IF EXISTS ge_changes_select_policy ON public.ge_changes;
DROP POLICY IF EXISTS ge_changes_insert_policy ON public.ge_changes;
DROP POLICY IF EXISTS ge_changes_update_policy ON public.ge_changes;

DROP TABLE IF EXISTS public.users;
