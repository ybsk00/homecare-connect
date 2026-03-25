'use client';

import { useEffect, useRef, useState } from 'react';

const testimonials = [
  {
    initial: '김',
    name: '김서연',
    role: '보호자',
    avatarBg: 'bg-primary',
    review:
      'AI 도우미 덕분에 어머니 복약 관리가 정말 편해졌어요. 약 먹을 시간을 놓치면 바로 알림이 오고, 간호사님과도 자동으로 연락이 됩니다. 기술이 이렇게 따뜻할 수 있다니 놀랍습니다.',
  },
  {
    initial: '박',
    name: '박지현',
    role: '방문간호사',
    avatarBg: 'bg-secondary',
    review:
      '출근길에 AI 브리핑으로 오늘 방문할 환자들의 상태를 미리 파악할 수 있어서 업무 효율이 크게 올랐습니다. 레드플래그 알림 덕분에 위험 상황도 빠르게 대응할 수 있었어요.',
  },
  {
    initial: '이',
    name: '이준호',
    role: '병원 관리자',
    avatarBg: 'bg-primary-container',
    review:
      '매칭부터 방문 기록, 건보 청구 자료까지 한 플랫폼에서 해결됩니다. 특히 AI 매칭 시스템이 환자와 간호사의 궁합을 잘 맞춰줘서 만족도가 높습니다.',
  },
];

export function Testimonials() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="testimonials"
      ref={sectionRef}
      className="bg-surface-container-low py-20 lg:py-28"
    >
      <div className="mx-auto max-w-7xl px-8">
        {/* Section header */}
        <div
          className={`mx-auto max-w-2xl text-center transition-all duration-800 ease-out ${
            visible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}
        >
          <h2 className="text-3xl font-extrabold tracking-tight text-primary lg:text-4xl font-headline">
            이용자 후기
          </h2>
          <p className="mt-4 text-lg text-on-surface-variant font-body">
            홈케어커넥트와 함께하는 분들의 이야기
          </p>
        </div>

        {/* Testimonial cards */}
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <div
              key={t.name}
              className={`rounded-lg bg-surface-container-lowest p-8 premium-shadow transition-all duration-700 ease-out ${
                visible ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'
              }`}
              style={{ transitionDelay: visible ? `${200 + i * 150}ms` : '0ms' }}
            >
              {/* 인용부호 */}
              <p className="text-6xl font-bold leading-none text-primary/10 font-headline">
                &ldquo;
              </p>

              {/* 후기 내용 */}
              <p className="mt-2 leading-relaxed text-on-surface-variant font-body">{t.review}</p>

              {/* 별점 */}
              <div className="mt-5 flex gap-0.5">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <span
                    key={idx}
                    className="material-symbols-outlined text-secondary text-lg"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    star
                  </span>
                ))}
              </div>

              {/* 프로필 */}
              <div className="mt-5 flex items-center gap-3">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-full ${t.avatarBg}`}
                >
                  <span className="text-sm font-bold text-white">{t.initial}</span>
                </div>
                <div>
                  <p className="font-bold text-on-surface">{t.name}</p>
                  <span className="inline-block mt-1 rounded-full bg-secondary/10 px-3 py-0.5 text-xs font-medium text-secondary">
                    {t.role}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
