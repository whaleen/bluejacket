import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import supabase from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { getActiveLocationContext } from '@/lib/tenant';
import {
  createSession,
  deleteSession,
  getSession,
  getSessionSummaries,
  updateSessionScannedItems,
  updateSessionStatus,
} from '@/lib/sessionManager';
import type { InventoryItem, InventoryType } from '@/types/inventory';
import type { ScanningSession, SessionStatus, SessionSummary } from '@/types/session';

type LoadMetadataSummary = {
  sub_inventory_name: string;
  friendly_name: string | null;
  primary_color: string | null;
  ge_cso: string | null;
  ge_source_status?: string | null;
};

type ProfileRecord = {
  username: string | null;
  email: string | null;
  image: string | null;
};

export function useSessionSummaries() {
  const { locationId } = getActiveLocationContext();

  return useQuery<SessionSummary[]>({
    queryKey: queryKeys.sessions.all(locationId ?? 'missing'),
    queryFn: async () => {
      const { data, error } = await getSessionSummaries();
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!locationId,
  });
}

export function useSessionDetail(sessionId: string) {
  const { locationId } = getActiveLocationContext();

  return useQuery<ScanningSession>({
    queryKey: queryKeys.sessions.detail(locationId ?? 'missing', sessionId),
    queryFn: async () => {
      const { data, error } = await getSession(sessionId);
      if (error || !data) throw error ?? new Error('Session not found');
      return data;
    },
    enabled: !!locationId && !!sessionId,
  });
}

export function useCreateSessionFromInventory() {
  const queryClient = useQueryClient();
  const { locationId } = getActiveLocationContext();

  return useMutation({
    mutationFn: async ({
      name,
      inventoryType,
      subInventory,
      createdBy,
    }: {
      name: string;
      inventoryType: InventoryType;
      subInventory?: string;
      createdBy?: string;
    }) => {
      if (!locationId) {
        throw new Error('No active location selected');
      }

      let query = supabase
        .from('inventory_items')
        .select('*')
        .eq('location_id', locationId)
        .eq('inventory_type', inventoryType);

      if (subInventory && subInventory !== 'all') {
        query = query.eq('sub_inventory', subInventory);
      }

      const { data, error } = await query;
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('No items found for this inventory type');
      }

      const { data: session, error: sessionError } = await createSession({
        name,
        inventoryType,
        subInventory,
        items: data as InventoryItem[],
        createdBy,
      });

      if (sessionError || !session) {
        throw sessionError ?? new Error('Failed to create session');
      }

      return session;
    },
    onSuccess: () => {
      if (locationId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all(locationId) });
      }
    },
  });
}

export function useUpdateSessionStatus() {
  const queryClient = useQueryClient();
  const { locationId } = getActiveLocationContext();

  return useMutation({
    mutationFn: async ({
      sessionId,
      status,
      updatedBy,
    }: {
      sessionId: string;
      status: SessionStatus;
      updatedBy?: string;
    }) => {
      const { data, error } = await updateSessionStatus({ sessionId, status, updatedBy });
      if (error || !data) throw error ?? new Error('Failed to update session');
      return data;
    },
    onSuccess: (data) => {
      if (!locationId) return;
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all(locationId) });
      queryClient.setQueryData(queryKeys.sessions.detail(locationId, data.id), data);
    },
  });
}

export function useUpdateSessionScannedItems() {
  const queryClient = useQueryClient();
  const { locationId } = getActiveLocationContext();

  return useMutation({
    mutationFn: async ({
      sessionId,
      scannedItemIds,
      updatedBy,
    }: {
      sessionId: string;
      scannedItemIds: string[];
      updatedBy?: string;
    }) => {
      const { data, error } = await updateSessionScannedItems({ sessionId, scannedItemIds, updatedBy });
      if (error || !data) throw error ?? new Error('Failed to update session');
      return data;
    },
    onSuccess: (data) => {
      if (!locationId) return;
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all(locationId) });
      queryClient.setQueryData(queryKeys.sessions.detail(locationId, data.id), data);
    },
  });
}

export function useDeleteSession() {
  const queryClient = useQueryClient();
  const { locationId } = getActiveLocationContext();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { success, error } = await deleteSession(sessionId);
      if (error || !success) throw error ?? new Error('Failed to delete session');
      return sessionId;
    },
    onSuccess: (sessionId) => {
      if (!locationId) return;
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all(locationId) });
      queryClient.removeQueries({ queryKey: queryKeys.sessions.detail(locationId, sessionId) });
    },
  });
}

export function useSubInventoryNames(inventoryType: InventoryType) {
  const { locationId } = getActiveLocationContext();

  return useQuery<string[]>({
    queryKey: queryKeys.sessions.subInventories(locationId ?? 'missing', inventoryType),
    queryFn: async () => {
      if (!locationId) {
        throw new Error('No active location selected');
      }

      const { data, error } = await supabase
        .from('inventory_items')
        .select('sub_inventory')
        .eq('location_id', locationId)
        .eq('inventory_type', inventoryType)
        .not('sub_inventory', 'is', null);

      if (error) throw error;
      const unique = [...new Set((data ?? []).map((item) => item.sub_inventory).filter(Boolean))] as string[];
      return unique;
    },
    enabled: !!locationId,
  });
}

export function useInventoryPreviewCount(inventoryType: InventoryType, subInventory: string) {
  const { locationId } = getActiveLocationContext();

  return useQuery<number>({
    queryKey: queryKeys.sessions.previewCount(locationId ?? 'missing', inventoryType, subInventory),
    queryFn: async () => {
      if (!locationId) {
        throw new Error('No active location selected');
      }

      let query = supabase
        .from('inventory_items')
        .select('id', { count: 'exact', head: true })
        .eq('location_id', locationId)
        .eq('inventory_type', inventoryType);

      if (subInventory !== 'all') {
        query = query.eq('sub_inventory', subInventory);
      }

      const { count, error } = await query;
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!locationId,
  });
}

export function useSessionLoadMetadata(subInventoryNames: string[], inventoryType?: InventoryType) {
  const { locationId } = getActiveLocationContext();

  return useQuery<Map<string, LoadMetadataSummary>>({
    queryKey: queryKeys.sessions.loadMetadata(
      locationId ?? 'missing',
      inventoryType ?? 'all',
      subInventoryNames
    ),
    queryFn: async () => {
      if (!locationId) {
        throw new Error('No active location selected');
      }

      let query = supabase
        .from('load_metadata')
        .select('sub_inventory_name, friendly_name, primary_color, ge_cso, ge_source_status')
        .eq('location_id', locationId)
        .in('sub_inventory_name', subInventoryNames);

      if (inventoryType) {
        query = query.eq('inventory_type', inventoryType);
      }

      const { data, error } = await query;
      if (error) throw error;

      const metadataMap = new Map<string, LoadMetadataSummary>();
      for (const item of data ?? []) {
        metadataMap.set(item.sub_inventory_name, {
          sub_inventory_name: item.sub_inventory_name,
          friendly_name: item.friendly_name,
          primary_color: item.primary_color,
          ge_cso: item.ge_cso,
          ge_source_status: item.ge_source_status,
        });
      }
      return metadataMap;
    },
    enabled: !!locationId && subInventoryNames.length > 0,
  });
}

export function useSessionCreatorAvatars(names: string[]) {
  const trimmed = names.filter(Boolean);

  return useQuery<Record<string, string | null>>({
    queryKey: queryKeys.users.avatars(trimmed),
    queryFn: async () => {
      const { data: usersByUsername, error: usernameError } = await supabase
        .from('profiles')
        .select('username, email, image')
        .in('username', trimmed);

      const { data: usersByEmail, error: emailError } = await supabase
        .from('profiles')
        .select('username, email, image')
        .in('email', trimmed);

      if (usernameError) throw usernameError;
      if (emailError) throw emailError;

      const nextMap: Record<string, string | null> = {};
      const records: ProfileRecord[] = [...(usersByUsername ?? []), ...(usersByEmail ?? [])];
      for (const user of records) {
        if (user.username) nextMap[user.username] = user.image ?? null;
        if (user.email) nextMap[user.email] = user.image ?? null;
      }

      return nextMap;
    },
    enabled: trimmed.length > 0,
  });
}
