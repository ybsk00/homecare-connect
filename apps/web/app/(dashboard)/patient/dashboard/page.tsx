import { Card, CardHeader, CardTitle } from '@/components/ui/Card';

export default function DashboardPage() {
  return (
    <div className="space-y-8">
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
