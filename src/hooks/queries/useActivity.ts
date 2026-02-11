import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import supabase from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { getActiveLocationContext } from '@/lib/tenant';
import { logActivity, type ActivityLogInput } from '@/lib/activityLog';

const PAGE_SIZE = 50;

export function useActivityLog() {
  const { locationId } = getActiveLocationContext();

  return useInfiniteQuery({
    queryKey: queryKeys.activity.all(locationId ?? 'none'),
    enabled: !!locationId,
    queryFn: async ({ pageParam = 0 }) => {
      if (!locationId) throw new Error('Location required');
      const from = pageParam * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from('activity_log')
        .select('id, action, entity_type, entity_id, details, actor_name, actor_image, created_at, user_id')
        .eq('location_id', locationId)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      const entries = data ?? [];
      const userIds = Array.from(new Set(entries.map((entry) => entry.user_id).filter(Boolean)));
      const actorNames = Array.from(
        new Set(
          entries
            .map((entry) => entry.actor_name)
            .filter((name): name is string => Boolean(name))
        )
      );

      let profileMap = new Map<string, { username: string | null; email: string | null; image: string | null }>();
      let nameMap = new Map<string, { username: string | null; email: string | null; image: string | null }>();

      if (userIds.length > 0) {
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('id, username, email, image')
          .in('id', userIds as string[]);

        if (profileError) throw profileError;

        profileMap = new Map(
          (profiles ?? []).map((profile) => [
            profile.id,
            {
              username: profile.username ?? null,
              email: profile.email ?? null,
              image: profile.image ?? null,
            },
          ])
        );
      }

      if (actorNames.length > 0) {
        const { data: profilesByName, error: nameError } = await supabase
          .from('profiles')
          .select('id, username, email, image')
          .in('username', actorNames);

        if (nameError) throw nameError;

        const { data: profilesByEmail, error: emailError } = await supabase
          .from('profiles')
          .select('id, username, email, image')
          .in('email', actorNames);

        if (emailError) throw emailError;

        nameMap = new Map(
          [...(profilesByName ?? []), ...(profilesByEmail ?? [])].flatMap((profile) => {
            const records: Array<[string, { username: string | null; email: string | null; image: string | null }]> = [];
            if (profile.username) {
              records.push([
                profile.username,
                {
                  username: profile.username ?? null,
                  email: profile.email ?? null,
                  image: profile.image ?? null,
                },
              ]);
            }
            if (profile.email) {
              records.push([
                profile.email,
                {
                  username: profile.username ?? null,
                  email: profile.email ?? null,
                  image: profile.image ?? null,
                },
              ]);
            }
            return records;
          })
        );
      }

      const hydratedEntries = entries.map((entry) => {
        const profile = entry.user_id ? profileMap.get(entry.user_id) : null;
        const nameProfile = entry.actor_name ? nameMap.get(entry.actor_name) : null;
        return {
          ...entry,
          actor_name: profile?.username ?? profile?.email ?? nameProfile?.username ?? nameProfile?.email ?? entry.actor_name,
          actor_image: profile?.image ?? nameProfile?.image ?? entry.actor_image,
        };
      });

      return {
        data: hydratedEntries,
        nextPage: (data?.length ?? 0) === PAGE_SIZE ? pageParam + 1 : undefined,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
  });
}

export function useLogActivity() {
  const queryClient = useQueryClient();
  const { locationId } = getActiveLocationContext();

  return useMutation({
    mutationFn: (input: ActivityLogInput) => logActivity(input),
    onSuccess: () => {
      if (locationId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.activity.all(locationId) });
      }
    },
  });
}
