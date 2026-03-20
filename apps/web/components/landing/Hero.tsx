import { ArrowRight, Heart, Droplets, Thermometer, Activity } from 'lucide-react';

function VitalCard({
  icon: Icon,
  label,
  value,
  unit,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  unit: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <p className="text-xs text-on-surface-variant">{label}</p>
        <p className="text-sm font-bold text-on-surface">
          {value}
          <span className="ml-1 text-xs font-normal text-on-surface-variant">
            {unit}
          </span>
        </p>
      </div>
    </div>
  );
}

export function Hero() {
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

      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-6 lg:grid-cols-2 lg:gap-16">
        {/* Left: Text content */}
        <div className="max-w-xl">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-secondary/10 px-4 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
            <span className="text-xs font-semibold tracking-widest text-secondary uppercase">
              Trust & Authority
            </span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl leading-tight font-bold tracking-tight text-primary lg:text-5xl lg:leading-tight">
            가족을 위한
            <br />
            가장 따뜻한 기술,
            <br />
            <span className="text-secondary">홈케어커넥트</span>
          </h1>

          {/* Subtitle */}
          <p className="mt-6 text-lg leading-relaxed text-on-surface-variant">
            AI 기반 방문간호 매칭부터 실시간 건강 모니터링까지,
            <br className="hidden sm:block" />
            더 이상 걱정하지 마세요. 전문적인 케어를 경험하세요.
          </p>

          {/* CTA buttons */}
          <div className="mt-8 flex flex-wrap gap-4">
            <a
              href="/login"
              className="btn-gradient inline-flex items-center gap-2 rounded-2xl px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-primary/20 transition-opacity hover:opacity-90"
            >
              지금 서비스 신청하기
              <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="/login"
              className="inline-flex items-center gap-2 rounded-2xl border border-secondary px-7 py-3.5 text-base font-semibold text-secondary transition-colors hover:bg-secondary/5"
            >
              AI 내담 체험하기
            </a>
          </div>

          {/* Social proof */}
          <div className="mt-10 flex items-center gap-3">
            {/* Avatars placeholder */}
            <div className="flex -space-x-2">
              {[
                'bg-primary/80',
                'bg-secondary/80',
                'bg-primary-container',
                'bg-secondary',
              ].map((bg, i) => (
                <div
                  key={i}
                  className={`flex h-8 w-8 items-center justify-center rounded-full ${bg} ring-2 ring-surface text-xs font-bold text-white`}
                >
                  {['K', 'J', 'L', 'P'][i]}
                </div>
              ))}
            </div>
            <p className="text-sm text-on-surface-variant">
              <span className="font-bold text-on-surface">2,000명 이상</span>의
              보호자가 신뢰합니다
            </p>
          </div>
        </div>

        {/* Right: Visual */}
        <div className="relative flex items-center justify-center lg:justify-end">
          {/* Main visual card */}
          <div className="relative h-[420px] w-full max-w-md overflow-hidden rounded-3xl bg-gradient-to-br from-primary/5 to-secondary/10 lg:h-[480px]">
            {/* Healthcare illustration placeholder */}
            <div className="flex h-full flex-col items-center justify-center p-8">
              <div className="flex h-28 w-28 items-center justify-center rounded-full bg-secondary/10">
                <HeartPulseIcon className="h-16 w-16 text-secondary" />
              </div>
              <p className="mt-6 text-center text-lg font-semibold text-primary">
                전문 방문간호 서비스
              </p>
              <p className="mt-2 text-center text-sm text-on-surface-variant">
                검증된 의료진이 직접 방문합니다
              </p>
            </div>
          </div>

          {/* Floating glassmorphism vitals card */}
          <div className="glass absolute -right-2 -bottom-4 w-64 rounded-2xl p-5 shadow-xl lg:right-0 lg:-bottom-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-primary">건강 지표</h3>
              <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                정상
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <VitalCard
                icon={Droplets}
                label="혈압"
                value="120/80"
                unit="mmHg"
                color="bg-primary"
              />
              <VitalCard
                icon={Thermometer}
                label="체온"
                value="36.5"
                unit="°C"
                color="bg-secondary"
              />
              <VitalCard
                icon={Activity}
                label="심박수"
                value="72"
                unit="bpm"
                color="bg-rose-500"
              />
              <VitalCard
                icon={Heart}
                label="산소포화도"
                value="98"
                unit="%"
                color="bg-blue-500"
              />
            </div>
          </div>

          {/* Floating notification card */}
          <div className="glass absolute -left-4 top-8 rounded-2xl p-4 shadow-lg lg:left-0 lg:top-12">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/10">
                <Activity className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <p className="text-xs font-semibold text-on-surface">
                  AI 매칭 완료
                </p>
                <p className="text-xs text-on-surface-variant">
                  최적의 간호사를 찾았습니다
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HeartPulseIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M19.5 12.572l-7.5 7.428l-7.5-7.428A5 5 0 1 1 12 6.006a5 5 0 1 1 7.5 6.572" />
      <path d="M5 12h2l2 3l4-6l2 3h2" />
    </svg>
  );
}
