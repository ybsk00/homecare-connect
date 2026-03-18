'use client';

import { useState, useEffect, useCallback } from 'react';
import AdminTopBar from '@/components/layout/AdminTopBar';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { formatDateTime } from '@homecare/shared-utils';
import { clsx } from 'clsx';
import { MessageSquare, Send } from 'lucide-react';

type BadgeColor = 'gray' | 'green' | 'yellow' | 'red' | 'blue' | 'navy' | 'teal' | 'brown' | 'purple';

interface SupportTicket {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  read: boolean;
  created_at: string;
  profile?: {
    full_name: string;
    role: string;
    phone: string;
  };
}

type StatusKey = 'unread' | 'in_progress' | 'resolved';

const statusConfig: Record<StatusKey, { label: string; color: BadgeColor }> = {
  unread: { label: '미처리', color: 'red' },
  in_progress: { label: '처리중', color: 'yellow' },
  resolved: { label: '완료', color: 'green' },
};

export default function SupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<StatusKey | 'all'>('all');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [reply, setReply] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createBrowserSupabaseClient();

      let query = supabase
        .from('notifications')
        .select('*, profile:profiles (full_name, role, phone)')
        .eq('type', 'support_ticket')
        .order('created_at', { ascending: false });

      if (activeFilter === 'unread') {
        query = query.eq('read', false).not('data->status', 'eq', 'in_progress');
      } else if (activeFilter === 'in_progress') {
        query = query.eq('data->status', 'in_progress');
      } else if (activeFilter === 'resolved') {
        query = query.eq('data->status', 'resolved');
      }

      const { data, error } = await query;
      if (error) throw error;
      setTickets((data as unknown as SupportTicket[]) || []);
    } catch (err) {
      console.error('민원 목록 조회 실패:', err);
    } finally {
      setLoading(false);
    }
  }, [activeFilter]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  function getTicketStatus(ticket: SupportTicket): StatusKey {
    const status = (ticket.data?.status as string) || '';
    if (status === 'resolved') return 'resolved';
    if (status === 'in_progress') return 'in_progress';
    return 'unread';
  }

  async function handleReply() {
    if (!selectedTicket || !reply.trim()) return;
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
          read: true,
          data: updatedData,
        })
        .eq('id', selectedTicket.id);

      await supabase.from('notifications').insert({
        user_id: selectedTicket.user_id,
        type: 'support_reply',
        title: '민원 답변이 등록되었습니다',
        body: reply,
        data: { original_ticket_id: selectedTicket.id },
        channels: ['in_app', 'push'],
      });

      setReply('');
      setSelectedTicket(null);
      fetchTickets();
    } catch (err) {
      console.error('답변 등록 실패:', err);
    } finally {
      setReplyLoading(false);
    }
  }

  async function handleMarkInProgress(ticketId: string) {
    try {
      const supabase = createBrowserSupabaseClient();
      const ticket = tickets.find((t) => t.id === ticketId);
      if (!ticket) return;

      await supabase
        .from('notifications')
        .update({
          data: { ...ticket.data, status: 'in_progress' },
        })
        .eq('id', ticketId);

      fetchTickets();
    } catch (err) {
      console.error('상태 변경 실패:', err);
    }
  }

  const roleLabels: Record<string, string> = {
    guardian: '보호자',
    nurse: '간호사',
    doctor: '의사',
    org_admin: '기관관리자',
  };

  const filters: { key: StatusKey | 'all'; label: string }[] = [
    { key: 'all', label: '전체' },
    { key: 'unread', label: '미처리' },
    { key: 'in_progress', label: '처리중' },
    { key: 'resolved', label: '완료' },
  ];

  return (
    <div>
      <AdminTopBar title="민원 처리" subtitle="접수된 민원을 확인하고 답변합니다." />
      <div className="p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Ticket List */}
          <div className="lg:col-span-1 space-y-5">
            {/* Filter Pills */}
            <div className="flex gap-2">
              {filters.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setActiveFilter(f.key)}
                  className={clsx(
                    'px-4 py-2 text-[12px] font-semibold rounded-xl transition-all duration-200',
                    activeFilter === f.key
                      ? 'gradient-button text-white shadow-sm'
                      : 'bg-primary-50/60 text-primary-400 hover:text-primary-600 hover:bg-primary-100/60',
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Ticket List */}
            <div className="space-y-2 max-h-[calc(100vh-240px)] overflow-y-auto pr-1">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-6 h-6 border-[3px] border-primary-100 border-t-secondary-600 rounded-full animate-spin" />
                </div>
              ) : tickets.length === 0 ? (
                <div className="text-center py-16 text-sm text-primary-300">
                  민원이 없습니다.
                </div>
              ) : (
                tickets.map((ticket) => {
                  const ticketStatus = getTicketStatus(ticket);
                  const config = statusConfig[ticketStatus];
                  const isSelected = selectedTicket?.id === ticket.id;

                  return (
                    <div
                      key={ticket.id}
                      onClick={() => setSelectedTicket(ticket)}
                      className={clsx(
                        'p-5 rounded-2xl cursor-pointer transition-all duration-200',
                        isSelected
                          ? 'bg-white shadow-[var(--shadow-card)] ring-2 ring-secondary-200'
                          : 'bg-white/60 hover:bg-white hover:shadow-[var(--shadow-soft)]',
                      )}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="text-[13px] font-semibold text-primary-800 line-clamp-1">
                          {ticket.title}
                        </h4>
                        <Badge color={config.color}>{config.label}</Badge>
                      </div>
                      <p className="text-[12px] text-primary-400 line-clamp-2 mb-3">
                        {ticket.body}
                      </p>
                      <div className="flex items-center justify-between text-[11px] text-primary-300">
                        <span>
                          {ticket.profile?.full_name || '알 수 없음'} ({roleLabels[ticket.profile?.role || ''] || ticket.profile?.role})
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
                        {formatDateTime(selectedTicket.created_at)}
                      </p>
                    </div>
                    <Badge color={statusConfig[getTicketStatus(selectedTicket)].color}>
                      {statusConfig[getTicketStatus(selectedTicket)].label}
                    </Badge>
                  </div>

                  {/* Ticket Content */}
                  <div className="p-5 bg-primary-50/50 rounded-2xl mb-5">
                    <p className="text-sm text-primary-600 whitespace-pre-wrap leading-relaxed">
                      {selectedTicket.body}
                    </p>
                  </div>

                  {/* Existing Reply */}
                  {selectedTicket.data?.admin_reply && (
                    <div className="p-5 bg-secondary-50/50 rounded-2xl mb-5">
                      <div className="flex items-center gap-2 mb-2">
                        <MessageSquare className="w-4 h-4 text-secondary-600" />
                        <span className="text-[13px] font-semibold text-secondary-700">관리자 답변</span>
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

                  {/* Status Change Button */}
                  {getTicketStatus(selectedTicket) === 'unread' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleMarkInProgress(selectedTicket.id)}
                      className="mb-5"
                    >
                      처리중으로 변경
                    </Button>
                  )}

                  {/* Reply Input */}
                  {getTicketStatus(selectedTicket) !== 'resolved' && (
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
                        답변 등록
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
