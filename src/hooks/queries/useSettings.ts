import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
  getLocations,
  getCompanies,
  getUsers,
  resolveLocationSettings,
  updateLocation,
  upsertSettings,
  createLocation,
  updateCompany,
  createCompany,
  updateUserProfile,
  // type LocationRecord,
  // type CompanyRecord,
  // type UserRecord,
} from '@/lib/settingsManager';

export function useLocations() {
  return useQuery({
    queryKey: queryKeys.locations.all(),
    queryFn: getLocations,
  });
}

export function useCompanies() {
  return useQuery({
    queryKey: queryKeys.companies.all(),
    queryFn: getCompanies,
  });
}

export function useUsers() {
  return useQuery({
    queryKey: queryKeys.users.all(),
    queryFn: getUsers,
  });
}

export function useLocationSettings(locationKey: string | null) {
  return useQuery({
    queryKey: queryKeys.settings.byKey(locationKey),
    queryFn: () => resolveLocationSettings(locationKey as string),
    enabled: !!locationKey,
  });
}

export function useUpdateLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ locationId, name, slug }: { locationId: string; name: string; slug: string }) =>
      updateLocation(locationId, name, slug),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.locations.all() });
    },
  });
}

export function useUpsertSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      locationId: string;
      companyId: string;
      ssoUsername?: string | null;
      ssoPassword?: string | null;
      uiHandedness?: string | null;
    }) => upsertSettings(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });
}

export function useCreateLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { name: string; slug: string; companyId: string }) => createLocation(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.locations.all() });
    },
  });
}

export function useUpdateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { companyId: string; name: string; slug: string }) => updateCompany(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.locations.all() });
    },
  });
}

export function useCreateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { name: string; slug: string }) => createCompany(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.all() });
    },
  });
}

export function useUpdateUserProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { id: string; username: string; role?: string | null; companyId?: string | null }) =>
      updateUserProfile(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all() });
    },
  });
}
