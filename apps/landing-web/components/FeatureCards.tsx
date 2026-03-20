import { Brain, Activity, ShieldCheck } from 'lucide-react';

const features = [
  {
    icon: Brain,
    title: 'AI 맞춤 매칭',
    description:
      '최적의 방문간호 전문가를 AI가 직접 매칭합니다. 거리, 전문성, 리뷰를 종합 분석합니다.',
    color: 'bg-primary/10',
    iconColor: 'text-primary',
  },
  {
    icon: Activity,
    title: '실시간 모니터링',
    description:
      '바이탈 사인과 건강 데이터를 24시간 실시간으로 모니터링하고 이상 징후를 감지합니다.',
    color: 'bg-secondary/10',
    iconColor: 'text-secondary',
  },
  {
    icon: ShieldCheck,
    title: '검증된 전문가',
    description:
      '면허 인증된 간호사와 의료진만 활동합니다. 엄격한 검증 절차를 거칩니다.',
    color: 'bg-tertiary/10',
    iconColor: 'text-tertiary',
  },
];

export function FeatureCards() {
  return (
    <section id="features" className="bg-surface-container-low py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6">
        {/* Section header */}
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-primary lg:text-4xl">
            왜 홈케어커넥트인가요?
          </h2>
          <p className="mt-4 text-lg text-on-surface-variant">
            기술과 전문성이 만나 가장 안전하고 편리한 방문간호를 제공합니다.
          </p>
        </div>

        {/* Cards */}
        <div className="mt-14 grid gap-6 md:grid-cols-3 lg:gap-8">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-2xl bg-surface-container-lowest p-8 shadow-sm transition-shadow hover:shadow-md"
            >
              <div
                className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl ${feature.color}`}
              >
                <feature.icon className={`h-7 w-7 ${feature.iconColor}`} />
              </div>
              <h3 className="mt-6 text-xl font-bold text-on-surface">
                {feature.title}
              </h3>
              <p className="mt-3 leading-relaxed text-on-surface-variant">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
