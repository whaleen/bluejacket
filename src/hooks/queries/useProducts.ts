import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import supabase from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';

export interface ProductRecord {
  id?: string;
  model: string;
  product_type: string;
  brand?: string;
  description?: string;
  dimensions?: {
    width?: number;
    height?: number;
    depth?: number;
  };
  image_url?: string;
  product_url?: string;
  price?: number;
  msrp?: number;
  color?: string;
  capacity?: string;
  availability?: string;
  commercial_category?: string;
  product_category?: string;
  is_part?: boolean;
  weight?: number;
}

export function useProductSearch(searchTerm: string, enabled: boolean = true, limit: number = 20) {
  const trimmed = searchTerm.trim();

  return useQuery({
    queryKey: queryKeys.products.search(trimmed),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .ilike('model', `%${trimmed}%`)
        .limit(limit)
        .order('model');

      if (error) throw error;
      return data ?? [];
    },
    enabled: enabled && trimmed.length > 0,
    staleTime: 1000 * 60 * 10,
  });
}

export function useUpsertProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (product: ProductRecord) => {
      const { data, error } = await supabase
        .from('products')
        .upsert(
          {
            model: product.model,
            product_type: product.product_type,
            brand: product.brand || 'GE',
            description: product.description || null,
            dimensions: product.dimensions || null,
            product_category: product.product_category || null,
            is_part: product.is_part ?? false,
          },
          { onConflict: 'model' }
        )
        .select('*');

      if (error) throw error;
      return data?.[0] ?? null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', 'search'] });
    },
  });
}
