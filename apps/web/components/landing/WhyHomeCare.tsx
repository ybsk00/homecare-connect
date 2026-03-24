'use client';

import { useEffect, useRef, useState } from 'react';

const stats = [
  { value: '1,000만+', label: '65세 이상 인구', bg: 'bg-primary text-white' },
  { value: '78%', label: '재가요양 선호율', bg: 'bg-secondary text-white' },
  { value: '2.3배', label: '시설 대비 만족도', bg: 'bg-primary-container text-on-primary-container' },
];

export function WhyHomeCare() {
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
    <section id="why-homecare" ref={sectionRef} className="bg-surface py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
          {/* 좌측: 이미지 */}
          <div
            className={`transition-all duration-800 ease-out ${
              visible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
            }`}
          >
            <div className="relative overflow-hidden rounded-3xl shadow-2xl h-[400px] lg:h-[500px] bg-gradient-to-br from-secondary/20 to-primary/10">
              <img
                src="/images/hero-homecare.jpg"
                alt="방문요양 서비스"
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              {/* placeholder overlay in case image doesn't load */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-on-surface-variant/40">
                  <div className="text-6xl mb-4">🏠</div>
                  <p className="text-lg font-medium">홈케어 방문치료</p>
                </div>
              </div>
            </div>
          </div>

          {/* 우측: 텍스트 콘텐츠 */}
          <div
            className={`transition-all duration-800 ease-out ${
              visible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
            }`}
            style={{ transitionDelay: visible ? '200ms' : '0ms' }}
          >
            <span className="inline-block rounded-full bg-secondary/10 px-4 py-1.5 text-sm font-semibold text-secondary">
              고령화 시대
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-primary lg:text-4xl">
              방문요양, 왜 중요한가요?
            </h2>
            <div className="mt-6 space-y-4 text-on-surface-variant leading-relaxed">
              <p>
                대한민국은 2025년 초고령사회에 진입하며, 65세 이상 인구가 전체의 20%를
                넘어섰습니다. 어르신들은 익숙한 자택에서 전문적인 케어를 받길 원합니다.
              </p>
              <p>
                재가요양은 시설 입소 대비 비용이 절감되고, 가족과 함께할 수 있으며,
                심리적 안정감이 높습니다. 하지만 적합한 전문 인력을 찾고 관리하는 것이
                큰 과제입니다.
              </p>
              <p className="font-semibold text-on-surface">
                홈케어커넥트는 이 문제를 AI 기술로 해결합니다.
              </p>
            </div>
          </div>
        </div>

        {/* 통계 카드 */}
        <div className="mt-14 grid gap-4 sm:grid-cols-3">
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className={`rounded-2xl ${stat.bg} p-6 text-center transition-all duration-700 ease-out ${
                visible ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'
              }`}
              style={{ transitionDelay: visible ? `${400 + i * 150}ms` : '0ms' }}
            >
              <p className="text-3xl font-extrabold">{stat.value}</p>
              <p className="mt-1 text-sm opacity-80">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default WhyHomeCare;
