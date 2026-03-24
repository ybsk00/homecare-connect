'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';

const agents = [
  {
    emoji: '\u{1F4AC}',
    title: '환자 돌봄 에이전트',
    target: '환자 \u00B7 보호자',
    features: ['음성 대화(STT/TTS)', '일정 확인', '복약 관리', '건강 상담', '컨디션 체크'],
    tools: '9개 AI 도구',
    highlight: '어르신도 쉽게 음성으로 대화',
  },
  {
    emoji: '\u{1FA7A}',
    title: '간호사 업무 에이전트',
    target: '방문간호사',
    features: ['오늘 브리핑', '환자 요약', '레드플래그 알림', '처방약 조회', '임상 가이드'],
    tools: '8개 AI 도구',
    highlight: '출근길에 음성으로 브리핑 완료',
  },
  {
    emoji: '\u{1F48A}',
    title: '복약 관리 에이전트',
    target: '전체 시스템',
    features: ['e약은요 API 연동', 'DUR 상호작용 검사', '자동 알람', '미복약 시 간호사 알림'],
    tools: '자동 연동',
    highlight: '복약 시간을 놓치면 간호사에게 자동 연락',
  },
  {
    emoji: '\u{1F4CA}',
    title: '건강 분석 에이전트',
    target: '전체 시스템',
    features: ['바이탈 분석', '레드플래그 감지', 'AI 리포트 생성', 'RAG 기반 건강 정보 (1,800+ FAQ)'],
    tools: 'RAG 시스템',
    highlight: '1,800+ 의료 FAQ에서 즉시 답변',
  },
];

export function AgentShowcase() {
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
    <section id="agents" ref={sectionRef} className="relative overflow-hidden bg-primary py-20 lg:py-28">
      {/* 배경 장식 */}
      <div className="absolute -right-32 top-1/4 h-96 w-96 rounded-full bg-white/5 blur-3xl" />
      <div className="absolute -left-20 bottom-1/4 h-64 w-64 rounded-full bg-white/5 blur-3xl" />

      <div className="relative z-10 mx-auto max-w-7xl px-6">
        {/* Header */}
        <div
          className={`mx-auto max-w-3xl text-center transition-all duration-800 ease-out ${
            visible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}
        >
          <h2 className="text-3xl font-bold tracking-tight text-white lg:text-4xl">
            4개의 AI 에이전트가 24시간 돌봅니다
          </h2>
          <p className="mt-4 text-lg text-white/70">
            홈케어커넥트만의 멀티 에이전트 시스템
          </p>
        </div>

        {/* Agent Cards */}
        <div className="mt-14 grid gap-6 md:grid-cols-2">
          {agents.map((agent, i) => (
            <div
              key={agent.title}
              className={`rounded-2xl bg-white/10 p-8 backdrop-blur transition-all duration-700 ease-out ${
                visible ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'
              }`}
              style={{ transitionDelay: visible ? `${200 + i * 150}ms` : '0ms' }}
            >
              {/* Emoji + Title */}
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[40px] leading-none">{agent.emoji}</span>
                  <h3 className="mt-3 text-xl font-bold text-white">{agent.title}</h3>
                </div>
                <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-white">
                  {agent.target}
                </span>
              </div>

              {/* Features */}
              <ul className="mt-6 space-y-2.5">
                {agent.features.map((feat) => (
                  <li key={feat} className="flex items-center gap-2.5">
                    <CheckCircle className="h-4 w-4 shrink-0 text-secondary" />
                    <span className="text-sm text-white/80">{feat}</span>
                  </li>
                ))}
              </ul>

              {/* Footer */}
              <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
                <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white">
                  {agent.tools}
                </span>
                <span className="text-xs text-white/60">{agent.highlight}</span>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div
          className={`mt-14 text-center transition-all duration-800 ease-out ${
            visible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}
          style={{ transitionDelay: visible ? '900ms' : '0ms' }}
        >
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-base font-bold text-primary shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5"
          >
            AI 에이전트 체험하기
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

export default AgentShowcase;
