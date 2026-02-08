import { createContext, useContext, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import supabase from '@/lib/supabase';
import { getActiveLocationContext } from '@/lib/tenant';
import { queryKeys } from '@/lib/queryKeys';
// Removed: useLoadStore - using TanStack Query as single source of truth

interface RealtimeContextValue {
  connected: boolean; // Future: track connection status
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { locationId } = getActiveLocationContext();

  useEffect(() => {
    if (!locationId) return;

    if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_REALTIME) {
      // console.log('🔴 Realtime: Subscribing to changes for location:', locationId);
    }

    // Subscribe to inventory_items changes
    const inventoryChannel = supabase
      .channel(`inventory:${locationId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'inventory_items',
          filter: `location_id=eq.${locationId}`,
        },
        () => {
          // console.log('📦 Inventory change:', payload.eventType, payload.new || payload.old);

          // Invalidate ALL inventory queries
          queryClient.invalidateQueries({
            queryKey: queryKeys.inventory.all(locationId),
          });

          // Invalidate loads (item counts may have changed)
          queryClient.invalidateQueries({
            queryKey: queryKeys.loads.all(locationId),
          });

          // Invalidate map data (markers may have changed)
          queryClient.invalidateQueries({
            queryKey: ['product-locations', locationId],
          });

          // Legacy keys
          queryClient.invalidateQueries({
            queryKey: ['inventory-scan-counts-v4', locationId],
          });

          queryClient.invalidateQueries({
            queryKey: ['data-quality'],
          });
        }
      )
      .subscribe(() => {
        // console.log('📦 Inventory channel status:', status);
      });

    // Subscribe to product_location_history (scan events)
    const scanChannel = supabase
      .channel(`scans:${locationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'product_location_history',
          filter: `location_id=eq.${locationId}`,
        },
        () => {
          // console.log('📍 New scan:', payload.new);

          // Invalidate map locations (new marker added)
          queryClient.invalidateQueries({
            queryKey: ['product-locations', locationId],
          });

          // Invalidate loads (scanning progress changed)
          queryClient.invalidateQueries({
            queryKey: queryKeys.loads.all(locationId),
          });

          // Invalidate map metadata (load scanning progress in popovers)
          queryClient.invalidateQueries({
            queryKey: ['map-metadata', locationId],
          });

          // Legacy keys
          queryClient.invalidateQueries({
            queryKey: ['inventory-scan-counts-v4', locationId],
          });
        }
      )
      .subscribe(() => {
        // console.log('📍 Scan channel status:', status);
      });

    // Subscribe to scanning_sessions changes
    const sessionChannel = supabase
      .channel(`sessions:${locationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scanning_sessions',
          filter: `location_id=eq.${locationId}`,
        },
        () => {
          // console.log('🎯 Session change:', payload.eventType, payload.new || payload.old);

          // Invalidate ALL session queries
          queryClient.invalidateQueries({
            queryKey: queryKeys.sessions.all(locationId),
          });

          // Invalidate map metadata (sessions show in popovers)
          queryClient.invalidateQueries({
            queryKey: ['map-metadata', locationId],
          });
        }
      )
      .subscribe(() => {
        // console.log('🎯 Session channel status:', status);
      });

    // Subscribe to load_metadata changes
    const loadChannel = supabase
      .channel(`loads:${locationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'load_metadata',
          filter: `location_id=eq.${locationId}`,
        },
        () => {
          // console.log('🚚 Load metadata change:', payload.eventType, payload.new || payload.old);

          // Single source of truth: TanStack Query
          queryClient.invalidateQueries({
            queryKey: queryKeys.loads.all(locationId),
          });

          // Invalidate map queries (they show load data)
          queryClient.invalidateQueries({
            queryKey: ['map-metadata', locationId],
          });

          queryClient.invalidateQueries({
            queryKey: ['product-locations', locationId],
          });
        }
      )
      .subscribe(() => {
        // console.log('🚚 Load channel status:', status);
      });

    // Cleanup on unmount or location change
    return () => {
      // console.log('🔴 Realtime: Unsubscribing from all channels');
      inventoryChannel.unsubscribe();
      scanChannel.unsubscribe();
      sessionChannel.unsubscribe();
      loadChannel.unsubscribe();
    };
  }, [locationId, queryClient]);

  return (
    <RealtimeContext.Provider value={{ connected: true }}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  const ctx = useContext(RealtimeContext);
  if (!ctx) {
    throw new Error('useRealtime must be used within RealtimeProvider');
  }
  return ctx;
}
