'use client';

import { useEffect, useRef, useState } from 'react';

const features = [
  {
    icon: 'psychology',
    title: 'AI 맞춤 매칭',
    description:
      '증상과 환경에 최적화된 전문 간호사를 빅데이터 기반으로 선별하여 매칭합니다.',
    color: 'bg-primary/5',
    iconColor: 'text-primary',
  },
  {
    icon: 'monitor_heart',
    title: '실시간 모니터링',
    description:
      '24시간 건강 데이터를 분석하여 이상 징후 발생 시 보호자와 의료진에게 즉시 알립니다.',
    color: 'bg-secondary/5',
    iconColor: 'text-secondary',
  },
  {
    icon: 'verified',
    title: '검증된 전문가',
    description:
      '엄격한 신원 확인과 전문 교육 과정을 거친 국가 공인 면허 소지자만이 활동합니다.',
    color: 'bg-tertiary/5',
    iconColor: 'text-tertiary',
  },
];

const chatFeatures = [
  { icon: 'mic', label: '음성으로 대화하세요', desc: 'STT/TTS 지원으로 편하게 말로 소통' },
  { icon: 'notifications_active', label: '복약 시간을 관리해드려요', desc: '자동 알림과 미복약 시 간호사 연계' },
  { icon: 'warning', label: '건강 이상을 감지해요', desc: '바이탈 분석 기반 레드플래그 자동 알림' },
  { icon: 'menu_book', label: '맞춤 건강 정보 제공', desc: 'RAG 기반 1,800+ FAQ에서 즉시 답변' },
];

export function FeatureCards() {
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
      { threshold: 0.2 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="features" ref={sectionRef} className="bg-surface-container-low py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-8">
        {/* Section header */}
        <div
          className={`mx-auto max-w-2xl text-center transition-all duration-800 ease-out ${
            visible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}
        >
          <h2 className="text-3xl font-extrabold tracking-tight text-primary lg:text-4xl font-headline">
            왜 홈케어커넥트인가요?
          </h2>
          <p className="mt-4 text-lg text-on-surface-variant font-body">
            기술과 전문성이 만나 가장 안전하고 편리한 방문간호를 제공합니다.
          </p>
        </div>

        {/* AI Agent Hero Section */}
        <div
          className={`mt-14 rounded-lg bg-gradient-to-br from-secondary to-[#004D47] p-8 md:p-12 shadow-2xl shadow-secondary/20 relative overflow-hidden transition-all duration-800 ease-out ${
            visible ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'
          }`}
          style={{ transitionDelay: visible ? '200ms' : '0ms' }}
        >
          <div className="relative z-10 flex flex-col lg:flex-row gap-10 lg:gap-16">
            {/* 좌측: 채팅 UI 미리보기 */}
            <div className="flex-1 max-w-md">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 space-y-4">
                {/* AI 말풍선 */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-white text-base">psychology</span>
                  </div>
                  <div className="bg-white/15 rounded-lg rounded-tl-sm px-4 py-3 text-white text-sm leading-relaxed">
                    안녕하세요! 오늘 오후 2시에 방문 간호 일정이 있어요. 약 복용은 잘 하고 계신가요?
                  </div>
                </div>
                {/* 사용자 말풍선 */}
                <div className="flex items-start gap-3 justify-end">
                  <div className="bg-white rounded-lg rounded-tr-sm px-4 py-3 text-secondary text-sm font-medium leading-relaxed">
                    아침 약은 먹었는데 점심 약을 깜빡했어요
                  </div>
                </div>
                {/* AI 답변 말풍선 */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-white text-base">psychology</span>
                  </div>
                  <div className="bg-white/15 rounded-lg rounded-tl-sm px-4 py-3 text-white text-sm leading-relaxed">
                    지금이라도 점심 약을 드시는 게 좋겠어요. 저녁 약과 2시간 이상 간격을 두세요. 알림을 설정해 드릴까요?
                  </div>
                </div>
              </div>
            </div>

            {/* 우측: 기능 설명 리스트 */}
            <div className="flex-1 flex flex-col justify-center">
              <h3 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mb-2 font-headline">
                AI 에이전트와 대화하세요
              </h3>
              <p className="text-white/70 text-sm mb-8 font-body">
                홈케어커넥트의 AI가 24시간 건강을 돌봅니다
              </p>
              <div className="space-y-5">
                {chatFeatures.map(({ icon, label, desc }) => (
                  <div key={label} className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-white text-xl">{icon}</span>
                    </div>
                    <div>
                      <p className="text-white font-bold text-sm">{label}</p>
                      <p className="text-white/60 text-xs mt-0.5">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 배경 장식 */}
          <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute -left-10 -top-10 w-48 h-48 bg-white/5 rounded-full blur-2xl" />
        </div>

        {/* Cards */}
        <div className="mt-10 grid gap-6 md:grid-cols-3 lg:gap-8">
          {features.map((feature, i) => (
            <div
              key={feature.title}
              className={`group rounded-lg bg-surface-container-lowest p-8 premium-shadow transition-all duration-700 ease-out hover:shadow-lg hover:-translate-y-1 ${
                visible ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'
              }`}
              style={{ transitionDelay: visible ? `${300 + i * 150}ms` : '0ms' }}
            >
              <div
                className={`inline-flex h-12 w-12 items-center justify-center rounded-lg ${feature.color} transition-transform duration-300 group-hover:scale-110`}
              >
                <span className={`material-symbols-outlined text-3xl ${feature.iconColor}`}>
                  {feature.icon}
                </span>
              </div>
              <h3 className="mt-6 text-xl font-bold text-primary font-headline">
                {feature.title}
              </h3>
              <p className="mt-3 leading-relaxed text-on-surface-variant font-body">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
