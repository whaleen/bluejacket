/**
 * Load Store - Instant local state for load data
 * Synced with database via Realtime subscriptions
 */

import { create } from 'zustand';
import type { LoadMetadata } from '@/types/inventory';

interface LoadStore {
  // State
  loads: Map<string, LoadMetadata>;
  isHydrated: boolean;
  lastSync: number;

  // Actions
  setLoads: (loads: LoadMetadata[]) => void;
  updateLoad: (loadName: string, updates: Partial<LoadMetadata>) => void;
  removeLoad: (loadName: string) => void;
  getLoad: (loadName: string) => LoadMetadata | undefined;

  // Optimistic updates for scanning progress
  incrementScannedCount: (loadName: string) => void;
  decrementScannedCount: (loadName: string) => void;

  // Sync status
  markHydrated: () => void;
  updateSyncTime: () => void;
}

export const useLoadStore = create<LoadStore>((set, get) => ({
  // Initial state
  loads: new Map(),
  isHydrated: false,
  lastSync: 0,

  // Set all loads (from server)
  setLoads: (loads) => {
    const loadsMap = new Map(
      loads.map(load => [load.sub_inventory_name, load])
    );
    set({
      loads: loadsMap,
      isHydrated: true,
      lastSync: Date.now()
    });
  },

  // Update specific load
  updateLoad: (loadName, updates) => {
    const { loads } = get();
    const existing = loads.get(loadName);

    if (existing) {
      const updated = { ...existing, ...updates };
      const newLoads = new Map(loads);
      newLoads.set(loadName, updated);
      set({ loads: newLoads });
    }
  },

  // Remove load
  removeLoad: (loadName) => {
    const { loads } = get();
    const newLoads = new Map(loads);
    newLoads.delete(loadName);
    set({ loads: newLoads });
  },

  // Get specific load
  getLoad: (loadName) => {
    return get().loads.get(loadName);
  },

  // Optimistic increment (before server confirms)
  incrementScannedCount: (loadName) => {
    const { loads } = get();
    const existing = loads.get(loadName);

    if (existing) {
      const newCount = (existing.items_scanned_count || 0) + 1;
      const total = existing.items_total_count || 0;
      const updated = {
        ...existing,
        items_scanned_count: newCount,
        scanning_complete: total > 0 && newCount >= total,
      };

      const newLoads = new Map(loads);
      newLoads.set(loadName, updated);
      set({ loads: newLoads });
    }
  },

  // Optimistic decrement (for undo/delete)
  decrementScannedCount: (loadName) => {
    const { loads } = get();
    const existing = loads.get(loadName);

    if (existing) {
      const newCount = Math.max(0, (existing.items_scanned_count || 0) - 1);
      const total = existing.items_total_count || 0;
      const updated = {
        ...existing,
        items_scanned_count: newCount,
        scanning_complete: total > 0 && newCount >= total,
      };

      const newLoads = new Map(loads);
      newLoads.set(loadName, updated);
      set({ loads: newLoads });
    }
  },

  // Mark as hydrated from server
  markHydrated: () => set({ isHydrated: true }),

  // Update sync timestamp
  updateSyncTime: () => set({ lastSync: Date.now() }),
}));
