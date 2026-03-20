'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import {
  getReviewsByGuardian,
  createReview,
  getPatientsByGuardian,
} from '@homecare/supabase-client';
import {
  formatDate,
  formatRelativeTime,
  formatOrgType,
} from '@homecare/shared-utils';

export default function ReviewsPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [ratingQuality, setRatingQuality] = useState(0);
  const [ratingPunctuality, setRatingPunctuality] = useState(0);
  const [ratingCommunication, setRatingCommunication] = useState(0);
  const [ratingKindness, setRatingKindness] = useState(0);
  const [content, setContent] = useState('');
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState('');

  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  const userId = session?.user?.id;

  const { data: patientLinks } = useQuery({
    queryKey: ['patients', userId],
    queryFn: () => getPatientsByGuardian(supabase, userId!),
    enabled: !!userId,
  });

  const { data: reviews, isLoading } = useQuery({
    queryKey: ['reviews', userId],
    queryFn: () => getReviewsByGuardian(supabase, userId!),
    enabled: !!userId,
  });

  // 리뷰를 작성할 수 있는 기관 목록 (이전 요청에서 매칭된 기관들) - 기존 리뷰에서 추출
  const knownOrgs = useMemo(() => {
    if (!reviews) return [];
    const orgMap = new Map<string, { id: string; name: string; org_type: string }>();
    for (const r of reviews) {
      const org = r.organization as any;
      if (org?.id && !orgMap.has(org.id)) {
        orgMap.set(org.id, { id: org.id, name: org.name, org_type: org.org_type });
      }
    }
    return Array.from(orgMap.values());
  }, [reviews]);

  const createMutation = useMutation({
    mutationFn: async () => {
      return createReview(supabase, {
        guardian_id: userId!,
        org_id: selectedOrgId,
        patient_id: selectedPatientId || (patientLinks?.[0]?.patient?.id ?? ''),
        rating,
        content: content || null,
        rating_quality: ratingQuality || null,
        rating_punctuality: ratingPunctuality || null,
        rating_communication: ratingCommunication || null,
        rating_kindness: ratingKindness || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      resetForm();
    },
  });

  const resetForm = () => {
    setShowForm(false);
    setRating(0);
    setHoverRating(0);
    setRatingQuality(0);
    setRatingPunctuality(0);
    setRatingCommunication(0);
    setRatingKindness(0);
    setContent('');
    setSelectedOrgId('');
    setSelectedPatientId('');
  };

  const renderStars = (
    value: number,
    onChange: (v: number) => void,
    hover?: number,
    onHover?: (v: number) => void,
    size = 'h-6 w-6',
  ) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => onChange(star)}
          onMouseEnter={() => onHover?.(star)}
          onMouseLeave={() => onHover?.(0)}
          className="transition-transform hover:scale-110"
        >
          <svg
            className={`${size} ${
              star <= (hover || value) ? 'text-[#F59E0B]' : 'text-[#002045]/15'
            }`}
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </button>
      ))}
    </div>
  );

  const readOnlyStars = (value: number) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`h-4 w-4 ${star <= value ? 'text-[#F59E0B]' : 'text-[#002045]/15'}`}
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#002045]">리뷰</h1>
          <p className="mt-1 text-[#002045]/60">서비스 이용 후기를 남겨주세요</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="rounded-xl bg-gradient-to-r from-[#006A63] to-[#004D47] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            리뷰 작성
          </button>
        )}
      </div>

      {/* 리뷰 작성 폼 */}
      {showForm && (
        <div className="rounded-2xl bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <h2 className="text-lg font-semibold text-[#002045]">리뷰 작성</h2>

          {/* 기관 선택 (직접 입력도 가능하도록 input) */}
          <div className="mt-5">
            <label className="text-sm font-medium text-[#002045]/70">기관 ID</label>
            <input
              type="text"
              value={selectedOrgId}
              onChange={(e) => setSelectedOrgId(e.target.value)}
              placeholder="리뷰를 남길 기관 ID를 입력해주세요"
              className="mt-1.5 w-full rounded-xl bg-[#F7FAFC] px-4 py-3 text-sm text-[#002045] outline-none focus:ring-2 focus:ring-[#006A63]/30"
            />
            {knownOrgs.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {knownOrgs.map((org) => (
                  <button
                    key={org.id}
                    onClick={() => setSelectedOrgId(org.id)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                      selectedOrgId === org.id
                        ? 'bg-[#006A63] text-white'
                        : 'bg-[#F7FAFC] text-[#002045]/60 hover:bg-[#006A63]/10'
                    }`}
                  >
                    {org.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 총점 */}
          <div className="mt-5">
            <label className="text-sm font-medium text-[#002045]/70">총점</label>
            <div className="mt-2">
              {renderStars(rating, setRating, hoverRating, setHoverRating, 'h-8 w-8')}
            </div>
          </div>

          {/* 세부 평점 */}
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs text-[#002045]/50">서비스 품질</label>
              <div className="mt-1">
                {renderStars(ratingQuality, setRatingQuality)}
              </div>
            </div>
            <div>
              <label className="text-xs text-[#002045]/50">정시성</label>
              <div className="mt-1">
                {renderStars(ratingPunctuality, setRatingPunctuality)}
              </div>
            </div>
            <div>
              <label className="text-xs text-[#002045]/50">의사소통</label>
              <div className="mt-1">
                {renderStars(ratingCommunication, setRatingCommunication)}
              </div>
            </div>
            <div>
              <label className="text-xs text-[#002045]/50">친절도</label>
              <div className="mt-1">
                {renderStars(ratingKindness, setRatingKindness)}
              </div>
            </div>
          </div>

          {/* 리뷰 내용 */}
          <div className="mt-5">
            <label className="text-sm font-medium text-[#002045]/70">리뷰 내용</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="서비스에 대한 소감을 자유롭게 작성해주세요"
              rows={4}
              className="mt-1.5 w-full resize-none rounded-xl bg-[#F7FAFC] px-4 py-3 text-sm text-[#002045] outline-none focus:ring-2 focus:ring-[#006A63]/30"
            />
          </div>

          {/* 버튼 */}
          <div className="mt-6 flex gap-3">
            <button
              onClick={resetForm}
              className="flex-1 rounded-xl bg-[#F7FAFC] px-6 py-3 text-sm font-medium text-[#002045]/60 transition-colors hover:bg-[#002045]/10"
            >
              취소
            </button>
            <button
              onClick={() => createMutation.mutate()}
              disabled={
                rating === 0 || !selectedOrgId || createMutation.isPending
              }
              className="flex-1 rounded-xl bg-gradient-to-r from-[#006A63] to-[#004D47] px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {createMutation.isPending ? '등록 중...' : '리뷰 등록'}
            </button>
          </div>

          {createMutation.isError && (
            <p className="mt-3 text-center text-sm text-[#EF4444]">
              등록에 실패했습니다. 다시 시도해주세요.
            </p>
          )}
        </div>
      )}

      {/* 리뷰 목록 */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-[#002045]/5" />
          ))}
        </div>
      ) : !reviews || reviews.length === 0 ? (
        <div className="rounded-2xl bg-[#002045]/5 p-10 text-center">
          <svg
            className="mx-auto h-12 w-12 text-[#002045]/20"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z"
            />
          </svg>
          <p className="mt-3 text-sm text-[#002045]/40">작성한 리뷰가 없습니다</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => {
            const org = review.organization as any;
            return (
              <div
                key={review.id}
                className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#002045]">
                      {org?.name ?? '기관'}
                    </p>
                    {org?.org_type && (
                      <span className="text-xs text-[#002045]/40">
                        {formatOrgType(org.org_type)}
                      </span>
                    )}
                  </div>
                  {readOnlyStars(review.rating)}
                </div>

                {review.content && (
                  <p className="mt-3 text-sm text-[#002045]/70">{review.content}</p>
                )}

                {/* 세부 평점 */}
                {(review.rating_quality || review.rating_punctuality || review.rating_communication || review.rating_kindness) && (
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-[#002045]/40">
                    {review.rating_quality && (
                      <span>품질 {review.rating_quality}/5</span>
                    )}
                    {review.rating_punctuality && (
                      <span>정시성 {review.rating_punctuality}/5</span>
                    )}
                    {review.rating_communication && (
                      <span>소통 {review.rating_communication}/5</span>
                    )}
                    {review.rating_kindness && (
                      <span>친절도 {review.rating_kindness}/5</span>
                    )}
                  </div>
                )}

                <p className="mt-3 text-xs text-[#002045]/30">
                  {formatRelativeTime(review.created_at)}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
