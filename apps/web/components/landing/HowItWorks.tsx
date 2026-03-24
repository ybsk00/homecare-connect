'use client';

import { UserPlus, Brain, HeartHandshake } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

const steps = [
  {
    number: '01',
    icon: UserPlus,
    title: '회원가입',
    description:
      '보호자 정보와 환자의 건강 상태, 필요한 서비스를 등록하세요. 3분이면 충분합니다.',
  },
  {
    number: '02',
    icon: Brain,
    title: 'AI 매칭',
    description:
      'AI가 거리, 전문성, 리뷰, 스케줄을 종합 분석하여 최적의 방문간호 기관과 간호사를 추천합니다.',
  },
  {
    number: '03',
    icon: HeartHandshake,
    title: '케어 시작',
    description:
      '전문 간호사의 정기 방문이 시작됩니다. AI 에이전트가 복약, 건강, 일정을 24시간 돌봅니다.',
  },
];

export function HowItWorks() {
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
    <section id="how-it-works" ref={sectionRef} className="bg-surface py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6">
        {/* Section header */}
        <div
          className={`mx-auto max-w-2xl text-center transition-all duration-800 ease-out ${
            visible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}
        >
          <h2 className="text-3xl font-bold tracking-tight text-primary lg:text-4xl">
            3단계로 시작하세요
          </h2>
          <p className="mt-4 text-lg text-on-surface-variant">
            복잡한 과정 없이, 누구나 쉽게 전문 방문간호를 시작할 수 있습니다
          </p>
        </div>

        {/* Steps */}
        <div className="mt-16 grid gap-8 md:grid-cols-3 relative">
          {/* 데스크탑 점선 연결 */}
          <div className="hidden md:block absolute top-[60px] left-[calc(33.333%_-_16px)] right-[calc(33.333%_-_16px)] border-t-2 border-dashed border-primary/20 z-0" />

          {steps.map((step, i) => (
            <div
              key={step.number}
              className={`relative z-10 rounded-2xl bg-surface-container-lowest p-8 text-center transition-all duration-700 ease-out ${
                visible ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'
              }`}
              style={{ transitionDelay: visible ? `${200 + i * 150}ms` : '0ms' }}
            >
              {/* 번호 */}
              <p className="text-5xl font-black text-primary/10">
                Step {step.number}
              </p>

              {/* 아이콘 */}
              <div className="mt-4 flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary/10">
                  <step.icon className="h-8 w-8 text-secondary" />
                </div>
              </div>

              {/* 제목 */}
              <h3 className="mt-4 text-xl font-bold text-on-surface">{step.title}</h3>

              {/* 설명 */}
              <p className="mt-3 leading-relaxed text-on-surface-variant">
                {step.description}
              </p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div
          className={`mt-14 text-center transition-all duration-800 ease-out ${
            visible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}
          style={{ transitionDelay: visible ? '700ms' : '0ms' }}
        >
          <Link
            href="/register"
            className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-secondary to-[#004D47] px-8 py-4 text-lg font-bold text-white shadow-lg shadow-secondary/20 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5"
          >
            지금 시작하기
          </Link>
        </div>
      </div>
    </section>
  );
}
