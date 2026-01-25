import supabase from '@/lib/supabase';

type ActivityUser = {
  id: string;
  username: string;
  image?: string | null;
};

export type ActivityAction = 'asis_sync' | 'asis_wipe' | 'load_update';

export type ActivityLogInput = {
  companyId: string;
  locationId: string;
  user: ActivityUser | null;
  action: ActivityAction;
  entityType?: string | null;
  entityId?: string | null;
  details?: Record<string, unknown> | null;
};

export async function logActivity({
  companyId,
  locationId,
  user,
  action,
  entityType,
  entityId,
  details,
}: ActivityLogInput) {
  if (!companyId || !locationId || !user) {
    return { error: new Error('Missing required activity log context.') };
  }

  const payload = {
    company_id: companyId,
    location_id: locationId,
    user_id: user.id,
    actor_name: user.username,
    actor_image: user.image ?? null,
    action,
    entity_type: entityType ?? null,
    entity_id: entityId ?? null,
    details: details ?? null,
  };

  const { error } = await supabase.from('activity_log').insert(payload);
  return { error };
}
