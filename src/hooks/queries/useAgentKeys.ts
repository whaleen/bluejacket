import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import supabase from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { AgentProvider } from '@/lib/agent/client';

type UserAgentKey = {
  id: string;
  user_id: string;
  provider: AgentProvider;
  api_key: string;
  created_at: string;
  updated_at: string;
};

export const queryKeys = {
  agentKeys: (userId: string | undefined) => ['agent-keys', userId] as const,
};

export function useAgentKeys() {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.agentKeys(user?.id),
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('user_agent_keys')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      return data as UserAgentKey[];
    },
    enabled: !!user?.id,
  });
}

export function useUpsertAgentKey() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ provider, apiKey }: { provider: AgentProvider; apiKey: string }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('user_agent_keys')
        .upsert(
          {
            user_id: user.id,
            provider,
            api_key: apiKey,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,provider' }
        )
        .select()
        .single();

      if (error) throw error;
      return data as UserAgentKey;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.agentKeys(user?.id) });
    },
  });
}

export function useDeleteAgentKey() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (provider: AgentProvider) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('user_agent_keys')
        .delete()
        .eq('user_id', user.id)
        .eq('provider', provider);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.agentKeys(user?.id) });
    },
  });
}
