'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

export function Hero() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section
      id="hero"
      className="relative overflow-hidden bg-surface pt-28 pb-20 lg:pt-36 lg:pb-28"
    >
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-secondary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-[400px] w-[400px] rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-8 lg:grid-cols-12 lg:gap-16">
        {/* Left: Text content */}
        <div
          className={`lg:col-span-6 space-y-8 transition-all duration-1000 ease-out ${
            mounted ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full bg-secondary/10 px-4 py-1.5">
            <span className="material-symbols-outlined text-secondary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
              verified_user
            </span>
            <span className="text-secondary font-semibold text-sm tracking-wide uppercase font-headline">
              Trust & Authority
            </span>
          </div>

          {/* Heading */}
          <div className="space-y-4">
            <h1 className="font-headline text-5xl leading-[1.15] font-extrabold tracking-tight text-primary lg:text-6xl">
              가족을 위한
              <br />
              가장 따뜻한 기술,
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary to-secondary">
                홈케어커넥트
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-lg leading-relaxed text-on-surface-variant max-w-xl font-body md:text-xl">
              AI 기반 방문간호 매칭부터 실시간 건강 모니터링까지,
              <br className="hidden sm:block" />
              이제 집에서도 전문적인 케어를 경험하세요.
            </p>
          </div>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <a
              href="/login"
              className="btn-gradient inline-flex items-center justify-center gap-2 rounded-lg px-8 py-4 text-lg font-bold text-white shadow-lg shadow-primary/20 transition-all hover:shadow-2xl hover:-translate-y-0.5 group"
            >
              지금 서비스 신청하기
              <span className="material-symbols-outlined text-xl group-hover:translate-x-1 transition-transform">
                arrow_forward
              </span>
            </a>
            <a
              href="/login"
              className="inline-flex items-center justify-center gap-2 bg-secondary-container rounded-lg px-8 py-4 text-lg font-bold text-on-secondary-container transition-colors hover:bg-secondary/10"
            >
              AI 매칭 체험하기
              <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                auto_awesome
              </span>
            </a>
          </div>

          {/* Social proof */}
          <div className="pt-8 border-t border-outline-variant/20 flex items-center gap-6">
            <div className="flex -space-x-3">
              {['local_hospital', 'medical_services', 'health_metrics'].map((icon, i) => (
                <div
                  key={i}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-high ring-2 ring-surface"
                >
                  <span className="material-symbols-outlined text-sm text-primary">
                    {icon}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-sm font-medium text-on-surface-variant">
              <span className="font-bold text-primary">2,000개 이상의</span> 의료기관과 함께합니다
            </p>
          </div>
        </div>

        {/* Right: Visual with hero image */}
        <div
          className={`lg:col-span-6 relative transition-all duration-1000 delay-300 ease-out ${
            mounted ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'
          }`}
        >
          {/* Main hero image */}
          <div className="relative rounded-lg overflow-hidden shadow-2xl">
            <Image
              src="/images/hero-care.jpg"
              alt="방문간호 서비스 - 따뜻한 돌봄"
              width={800}
              height={1000}
              className="w-full aspect-[4/5] object-cover"
              priority
            />

            {/* Floating glassmorphism health summary card */}
            <div
              className={`glass absolute bottom-8 left-8 right-8 rounded-lg p-6 shadow-xl border border-white/20 transition-all duration-1000 delay-700 ease-out ${
                mounted ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
              }`}
            >
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm font-bold text-primary font-headline">오늘의 건강 요약</span>
                <span className="flex h-2 w-2 rounded-full bg-secondary animate-pulse" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-on-surface-variant font-medium">실시간 맥박</p>
                  <p className="text-xl font-bold text-primary">72 <span className="text-xs font-normal">bpm</span></p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-on-surface-variant font-medium">활동량</p>
                  <p className="text-xl font-bold text-secondary">85 <span className="text-xs font-normal">%</span></p>
                </div>
              </div>
            </div>

            {/* Vitality Chip - top right */}
            <div
              className={`absolute top-8 right-8 bg-secondary/10 backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-2 border border-secondary/20 transition-all duration-1000 delay-500 ease-out ${
                mounted ? 'translate-y-0 opacity-100' : '-translate-y-8 opacity-0'
              }`}
            >
              <span className="material-symbols-outlined text-secondary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                favorite
              </span>
              <span className="text-secondary font-bold text-sm">실시간 안심 케어 중</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
