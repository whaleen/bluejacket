import { getActiveLocationContext } from '@/lib/tenant';

/**
 * Hook that safely gets the active location context.
 * Returns null values if no location is set (e.g., before login).
 * Use this instead of calling getActiveLocationContext() directly in hooks.
 */
export function useActiveLocation() {
  const { locationId, companyId } = getActiveLocationContext();
  return {
    locationId,
    companyId,
    hasLocation: !!locationId,
  };
}
