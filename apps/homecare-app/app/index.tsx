import { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Dimensions, Animated, Image, ImageBackground,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '@/stores/auth-store';
import { Colors, Spacing, Radius, FontSize, Shadows } from '@/constants/theme';

const { width } = Dimensions.get('window');
const bannerImage = require('@/assets/images/banner.jpg');

export default function LandingScreen() {
  const insets = useSafeAreaInsets();
  const { isInitialized, user, profile } = useAuthStore();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  // 이미 로그인된 경우 2초 후 자동 이동
  useEffect(() => {
    if (!isInitialized || !user || !profile) return;
    const timer = setTimeout(() => navigateByRole(profile.role), 2000);
    return () => clearTimeout(timer);
  }, [isInitialized, user, profile]);

  const navigateByRole = (role: string) => {
    console.log('[Navigate] role:', role);
    try {
      switch (role) {
        case 'guardian': router.replace('/(patient)/home'); break;
        case 'nurse': case 'doctor': router.replace('/(nurse)/today'); break;
        case 'org_admin': router.replace('/(hospital)/dashboard'); break;
        case 'platform_admin': router.replace('/(admin)/kpi'); break;
        default: router.push('/(auth)/login');
      }
    } catch (e) {
      console.error('[Navigate] error:', e);
    }
  };

  const handleStart = () => {
    if (user && profile) {
      navigateByRole(profile.role);
    } else {
      router.push('/(auth)/login');
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      >
        {/* ── 히어로 배너 ── */}
        <ImageBackground
          source={bannerImage}
          style={styles.heroBanner}
          resizeMode="cover"
        >
          <LinearGradient
            colors={['rgba(0,9,27,0.3)', 'rgba(0,9,27,0.75)', 'rgba(0,9,27,0.95)']}
            style={[styles.heroOverlay, { paddingTop: insets.top + 16 }]}
          >
            {/* 상단 바 */}
            <Animated.View style={[styles.topBar, { opacity: fadeAnim }]}>
              <Text style={styles.topBarBrand}>홈케어커넥트</Text>
              <View style={styles.topBarLabel}>
                <Text style={styles.topBarLabelText}>SMART CARE CONNECT</Text>
              </View>
            </Animated.View>

            {/* 히어로 텍스트 */}
            <Animated.View style={[styles.heroTextArea, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
              <Text style={styles.heroTitle}>
                기술로 잇는{'\n'}
                <Text style={styles.heroTitleAccent}>따뜻한</Text> 돌봄의 시작
              </Text>
              <Text style={styles.heroDesc}>
                AI 기반 방문치료 매칭부터 건강 모니터링까지,{'\n'}
                어르신의 일상을 함께 합니다.
              </Text>

              {/* CTA 버튼 */}
              <TouchableOpacity onPress={handleStart} activeOpacity={0.85} style={styles.ctaWrapper}>
                <LinearGradient
                  colors={[Colors.secondary, '#005A54']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.ctaButton}
                >
                  <Text style={styles.ctaText}>지금 시작하기</Text>
                  <Text style={styles.ctaArrow}>→</Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          </LinearGradient>
        </ImageBackground>

        {/* ── 오늘의 케어 안내 섹션 ── */}
        <View style={styles.section}>
          <Text style={styles.sectionOverline}>오늘의 케어 안내</Text>

          <View style={styles.careInfoCard}>
            <View style={styles.careInfoIcon}>
              <Text style={styles.careInfoEmoji}>🏥</Text>
            </View>
            <View style={styles.careInfoContent}>
              <Text style={styles.careInfoTitle}>
                {user && profile ? `${profile.full_name}님, 환영합니다` : '로그인하고 케어를 시작하세요'}
              </Text>
              <Text style={styles.careInfoDesc}>
                {user ? '오늘의 일정을 확인해보세요' : 'AI가 최적의 방문치료를 매칭해드립니다'}
              </Text>
            </View>
          </View>
        </View>

        {/* ── AI 돌봄 도우미 유형 ── */}
        <View style={styles.section}>
          <Text style={styles.sectionOverline}>AI 돌봄 도우미 유형</Text>

          <View style={styles.agentGrid}>
            <View style={styles.agentCard}>
              <LinearGradient
                colors={[Colors.primary, '#001a3a']}
                style={styles.agentCardBg}
              >
                <Text style={styles.agentCardIcon}>💬</Text>
                <Text style={styles.agentCardTitle}>보호자{'\n'}도우미</Text>
              </LinearGradient>
            </View>
            <View style={styles.agentCard}>
              <LinearGradient
                colors={[Colors.secondary, '#004D47']}
                style={styles.agentCardBg}
              >
                <Text style={styles.agentCardIcon}>🩺</Text>
                <Text style={styles.agentCardTitle}>간호사{'\n'}어시스턴트</Text>
              </LinearGradient>
            </View>
          </View>
        </View>

        {/* ── 핵심 서비스 ── */}
        <View style={styles.section}>
          <Text style={styles.sectionOverline}>핵심 서비스</Text>

          <View style={styles.serviceList}>
            {[
              { icon: '🔍', title: '매칭 서비스', desc: '지역·전문성 기반 최적 기관 AI 매칭' },
              { icon: '📊', title: '건강 모니터링', desc: '바이탈 추적 + 이상징후 자동 감지' },
              { icon: '💊', title: '스마트 복약', desc: '자동 알림 + AI 복약지도 + DUR 체크' },
              { icon: '📋', title: '방문 기록 관리', desc: '체크인부터 체크아웃까지 디지털 기록' },
            ].map((item, idx) => (
              <View key={idx} style={styles.serviceItem}>
                <View style={styles.serviceIconWrap}>
                  <Text style={styles.serviceIcon}>{item.icon}</Text>
                </View>
                <View style={styles.serviceTextArea}>
                  <Text style={styles.serviceTitle}>{item.title}</Text>
                  <Text style={styles.serviceDesc}>{item.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ── 신뢰 기관 인증 ── */}
        <View style={styles.section}>
          <View style={styles.trustCard}>
            <View style={styles.trustBadge}>
              <Text style={styles.trustBadgeText}>✓</Text>
            </View>
            <Text style={styles.trustTitle}>검증된 기관 인증</Text>
            <Text style={styles.trustDesc}>
              사업자 등록 확인, 자격증 검증을 거친{'\n'}신뢰할 수 있는 기관만 등록됩니다
            </Text>
          </View>
        </View>

        {/* ── 하단 ── */}
        <View style={styles.footer}>
          {!user && (
            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
              <Text style={styles.footerLink}>이미 계정이 있으신가요? 로그인</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.footerCompany}>주식회사 루미브리즈</Text>
          <Text style={styles.footerCopyright}>© 2026 HomeCare Connect. All rights reserved.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },

  // ── 히어로 배너 ──
  heroBanner: {
    width: '100%',
    height: 480,
  },
  heroOverlay: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topBarBrand: {
    fontSize: FontSize.body,
    fontWeight: '700',
    color: Colors.onPrimary,
    letterSpacing: -0.3,
  },
  topBarLabel: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  topBarLabelText: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1.5,
  },
  heroTextArea: {
    gap: Spacing.lg,
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: Colors.onPrimary,
    lineHeight: 42,
    letterSpacing: -0.5,
  },
  heroTitleAccent: {
    color: Colors.secondaryFixed,
  },
  heroDesc: {
    fontSize: FontSize.caption,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 22,
  },
  ctaWrapper: {
    alignSelf: 'flex-start',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 14,
    borderRadius: Radius.lg,
    ...Shadows.float,
  },
  ctaText: {
    fontSize: FontSize.body,
    fontWeight: '700',
    color: Colors.onPrimary,
  },
  ctaArrow: {
    fontSize: 18,
    color: Colors.onPrimary,
    fontWeight: '300',
  },

  // ── 섹션 공통 ──
  section: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxl,
  },
  sectionOverline: {
    fontSize: FontSize.label,
    fontWeight: '700',
    color: Colors.onSurfaceVariant,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: Spacing.lg,
  },

  // ── 케어 안내 ──
  careInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    ...Shadows.ambient,
  },
  careInfoIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceContainerLow,
    justifyContent: 'center',
    alignItems: 'center',
  },
  careInfoEmoji: { fontSize: 22 },
  careInfoContent: { flex: 1 },
  careInfoTitle: {
    fontSize: FontSize.body,
    fontWeight: '700',
    color: Colors.onSurface,
    marginBottom: 2,
  },
  careInfoDesc: {
    fontSize: FontSize.caption,
    color: Colors.onSurfaceVariant,
  },

  // ── AI 에이전트 그리드 ──
  agentGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  agentCard: {
    flex: 1,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    ...Shadows.float,
  },
  agentCardBg: {
    padding: Spacing.xl,
    height: 140,
    justifyContent: 'space-between',
  },
  agentCardIcon: {
    fontSize: 28,
  },
  agentCardTitle: {
    fontSize: FontSize.body,
    fontWeight: '700',
    color: Colors.onPrimary,
    lineHeight: 22,
  },

  // ── 핵심 서비스 ──
  serviceList: {
    gap: Spacing.sm,
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    ...Shadows.ambient,
  },
  serviceIconWrap: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceContainerLow,
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceIcon: { fontSize: 20 },
  serviceTextArea: { flex: 1 },
  serviceTitle: {
    fontSize: FontSize.caption,
    fontWeight: '700',
    color: Colors.onSurface,
    marginBottom: 2,
  },
  serviceDesc: {
    fontSize: FontSize.label,
    color: Colors.onSurfaceVariant,
    lineHeight: 17,
  },

  // ── 신뢰 기관 ──
  trustCard: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  trustBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  trustBadgeText: {
    fontSize: 18,
    color: Colors.onPrimary,
    fontWeight: '700',
  },
  trustTitle: {
    fontSize: FontSize.body,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  trustDesc: {
    fontSize: FontSize.caption,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 21,
  },

  // ── 하단 ──
  footer: {
    alignItems: 'center',
    paddingTop: Spacing.xxxl,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  footerLink: {
    fontSize: FontSize.caption,
    color: Colors.secondary,
    fontWeight: '600',
    marginBottom: Spacing.md,
  },
  footerCompany: {
    fontSize: FontSize.label,
    color: Colors.onSurfaceVariant,
    fontWeight: '500',
  },
  footerCopyright: {
    fontSize: 10,
    color: Colors.onSurfaceVariant + '60',
  },
});
