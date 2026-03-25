'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

const stats = [
  { value: 1800, suffix: '+', label: 'AI 학습 의료 FAQ', icon: 'menu_book' },
  { value: 16, suffix: '', label: 'AI Edge Functions', icon: 'memory' },
  { value: 24, suffix: '시간', label: '에이전트 모니터링', icon: 'schedule' },
  { value: 4, suffix: '', label: '멀티 에이전트 시스템', icon: 'smart_toy' },
];

function useCountUp(target: number, duration: number, start: boolean) {
  const [count, setCount] = useState(0);

  const animate = useCallback(() => {
    if (!start) return;
    const startTime = performance.now();

    function step(currentTime: number) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    }

    requestAnimationFrame(step);
  }, [start, target, duration]);

  useEffect(() => {
    animate();
  }, [animate]);

  return count;
}

function StatItem({
  stat,
  visible,
  delay,
}: {
  stat: (typeof stats)[number];
  visible: boolean;
  delay: number;
}) {
  const count = useCountUp(stat.value, 2000, visible);

  return (
    <div
      className={`text-center transition-all duration-700 ease-out ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'
      }`}
      style={{ transitionDelay: visible ? `${delay}ms` : '0ms' }}
    >
      <span className="material-symbols-outlined mx-auto mb-4 text-4xl text-white/40">
        {stat.icon}
      </span>
      <p className="text-5xl font-black text-white font-headline">
        {visible ? count.toLocaleString() : '0'}
        {stat.suffix}
      </p>
      <p className="mt-2 text-sm text-white/70">{stat.label}</p>
    </div>
  );
}

export function Stats() {
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
      id="stats"
      ref={sectionRef}
      className="relative overflow-hidden bg-gradient-to-br from-secondary to-[#004D47] py-20 lg:py-28"
    >
      <div className="relative z-10 mx-auto max-w-7xl px-8">
        {/* Header */}
        <p
          className={`text-center text-2xl font-bold text-white/80 font-headline transition-all duration-800 ease-out ${
            visible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}
        >
          숫자로 보는 홈케어커넥트
        </p>

        {/* Stats grid */}
        <div className="mt-14 grid gap-8 md:grid-cols-4">
          {stats.map((stat, i) => (
            <StatItem key={stat.label} stat={stat} visible={visible} delay={200 + i * 150} />
          ))}
        </div>
      </div>

      {/* 배경 장식 */}
      <div className="absolute -right-32 -top-32 h-[500px] w-[500px] rounded-full bg-white/5 blur-3xl" />
      <div className="absolute -left-20 -bottom-20 h-80 w-80 rounded-full bg-white/5 blur-3xl" />
    </section>
  );
}
