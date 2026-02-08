import supabase from '@/lib/supabase';

type ActivityUser = {
  id: string;
  username: string | null;
  email?: string | null;
  image?: string | null;
};

export type ActivityAction =
  // GE Sync actions (system)
  | 'asis_sync'
  | 'asis_wipe'
  | 'fg_sync'
  | 'sta_sync'
  | 'inventory_sync'
  | 'inbound_sync'
  // User actions
  | 'load_update'
  | 'sanity_check_requested'
  | 'sanity_check_completed'
  | 'item_scanned'
  | 'session_started'
  | 'session_completed';

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
  // Require at least locationId and user
  if (!locationId) {
    console.error('Activity log failed: missing locationId');
    return; // Fail silently rather than throwing
  }

  if (!user || !user.id) {
    console.error('Activity log failed: missing user or user.id');
    return; // Fail silently rather than throwing
  }

  // Use locationId as company_id fallback
  const finalCompanyId = companyId || locationId;

  const payload = {
    company_id: finalCompanyId,
    location_id: locationId,
    user_id: user.id,
    actor_name: user.username ?? user.email ?? 'Unknown User',
    actor_image: user.image ?? null,
    action,
    entity_type: entityType ?? null,
    entity_id: entityId ?? null,
    details: details ?? null,
  };

  const { error } = await supabase.from('activity_log').insert(payload);
  if (error) {
    console.error('Activity log insert failed:', error);
    // Don't throw - fail silently to not break the app
  }
}
