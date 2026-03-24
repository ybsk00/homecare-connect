'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

const oldWay = [
  {
    title: '전화로 직접 기관 탐색',
    desc: '수십 곳에 전화해야 하고, 정보가 부족합니다',
  },
  {
    title: '간호사 역량 확인 불가',
    desc: '면허, 경력, 전문성을 확인할 방법이 없습니다',
  },
  {
    title: '종이 기록, 정보 단절',
    desc: '방문 기록이 공유되지 않아 연속성이 떨어집니다',
  },
  {
    title: '보호자 불안, 확인 불가',
    desc: '방문 중 어떤 케어가 이루어지는지 알 수 없습니다',
  },
  {
    title: '이상징후 놓침',
    desc: '위험 신호를 사후에야 발견합니다',
  },
];

const newWay = [
  {
    title: 'AI가 최적 기관 자동 매칭',
    desc: '거리, 전문성, 리뷰를 종합 분석해 최적의 기관을 추천합니다',
  },
  {
    title: '면허/경력/리뷰 투명 공개',
    desc: '검증된 전문가의 모든 정보를 한눈에 확인할 수 있습니다',
  },
  {
    title: '실시간 바이탈 모니터링',
    desc: '방문 기록과 바이탈 데이터가 실시간으로 공유됩니다',
  },
  {
    title: 'AI 에이전트가 24시간 케어',
    desc: '음성 대화, 복약 관리, 건강 상담을 AI가 돌봅니다',
  },
  {
    title: 'AI 자동 이상징후 감지',
    desc: '바이탈 분석으로 위험 신호를 즉시 감지하고 알립니다',
  },
];

export function PlatformValue() {
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
    <section id="platform" ref={sectionRef} className="bg-surface-container-low py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6">
        {/* Header */}
        <div
          className={`mx-auto max-w-2xl text-center transition-all duration-800 ease-out ${
            visible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}
        >
          <h2 className="text-3xl font-bold tracking-tight text-primary lg:text-4xl">
            기존 방식의 한계를 넘어서
          </h2>
          <p className="mt-4 text-lg text-on-surface-variant">
            홈케어커넥트가 방문요양의 모든 과정을 혁신합니다
          </p>
        </div>

        {/* Comparison Grid */}
        <div className="mt-14 grid gap-8 lg:grid-cols-2">
          {/* 기존 방식 */}
          <div
            className={`transition-all duration-800 ease-out ${
              visible ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'
            }`}
            style={{ transitionDelay: visible ? '200ms' : '0ms' }}
          >
            <div className="mb-4">
              <span className="inline-block rounded-full bg-error/10 px-4 py-1.5 text-sm font-semibold text-error">
                기존 방식
              </span>
            </div>
            <div className="space-y-3">
              {oldWay.map((item, i) => (
                <div
                  key={item.title}
                  className={`flex items-start gap-3 rounded-xl bg-surface-container-lowest p-4 shadow-sm transition-all duration-700 ease-out ${
                    visible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
                  }`}
                  style={{ transitionDelay: visible ? `${300 + i * 100}ms` : '0ms' }}
                >
                  <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-error" />
                  <div>
                    <p className="font-semibold text-on-surface">{item.title}</p>
                    <p className="mt-0.5 text-sm text-on-surface-variant">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 홈케어커넥트 */}
          <div
            className={`transition-all duration-800 ease-out ${
              visible ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'
            }`}
            style={{ transitionDelay: visible ? '400ms' : '0ms' }}
          >
            <div className="mb-4">
              <span className="inline-block rounded-full bg-secondary/10 px-4 py-1.5 text-sm font-semibold text-secondary">
                홈케어커넥트
              </span>
            </div>
            <div className="space-y-3">
              {newWay.map((item, i) => (
                <div
                  key={item.title}
                  className={`flex items-start gap-3 rounded-xl bg-surface-container-lowest p-4 shadow-sm transition-all duration-700 ease-out ${
                    visible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
                  }`}
                  style={{ transitionDelay: visible ? `${500 + i * 100}ms` : '0ms' }}
                >
                  <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-secondary" />
                  <div>
                    <p className="font-semibold text-on-surface">{item.title}</p>
                    <p className="mt-0.5 text-sm text-on-surface-variant">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default PlatformValue;
