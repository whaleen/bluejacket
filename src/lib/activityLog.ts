import supabase from '@/lib/supabase';

type ActivityUser = {
  id: string;
  username: string | null;
  email?: string | null;
  image?: string | null;
};

export type ActivityAction =
  | 'asis_sync'
  | 'asis_wipe'
  | 'load_update'
  | 'sanity_check_requested'
  | 'sanity_check_completed';

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
}: ActivityLogInput): Promise<void> {
  if (!companyId || !locationId || !user) {
    throw new Error('Missing required activity log context.');
  }

  const payload = {
    company_id: companyId,
    location_id: locationId,
    user_id: user.id,
    actor_name: user.username ?? user.email ?? 'Unknown',
    actor_image: user.image ?? null,
    action,
    entity_type: entityType ?? null,
    entity_id: entityId ?? null,
    details: details ?? null,
  };

  const { error } = await supabase.from('activity_log').insert(payload);
  if (error) {
    throw error;
  }
}
