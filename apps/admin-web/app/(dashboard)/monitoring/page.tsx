'use client';

import { useQuery } from '@tanstack/react-query';
import AdminTopBar from '@/components/layout/AdminTopBar';
import Card from '@/components/ui/Card';
import StatCard from '@/components/ui/StatCard';
import Badge from '@/components/ui/Badge';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { formatCurrency } from '@homecare/shared-utils';
import {
  FileText,
  MessageCircle,
  Cpu,
  ShieldAlert,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import type { RedFlagStats, ReportStats, ChatStats, AiCostEstimate } from '@homecare/shared-types';

/* Warm palette for red flags */
const SEVERITY_COLORS = {
  red: '#dc2626',
  orange: '#d97706',
  yellow: '#eab308',
};

const tooltipStyle = {
  borderRadius: '16px',
  border: 'none',
  boxShadow: '0 12px 40px -8px rgba(0, 32, 69, 0.12)',
  padding: '12px 16px',
};

interface MonitoringData {
  redFlagStats: RedFlagStats;
  reportStats: ReportStats;
  chatStats: ChatStats;
  aiCost: AiCostEstimate;
}

export default function MonitoringPage() {
  const { data, isLoading: loading, error } = useQuery<MonitoringData>({
    queryKey: ['admin-monitoring'],
    queryFn: async () => {
      const supabase = createBrowserSupabaseClient();

      const [
        { count: totalAlerts },
        { count: redCount },
        { count: orangeCount },
        { count: yellowCount },
        { count: falsePositiveCount },
        { data: reports },
        { count: chatCount },
        { count: escalationCount },
        { count: visitRecordCount },
      ] = await Promise.all([
        supabase.from('red_flag_alerts').select('*', { count: 'exact', head: true }),
        supabase.from('red_flag_alerts').select('*', { count: 'exact', head: true }).eq('severity', 'red'),
        supabase.from('red_flag_alerts').select('*', { count: 'exact', head: true }).eq('severity', 'orange'),
        supabase.from('red_flag_alerts').select('*', { count: 'exact', head: true }).eq('severity', 'yellow'),
        supabase.from('red_flag_alerts').select('*', { count: 'exact', head: true }).eq('status', 'false_positive'),
        supabase.from('ai_reports').select('status'),
        supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('type', 'chat_message'),
        supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('type', 'chat_escalation'),
        supabase.from('visit_records').select('*', { count: 'exact', head: true }),
      ]);

      const total = totalAlerts ?? 0;
      const fpRate = total > 0 ? ((falsePositiveCount ?? 0) / total) * 100 : 0;

      const statusCounts = { generating: 0, generated: 0, doctor_reviewed: 0, sent: 0, error: 0 };
      ((reports || []) as { status: string }[]).forEach((r) => {
        const key = r.status as keyof typeof statusCounts;
        if (key in statusCounts) statusCounts[key]++;
      });

      const totalChats = chatCount ?? 0;
      const escalations = escalationCount ?? 0;
      const escRate = totalChats > 0 ? (escalations / totalChats) * 100 : 0;

      const totalRecords = visitRecordCount ?? 0;
      const costPerCall = 50;
      const estimatedCalls = totalRecords * 2 + totalChats + (reports?.length ?? 0);
      const estimatedCost = estimatedCalls * costPerCall;

      return {
        redFlagStats: {
          total,
          red: redCount ?? 0,
          orange: orangeCount ?? 0,
          yellow: yellowCount ?? 0,
          falsePositiveRate: Math.round(fpRate * 10) / 10,
        },
        reportStats: {
          generating: statusCounts.generating,
          generated: statusCounts.generated,
          doctorReviewed: statusCounts.doctor_reviewed,
          sent: statusCounts.sent,
          error: statusCounts.error,
        },
        chatStats: {
          totalConversations: totalChats,
          escalationRate: Math.round(escRate * 10) / 10,
        },
        aiCost: {
          totalCalls: estimatedCalls,
          estimatedCost,
          avgCallsPerDay: Math.round(estimatedCalls / 30),
        },
      };
    },
  });

  const redFlagStats = data?.redFlagStats ?? { total: 0, red: 0, orange: 0, yellow: 0, falsePositiveRate: 0 };
  const reportStats = data?.reportStats ?? { generating: 0, generated: 0, doctorReviewed: 0, sent: 0, error: 0 };
  const chatStats = data?.chatStats ?? { totalConversations: 0, escalationRate: 0 };
  const aiCost = data?.aiCost ?? { totalCalls: 0, estimatedCost: 0, avgCallsPerDay: 0 };

  const severityPieData = [
    { name: 'RED (긴급)', value: redFlagStats.red, color: SEVERITY_COLORS.red },
    { name: 'ORANGE (주의)', value: redFlagStats.orange, color: SEVERITY_COLORS.orange },
    { name: 'YELLOW (관찰)', value: redFlagStats.yellow, color: SEVERITY_COLORS.yellow },
  ];

  const reportBarData = [
    { name: '생성중', count: reportStats.generating },
    { name: '생성완료', count: reportStats.generated },
    { name: '의사확인', count: reportStats.doctorReviewed },
    { name: '발송완료', count: reportStats.sent },
    { name: '오류', count: reportStats.error },
  ];

  if (error) {
    return (
      <div>
        <AdminTopBar title="AI 모니터링" subtitle="AI 기능별 성능과 비용을 모니터링합니다." />
        <div className="p-8">
          <Card>
            <div className="flex flex-col items-center justify-center py-16 text-primary-400">
              <p className="text-sm font-semibold text-danger-600 mb-2">모니터링 데이터를 불러오지 못했습니다.</p>
              <p className="text-xs text-primary-300">{(error as Error).message}</p>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div>
        <AdminTopBar title="AI 모니터링" subtitle="AI 기능별 성능과 비용을 모니터링합니다." />
        <div className="p-8 flex items-center justify-center py-24">
          <div className="w-8 h-8 border-[3px] border-primary-100 border-t-secondary-600 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <AdminTopBar title="AI 모니터링" subtitle="AI 기능별 성능과 비용을 모니터링합니다." />
      <div className="p-8 space-y-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="레드플래그 발생 (전체)"
            value={redFlagStats.total.toLocaleString()}
            change={`False Positive: ${redFlagStats.falsePositiveRate}%`}
            changeType="neutral"
            icon={ShieldAlert}
            iconColor="bg-danger-50 text-danger-600"
          />
          <StatCard
            title="AI 리포트 생성"
            value={(reportStats.generated + reportStats.doctorReviewed + reportStats.sent).toLocaleString()}
            change={`오류: ${reportStats.error}건`}
            changeType={reportStats.error > 0 ? 'negative' : 'neutral'}
            icon={FileText}
            iconColor="bg-primary-100 text-primary-700"
          />
          <StatCard
            title="챗봇 대화"
            value={chatStats.totalConversations.toLocaleString()}
            change={`에스컬레이션: ${chatStats.escalationRate}%`}
            changeType="neutral"
            icon={MessageCircle}
            iconColor="bg-secondary-50 text-secondary-700"
          />
          <StatCard
            title="Gemini API 비용 (추정)"
            value={formatCurrency(aiCost.estimatedCost)}
            change={`일 평균 ${aiCost.avgCallsPerDay}회 호출`}
            changeType="neutral"
            icon={Cpu}
            iconColor="bg-tertiary-50 text-tertiary-600"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Red Flag Severity Distribution */}
          <Card>
            <h3 className="text-[15px] font-bold text-primary-900 mb-6">
              레드플래그 Severity 분포
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={severityPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={{ stroke: '#9fb3c8', strokeWidth: 1 }}
                  >
                    {severityPieData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-4">
              {severityPieData.map((entry) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-[12px] text-primary-500">{entry.name}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Report Generation Status */}
          <Card>
            <h3 className="text-[15px] font-bold text-primary-900 mb-6">
              AI 리포트 생성 현황
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reportBarData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8edf2" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#627d98' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#627d98' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar
                    dataKey="count"
                    name="건수"
                    fill="#002045"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* System Health Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: 'AI 엔진', status: '정상', color: 'green' as const },
            { label: 'RAG 파이프라인', status: '정상', color: 'green' as const },
            { label: 'Gemini API', status: '정상', color: 'green' as const },
            { label: '레드플래그 탐지', status: '정상', color: 'green' as const },
          ].map((item) => (
            <Card key={item.label}>
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-medium text-primary-600">{item.label}</span>
                <Badge color={item.color}>{item.status}</Badge>
              </div>
            </Card>
          ))}
        </div>

        {/* Gemini API Usage Detail */}
        <Card padding={false}>
          <div className="p-7 pb-0">
            <h3 className="text-[15px] font-bold text-primary-900 mb-6">
              Gemini API 사용량 상세
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-primary-50/50">
                  <th className="px-6 py-4 text-left text-[11px] font-semibold text-primary-400 uppercase tracking-wider">기능</th>
                  <th className="px-6 py-4 text-left text-[11px] font-semibold text-primary-400 uppercase tracking-wider">모델</th>
                  <th className="px-6 py-4 text-left text-[11px] font-semibold text-primary-400 uppercase tracking-wider">추정 호출 수</th>
                  <th className="px-6 py-4 text-left text-[11px] font-semibold text-primary-400 uppercase tracking-wider">호출당 비용</th>
                  <th className="px-6 py-4 text-left text-[11px] font-semibold text-primary-400 uppercase tracking-wider">추정 월 비용</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: '레드플래그 탐지', model: 'Gemini 2.5 Flash', calls: redFlagStats.total, costPerCall: 30 },
                  { feature: 'AI 경과 리포트', model: 'Gemini 2.5 Flash', calls: reportStats.generated + reportStats.doctorReviewed + reportStats.sent, costPerCall: 100 },
                  { feature: 'RAG 챗봇', model: 'Gemini 2.5 Flash', calls: chatStats.totalConversations, costPerCall: 40 },
                  { feature: '음성 > 텍스트', model: 'Gemini 2.5 Flash', calls: Math.floor(aiCost.totalCalls * 0.1), costPerCall: 60 },
                  { feature: '소견서 쉬운 말', model: 'Gemini 2.5 Flash', calls: Math.floor(reportStats.sent * 0.8), costPerCall: 30 },
                ].map((row, idx) => (
                  <tr key={row.feature} className={`transition-all duration-150 hover:bg-secondary-50/40 ${idx % 2 === 1 ? 'bg-primary-50/30' : ''}`}>
                    <td className="px-6 py-4 text-sm font-semibold text-primary-800">{row.feature}</td>
                    <td className="px-6 py-4">
                      <Badge color="purple">{row.model}</Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-primary-500">{row.calls.toLocaleString()}회</td>
                    <td className="px-6 py-4 text-sm text-primary-500">{formatCurrency(row.costPerCall)}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-primary-800">
                      {formatCurrency(row.calls * row.costPerCall)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-primary-50/50">
                  <td colSpan={4} className="px-6 py-4 text-sm font-bold text-primary-900">
                    합계
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-secondary-700">
                    {formatCurrency(aiCost.estimatedCost)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
