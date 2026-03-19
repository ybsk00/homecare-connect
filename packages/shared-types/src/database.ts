/**
 * Supabase Database 타입 정의
 * DB 스키마와 1:1 매칭되는 TypeScript 타입
 */

export interface Database {
  public: {
    Tables: {
      // =====================================================
      // 1. 사용자 프로필 (Supabase Auth 연동)
      // =====================================================
      profiles: {
        Row: {
          id: string;
          role: 'guardian' | 'nurse' | 'doctor' | 'org_admin' | 'platform_admin';
          full_name: string;
          phone: string;
          phone_verified: boolean;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role: 'guardian' | 'nurse' | 'doctor' | 'org_admin' | 'platform_admin';
          full_name: string;
          phone: string;
          phone_verified?: boolean;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          role?: 'guardian' | 'nurse' | 'doctor' | 'org_admin' | 'platform_admin';
          full_name?: string;
          phone?: string;
          phone_verified?: boolean;
          avatar_url?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };

      // =====================================================
      // 2. 환자 정보
      // =====================================================
      patients: {
        Row: {
          id: string;
          primary_guardian_id: string;
          full_name: string;
          birth_date: string;
          gender: 'male' | 'female';
          phone: string | null;
          address: string;
          address_detail: string | null;
          location: string; // PostGIS GEOGRAPHY — 문자열(WKT)로 직렬화
          care_grade: '1' | '2' | '3' | '4' | '5' | 'cognitive' | null;
          mobility: 'bedridden' | 'wheelchair' | 'walker' | 'independent' | null;
          primary_diagnosis: string | null;
          medical_history: unknown[];
          current_medications: unknown[];
          allergies: unknown[];
          needed_services: string[];
          preferred_time: 'morning' | 'afternoon' | 'any' | null;
          special_notes: string | null;
          status: 'active' | 'paused' | 'discharged';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          primary_guardian_id: string;
          full_name: string;
          birth_date: string;
          gender: 'male' | 'female';
          phone?: string | null;
          address: string;
          address_detail?: string | null;
          location: string;
          care_grade?: '1' | '2' | '3' | '4' | '5' | 'cognitive' | null;
          mobility?: 'bedridden' | 'wheelchair' | 'walker' | 'independent' | null;
          primary_diagnosis?: string | null;
          medical_history?: unknown[];
          current_medications?: unknown[];
          allergies?: unknown[];
          needed_services?: string[];
          preferred_time?: 'morning' | 'afternoon' | 'any' | null;
          special_notes?: string | null;
          status?: 'active' | 'paused' | 'discharged';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          primary_guardian_id?: string;
          full_name?: string;
          birth_date?: string;
          gender?: 'male' | 'female';
          phone?: string | null;
          address?: string;
          address_detail?: string | null;
          location?: string;
          care_grade?: '1' | '2' | '3' | '4' | '5' | 'cognitive' | null;
          mobility?: 'bedridden' | 'wheelchair' | 'walker' | 'independent' | null;
          primary_diagnosis?: string | null;
          medical_history?: unknown[];
          current_medications?: unknown[];
          allergies?: unknown[];
          needed_services?: string[];
          preferred_time?: 'morning' | 'afternoon' | 'any' | null;
          special_notes?: string | null;
          status?: 'active' | 'paused' | 'discharged';
          updated_at?: string;
        };
        Relationships: [];
      };

      // =====================================================
      // 3. 보호자-환자 연결
      // =====================================================
      guardian_patient_links: {
        Row: {
          id: string;
          guardian_id: string;
          patient_id: string;
          relationship: string;
          is_primary: boolean;
          notification_mode: 'all' | 'summary' | 'alert_only';
          created_at: string;
        };
        Insert: {
          id?: string;
          guardian_id: string;
          patient_id: string;
          relationship: string;
          is_primary?: boolean;
          notification_mode?: 'all' | 'summary' | 'alert_only';
          created_at?: string;
        };
        Update: {
          id?: string;
          guardian_id?: string;
          patient_id?: string;
          relationship?: string;
          is_primary?: boolean;
          notification_mode?: 'all' | 'summary' | 'alert_only';
        };
        Relationships: [];
      };

      // =====================================================
      // 4. 의료기관
      // =====================================================
      organizations: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          business_number: string;
          license_number: string | null;
          org_type: 'home_nursing' | 'home_care' | 'rehab_center' | 'clinic' | 'hospital';
          address: string;
          address_detail: string | null;
          location: string;
          services: string[];
          operating_hours: Record<string, { start: string; end: string }> | null;
          service_area_km: number;
          phone: string;
          email: string | null;
          website: string | null;
          description: string | null;
          logo_url: string | null;
          photos: string[];
          rating_avg: number;
          review_count: number;
          punctuality_rate: number;
          response_avg_hours: number;
          active_patient_count: number;
          verification_status: 'pending' | 'verified' | 'rejected' | 'suspended';
          verified_at: string | null;
          subscription_plan: 'free' | 'basic' | 'pro' | 'enterprise';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          business_number: string;
          license_number?: string | null;
          org_type: 'home_nursing' | 'home_care' | 'rehab_center' | 'clinic' | 'hospital';
          address: string;
          address_detail?: string | null;
          location: string;
          services?: string[];
          operating_hours?: Record<string, { start: string; end: string }> | null;
          service_area_km?: number;
          phone: string;
          email?: string | null;
          website?: string | null;
          description?: string | null;
          logo_url?: string | null;
          photos?: string[];
          rating_avg?: number;
          review_count?: number;
          punctuality_rate?: number;
          response_avg_hours?: number;
          active_patient_count?: number;
          verification_status?: 'pending' | 'verified' | 'rejected' | 'suspended';
          verified_at?: string | null;
          subscription_plan?: 'free' | 'basic' | 'pro' | 'enterprise';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          name?: string;
          business_number?: string;
          license_number?: string | null;
          org_type?: 'home_nursing' | 'home_care' | 'rehab_center' | 'clinic' | 'hospital';
          address?: string;
          address_detail?: string | null;
          location?: string;
          services?: string[];
          operating_hours?: Record<string, { start: string; end: string }> | null;
          service_area_km?: number;
          phone?: string;
          email?: string | null;
          website?: string | null;
          description?: string | null;
          logo_url?: string | null;
          photos?: string[];
          rating_avg?: number;
          review_count?: number;
          punctuality_rate?: number;
          response_avg_hours?: number;
          active_patient_count?: number;
          verification_status?: 'pending' | 'verified' | 'rejected' | 'suspended';
          verified_at?: string | null;
          subscription_plan?: 'free' | 'basic' | 'pro' | 'enterprise';
          updated_at?: string;
        };
        Relationships: [];
      };

      // =====================================================
      // 5. 의료진 (간호사, 의사 등)
      // =====================================================
      staff: {
        Row: {
          id: string;
          user_id: string;
          org_id: string;
          staff_type: 'nurse' | 'doctor' | 'physio' | 'caregiver';
          license_number: string | null;
          specialties: string[];
          max_patients: number;
          current_patient_count: number;
          is_active: boolean;
          joined_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          org_id: string;
          staff_type: 'nurse' | 'doctor' | 'physio' | 'caregiver';
          license_number?: string | null;
          specialties?: string[];
          max_patients?: number;
          current_patient_count?: number;
          is_active?: boolean;
          joined_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          org_id?: string;
          staff_type?: 'nurse' | 'doctor' | 'physio' | 'caregiver';
          license_number?: string | null;
          specialties?: string[];
          max_patients?: number;
          current_patient_count?: number;
          is_active?: boolean;
        };
        Relationships: [];
      };

      // =====================================================
      // 6. 서비스 매칭 요청
      // =====================================================
      service_requests: {
        Row: {
          id: string;
          patient_id: string;
          guardian_id: string;
          requested_services: string[];
          preferred_time: string | null;
          urgency: 'normal' | 'urgent';
          notes: string | null;
          matched_orgs: unknown[];
          status:
            | 'matching'
            | 'waiting_selection'
            | 'sent_to_org'
            | 'org_accepted'
            | 'org_rejected'
            | 'assessment_scheduled'
            | 'service_started'
            | 'cancelled'
            | 'expired';
          selected_org_id: string | null;
          assigned_nurse_id: string | null;
          matched_at: string | null;
          selected_at: string | null;
          sent_at: string | null;
          responded_at: string | null;
          expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          guardian_id: string;
          requested_services: string[];
          preferred_time?: string | null;
          urgency?: 'normal' | 'urgent';
          notes?: string | null;
          matched_orgs?: unknown[];
          status?:
            | 'matching'
            | 'waiting_selection'
            | 'sent_to_org'
            | 'org_accepted'
            | 'org_rejected'
            | 'assessment_scheduled'
            | 'service_started'
            | 'cancelled'
            | 'expired';
          selected_org_id?: string | null;
          assigned_nurse_id?: string | null;
          matched_at?: string | null;
          selected_at?: string | null;
          sent_at?: string | null;
          responded_at?: string | null;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          patient_id?: string;
          guardian_id?: string;
          requested_services?: string[];
          preferred_time?: string | null;
          urgency?: 'normal' | 'urgent';
          notes?: string | null;
          matched_orgs?: unknown[];
          status?:
            | 'matching'
            | 'waiting_selection'
            | 'sent_to_org'
            | 'org_accepted'
            | 'org_rejected'
            | 'assessment_scheduled'
            | 'service_started'
            | 'cancelled'
            | 'expired';
          selected_org_id?: string | null;
          assigned_nurse_id?: string | null;
          matched_at?: string | null;
          selected_at?: string | null;
          sent_at?: string | null;
          responded_at?: string | null;
          expires_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };

      // =====================================================
      // 7. 서비스 계획서
      // =====================================================
      service_plans: {
        Row: {
          id: string;
          request_id: string;
          patient_id: string;
          org_id: string;
          nurse_id: string;
          visit_frequency: string;
          visit_day_of_week: number[];
          visit_time_slot: string | null;
          care_items: unknown;
          goals: string | null;
          precautions: string | null;
          guardian_consent: boolean;
          consented_at: string | null;
          consent_signature_url: string | null;
          status: 'draft' | 'pending_consent' | 'active' | 'modified' | 'terminated';
          start_date: string | null;
          end_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          request_id: string;
          patient_id: string;
          org_id: string;
          nurse_id: string;
          visit_frequency: string;
          visit_day_of_week?: number[];
          visit_time_slot?: string | null;
          care_items: unknown;
          goals?: string | null;
          precautions?: string | null;
          guardian_consent?: boolean;
          consented_at?: string | null;
          consent_signature_url?: string | null;
          status?: 'draft' | 'pending_consent' | 'active' | 'modified' | 'terminated';
          start_date?: string | null;
          end_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          request_id?: string;
          patient_id?: string;
          org_id?: string;
          nurse_id?: string;
          visit_frequency?: string;
          visit_day_of_week?: number[];
          visit_time_slot?: string | null;
          care_items?: unknown;
          goals?: string | null;
          precautions?: string | null;
          guardian_consent?: boolean;
          consented_at?: string | null;
          consent_signature_url?: string | null;
          status?: 'draft' | 'pending_consent' | 'active' | 'modified' | 'terminated';
          start_date?: string | null;
          end_date?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };

      // =====================================================
      // 8. 방문 스케줄
      // =====================================================
      visits: {
        Row: {
          id: string;
          plan_id: string;
          patient_id: string;
          org_id: string;
          nurse_id: string;
          scheduled_date: string;
          scheduled_time: string | null;
          visit_order: number | null;
          estimated_duration_min: number;
          status:
            | 'scheduled'
            | 'en_route'
            | 'checked_in'
            | 'in_progress'
            | 'checked_out'
            | 'completed'
            | 'cancelled'
            | 'no_show';
          checkin_at: string | null;
          checkin_location: string | null;
          checkout_at: string | null;
          checkout_location: string | null;
          actual_duration_min: number | null;
          cancel_reason: string | null;
          reschedule_from: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          plan_id: string;
          patient_id: string;
          org_id: string;
          nurse_id: string;
          scheduled_date: string;
          scheduled_time?: string | null;
          visit_order?: number | null;
          estimated_duration_min?: number;
          status?:
            | 'scheduled'
            | 'en_route'
            | 'checked_in'
            | 'in_progress'
            | 'checked_out'
            | 'completed'
            | 'cancelled'
            | 'no_show';
          checkin_at?: string | null;
          checkin_location?: string | null;
          checkout_at?: string | null;
          checkout_location?: string | null;
          actual_duration_min?: number | null;
          cancel_reason?: string | null;
          reschedule_from?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          plan_id?: string;
          patient_id?: string;
          org_id?: string;
          nurse_id?: string;
          scheduled_date?: string;
          scheduled_time?: string | null;
          visit_order?: number | null;
          estimated_duration_min?: number;
          status?:
            | 'scheduled'
            | 'en_route'
            | 'checked_in'
            | 'in_progress'
            | 'checked_out'
            | 'completed'
            | 'cancelled'
            | 'no_show';
          checkin_at?: string | null;
          checkin_location?: string | null;
          checkout_at?: string | null;
          checkout_location?: string | null;
          actual_duration_min?: number | null;
          cancel_reason?: string | null;
          reschedule_from?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };

      // =====================================================
      // 9. 방문 기록 (간호사가 입력)
      // =====================================================
      visit_records: {
        Row: {
          id: string;
          visit_id: string;
          nurse_id: string;
          patient_id: string;
          vitals: {
            systolic_bp?: number;
            diastolic_bp?: number;
            heart_rate?: number;
            temperature?: number;
            blood_sugar?: number;
            spo2?: number;
            weight?: number;
            respiration_rate?: number;
          };
          performed_items: {
            item: string;
            done: boolean;
            note?: string;
          }[];
          general_condition: string | null;
          consciousness: string | null;
          skin_condition: string | null;
          nutrition_intake: string | null;
          pain_score: number | null;
          mood: string | null;
          nurse_note: string | null;
          voice_memo_url: string | null;
          voice_memo_text: string | null;
          photos: string[];
          message_to_guardian: string | null;
          recorded_offline: boolean;
          synced_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          visit_id: string;
          nurse_id: string;
          patient_id: string;
          vitals?: {
            systolic_bp?: number;
            diastolic_bp?: number;
            heart_rate?: number;
            temperature?: number;
            blood_sugar?: number;
            spo2?: number;
            weight?: number;
            respiration_rate?: number;
          };
          performed_items?: {
            item: string;
            done: boolean;
            note?: string;
          }[];
          general_condition?: string | null;
          consciousness?: string | null;
          skin_condition?: string | null;
          nutrition_intake?: string | null;
          pain_score?: number | null;
          mood?: string | null;
          nurse_note?: string | null;
          voice_memo_url?: string | null;
          voice_memo_text?: string | null;
          photos?: string[];
          message_to_guardian?: string | null;
          recorded_offline?: boolean;
          synced_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          visit_id?: string;
          nurse_id?: string;
          patient_id?: string;
          vitals?: {
            systolic_bp?: number;
            diastolic_bp?: number;
            heart_rate?: number;
            temperature?: number;
            blood_sugar?: number;
            spo2?: number;
            weight?: number;
            respiration_rate?: number;
          };
          performed_items?: {
            item: string;
            done: boolean;
            note?: string;
          }[];
          general_condition?: string | null;
          consciousness?: string | null;
          skin_condition?: string | null;
          nutrition_intake?: string | null;
          pain_score?: number | null;
          mood?: string | null;
          nurse_note?: string | null;
          voice_memo_url?: string | null;
          voice_memo_text?: string | null;
          photos?: string[];
          message_to_guardian?: string | null;
          recorded_offline?: boolean;
          synced_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };

      // =====================================================
      // 10. 레드플래그 알림
      // =====================================================
      red_flag_alerts: {
        Row: {
          id: string;
          visit_record_id: string;
          patient_id: string;
          nurse_id: string | null;
          org_id: string;
          severity: 'yellow' | 'orange' | 'red';
          category: string;
          title: string;
          description: string;
          ai_analysis: string | null;
          related_vitals: unknown | null;
          trend_data: unknown | null;
          status: 'active' | 'acknowledged' | 'resolved' | 'false_positive';
          acknowledged_by: string | null;
          acknowledged_at: string | null;
          resolution_note: string | null;
          resolved_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          visit_record_id: string;
          patient_id: string;
          nurse_id?: string | null;
          org_id: string;
          severity: 'yellow' | 'orange' | 'red';
          category: string;
          title: string;
          description: string;
          ai_analysis?: string | null;
          related_vitals?: unknown | null;
          trend_data?: unknown | null;
          status?: 'active' | 'acknowledged' | 'resolved' | 'false_positive';
          acknowledged_by?: string | null;
          acknowledged_at?: string | null;
          resolution_note?: string | null;
          resolved_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          visit_record_id?: string;
          patient_id?: string;
          nurse_id?: string | null;
          org_id?: string;
          severity?: 'yellow' | 'orange' | 'red';
          category?: string;
          title?: string;
          description?: string;
          ai_analysis?: string | null;
          related_vitals?: unknown | null;
          trend_data?: unknown | null;
          status?: 'active' | 'acknowledged' | 'resolved' | 'false_positive';
          acknowledged_by?: string | null;
          acknowledged_at?: string | null;
          resolution_note?: string | null;
          resolved_at?: string | null;
        };
        Relationships: [];
      };

      // =====================================================
      // 11. AI 경과 리포트
      // =====================================================
      ai_reports: {
        Row: {
          id: string;
          patient_id: string;
          org_id: string;
          doctor_id: string | null;
          period_start: string;
          period_end: string;
          patient_summary: string | null;
          vitals_analysis: unknown | null;
          vitals_chart_data: unknown | null;
          key_events: unknown[];
          nursing_summary: unknown | null;
          medication_adherence: unknown | null;
          red_flag_history: unknown[];
          ai_summary: string | null;
          doctor_opinion: string | null;
          doctor_opinion_simple: string | null;
          doctor_confirmed: boolean;
          doctor_confirmed_at: string | null;
          sent_to_guardian: boolean;
          sent_at: string | null;
          status: 'generating' | 'generated' | 'doctor_reviewed' | 'sent' | 'error';
          doctor_visit_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          org_id: string;
          doctor_id?: string | null;
          period_start: string;
          period_end: string;
          patient_summary?: string | null;
          vitals_analysis?: unknown | null;
          vitals_chart_data?: unknown | null;
          key_events?: unknown[];
          nursing_summary?: unknown | null;
          medication_adherence?: unknown | null;
          red_flag_history?: unknown[];
          ai_summary?: string | null;
          doctor_opinion?: string | null;
          doctor_opinion_simple?: string | null;
          doctor_confirmed?: boolean;
          doctor_confirmed_at?: string | null;
          sent_to_guardian?: boolean;
          sent_at?: string | null;
          status?: 'generating' | 'generated' | 'doctor_reviewed' | 'sent' | 'error';
          doctor_visit_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          patient_id?: string;
          org_id?: string;
          doctor_id?: string | null;
          period_start?: string;
          period_end?: string;
          patient_summary?: string | null;
          vitals_analysis?: unknown | null;
          vitals_chart_data?: unknown | null;
          key_events?: unknown[];
          nursing_summary?: unknown | null;
          medication_adherence?: unknown | null;
          red_flag_history?: unknown[];
          ai_summary?: string | null;
          doctor_opinion?: string | null;
          doctor_opinion_simple?: string | null;
          doctor_confirmed?: boolean;
          doctor_confirmed_at?: string | null;
          sent_to_guardian?: boolean;
          sent_at?: string | null;
          status?: 'generating' | 'generated' | 'doctor_reviewed' | 'sent' | 'error';
          doctor_visit_date?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };

      // =====================================================
      // 12. 알림
      // =====================================================
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          body: string;
          data: Record<string, unknown>;
          channels: string[];
          read: boolean;
          read_at: string | null;
          push_sent: boolean;
          kakao_sent: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          title: string;
          body: string;
          data?: Record<string, unknown>;
          channels?: string[];
          read?: boolean;
          read_at?: string | null;
          push_sent?: boolean;
          kakao_sent?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: string;
          title?: string;
          body?: string;
          data?: Record<string, unknown>;
          channels?: string[];
          read?: boolean;
          read_at?: string | null;
          push_sent?: boolean;
          kakao_sent?: boolean;
        };
        Relationships: [];
      };

      // =====================================================
      // 13. 인앱 메시지
      // =====================================================
      messages: {
        Row: {
          id: string;
          channel_id: string;
          sender_id: string;
          sender_role: string;
          content: string;
          attachments: string[];
          read_by: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          channel_id: string;
          sender_id: string;
          sender_role: string;
          content: string;
          attachments?: string[];
          read_by?: string[];
          created_at?: string;
        };
        Update: {
          id?: string;
          channel_id?: string;
          sender_id?: string;
          sender_role?: string;
          content?: string;
          attachments?: string[];
          read_by?: string[];
        };
        Relationships: [];
      };

      // =====================================================
      // 14. 리뷰/평점
      // =====================================================
      reviews: {
        Row: {
          id: string;
          org_id: string;
          guardian_id: string;
          patient_id: string;
          rating: number;
          content: string | null;
          rating_quality: number | null;
          rating_punctuality: number | null;
          rating_communication: number | null;
          rating_kindness: number | null;
          is_visible: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          guardian_id: string;
          patient_id: string;
          rating: number;
          content?: string | null;
          rating_quality?: number | null;
          rating_punctuality?: number | null;
          rating_communication?: number | null;
          rating_kindness?: number | null;
          is_visible?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          guardian_id?: string;
          patient_id?: string;
          rating?: number;
          content?: string | null;
          rating_quality?: number | null;
          rating_punctuality?: number | null;
          rating_communication?: number | null;
          rating_kindness?: number | null;
          is_visible?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };

      // =====================================================
      // 15. SaaS 구독
      // =====================================================
      subscriptions: {
        Row: {
          id: string;
          org_id: string;
          plan: 'free' | 'basic' | 'pro' | 'enterprise';
          status: 'active' | 'past_due' | 'cancelled' | 'trial';
          toss_billing_key: string | null;
          toss_customer_key: string | null;
          billing_cycle: 'monthly' | 'yearly';
          amount: number;
          next_billing_date: string | null;
          trial_ends_at: string | null;
          started_at: string;
          cancelled_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          plan: 'free' | 'basic' | 'pro' | 'enterprise';
          status?: 'active' | 'past_due' | 'cancelled' | 'trial';
          toss_billing_key?: string | null;
          toss_customer_key?: string | null;
          billing_cycle?: 'monthly' | 'yearly';
          amount?: number;
          next_billing_date?: string | null;
          trial_ends_at?: string | null;
          started_at?: string;
          cancelled_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          plan?: 'free' | 'basic' | 'pro' | 'enterprise';
          status?: 'active' | 'past_due' | 'cancelled' | 'trial';
          toss_billing_key?: string | null;
          toss_customer_key?: string | null;
          billing_cycle?: 'monthly' | 'yearly';
          amount?: number;
          next_billing_date?: string | null;
          trial_ends_at?: string | null;
          cancelled_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };

      // =====================================================
      // 16. 결제 이력
      // =====================================================
      payment_history: {
        Row: {
          id: string;
          subscription_id: string;
          org_id: string;
          amount: number;
          status: 'paid' | 'failed' | 'refunded';
          toss_payment_key: string | null;
          toss_order_id: string | null;
          paid_at: string | null;
          receipt_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          subscription_id: string;
          org_id: string;
          amount: number;
          status: 'paid' | 'failed' | 'refunded';
          toss_payment_key?: string | null;
          toss_order_id?: string | null;
          paid_at?: string | null;
          receipt_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          subscription_id?: string;
          org_id?: string;
          amount?: number;
          status?: 'paid' | 'failed' | 'refunded';
          toss_payment_key?: string | null;
          toss_order_id?: string | null;
          paid_at?: string | null;
          receipt_url?: string | null;
        };
        Relationships: [];
      };

      // =====================================================
      // 17. 광고
      // =====================================================
      advertisements: {
        Row: {
          id: string;
          org_id: string;
          ad_type: 'search_top' | 'profile_boost' | 'area_exclusive';
          target_area: string | null;
          content: unknown | null;
          review_status: 'pending' | 'approved' | 'rejected';
          reviewed_at: string | null;
          start_date: string | null;
          end_date: string | null;
          monthly_fee: number | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          ad_type: 'search_top' | 'profile_boost' | 'area_exclusive';
          target_area?: string | null;
          content?: unknown | null;
          review_status?: 'pending' | 'approved' | 'rejected';
          reviewed_at?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          monthly_fee?: number | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          ad_type?: 'search_top' | 'profile_boost' | 'area_exclusive';
          target_area?: string | null;
          content?: unknown | null;
          review_status?: 'pending' | 'approved' | 'rejected';
          reviewed_at?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          monthly_fee?: number | null;
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };

      // =====================================================
      // 18. RAG 문서 임베딩 (챗봇용)
      // =====================================================
      rag_documents: {
        Row: {
          id: string;
          title: string;
          source: string;
          content: string;
          chunk_index: number;
          embedding: number[] | null;
          metadata: Record<string, unknown>;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          source: string;
          content: string;
          chunk_index?: number;
          embedding?: number[] | null;
          metadata?: Record<string, unknown>;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          source?: string;
          content?: string;
          chunk_index?: number;
          embedding?: number[] | null;
          metadata?: Record<string, unknown>;
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };

      // =====================================================
      // 19. 푸시 토큰 관리
      // =====================================================
      push_tokens: {
        Row: {
          id: string;
          user_id: string;
          expo_push_token: string;
          device_type: 'ios' | 'android' | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          expo_push_token: string;
          device_type?: 'ios' | 'android' | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          expo_push_token?: string;
          device_type?: 'ios' | 'android' | null;
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };

      // =====================================================
      // 20. 감사 로그 (개인정보보호법 준수)
      // =====================================================
      audit_logs: {
        Row: {
          id: string;
          user_id: string;
          action: string;
          resource_type: string;
          resource_id: string | null;
          ip_address: string | null;
          user_agent: string | null;
          details: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          action: string;
          resource_type: string;
          resource_id?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          details?: Record<string, unknown>;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          action?: string;
          resource_type?: string;
          resource_id?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          details?: Record<string, unknown>;
        };
        Relationships: [];
      };
    };

    Views: Record<string, never>;

    Functions: {
      find_matching_organizations: {
        Args: {
          p_patient_id: string;
          p_radius_km?: number;
        };
        Returns: {
          org_id: string;
          org_name: string;
          distance_km: number;
          service_match_score: number;
          capacity_score: number;
          reputation_score: number;
          total_score: number;
        }[];
      };
      rag_hybrid_search: {
        Args: {
          p_query_embedding: number[];
          p_query_text: string;
          p_limit?: number;
        };
        Returns: {
          id: string;
          title: string;
          content: string;
          source: string;
          similarity: number;
          rank_score: number;
        }[];
      };
    };
  };
}

/** 테이블 Row 타입 헬퍼 */
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

/** 테이블 Insert 타입 헬퍼 */
export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

/** 테이블 Update 타입 헬퍼 */
export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
