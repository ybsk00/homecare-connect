'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { useAppStore } from '@/lib/store';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Loading } from '@/components/ui/Loading';
import { Users, User, Activity, Heart, Thermometer, Droplets, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';

function getVitalStatus(type: string, value: number): 'normal' | 'warning' | 'critical' {
  switch (type) {
    case 'systolic_bp':
      if (value > 180 || value < 90) return 'critical';
      if (value > 140 || value < 100) return 'warning';
      return 'normal';
    case 'heart_rate':
      if (value > 120 || value < 50) return 'critical';
      if (value > 100 || value < 60) return 'warning';
      return 'normal';
    case 'temperature':
      if (value > 39.0 || value < 35.0) return 'critical';
      if (value > 37.5 || value < 36.0) return 'warning';
      return 'normal';
    case 'spo2':
      if (value < 90) return 'critical';
      if (value < 95) return 'warning';
      return 'normal';
    default:
      return 'normal';
  }
}

const vitalStatusColors = {
  normal: 'inline-flex items-center rounded-full bg-secondary-container/60 px-2.5 py-1 text-[11px] font-semibold text-on-secondary-container',
  warning: 'inline-flex items-center rounded-full bg-tertiary-fixed/40 px-2.5 py-1 text-[11px] font-semibold text-tertiary',
  critical: 'inline-flex items-center rounded-full bg-error-container px-2.5 py-1 text-[11px] font-semibold text-error',
};

export default function PatientsPage() {
  const { staffInfo } = useAppStore();
  const router = useRouter();

  // Fetch patients assigned to this nurse
  const { data: patients = [], isLoading } = useQuery({
    queryKey: ['nurse-patients', staffInfo?.id],
    queryFn: async () => {
      if (!staffInfo?.id) return [];
      const supabase = createBrowserSupabaseClient();

      // Get visits with unique patient IDs for this nurse
      const { data: visits } = await supabase
        .from('visits')
        .select('patient_id')
        .eq('nurse_id', staffInfo.id);

      if (!visits || visits.length === 0) return [];

      const patientIds = [...new Set(visits.map((v) => v.patient_id))];

      // Fetch patient details
      const { data: patientList } = await supabase
        .from('patients')
        .select('id, full_name, birth_date, gender, care_grade, primary_diagnosis, status')
        .in('id', patientIds)
        .eq('status', 'active');

      return (patientList ?? []) as Array<{
        id: string;
        full_name: string;
        birth_date: string | null;
        gender: string | null;
        care_grade: string | null;
        primary_diagnosis: string | null;
        status: string;
      }>;
    },
    enabled: !!staffInfo?.id,
  });

  // Fetch latest vitals for all patients (vitals are stored as JSONB in visit_records)
  const { data: vitalsMap = {} } = useQuery({
    queryKey: ['nurse-patients-vitals', patients.map((p) => p.id).join(',')],
    queryFn: async () => {
      if (patients.length === 0) return {};
      const supabase = createBrowserSupabaseClient();

      const { data: records } = await supabase
        .from('visit_records')
        .select('patient_id, vitals, created_at')
        .in('patient_id', patients.map((p) => p.id))
        .order('created_at', { ascending: false });

      // Group by patient, keep latest
      const map: Record<string, {
        systolic_bp: number | null;
        diastolic_bp: number | null;
        heart_rate: number | null;
        temperature: number | null;
        spo2: number | null;
      }> = {};

      (records ?? []).forEach((r: Record<string, unknown>) => {
        const pid = r.patient_id as string;
        if (!map[pid]) {
          const vitals = (r.vitals ?? {}) as Record<string, unknown>;
          map[pid] = {
            systolic_bp: (vitals.systolic_bp as number) ?? null,
            diastolic_bp: (vitals.diastolic_bp as number) ?? null,
            heart_rate: (vitals.heart_rate as number) ?? null,
            temperature: (vitals.temperature as number) ?? null,
            spo2: (vitals.spo2 as number) ?? null,
          };
        }
      });

      return map;
    },
    enabled: patients.length > 0,
  });

  const calculateAge = (dob: string | null): number | null => {
    if (!dob) return null;
    const birth = new Date(dob);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
    return age;
  };

  const genderLabel = (g: string | null) => {
    if (g === 'male') return '남';
    if (g === 'female') return '여';
    return '';
  };

  if (isLoading) return <Loading />;

  return (
    <div className="space-y-12">
      {/* Page Header */}
      <div>
        <h1 className="text-4xl font-extrabold tracking-tight text-primary">담당 환자</h1>
        <p className="mt-2 text-base leading-relaxed text-on-surface-variant">
          현재 담당하고 있는 환자 <span className="font-bold text-secondary">{patients.length}</span>명
        </p>
      </div>

      {patients.length === 0 ? (
        <div className="rounded-3xl bg-surface-container-lowest p-8 shadow-[0_10px_40px_rgba(46,71,110,0.06)]">
          <div className="py-14 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-surface-container-high">
              <Users className="h-10 w-10 text-on-surface-variant/30" />
            </div>
            <p className="mt-6 text-base font-semibold text-on-surface-variant">
              담당 환자가 없습니다.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-on-surface-variant/60">
              배정된 환자가 있으면 여기에 표시됩니다.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {patients.map((patient) => {
            const vitals = vitalsMap[patient.id];
            const age = calculateAge(patient.birth_date);

            return (
              <div
                key={patient.id}
                className="group cursor-pointer rounded-3xl bg-surface-container-lowest p-6 shadow-[0_10px_40px_rgba(46,71,110,0.06)] transition-all duration-300 hover:shadow-[0_20px_60px_rgba(46,71,110,0.12)] hover:-translate-y-0.5"
                onClick={() => router.push(`/nurse/patients/${patient.id}`)}
              >
                {/* Patient header */}
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-container ring-2 ring-white shadow-sm">
                    <User className="h-7 w-7 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-extrabold tracking-tight text-on-surface truncate">
                        {patient.full_name}
                      </p>
                      {patient.care_grade && (
                        <Badge variant="primary">{patient.care_grade}등급</Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-on-surface-variant">
                      {age !== null && `${age}세`}
                      {age !== null && patient.gender && ' / '}
                      {genderLabel(patient.gender)}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-on-surface-variant/30 transition-all duration-300 group-hover:translate-x-1 group-hover:text-primary" />
                </div>

                {/* Primary diagnosis */}
                {patient.primary_diagnosis && (
                  <div className="mt-5 rounded-2xl bg-surface-container-low px-4 py-3">
                    <p className="text-xs leading-relaxed text-on-surface-variant">
                      {patient.primary_diagnosis}
                    </p>
                  </div>
                )}

                {/* Vitals */}
                {vitals && (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {vitals.systolic_bp !== null && vitals.diastolic_bp !== null && (
                      <span className={vitalStatusColors[getVitalStatus('systolic_bp', vitals.systolic_bp)]}>
                        <Heart className="mr-1 inline h-3 w-3" />
                        {vitals.systolic_bp}/{vitals.diastolic_bp}
                      </span>
                    )}
                    {vitals.heart_rate !== null && (
                      <span className={vitalStatusColors[getVitalStatus('heart_rate', vitals.heart_rate)]}>
                        <Activity className="mr-1 inline h-3 w-3" />
                        {vitals.heart_rate}bpm
                      </span>
                    )}
                    {vitals.temperature !== null && (
                      <span className={vitalStatusColors[getVitalStatus('temperature', vitals.temperature)]}>
                        <Thermometer className="mr-1 inline h-3 w-3" />
                        {vitals.temperature}°C
                      </span>
                    )}
                    {vitals.spo2 !== null && (
                      <span className={vitalStatusColors[getVitalStatus('spo2', vitals.spo2)]}>
                        <Droplets className="mr-1 inline h-3 w-3" />
                        {vitals.spo2}%
                      </span>
                    )}
                  </div>
                )}

                {!vitals && (
                  <p className="mt-5 text-xs text-on-surface-variant/40 italic">
                    바이탈 데이터 없음
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
