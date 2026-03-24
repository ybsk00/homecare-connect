import Link from 'next/link';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* ── AI 에이전트 히어로 카드 ── */}
      <Link
        href="/patient/agent"
        className="block rounded-3xl bg-gradient-to-br from-secondary to-[#004D47] p-8 md:p-10 shadow-2xl shadow-secondary/20 min-h-[180px] relative overflow-hidden group transition-shadow hover:shadow-3xl"
      >
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 h-full">
          {/* 좌측: 텍스트 + CTA */}
          <div className="flex-1">
            <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mb-2">
              AI 돌봄 도우미
            </h2>
            <p className="text-white/80 text-sm md:text-base leading-relaxed mb-6">
              음성으로 일정 확인, 복약 관리, 건강 상담을 해보세요
            </p>
            <span className="inline-flex items-center gap-2 bg-white text-secondary font-bold text-sm px-6 py-3 rounded-xl shadow-lg group-hover:shadow-xl transition-shadow">
              지금 대화하기
              <svg className="h-4 w-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>
          </div>

          {/* 우측: 기능 칩 */}
          <div className="flex flex-row md:flex-col gap-3">
            <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm text-white text-sm font-semibold px-4 py-2.5 rounded-xl">
              <span className="text-lg">📅</span> 일정 확인
            </div>
            <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm text-white text-sm font-semibold px-4 py-2.5 rounded-xl">
              <span className="text-lg">💊</span> 복약 관리
            </div>
            <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm text-white text-sm font-semibold px-4 py-2.5 rounded-xl">
              <span className="text-lg">🏥</span> 건강 상담
            </div>
          </div>
        </div>

        {/* 배경 장식 */}
        <div className="absolute -right-16 -bottom-16 w-72 h-72 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute -left-10 -top-10 w-40 h-40 bg-white/5 rounded-full blur-2xl" />
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-on-surface">대시보드</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          환자/보호자 종합 현황을 확인하세요
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <Card elevated>
          <CardHeader>
            <CardTitle>예정된 방문</CardTitle>
          </CardHeader>
          <p className="text-3xl font-bold text-primary">-</p>
          <p className="mt-1 text-sm text-on-surface-variant">이번 주</p>
        </Card>

        <Card elevated>
          <CardHeader>
            <CardTitle>진행 중 매칭</CardTitle>
          </CardHeader>
          <p className="text-3xl font-bold text-secondary">-</p>
          <p className="mt-1 text-sm text-on-surface-variant">현재</p>
        </Card>

        <Card elevated>
          <CardHeader>
            <CardTitle>치료 기록</CardTitle>
          </CardHeader>
          <p className="text-3xl font-bold text-on-surface">-</p>
          <p className="mt-1 text-sm text-on-surface-variant">최근 30일</p>
        </Card>

        <Card elevated>
          <CardHeader>
            <CardTitle>AI 리포트</CardTitle>
          </CardHeader>
          <p className="text-3xl font-bold text-tertiary">-</p>
          <p className="mt-1 text-sm text-on-surface-variant">미확인</p>
        </Card>
      </div>
    </div>
  );
}
