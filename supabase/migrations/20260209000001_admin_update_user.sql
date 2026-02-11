-- Admin-only user update helper to sync profiles + auth metadata
CREATE OR REPLACE FUNCTION public.admin_update_user(
  target_user_id uuid,
  new_username text,
  new_role user_role,
  new_company_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  requester_role user_role;
BEGIN
  SELECT role
  INTO requester_role
  FROM public.profiles
  WHERE id = auth.uid();

  IF requester_role IS NULL OR requester_role <> 'admin' THEN
    RAISE EXCEPTION 'Not authorized to update users';
  END IF;

  UPDATE public.profiles
  SET
    username = new_username,
    role = new_role,
    company_id = new_company_id
  WHERE id = target_user_id;

  UPDATE auth.users
  SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
    'username', new_username,
    'role', new_role::text,
    'company_id', new_company_id
  )
  WHERE id = target_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_user(uuid, text, user_role, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_user(uuid, text, user_role, uuid) TO authenticated;
