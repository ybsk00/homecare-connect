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
    size = 'h-7 w-7',
  ) => (
    <div className="flex gap-1.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => onChange(star)}
          onMouseEnter={() => onHover?.(star)}
          onMouseLeave={() => onHover?.(0)}
          className="transition-all hover:scale-125 active:scale-95"
        >
          <svg
            className={`${size} transition-colors ${
              star <= (hover || value) ? 'text-tertiary-400' : 'text-primary/10'
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
          className={`h-5 w-5 ${star <= value ? 'text-tertiary-400' : 'text-primary/10'}`}
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );

  /* 세부 평점 바 렌더링 */
  const renderRatingBar = (label: string, value: number) => (
    <div className="flex items-center gap-3">
      <span className="w-14 shrink-0 text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant">{label}</span>
      <div className="h-2 flex-1 rounded-full bg-primary/5">
        <div
          className="h-2 rounded-full bg-gradient-to-r from-secondary to-secondary-400 transition-all"
          style={{ width: `${(value / 5) * 100}%` }}
        />
      </div>
      <span className="w-8 text-right text-sm font-bold text-primary">{value}/5</span>
    </div>
  );

  /* 평균 점수 계산 */
  const avgRating = useMemo(() => {
    if (!reviews || reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return (sum / reviews.length).toFixed(1);
  }, [reviews]);

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-secondary">리뷰</p>
          <h1 className="mt-1 text-4xl font-extrabold tracking-tight text-primary">리뷰</h1>
          <p className="mt-2 text-on-surface-variant">서비스 이용 후기를 남겨주세요</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="rounded-2xl bg-gradient-to-r from-secondary to-secondary-900 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-secondary/20 transition-all hover:shadow-xl hover:shadow-secondary/30 active:scale-95"
          >
            리뷰 작성
          </button>
        )}
      </div>

      {/* 통계 요약 카드 */}
      {reviews && reviews.length > 0 && !showForm && (
        <div className="rounded-2xl bg-surface-container-lowest p-8 shadow-[0_10px_40px_rgba(46,71,110,0.06)]">
          <div className="flex items-center gap-8">
            <div className="text-center">
              <p className="text-5xl font-extrabold tracking-tight text-primary">{avgRating}</p>
              <div className="mt-2">{readOnlyStars(Math.round(Number(avgRating)))}</div>
              <p className="mt-2 text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant/60">평균 평점</p>
            </div>
            <div className="h-16 w-px bg-primary/8" />
            <div className="text-center">
              <p className="text-5xl font-extrabold tracking-tight text-secondary">{reviews.length}</p>
              <p className="mt-2 text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant/60">총 리뷰</p>
            </div>
          </div>
        </div>
      )}

      {/* 리뷰 작성 폼 */}
      {showForm && (
        <div className="rounded-2xl bg-surface-container-lowest p-8 shadow-[0_10px_40px_rgba(46,71,110,0.06)]">
          <h2 className="text-xl font-bold text-primary">리뷰 작성</h2>
          <p className="mt-1 text-sm text-on-surface-variant/60">서비스에 대한 솔직한 평가를 남겨주세요</p>

          {/* 기관 선택 */}
          <div className="mt-8">
            <label className="text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant/70">기관 ID</label>
            <input
              type="text"
              value={selectedOrgId}
              onChange={(e) => setSelectedOrgId(e.target.value)}
              placeholder="리뷰를 남길 기관 ID를 입력해주세요"
              className="mt-2 w-full rounded-xl bg-surface-container-low px-4 py-3.5 text-sm text-primary outline-none transition-shadow focus:ring-2 focus:ring-secondary/30 focus:shadow-lg focus:shadow-secondary/5"
            />
            {knownOrgs.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2.5">
                {knownOrgs.map((org) => (
                  <button
                    key={org.id}
                    onClick={() => setSelectedOrgId(org.id)}
                    className={`rounded-full px-4 py-2 text-xs font-medium transition-all ${
                      selectedOrgId === org.id
                        ? 'bg-secondary text-white shadow-md shadow-secondary/20'
                        : 'bg-surface-container-low text-on-surface-variant hover:bg-secondary/10'
                    }`}
                  >
                    {org.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 총점 */}
          <div className="mt-8">
            <label className="text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant/70">총점</label>
            <div className="mt-3">
              {renderStars(rating, setRating, hoverRating, setHoverRating, 'h-10 w-10')}
            </div>
            {rating > 0 && (
              <p className="mt-2 text-2xl font-extrabold text-primary">{rating}.0</p>
            )}
          </div>

          {/* 세부 평점 */}
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {[
              { label: '서비스 품질', value: ratingQuality, setter: setRatingQuality },
              { label: '정시성', value: ratingPunctuality, setter: setRatingPunctuality },
              { label: '의사소통', value: ratingCommunication, setter: setRatingCommunication },
              { label: '친절도', value: ratingKindness, setter: setRatingKindness },
            ].map((item) => (
              <div key={item.label} className="rounded-xl bg-surface-container-low p-4">
                <label className="text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant/70">{item.label}</label>
                <div className="mt-2">
                  {renderStars(item.value, item.setter)}
                </div>
              </div>
            ))}
          </div>

          {/* 리뷰 내용 */}
          <div className="mt-8">
            <label className="text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant/70">리뷰 내용</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="서비스에 대한 소감을 자유롭게 작성해주세요"
              rows={4}
              className="mt-2 w-full resize-none rounded-xl bg-surface-container-low px-4 py-3.5 text-sm leading-relaxed text-primary outline-none transition-shadow focus:ring-2 focus:ring-secondary/30 focus:shadow-lg focus:shadow-secondary/5"
            />
          </div>

          {/* 버튼 */}
          <div className="mt-8 flex gap-3">
            <button
              onClick={resetForm}
              className="flex-1 rounded-2xl bg-surface-container-low px-6 py-3.5 text-sm font-medium text-on-surface-variant transition-colors hover:bg-primary/5"
            >
              취소
            </button>
            <button
              onClick={() => createMutation.mutate()}
              disabled={
                rating === 0 || !selectedOrgId || createMutation.isPending
              }
              className="flex-1 rounded-2xl bg-gradient-to-r from-secondary to-secondary-900 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-secondary/20 transition-all hover:shadow-xl hover:shadow-secondary/30 active:scale-95 disabled:opacity-50 disabled:shadow-none"
            >
              {createMutation.isPending ? '등록 중...' : '리뷰 등록'}
            </button>
          </div>

          {createMutation.isError && (
            <p className="mt-4 text-center text-sm text-error">
              등록에 실패했습니다. 다시 시도해주세요.
            </p>
          )}
        </div>
      )}

      {/* 리뷰 목록 */}
      {isLoading ? (
        <div className="space-y-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-36 animate-pulse rounded-2xl bg-primary/5" />
          ))}
        </div>
      ) : !reviews || reviews.length === 0 ? (
        <div className="rounded-2xl bg-surface-container-lowest p-16 text-center shadow-[0_10px_40px_rgba(46,71,110,0.06)]">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-tertiary-50">
            <svg
              className="h-10 w-10 text-tertiary-300"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </div>
          <p className="mt-6 text-base font-semibold text-primary">작성한 리뷰가 없습니다</p>
          <p className="mt-2 text-sm text-on-surface-variant/60">서비스를 이용한 후 리뷰를 남겨보세요</p>
        </div>
      ) : (
        <div className="space-y-5">
          {reviews.map((review) => {
            const org = review.organization as any;
            return (
              <div
                key={review.id}
                className="group rounded-2xl bg-surface-container-lowest p-6 shadow-[0_10px_40px_rgba(46,71,110,0.06)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_60px_rgba(46,71,110,0.1)]"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    {/* 기관 아이콘 */}
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary/8">
                      <svg className="h-5 w-5 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-base font-bold text-primary">
                        {org?.name ?? '기관'}
                      </p>
                      {org?.org_type && (
                        <span className="rounded-full bg-primary/5 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-on-surface-variant">
                          {formatOrgType(org.org_type)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    {readOnlyStars(review.rating)}
                    <p className="mt-1 text-lg font-extrabold text-primary">{review.rating}.0</p>
                  </div>
                </div>

                {review.content && (
                  <p className="mt-5 text-sm leading-relaxed text-on-surface-variant">{review.content}</p>
                )}

                {/* 세부 평점 바 */}
                {(review.rating_quality || review.rating_punctuality || review.rating_communication || review.rating_kindness) && (
                  <div className="mt-5 space-y-3 rounded-xl bg-surface-container-low p-5">
                    {review.rating_quality ? renderRatingBar('품질', review.rating_quality) : null}
                    {review.rating_punctuality ? renderRatingBar('정시성', review.rating_punctuality) : null}
                    {review.rating_communication ? renderRatingBar('소통', review.rating_communication) : null}
                    {review.rating_kindness ? renderRatingBar('친절도', review.rating_kindness) : null}
                  </div>
                )}

                <div className="mt-5 border-t border-primary/5 pt-4">
                  <p className="text-[10px] font-medium uppercase tracking-widest text-on-surface-variant/40">
                    {formatRelativeTime(review.created_at)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
