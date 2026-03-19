import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { createReview, getReviewsByGuardian } from '@homecare/supabase-client';
import { useAuthStore } from '@/stores/auth-store';
import type { TablesInsert } from '@homecare/shared-types';

export function useCreateReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (review: TablesInsert<'reviews'>) => {
      return createReview(supabase, review);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
    },
  });
}

export function useMyReviews() {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ['reviews', 'my', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('로그인이 필요합니다');
      return getReviewsByGuardian(supabase, user.id);
    },
    enabled: !!user,
  });
}
