'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Card from '@/components/admin/ui/Card';
import Badge from '@/components/admin/ui/Badge';
import Button from '@/components/admin/ui/Button';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { formatDateTime } from '@homecare/shared-utils';
import { clsx } from 'clsx';
import {
  MessageSquare,
  Send,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  AlertTriangle,
  ArrowUpCircle,
  ArrowDownCircle,
  Minus,
} from 'lucide-react';
import type { BadgeColor, SupportTicket } from '@homecare/shared-types';

type StatusKey = 'unread' | 'in_progress' | 'resolved' | 'rejected';

const statusConfig: Record<StatusKey, { label: string; color: BadgeColor }> = {
  unread: { label: '접수', color: 'red' },
  in_progress: { label: '처리중', color: 'yellow' },
  resolved: { label: '완료', color: 'green' },
  rejected: { label: '반려', color: 'gray' },
};

const categoryLabels: Record<string, { label: string; color: BadgeColor }> = {
  service: { label: '서비스 불만', color: 'red' },
  billing: { label: '결제/수납', color: 'yellow' },
  matching: { label: '매칭 문의', color: 'blue' },
  technical: { label: '기술 오류', color: 'purple' },
  nurse: { label: '간호사 민원', color: 'brown' },
  other: { label: '기타', color: 'gray' },
};

const priorityConfig: Record<string, { label: string; icon: typeof ArrowUpCircle; color: string }> = {
  high: { label: '긴급', icon: ArrowUpCircle, color: 'text-danger-500' },
  medium: { label: '보통', icon: Minus, color: 'text-warning-600' },
  low: { label: '낮음', icon: ArrowDownCircle, color: 'text-primary-400' },
};

// 데모 데이터 (DB에 데이터가 없을 경우)
const demoTickets: (SupportTicket & { category?: string; priority?: string })[] = [
  {
    id: 'demo-t1',
    user_id: 'u1',
    title: '간호사 방문 시간 지각 관련 민원',
    body: '지난 3회 연속으로 간호사분이 예정 시간보다 30분 이상 늦게 도착합니다. 어르신이 불안해 하셔서 개선이 필요합니다. 특히 3월 15일에는 1시간 지각이 있었습니다.',
    created_at: '2026-03-22T09:30:00.000Z',
    read: false,
    type: 'support_ticket',
    profile: { full_name: '김영수', role: 'guardian', phone: '010-1234-5678' },
    data: { status: 'unread' },
    category: 'service',
    priority: 'high',
  },
  {
    id: 'demo-t2',
    user_id: 'u2',
    title: '결제 이중 청구 확인 요청',
    body: '3월분 방문치료비가 이중으로 결제되었습니다. 확인 후 환불 처리 부탁드립니다. 결제일 3/10, 금액 각 350,000원.',
    created_at: '2026-03-21T14:20:00.000Z',
    read: false,
    type: 'support_ticket',
    profile: { full_name: '이미경', role: 'guardian', phone: '010-2345-6789' },
    data: { status: 'in_progress' },
    category: 'billing',
    priority: 'high',
  },
  {
    id: 'demo-t3',
    user_id: 'u3',
    title: '매칭 결과 불만족 재매칭 요청',
    body: '현재 매칭된 간호사분의 전문 분야가 어머니 상태(파킨슨)와 맞지 않는 것 같습니다. 재활치료 경력이 있는 간호사로 재매칭을 요청드립니다.',
    created_at: '2026-03-20T11:00:00.000Z',
    read: true,
    type: 'support_ticket',
    profile: { full_name: '박지훈', role: 'guardian', phone: '010-3456-7890' },
    data: { status: 'in_progress' },
    category: 'matching',
    priority: 'medium',
  },
  {
    id: 'demo-t4',
    user_id: 'u4',
    title: '앱 로그인 오류 지속 발생',
    body: '카카오 로그인 시 "인증 실패" 메시지가 반복적으로 발생합니다. 아이폰 15 Pro, iOS 18.3 사용 중입니다.',
    created_at: '2026-03-19T16:45:00.000Z',
    read: true,
    type: 'support_ticket',
    profile: { full_name: '최수현', role: 'nurse', phone: '010-4567-8901' },
    data: {
      status: 'resolved',
      admin_reply: '카카오 인증 서버 점검으로 인한 일시적 오류였습니다. 현재 정상 복구되었으며, 앱 업데이트(v2.1.3)를 설치해 주세요.',
      replied_at: '2026-03-20T10:30:00.000Z',
    },
    category: 'technical',
    priority: 'medium',
  },
  {
    id: 'demo-t5',
    user_id: 'u5',
    title: '간호사 교체 요청',
    body: '담당 간호사분의 서비스 태도에 대해 말씀드리고자 합니다. 상세 내용은 전화 상담을 희망합니다.',
    created_at: '2026-03-18T08:15:00.000Z',
    read: true,
    type: 'support_ticket',
    profile: { full_name: '정현우', role: 'guardian', phone: '010-5678-9012' },
    data: {
      status: 'resolved',
      admin_reply: '전화 상담 완료하였습니다. 간호사 교체가 3월 25일부터 적용됩니다. 불편을 드려 죄송합니다.',
      replied_at: '2026-03-19T14:20:00.000Z',
    },
    category: 'nurse',
    priority: 'high',
  },
  {
    id: 'demo-t6',
    user_id: 'u6',
    title: '방문 일정 변경 불가 문의',
    body: '앱에서 방문 일정을 변경하려 하는데 "변경 불가" 메시지가 나옵니다. 다음 주 월요일로 변경하고 싶습니다.',
    created_at: '2026-03-17T13:00:00.000Z',
    read: true,
    type: 'support_ticket',
    profile: { full_name: '한지원', role: 'guardian', phone: '010-6789-0123' },
    data: { status: 'unread' },
    category: 'technical',
    priority: 'low',
  },
];

type TicketWithMeta = SupportTicket & { category?: string; priority?: string };

export default function SupportPage() {
  const [activeFilter, setActiveFilter] = useState<StatusKey | 'all'>('all');
  const [selectedTicket, setSelectedTicket] = useState<TicketWithMeta | null>(null);
  const [reply, setReply] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const queryClient = useQueryClient();

  // DB에서 실제 티켓 조회 시도
  const { data: dbTickets = [], isLoading: loading, error } = useQuery({
    queryKey: ['admin-support-tickets'],
    queryFn: async () => {
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase
        .from('notifications')
        .select('*, profile:profiles (full_name, role, phone)')
        .eq('type', 'support_ticket')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data as unknown as SupportTicket[]) || [];
    },
  });

  // DB 데이터가 없으면 데모 데이터 사용
  const allTickets: TicketWithMeta[] =
    dbTickets.length > 0
      ? dbTickets.map((t) => ({
          ...t,
          category: (t.data as Record<string, unknown>)?.category as string || 'other',
          priority: (t.data as Record<string, unknown>)?.priority as string || 'medium',
        }))
      : demoTickets;

  function getTicketStatus(ticket: TicketWithMeta): StatusKey {
    const status = (ticket.data?.status as string) || '';
    if (status === 'resolved') return 'resolved';
    if (status === 'rejected') return 'rejected';
    if (status === 'in_progress') return 'in_progress';
    return 'unread';
  }

  // 필터 적용
  const filteredTickets =
    activeFilter === 'all'
      ? allTickets
      : allTickets.filter((t) => getTicketStatus(t) === activeFilter);

  // 카운트
  const statusCounts = {
    all: allTickets.length,
    unread: allTickets.filter((t) => getTicketStatus(t) === 'unread').length,
    in_progress: allTickets.filter((t) => getTicketStatus(t) === 'in_progress').length,
    resolved: allTickets.filter((t) => getTicketStatus(t) === 'resolved').length,
    rejected: allTickets.filter((t) => getTicketStatus(t) === 'rejected').length,
  };

  async function handleReply() {
    if (!selectedTicket || !reply.trim()) return;
    if (selectedTicket.id.startsWith('demo-')) {
      // 데모 모드: 로컬 상태만 업데이트
      setReply('');
      setSelectedTicket(null);
      return;
    }
    setReplyLoading(true);
    try {
      const supabase = createBrowserSupabaseClient();

      const updatedData = {
        ...selectedTicket.data,
        status: 'resolved',
        admin_reply: reply,
        replied_at: new Date().toISOString(),
      };

      await supabase
        .from('notifications')
        .update({
          read: true as const,
          data: updatedData as Record<string, unknown>,
        } as never)
        .eq('id', selectedTicket.id);

      await supabase.from('notifications').insert({
        user_id: selectedTicket.user_id,
        type: 'support_reply',
        title: '민원 답변이 등록되었습니다',
        body: reply,
        data: { original_ticket_id: selectedTicket.id },
        channels: ['in_app', 'push'],
      } as never);

      setReply('');
      setSelectedTicket(null);
      queryClient.invalidateQueries({ queryKey: ['admin-support-tickets'] });
    } catch (err) {
      console.error('답변 등록 실패:', err);
    } finally {
      setReplyLoading(false);
    }
  }

  async function handleMarkInProgress(ticketId: string) {
    if (ticketId.startsWith('demo-')) return;
    try {
      const supabase = createBrowserSupabaseClient();
      const ticket = allTickets.find((t) => t.id === ticketId);
      if (!ticket) return;

      await supabase
        .from('notifications')
        .update({
          data: { ...ticket.data, status: 'in_progress' } as Record<string, unknown>,
        } as never)
        .eq('id', ticketId);

      queryClient.invalidateQueries({ queryKey: ['admin-support-tickets'] });
    } catch (err) {
      console.error('상태 변경 실패:', err);
    }
  }

  async function handleReject(ticketId: string) {
    if (ticketId.startsWith('demo-')) {
      setShowRejectInput(false);
      setRejectReason('');
      setSelectedTicket(null);
      return;
    }
    try {
      const supabase = createBrowserSupabaseClient();
      const ticket = allTickets.find((t) => t.id === ticketId);
      if (!ticket) return;

      await supabase
        .from('notifications')
        .update({
          read: true as const,
          data: {
            ...ticket.data,
            status: 'rejected',
            reject_reason: rejectReason,
            rejected_at: new Date().toISOString(),
          } as Record<string, unknown>,
        } as never)
        .eq('id', ticketId);

      setShowRejectInput(false);
      setRejectReason('');
      setSelectedTicket(null);
      queryClient.invalidateQueries({ queryKey: ['admin-support-tickets'] });
    } catch (err) {
      console.error('반려 처리 실패:', err);
    }
  }

  function buildTimeline(ticket: TicketWithMeta) {
    const entries: { icon: typeof Clock; color: string; label: string; time: string }[] = [];

    entries.push({
      icon: AlertCircle,
      color: 'text-primary-400 bg-primary-100',
      label: '민원 접수',
      time: formatDateTime(ticket.created_at),
    });

    const status = (ticket.data?.status as string) || '';
    if (status === 'in_progress' || status === 'resolved') {
      entries.push({
        icon: Clock,
        color: 'text-yellow-600 bg-yellow-100',
        label: '처리중으로 변경',
        time: '',
      });
    }

    if (ticket.data?.replied_at) {
      entries.push({
        icon: Send,
        color: 'text-secondary-600 bg-secondary-100',
        label: '관리자 답변 등록',
        time: formatDateTime(ticket.data.replied_at as string),
      });
    }

    if (status === 'resolved') {
      entries.push({
        icon: CheckCircle2,
        color: 'text-success-600 bg-success-100',
        label: '처리 완료',
        time: ticket.data?.replied_at ? formatDateTime(ticket.data.replied_at as string) : '',
      });
    }

    if (status === 'rejected') {
      entries.push({
        icon: XCircle,
        color: 'text-danger-500 bg-danger-50',
        label: '반려 처리',
        time: (ticket.data as Record<string, unknown>)?.rejected_at
          ? formatDateTime((ticket.data as Record<string, unknown>).rejected_at as string)
          : '',
      });
    }

    return entries;
  }

  const roleLabels: Record<string, string> = {
    guardian: '보호자',
    nurse: '간호사',
    doctor: '의사',
    org_admin: '기관관리자',
  };

  const filters: { key: StatusKey | 'all'; label: string }[] = [
    { key: 'all', label: '전체' },
    { key: 'unread', label: '접수' },
    { key: 'in_progress', label: '처리중' },
    { key: 'resolved', label: '완료' },
    { key: 'rejected', label: '반려' },
  ];

  return (
    <div>
      <div className="p-8">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-primary-900">민원 처리</h2>
          <p className="text-[13px] text-primary-400 mt-1">
            접수된 민원을 확인하고 답변을 등록합니다.
          </p>
        </div>

        {/* Status Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            { key: 'all' as const, label: '전체', count: statusCounts.all, color: 'bg-primary-100 text-primary-700' },
            { key: 'unread' as const, label: '접수', count: statusCounts.unread, color: 'bg-danger-50 text-danger-600' },
            { key: 'in_progress' as const, label: '처리중', count: statusCounts.in_progress, color: 'bg-warning-50 text-warning-600' },
            { key: 'resolved' as const, label: '완료', count: statusCounts.resolved, color: 'bg-success-50 text-success-600' },
            { key: 'rejected' as const, label: '반려', count: statusCounts.rejected, color: 'bg-primary-50 text-primary-400' },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setActiveFilter(item.key)}
              className={clsx(
                'p-4 rounded-2xl text-left transition-all duration-200',
                activeFilter === item.key
                  ? 'bg-white shadow-[var(--shadow-card)] ring-2 ring-secondary-200'
                  : 'bg-white/60 hover:bg-white hover:shadow-[var(--shadow-soft)]'
              )}
            >
              <p className="text-[12px] text-primary-400 mb-1">{item.label}</p>
              <p className="text-2xl font-bold text-primary-900">{item.count}</p>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Ticket List */}
          <div className="lg:col-span-1 space-y-5">
            {/* Filter Pills */}
            <div className="flex gap-2 flex-wrap">
              {filters.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setActiveFilter(f.key)}
                  className={clsx(
                    'px-4 py-2 text-[12px] font-semibold rounded-xl transition-all duration-200',
                    activeFilter === f.key
                      ? 'gradient-button text-white shadow-sm'
                      : 'bg-primary-50/60 text-primary-400 hover:text-primary-600 hover:bg-primary-100/60'
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Ticket List */}
            <div className="space-y-2 max-h-[calc(100vh-400px)] overflow-y-auto pr-1">
              {error && !loading && allTickets === demoTickets && (
                <div className="text-center py-4">
                  <p className="text-xs text-primary-400">데모 데이터 표시 중</p>
                </div>
              )}
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-6 h-6 border-[3px] border-primary-100 border-t-secondary-600 rounded-full animate-spin" />
                </div>
              ) : filteredTickets.length === 0 ? (
                <div className="text-center py-16 text-sm text-primary-300">
                  민원이 없습니다.
                </div>
              ) : (
                filteredTickets.map((ticket) => {
                  const ticketStatus = getTicketStatus(ticket);
                  const config = statusConfig[ticketStatus];
                  const isSelected = selectedTicket?.id === ticket.id;
                  const category = categoryLabels[ticket.category || 'other'] || categoryLabels.other;
                  const priority = priorityConfig[ticket.priority || 'medium'] || priorityConfig.medium;
                  const PriorityIcon = priority.icon;

                  return (
                    <div
                      key={ticket.id}
                      onClick={() => {
                        setSelectedTicket(ticket);
                        setShowRejectInput(false);
                        setRejectReason('');
                      }}
                      className={clsx(
                        'p-5 rounded-2xl cursor-pointer transition-all duration-200',
                        isSelected
                          ? 'bg-white shadow-[var(--shadow-card)] ring-2 ring-secondary-200'
                          : 'bg-white/60 hover:bg-white hover:shadow-[var(--shadow-soft)]'
                      )}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <PriorityIcon className={clsx('w-4 h-4 shrink-0', priority.color)} />
                          <h4 className="text-[13px] font-semibold text-primary-800 line-clamp-1">
                            {ticket.title}
                          </h4>
                        </div>
                        <Badge color={config.color}>{config.label}</Badge>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge color={category.color}>{category.label}</Badge>
                        <span className={clsx('text-[11px] font-medium', priority.color)}>
                          {priority.label}
                        </span>
                      </div>
                      <p className="text-[12px] text-primary-400 line-clamp-2 mb-3">
                        {ticket.body}
                      </p>
                      <div className="flex items-center justify-between text-[11px] text-primary-300">
                        <span>
                          {ticket.profile?.full_name || '알 수 없음'} (
                          {roleLabels[ticket.profile?.role || ''] || ticket.profile?.role})
                        </span>
                        <span>{formatDateTime(ticket.created_at)}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right: Ticket Detail + Reply */}
          <div className="lg:col-span-2">
            {selectedTicket ? (
              <Card>
                <div className="mb-6">
                  <div className="flex items-start justify-between mb-5">
                    <div>
                      <h3 className="text-lg font-bold text-primary-900">
                        {selectedTicket.title}
                      </h3>
                      <p className="text-[13px] text-primary-400 mt-1">
                        {selectedTicket.profile?.full_name || '알 수 없음'} |{' '}
                        {roleLabels[selectedTicket.profile?.role || ''] || ''} |{' '}
                        {selectedTicket.profile?.phone || ''} |{' '}
                        {formatDateTime(selectedTicket.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedTicket.category && (
                        <Badge color={categoryLabels[selectedTicket.category]?.color || 'gray'}>
                          {categoryLabels[selectedTicket.category]?.label || '기타'}
                        </Badge>
                      )}
                      <Badge color={statusConfig[getTicketStatus(selectedTicket)].color}>
                        {statusConfig[getTicketStatus(selectedTicket)].label}
                      </Badge>
                    </div>
                  </div>

                  {/* Priority + Category Info */}
                  {selectedTicket.priority && (
                    <div className="flex items-center gap-4 mb-5">
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] text-primary-400">우선순위:</span>
                        {(() => {
                          const p = priorityConfig[selectedTicket.priority || 'medium'] || priorityConfig.medium;
                          const PIcon = p.icon;
                          return (
                            <span className={clsx('flex items-center gap-1 text-[13px] font-semibold', p.color)}>
                              <PIcon className="w-4 h-4" />
                              {p.label}
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                  {/* Ticket Content */}
                  <div className="p-5 bg-primary-50/50 rounded-2xl mb-5">
                    <p className="text-sm text-primary-600 whitespace-pre-wrap leading-relaxed">
                      {selectedTicket.body}
                    </p>
                  </div>

                  {/* 처리 이력 타임라인 */}
                  <div className="mb-5">
                    <h4 className="text-[13px] font-bold text-primary-700 mb-4">처리 이력</h4>
                    <div className="relative pl-6">
                      <div className="absolute left-[11px] top-2 bottom-2 w-[2px] bg-primary-100" />
                      {buildTimeline(selectedTicket).map((entry, idx) => {
                        const EntryIcon = entry.icon;
                        return (
                          <div key={idx} className="relative flex items-start gap-3 mb-4 last:mb-0">
                            <div
                              className={`absolute -left-6 w-6 h-6 rounded-full flex items-center justify-center ${entry.color}`}
                            >
                              <EntryIcon className="w-3.5 h-3.5" />
                            </div>
                            <div className="ml-3">
                              <p className="text-[13px] font-semibold text-primary-700">
                                {entry.label}
                              </p>
                              {entry.time && (
                                <p className="text-[11px] text-primary-400">{entry.time}</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Existing Reply */}
                  {selectedTicket.data?.admin_reply && (
                    <div className="p-5 bg-secondary-50/50 rounded-2xl mb-5">
                      <div className="flex items-center gap-2 mb-2">
                        <MessageSquare className="w-4 h-4 text-secondary-600" />
                        <span className="text-[13px] font-semibold text-secondary-700">
                          관리자 답변
                        </span>
                        <span className="text-[11px] text-secondary-400">
                          {selectedTicket.data?.replied_at
                            ? formatDateTime(selectedTicket.data.replied_at as string)
                            : ''}
                        </span>
                      </div>
                      <p className="text-sm text-primary-600 whitespace-pre-wrap">
                        {selectedTicket.data.admin_reply as string}
                      </p>
                    </div>
                  )}

                  {/* Reject Reason Display */}
                  {getTicketStatus(selectedTicket) === 'rejected' &&
                    !!(selectedTicket.data as Record<string, unknown>)?.reject_reason && (
                      <div className="p-5 bg-danger-50/50 rounded-2xl mb-5">
                        <div className="flex items-center gap-2 mb-2">
                          <XCircle className="w-4 h-4 text-danger-500" />
                          <span className="text-[13px] font-semibold text-danger-600">반려 사유</span>
                        </div>
                        <p className="text-sm text-primary-600 whitespace-pre-wrap">
                          {String((selectedTicket.data as Record<string, unknown>).reject_reason)}
                        </p>
                      </div>
                    )}

                  {/* Action Buttons for unread */}
                  {getTicketStatus(selectedTicket) === 'unread' && (
                    <div className="flex gap-3 mb-5">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleMarkInProgress(selectedTicket.id)}
                      >
                        <Clock className="w-4 h-4 mr-1" />
                        처리중으로 변경
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowRejectInput(true)}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        반려
                      </Button>
                    </div>
                  )}

                  {/* Action Buttons for in_progress */}
                  {getTicketStatus(selectedTicket) === 'in_progress' && !showRejectInput && (
                    <div className="flex gap-3 mb-5">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowRejectInput(true)}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        반려
                      </Button>
                    </div>
                  )}

                  {/* Reject Input */}
                  {showRejectInput &&
                    getTicketStatus(selectedTicket) !== 'resolved' &&
                    getTicketStatus(selectedTicket) !== 'rejected' && (
                      <div className="p-5 bg-danger-50/30 rounded-2xl mb-5">
                        <label className="block text-[13px] font-semibold text-danger-600 mb-2">
                          반려 사유
                        </label>
                        <textarea
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          placeholder="반려 사유를 입력하세요..."
                          rows={3}
                          className="w-full rounded-xl bg-white px-4 py-3 text-sm text-primary-800 placeholder-primary-300 focus:outline-none focus:ring-2 focus:ring-danger-500/30 transition-all mb-3"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleReject(selectedTicket.id)}
                            disabled={!rejectReason.trim()}
                          >
                            반려 확인
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setShowRejectInput(false);
                              setRejectReason('');
                            }}
                          >
                            취소
                          </Button>
                        </div>
                      </div>
                    )}

                  {/* Reply Input */}
                  {getTicketStatus(selectedTicket) !== 'resolved' &&
                    getTicketStatus(selectedTicket) !== 'rejected' && (
                      <div>
                        <label className="block text-[13px] font-semibold text-primary-600 mb-2">
                          답변 작성
                        </label>
                        <textarea
                          value={reply}
                          onChange={(e) => setReply(e.target.value)}
                          placeholder="답변을 입력하세요..."
                          rows={4}
                          className="w-full rounded-xl bg-primary-50/60 px-4 py-3 text-sm text-primary-800 placeholder-primary-300 focus:outline-none focus:ring-2 focus:ring-secondary-500/30 transition-all mb-4"
                        />
                        <Button
                          loading={replyLoading}
                          onClick={handleReply}
                          disabled={!reply.trim()}
                        >
                          <Send className="w-4 h-4 mr-1.5" />
                          답변 등록 (완료 처리)
                        </Button>
                      </div>
                    )}
                </div>
              </Card>
            ) : (
              <Card>
                <div className="flex flex-col items-center justify-center py-20 text-primary-200">
                  <MessageSquare className="w-14 h-14 mb-4" />
                  <p className="text-sm text-primary-300">민원을 선택하세요</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
