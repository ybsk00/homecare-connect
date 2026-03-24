'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Card from '@/components/admin/ui/Card';
import StatCard from '@/components/admin/ui/StatCard';
import Badge from '@/components/admin/ui/Badge';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { formatCurrency, formatDateTime } from '@homecare/shared-utils';
import { clsx } from 'clsx';
import {
  FileText,
  MessageCircle,
  Cpu,
  ShieldAlert,
  Bot,
  Search,
  Target,
  Activity,
  Zap,
  Database,
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
  LineChart,
  Line,
  AreaChart,
  Area,
} from 'recharts';
import type { BadgeColor, RedFlagStats, ReportStats, ChatStats, AiCostEstimate } from '@homecare/shared-types';

/* Warm palette for red flags */
const SEVERITY_COLORS = {
  red: '#dc2626',
  orange: '#d97706',
  yellow: '#eab308',
};

const AGENT_COLORS = {
  patient_agent: '#006A63',
  nurse_agent: '#002045',
};

const tooltipStyle = {
  borderRadius: '16px',
  border: 'none',
  boxShadow: '0 12px 40px -8px rgba(0, 32, 69, 0.12)',
  padding: '12px 16px',
};

interface SystemHealth {
  label: string;
  status: string;
  color: 'green' | 'yellow' | 'red' | 'gray';
}

interface AgentConversation {
  id: string;
  user_id: string;
  agent_type: string;
  role: string;
  content: string;
  input_method: string;
  function_calls: unknown[] | null;
  created_at: string;
}

interface DailyConversationData {
  date: string;
  patient_agent: number;
  nurse_agent: number;
  total: number;
}

interface MonitoringData {
  redFlagStats: RedFlagStats;
  reportStats: ReportStats;
  chatStats: ChatStats;
  aiCost: AiCostEstimate;
  systemHealth: SystemHealth[];
  falseNegativeRate: number;
  reportSuccessRate: number;
  resolvedCount: number;
  totalReports: number;
  // 에이전트 통계
  agentConversations: AgentConversation[];
  dailyConversations: DailyConversationData[];
  totalAgentConversations: number;
  patientAgentCount: number;
  nurseAgentCount: number;
  functionCallCount: number;
  // 매칭 통계
  matchingSuccessRate: number;
  matchingTotal: number;
  matchingMatched: number;
  // RAG 통계
  ragDocCount: number;
  ragPatientDiseases: number;
  ragPatientEmergency: number;
  ragNurseClinical: number;
  ragNurseAssessment: number;
}

export default function MonitoringPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'agent' | 'matching' | 'rag'>('overview');

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
      const fpCount = falsePositiveCount ?? 0;
      const fpRate = total > 0 ? (fpCount / total) * 100 : 0;
      const resolvedCount = total - fpCount;
      const fnRate = total > 0 ? Math.max(0, Math.round((1 - (resolvedCount + fpCount) / Math.max(total, 1)) * 1000) / 10) : 0;

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

      // 에이전트 대화 데이터 조회
      let agentConversations: AgentConversation[] = [];
      let totalAgentConversations = 0;
      let patientAgentCount = 0;
      let nurseAgentCount = 0;
      let functionCallCount = 0;
      let dailyConversations: DailyConversationData[] = [];

      try {
        const { data: agentData, count: agentCount } = await supabase
          .from('agent_conversations')
          .select('*', { count: 'exact' })
          .eq('role', 'user')
          .order('created_at', { ascending: false })
          .limit(50);

        agentConversations = (agentData as unknown as AgentConversation[]) || [];
        totalAgentConversations = agentCount ?? 0;

        const { count: patientCount } = await supabase
          .from('agent_conversations')
          .select('*', { count: 'exact', head: true })
          .eq('agent_type', 'patient_agent')
          .eq('role', 'user');
        patientAgentCount = patientCount ?? 0;

        const { count: nurseCount } = await supabase
          .from('agent_conversations')
          .select('*', { count: 'exact', head: true })
          .eq('agent_type', 'nurse_agent')
          .eq('role', 'user');
        nurseAgentCount = nurseCount ?? 0;

        // Function call 횟수 (function_calls가 null이 아닌 대화)
        const { count: fcCount } = await supabase
          .from('agent_conversations')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'assistant')
          .not('function_calls', 'is', null);
        functionCallCount = fcCount ?? 0;

        // 일별 대화 수 (최근 14일)
        const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
        const { data: dailyData } = await supabase
          .from('agent_conversations')
          .select('agent_type, created_at')
          .eq('role', 'user')
          .gte('created_at', fourteenDaysAgo);

        const dailyMap = new Map<string, { patient_agent: number; nurse_agent: number }>();
        const now = new Date();
        for (let i = 13; i >= 0; i--) {
          const d = new Date(now);
          d.setDate(d.getDate() - i);
          const key = d.toISOString().split('T')[0];
          dailyMap.set(key, { patient_agent: 0, nurse_agent: 0 });
        }

        ((dailyData || []) as { agent_type: string; created_at: string }[]).forEach((c) => {
          const key = new Date(c.created_at).toISOString().split('T')[0];
          const entry = dailyMap.get(key);
          if (entry) {
            if (c.agent_type === 'patient_agent') entry.patient_agent++;
            else if (c.agent_type === 'nurse_agent') entry.nurse_agent++;
          }
        });

        dailyConversations = Array.from(dailyMap.entries()).map(([date, counts]) => ({
          date: `${new Date(date).getMonth() + 1}/${new Date(date).getDate()}`,
          patient_agent: counts.patient_agent,
          nurse_agent: counts.nurse_agent,
          total: counts.patient_agent + counts.nurse_agent,
        }));
      } catch {
        // agent_conversations 테이블이 없거나 접근 불가 시 빈 데이터
        const now = new Date();
        dailyConversations = Array.from({ length: 14 }, (_, i) => {
          const d = new Date(now);
          d.setDate(d.getDate() - (13 - i));
          return {
            date: `${d.getMonth() + 1}/${d.getDate()}`,
            patient_agent: 0,
            nurse_agent: 0,
            total: 0,
          };
        });
      }

      // 매칭 성공률
      let matchingTotal = 0;
      let matchingMatched = 0;
      try {
        const { count: srTotal } = await supabase
          .from('service_requests')
          .select('*', { count: 'exact', head: true });
        const { count: srMatched } = await supabase
          .from('service_requests')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'service_started' as never);
        const { count: srCompleted } = await supabase
          .from('service_requests')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'org_accepted' as never);
        matchingTotal = srTotal ?? 0;
        matchingMatched = (srMatched ?? 0) + (srCompleted ?? 0);
      } catch {
        // 테이블 접근 불가
      }
      const matchingSuccessRate = matchingTotal > 0 ? Math.round((matchingMatched / matchingTotal) * 1000) / 10 : 0;

      // RAG 문서 통계
      let ragDocCount = 0;
      let ragPatientDiseases = 0;
      let ragPatientEmergency = 0;
      let ragNurseClinical = 0;
      let ragNurseAssessment = 0;

      try {
        const [
          { count: docCount },
          { count: pdCount },
          { count: peCount },
          { count: ncCount },
          { count: naCount },
        ] = await Promise.all([
          supabase.from('rag_documents').select('*', { count: 'exact', head: true }).eq('is_active', true),
          supabase.from('patient_agent_rag_diseases').select('*', { count: 'exact', head: true }),
          supabase.from('patient_agent_rag_emergency').select('*', { count: 'exact', head: true }),
          supabase.from('nurse_agent_rag_clinical').select('*', { count: 'exact', head: true }),
          supabase.from('nurse_agent_rag_assessment').select('*', { count: 'exact', head: true }),
        ]);
        ragDocCount = docCount ?? 0;
        ragPatientDiseases = pdCount ?? 0;
        ragPatientEmergency = peCount ?? 0;
        ragNurseClinical = ncCount ?? 0;
        ragNurseAssessment = naCount ?? 0;
      } catch {
        // 테이블 접근 불가
      }

      // 시스템 헬스체크
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      let recentAlerts = 0;
      try {
        const { count } = await supabase.from('red_flag_alerts').select('*', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo);
        recentAlerts = count ?? 0;
      } catch { /* */ }

      const reportErrors = statusCounts.error;

      const systemHealth: SystemHealth[] = [
        {
          label: 'AI 엔진',
          status: total > 0 ? (reportErrors > 0 ? '일부 오류' : '정상') : '대기',
          color: total > 0 ? (reportErrors > 0 ? 'yellow' : 'green') : 'gray',
        },
        {
          label: 'RAG 파이프라인',
          status: ragDocCount > 0 ? '정상' : '문서 없음',
          color: ragDocCount > 0 ? 'green' : 'yellow',
        },
        {
          label: 'Gemini API',
          status: estimatedCalls > 0 ? (reportErrors > 0 ? '일부 오류' : '정상') : '대기',
          color: estimatedCalls > 0 ? (reportErrors > 0 ? 'yellow' : 'green') : 'gray',
        },
        {
          label: '레드플래그 탐지',
          status: totalRecords > 0 ? '정상' : '대기',
          color: totalRecords > 0 ? 'green' : 'gray',
        },
      ];

      const totalReports = reports?.length ?? 0;
      const successReports = statusCounts.generated + statusCounts.doctor_reviewed + statusCounts.sent;
      const reportSuccessRate = totalReports > 0 ? Math.round((successReports / totalReports) * 1000) / 10 : 0;

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
        systemHealth,
        falseNegativeRate: fnRate,
        reportSuccessRate,
        resolvedCount,
        totalReports,
        agentConversations,
        dailyConversations,
        totalAgentConversations,
        patientAgentCount,
        nurseAgentCount,
        functionCallCount,
        matchingSuccessRate,
        matchingTotal,
        matchingMatched,
        ragDocCount,
        ragPatientDiseases,
        ragPatientEmergency,
        ragNurseClinical,
        ragNurseAssessment,
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

  const agentTypePieData = [
    { name: '환자 에이전트', value: data?.patientAgentCount ?? 0, color: AGENT_COLORS.patient_agent },
    { name: '간호사 에이전트', value: data?.nurseAgentCount ?? 0, color: AGENT_COLORS.nurse_agent },
  ];

  const ragTableData = [
    { name: '일반 RAG (rag_documents)', count: data?.ragDocCount ?? 0, category: '기본' },
    { name: '환자 질환 가이드', count: data?.ragPatientDiseases ?? 0, category: '환자 에이전트' },
    { name: '환자 응급 가이드', count: data?.ragPatientEmergency ?? 0, category: '환자 에이전트' },
    { name: '간호사 임상 가이드', count: data?.ragNurseClinical ?? 0, category: '간호사 에이전트' },
    { name: '간호사 평가 가이드', count: data?.ragNurseAssessment ?? 0, category: '간호사 에이전트' },
  ];

  const totalRagDocs = ragTableData.reduce((s, r) => s + r.count, 0);

  const tabItems = [
    { key: 'overview' as const, label: '종합 현황' },
    { key: 'agent' as const, label: '에이전트 모니터링' },
    { key: 'matching' as const, label: '매칭 성과' },
    { key: 'rag' as const, label: 'RAG 품질' },
  ];

  if (error) {
    return (
      <div>
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
        <div className="p-8 flex items-center justify-center py-24">
          <div className="w-8 h-8 border-[3px] border-primary-100 border-t-secondary-600 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="p-8 space-y-8">
        {/* Header */}
        <div>
          <h2 className="text-xl font-bold text-primary-900">AI 모니터링</h2>
          <p className="text-[13px] text-primary-400 mt-1">
            AI 에이전트, 매칭 엔진, RAG 파이프라인의 운영 상태를 모니터링합니다.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2">
          {tabItems.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={clsx(
                'px-5 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200',
                activeTab === tab.key
                  ? 'gradient-button text-white shadow-sm'
                  : 'bg-primary-50/60 text-primary-400 hover:text-primary-600 hover:bg-primary-100/60'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* System Health Indicators (always visible) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {(data?.systemHealth ?? []).map((item) => (
            <Card key={item.label}>
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-medium text-primary-600">{item.label}</span>
                <Badge color={item.color}>{item.status}</Badge>
              </div>
            </Card>
          ))}
        </div>

        {/* ===== OVERVIEW TAB ===== */}
        {activeTab === 'overview' && (
          <>
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
                title="에이전트 대화"
                value={(data?.totalAgentConversations ?? 0).toLocaleString()}
                change={`도구 호출: ${(data?.functionCallCount ?? 0).toLocaleString()}회`}
                changeType="neutral"
                icon={Bot}
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
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
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
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#627d98' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#627d98' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="count" name="건수" fill="#002045" radius={[6, 6, 0, 0]} maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>

            {/* False Positive / Negative + Report Success Rate */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card>
                <h3 className="text-[15px] font-bold text-primary-900 mb-4">
                  False Positive / Negative 비율
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-danger-50/60 rounded-xl">
                    <span className="text-sm text-primary-600">False Positive 비율</span>
                    <span className="text-lg font-bold text-danger-600">{redFlagStats.falsePositiveRate}%</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-tertiary-50/60 rounded-xl">
                    <span className="text-sm text-primary-600">False Negative 비율 (추정)</span>
                    <span className="text-lg font-bold text-tertiary-600">{data?.falseNegativeRate ?? 0}%</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-primary-50/60 rounded-xl">
                    <span className="text-sm text-primary-600">확인 처리 건</span>
                    <span className="text-lg font-bold text-primary-700">
                      {data?.resolvedCount ?? 0}건 / {redFlagStats.total}건
                    </span>
                  </div>
                  <p className="text-[11px] text-primary-300">
                    * resolved_as 필드가 구현되면 정확한 FP/FN 비율이 계산됩니다.
                  </p>
                </div>
              </Card>

              <Card>
                <h3 className="text-[15px] font-bold text-primary-900 mb-4">
                  AI 리포트 성공률
                </h3>
                <div className="flex flex-col items-center justify-center py-6">
                  <div className="relative w-32 h-32">
                    <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                      <path
                        className="text-primary-100"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none" stroke="currentColor" strokeWidth="3"
                      />
                      <path
                        className="text-secondary-600"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none" stroke="currentColor" strokeWidth="3"
                        strokeDasharray={`${data?.reportSuccessRate ?? 0}, 100`}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-bold text-primary-900">{data?.reportSuccessRate ?? 0}%</span>
                    </div>
                  </div>
                  <p className="text-sm text-primary-500 mt-4">
                    성공 {(reportStats.generated + reportStats.doctorReviewed + reportStats.sent).toLocaleString()} / 전체 {data?.totalReports ?? 0}
                  </p>
                  {reportStats.error > 0 && (
                    <p className="text-[12px] text-danger-500 mt-1">오류 {reportStats.error}건 발생</p>
                  )}
                </div>
              </Card>

              <Card>
                <h3 className="text-[15px] font-bold text-primary-900 mb-4">
                  매칭 성공률
                </h3>
                <div className="flex flex-col items-center justify-center py-6">
                  <div className="relative w-32 h-32">
                    <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                      <path
                        className="text-primary-100"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none" stroke="currentColor" strokeWidth="3"
                      />
                      <path
                        className="text-success-500"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none" stroke="currentColor" strokeWidth="3"
                        strokeDasharray={`${data?.matchingSuccessRate ?? 0}, 100`}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-bold text-primary-900">{data?.matchingSuccessRate ?? 0}%</span>
                    </div>
                  </div>
                  <p className="text-sm text-primary-500 mt-4">
                    매칭 {data?.matchingMatched ?? 0} / 요청 {data?.matchingTotal ?? 0}
                  </p>
                </div>
              </Card>
            </div>

            {/* Gemini API Usage Detail */}
            <Card padding={false}>
              <div className="p-7 pb-0">
                <h3 className="text-[15px] font-bold text-primary-900 mb-6">Gemini API 사용량 상세</h3>
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
                      { feature: '환자 에이전트', model: 'Gemini 2.5 Flash', calls: data?.patientAgentCount ?? 0, costPerCall: 50 },
                      { feature: '간호사 에이전트', model: 'Gemini 2.5 Flash', calls: data?.nurseAgentCount ?? 0, costPerCall: 50 },
                      { feature: 'RAG 챗봇', model: 'Gemini 2.5 Flash', calls: chatStats.totalConversations, costPerCall: 40 },
                      { feature: '음성 > 텍스트', model: 'Gemini 2.5 Flash', calls: Math.floor(aiCost.totalCalls * 0.1), costPerCall: 60 },
                      { feature: '소견서 쉬운 말', model: 'Gemini 2.5 Flash', calls: Math.floor(reportStats.sent * 0.8), costPerCall: 30 },
                    ].map((row, idx) => (
                      <tr key={row.feature} className={`transition-all duration-150 hover:bg-secondary-50/40 ${idx % 2 === 1 ? 'bg-primary-50/30' : ''}`}>
                        <td className="px-6 py-4 text-sm font-semibold text-primary-800">{row.feature}</td>
                        <td className="px-6 py-4"><Badge color="purple">{row.model}</Badge></td>
                        <td className="px-6 py-4 text-sm text-primary-500">{row.calls.toLocaleString()}회</td>
                        <td className="px-6 py-4 text-sm text-primary-500">{formatCurrency(row.costPerCall)}</td>
                        <td className="px-6 py-4 text-sm font-semibold text-primary-800">{formatCurrency(row.calls * row.costPerCall)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-primary-50/50">
                      <td colSpan={4} className="px-6 py-4 text-sm font-bold text-primary-900">합계</td>
                      <td className="px-6 py-4 text-sm font-bold text-secondary-700">{formatCurrency(aiCost.estimatedCost)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>
          </>
        )}

        {/* ===== AGENT TAB ===== */}
        {activeTab === 'agent' && (
          <>
            {/* Agent KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <StatCard
                title="총 에이전트 대화"
                value={(data?.totalAgentConversations ?? 0).toLocaleString()}
                change="사용자 메시지 기준"
                changeType="neutral"
                icon={MessageCircle}
                iconColor="bg-secondary-50 text-secondary-700"
              />
              <StatCard
                title="환자 에이전트"
                value={(data?.patientAgentCount ?? 0).toLocaleString()}
                change={`전체의 ${data?.totalAgentConversations ? Math.round((data.patientAgentCount / data.totalAgentConversations) * 100) : 0}%`}
                changeType="neutral"
                icon={Bot}
                iconColor="bg-success-50 text-success-600"
              />
              <StatCard
                title="간호사 에이전트"
                value={(data?.nurseAgentCount ?? 0).toLocaleString()}
                change={`전체의 ${data?.totalAgentConversations ? Math.round((data.nurseAgentCount / data.totalAgentConversations) * 100) : 0}%`}
                changeType="neutral"
                icon={Bot}
                iconColor="bg-primary-100 text-primary-700"
              />
              <StatCard
                title="도구 호출 횟수"
                value={(data?.functionCallCount ?? 0).toLocaleString()}
                change="Function Calling"
                changeType="neutral"
                icon={Zap}
                iconColor="bg-tertiary-50 text-tertiary-600"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Daily Conversation Chart */}
              <Card>
                <h3 className="text-[15px] font-bold text-primary-900 mb-6">
                  일별 에이전트 대화 수 (최근 14일)
                </h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data?.dailyConversations ?? []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e8edf2" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#627d98' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#627d98' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Area type="monotone" dataKey="patient_agent" name="환자 에이전트" stackId="1" fill={AGENT_COLORS.patient_agent} fillOpacity={0.3} stroke={AGENT_COLORS.patient_agent} strokeWidth={2} />
                      <Area type="monotone" dataKey="nurse_agent" name="간호사 에이전트" stackId="1" fill={AGENT_COLORS.nurse_agent} fillOpacity={0.3} stroke={AGENT_COLORS.nurse_agent} strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-6 mt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: AGENT_COLORS.patient_agent }} />
                    <span className="text-[12px] text-primary-500">환자 에이전트</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: AGENT_COLORS.nurse_agent }} />
                    <span className="text-[12px] text-primary-500">간호사 에이전트</span>
                  </div>
                </div>
              </Card>

              {/* Agent Type Distribution */}
              <Card>
                <h3 className="text-[15px] font-bold text-primary-900 mb-6">
                  에이전트 유형별 분포
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={agentTypePieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={3}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                        labelLine={{ stroke: '#9fb3c8', strokeWidth: 1 }}
                      >
                        {agentTypePieData.map((entry, idx) => (
                          <Cell key={idx} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-6 mt-4">
                  {agentTypePieData.map((entry) => (
                    <div key={entry.name} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                      <span className="text-[12px] text-primary-500">{entry.name}: {entry.value}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Recent Conversations Log */}
            <Card padding={false}>
              <div className="p-7 pb-0">
                <h3 className="text-[15px] font-bold text-primary-900 mb-2">최근 대화 로그</h3>
                <p className="text-[12px] text-primary-400 mb-6">agent_conversations 테이블의 최근 사용자 메시지</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-primary-50/50">
                      <th className="px-6 py-4 text-left text-[11px] font-semibold text-primary-400 uppercase tracking-wider">시간</th>
                      <th className="px-6 py-4 text-left text-[11px] font-semibold text-primary-400 uppercase tracking-wider">에이전트</th>
                      <th className="px-6 py-4 text-left text-[11px] font-semibold text-primary-400 uppercase tracking-wider">입력 방식</th>
                      <th className="px-6 py-4 text-left text-[11px] font-semibold text-primary-400 uppercase tracking-wider">내용</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.agentConversations ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-16 text-center text-sm text-primary-300">
                          대화 로그가 없습니다.
                        </td>
                      </tr>
                    ) : (
                      (data?.agentConversations ?? []).slice(0, 20).map((conv, idx) => (
                        <tr key={conv.id} className={`transition-all duration-150 hover:bg-secondary-50/40 ${idx % 2 === 1 ? 'bg-primary-50/30' : ''}`}>
                          <td className="px-6 py-4 text-[12px] text-primary-500 whitespace-nowrap">
                            {formatDateTime(conv.created_at)}
                          </td>
                          <td className="px-6 py-4">
                            <Badge color={conv.agent_type === 'patient_agent' ? 'teal' : 'navy'}>
                              {conv.agent_type === 'patient_agent' ? '환자' : '간호사'}
                            </Badge>
                          </td>
                          <td className="px-6 py-4">
                            <Badge color={conv.input_method === 'stt' ? 'purple' : conv.input_method === 'button' ? 'yellow' : 'gray'}>
                              {conv.input_method === 'stt' ? '음성' : conv.input_method === 'button' ? '버튼' : '텍스트'}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-sm text-primary-600 max-w-md truncate">
                            {conv.content}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}

        {/* ===== MATCHING TAB ===== */}
        {activeTab === 'matching' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatCard
                title="총 매칭 요청"
                value={(data?.matchingTotal ?? 0).toLocaleString()}
                change="service_requests 기준"
                changeType="neutral"
                icon={Target}
                iconColor="bg-primary-100 text-primary-700"
              />
              <StatCard
                title="매칭 성공"
                value={(data?.matchingMatched ?? 0).toLocaleString()}
                change={`성공률 ${data?.matchingSuccessRate ?? 0}%`}
                changeType={
                  (data?.matchingSuccessRate ?? 0) >= 70 ? 'positive' : (data?.matchingSuccessRate ?? 0) >= 40 ? 'neutral' : 'negative'
                }
                icon={Activity}
                iconColor="bg-success-50 text-success-600"
              />
              <StatCard
                title="대기/미매칭"
                value={((data?.matchingTotal ?? 0) - (data?.matchingMatched ?? 0)).toLocaleString()}
                change="매칭 대기 건"
                changeType="neutral"
                icon={Search}
                iconColor="bg-warning-50 text-warning-600"
              />
            </div>

            {/* Matching Success Rate Chart */}
            <Card>
              <h3 className="text-[15px] font-bold text-primary-900 mb-6">매칭 성공률</h3>
              <div className="flex items-center justify-center py-8">
                <div className="relative w-48 h-48">
                  <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                    <path
                      className="text-primary-100"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none" stroke="currentColor" strokeWidth="3"
                    />
                    <path
                      className="text-secondary-600"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none" stroke="currentColor" strokeWidth="3"
                      strokeDasharray={`${data?.matchingSuccessRate ?? 0}, 100`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-primary-900">{data?.matchingSuccessRate ?? 0}%</span>
                    <span className="text-[12px] text-primary-400 mt-1">성공률</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="p-4 bg-primary-50/60 rounded-xl text-center">
                  <p className="text-[12px] text-primary-400">총 요청</p>
                  <p className="text-lg font-bold text-primary-900">{data?.matchingTotal ?? 0}</p>
                </div>
                <div className="p-4 bg-success-50/60 rounded-xl text-center">
                  <p className="text-[12px] text-success-600">매칭 성공</p>
                  <p className="text-lg font-bold text-success-700">{data?.matchingMatched ?? 0}</p>
                </div>
                <div className="p-4 bg-warning-50/60 rounded-xl text-center">
                  <p className="text-[12px] text-warning-600">대기중</p>
                  <p className="text-lg font-bold text-warning-700">{(data?.matchingTotal ?? 0) - (data?.matchingMatched ?? 0)}</p>
                </div>
              </div>
            </Card>
          </>
        )}

        {/* ===== RAG TAB ===== */}
        {activeTab === 'rag' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatCard
                title="전체 RAG 문서"
                value={totalRagDocs.toLocaleString()}
                change="5개 벡터 테이블 합산"
                changeType="neutral"
                icon={Database}
                iconColor="bg-secondary-50 text-secondary-700"
              />
              <StatCard
                title="기본 RAG 문서"
                value={(data?.ragDocCount ?? 0).toLocaleString()}
                change="rag_documents (1536차원)"
                changeType="neutral"
                icon={FileText}
                iconColor="bg-primary-100 text-primary-700"
              />
              <StatCard
                title="에이전트 RAG FAQ"
                value={((data?.ragPatientDiseases ?? 0) + (data?.ragPatientEmergency ?? 0) + (data?.ragNurseClinical ?? 0) + (data?.ragNurseAssessment ?? 0)).toLocaleString()}
                change="4개 에이전트 RAG 테이블"
                changeType="neutral"
                icon={Search}
                iconColor="bg-tertiary-50 text-tertiary-600"
              />
            </div>

            {/* RAG Document Distribution */}
            <Card padding={false}>
              <div className="p-7 pb-0">
                <h3 className="text-[15px] font-bold text-primary-900 mb-2">RAG 벡터 테이블별 문서 수</h3>
                <p className="text-[12px] text-primary-400 mb-6">각 RAG 테이블에 적재된 문서/FAQ 수를 표시합니다.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-primary-50/50">
                      <th className="px-6 py-4 text-left text-[11px] font-semibold text-primary-400 uppercase tracking-wider">테이블</th>
                      <th className="px-6 py-4 text-left text-[11px] font-semibold text-primary-400 uppercase tracking-wider">카테고리</th>
                      <th className="px-6 py-4 text-right text-[11px] font-semibold text-primary-400 uppercase tracking-wider">문서 수</th>
                      <th className="px-6 py-4 text-right text-[11px] font-semibold text-primary-400 uppercase tracking-wider">비율</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ragTableData.map((row, idx) => (
                      <tr key={row.name} className={`transition-all duration-150 hover:bg-secondary-50/40 ${idx % 2 === 1 ? 'bg-primary-50/30' : ''}`}>
                        <td className="px-6 py-4 text-sm font-semibold text-primary-800">{row.name}</td>
                        <td className="px-6 py-4">
                          <Badge color={row.category === '기본' ? 'blue' : row.category === '환자 에이전트' ? 'teal' : 'navy'}>
                            {row.category}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-sm text-primary-500 text-right">{row.count.toLocaleString()}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-20 h-2 bg-primary-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-secondary-500 rounded-full transition-all"
                                style={{ width: `${totalRagDocs > 0 ? (row.count / totalRagDocs) * 100 : 0}%` }}
                              />
                            </div>
                            <span className="text-[12px] text-primary-500 w-10 text-right">
                              {totalRagDocs > 0 ? Math.round((row.count / totalRagDocs) * 100) : 0}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-primary-50/50">
                      <td colSpan={2} className="px-6 py-4 text-sm font-bold text-primary-900">합계</td>
                      <td className="px-6 py-4 text-sm font-bold text-secondary-700 text-right">{totalRagDocs.toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm font-bold text-primary-500 text-right">100%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>

            {/* RAG Quality Indicators */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <h3 className="text-[15px] font-bold text-primary-900 mb-4">RAG 검색 품질 지표</h3>
                <div className="space-y-4">
                  <div className="p-4 bg-secondary-50/60 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-primary-600">벡터 차원</span>
                      <span className="text-sm font-bold text-secondary-700">1536 / 768</span>
                    </div>
                    <p className="text-[11px] text-primary-400">
                      기본 RAG: 1536차원 (gemini-embedding-001), 에이전트 RAG: 768차원
                    </p>
                  </div>
                  <div className="p-4 bg-primary-50/60 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-primary-600">인덱스 타입</span>
                      <span className="text-sm font-bold text-primary-700">HNSW / IVFFlat</span>
                    </div>
                    <p className="text-[11px] text-primary-400">
                      기본 RAG: HNSW (m=16, ef=64), 에이전트 RAG: IVFFlat (lists=50~100)
                    </p>
                  </div>
                  <div className="p-4 bg-success-50/60 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-primary-600">검색 방식</span>
                      <span className="text-sm font-bold text-success-700">Hybrid</span>
                    </div>
                    <p className="text-[11px] text-primary-400">
                      벡터 유사도 (0.7) + 키워드 매칭 (0.3) 가중 합산 (hybrid_rag_search)
                    </p>
                  </div>
                  <div className="p-4 bg-tertiary-50/60 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-primary-600">유사도 메트릭</span>
                      <span className="text-sm font-bold text-tertiary-600">Cosine</span>
                    </div>
                    <p className="text-[11px] text-primary-400">
                      vector_cosine_ops 사용, 임계값 0.7 이상 결과만 반환
                    </p>
                  </div>
                </div>
              </Card>

              <Card>
                <h3 className="text-[15px] font-bold text-primary-900 mb-4">RAG 데이터 소스 분포</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={ragTableData.map((r) => ({ name: r.name.split('(')[0].trim(), count: r.count }))}
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e8edf2" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11, fill: '#627d98' }} axisLine={false} tickLine={false} />
                      <YAxis
                        dataKey="name"
                        type="category"
                        tick={{ fontSize: 10, fill: '#627d98' }}
                        axisLine={false}
                        tickLine={false}
                        width={120}
                      />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="count" name="문서 수" fill="#006A63" radius={[0, 6, 6, 0]} maxBarSize={28} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
