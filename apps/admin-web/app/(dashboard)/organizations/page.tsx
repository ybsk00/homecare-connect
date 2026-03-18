'use client';

import { useState, useEffect, useCallback } from 'react';
import AdminTopBar from '@/components/layout/AdminTopBar';
import OrgTable from '@/components/orgs/OrgTable';
import Card from '@/components/ui/Card';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { clsx } from 'clsx';

type TabKey = 'pending' | 'verified' | 'rejected' | 'suspended';

interface Organization {
  id: string;
  name: string;
  business_number: string;
  org_type: string;
  verification_status: string;
  subscription_plan: string;
  active_patient_count: number;
  created_at: string;
}

const tabs: { key: TabKey; label: string }[] = [
  { key: 'pending', label: '심사대기' },
  { key: 'verified', label: '승인' },
  { key: 'rejected', label: '거절' },
  { key: 'suspended', label: '정지' },
];

export default function OrganizationsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('pending');
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<Record<TabKey, number>>({
    pending: 0,
    verified: 0,
    rejected: 0,
    suspended: 0,
  });

  const fetchOrganizations = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createBrowserSupabaseClient();

      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, business_number, org_type, verification_status, subscription_plan, active_patient_count, created_at')
        .eq('verification_status', activeTab)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrganizations((data as Organization[]) || []);

      const countPromises = tabs.map(async (tab) => {
        const { count } = await supabase
          .from('organizations')
          .select('*', { count: 'exact', head: true })
          .eq('verification_status', tab.key);
        return { key: tab.key, count: count ?? 0 };
      });

      const countResults = await Promise.all(countPromises);
      const newCounts: Record<TabKey, number> = { pending: 0, verified: 0, rejected: 0, suspended: 0 };
      countResults.forEach((r) => {
        newCounts[r.key] = r.count;
      });
      setCounts(newCounts);
    } catch (err) {
      console.error('기관 목록 조회 실패:', err);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  async function handleApprove(id: string) {
    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase
        .from('organizations')
        .update({
          verification_status: 'verified',
          verified_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
      fetchOrganizations();
    } catch (err) {
      console.error('기관 승인 실패:', err);
    }
  }

  async function handleReject(id: string) {
    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase
        .from('organizations')
        .update({ verification_status: 'rejected' })
        .eq('id', id);

      if (error) throw error;
      fetchOrganizations();
    } catch (err) {
      console.error('기관 거절 실패:', err);
    }
  }

  async function handleSuspend(id: string) {
    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase
        .from('organizations')
        .update({ verification_status: 'suspended' })
        .eq('id', id);

      if (error) throw error;
      fetchOrganizations();
    } catch (err) {
      console.error('기관 정지 실패:', err);
    }
  }

  return (
    <div>
      <AdminTopBar title="기관 관리" subtitle="기관 등록 심사 및 현황을 관리합니다." />
      <div className="p-8 space-y-8">
        {/* Tonal Pill Tabs */}
        <div className="flex gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={clsx(
                'px-5 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200',
                activeTab === tab.key
                  ? 'gradient-button text-white shadow-sm'
                  : 'bg-primary-50/60 text-primary-400 hover:text-primary-600 hover:bg-primary-100/60',
              )}
            >
              {tab.label}
              <span
                className={clsx(
                  'ml-2 px-2 py-0.5 rounded-full text-[11px]',
                  activeTab === tab.key
                    ? 'bg-white/20 text-white'
                    : 'bg-primary-100 text-primary-400',
                )}
              >
                {counts[tab.key]}
              </span>
            </button>
          ))}
        </div>

        {/* Table */}
        <Card padding={false}>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-[3px] border-primary-100 border-t-secondary-600 rounded-full animate-spin" />
            </div>
          ) : (
            <OrgTable
              organizations={organizations}
              onApprove={handleApprove}
              onReject={handleReject}
              onSuspend={handleSuspend}
              showActions={activeTab === 'pending' || activeTab === 'verified'}
            />
          )}
        </Card>
      </div>
    </div>
  );
}
