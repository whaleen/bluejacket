-- Fix activity_log.user_id column type
-- It was bigint (referencing public.users) but should be uuid (referencing auth.users)
-- This table logs activity by authenticated users, not application users

-- First, drop the old foreign key constraint to public.users
ALTER TABLE public.activity_log
  DROP CONSTRAINT IF EXISTS activity_log_user_id_fkey;

-- Add a temporary uuid column
ALTER TABLE public.activity_log
  ADD COLUMN user_id_new uuid;

-- Try to convert valid UUIDs, set invalid ones to NULL
UPDATE public.activity_log
SET user_id_new =
  CASE
    WHEN user_id IS NULL THEN NULL
    -- Check if it's a valid UUID format
    WHEN (user_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
      THEN user_id::text::uuid
    -- Otherwise set to NULL (old bigint IDs)
    ELSE NULL
  END;

-- Drop old column and rename new one
ALTER TABLE public.activity_log
  DROP COLUMN user_id;

ALTER TABLE public.activity_log
  RENAME COLUMN user_id_new TO user_id;

-- Add foreign key to auth.users (Supabase Auth users, not public.users)
ALTER TABLE public.activity_log
  ADD CONSTRAINT activity_log_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id
  ON public.activity_log(user_id);

COMMENT ON COLUMN public.activity_log.user_id IS 'UUID reference to auth.users (Supabase Auth user)';
