import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { Link, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useAuthStore } from '@/stores/auth-store';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing, Radius, FontSize, Shadows } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { signIn, signInWithKakao, isLoading } = useAuthStore();
  const [naverLoading, setNaverLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('이메일과 비밀번호를 입력해주세요.');
      return;
    }
    const result = await signIn(email.trim(), password);
    if (result.error) {
      setError('이메일 또는 비밀번호가 올바르지 않습니다.');
    } else {
      // 로그인 성공 → index로 이동 → 역할별 자동 분기
      router.replace('/');
    }
  };

  const handleNaverLogin = async () => {
    setError('');
    setNaverLoading(true);
    try {
      // 웹앱의 네이버 OAuth API Route를 통해 인증 시작
      const webBaseUrl = process.env.EXPO_PUBLIC_WEB_URL || 'https://hospital-web--homecare-connect-ce904.asia-east1.hosted.app';
      const naverAuthUrl = `${webBaseUrl}/api/auth/naver`;
      const callbackUrl = Linking.createURL('/');

      const result = await WebBrowser.openAuthSessionAsync(
        naverAuthUrl,
        callbackUrl
      );

      if (result.type === 'success' && result.url) {
        // 콜백 URL에서 세션 토큰 추출
        const url = new URL(result.url);
        const params = new URLSearchParams(url.hash.substring(1));
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (accessToken && refreshToken) {
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          router.replace('/');
        } else {
          // 웹 콜백에서 리다이렉트된 경우 — 세션 확인
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            router.replace('/');
          } else {
            setError('네이버 로그인 인증에 실패했습니다.');
          }
        }
      }
    } catch {
      setError('네이버 로그인 중 오류가 발생했습니다.');
    } finally {
      setNaverLoading(false);
    }
  };

  const handleKakaoLogin = async () => {
    setError('');
    try {
      const redirectUrl = Linking.createURL('/');
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'kakao',
        options: {
          skipBrowserRedirect: true,
          redirectTo: redirectUrl,
        },
      });

      if (oauthError || !data.url) {
        setError('카카오 로그인 요청에 실패했습니다.');
        return;
      }

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

      if (result.type === 'success' && result.url) {
        // URL에서 토큰 파라미터 추출
        const url = new URL(result.url);
        const params = new URLSearchParams(url.hash.substring(1));
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (accessToken && refreshToken) {
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          router.replace('/');
        } else {
          setError('카카오 로그인 인증에 실패했습니다.');
        }
      }
    } catch {
      setError('카카오 로그인 중 오류가 발생했습니다.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 60 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* 로고 */}
        <View style={styles.logoSection}>
          <View style={styles.logoIcon}>
            <Text style={styles.logoEmoji}>+</Text>
          </View>
          <Text style={styles.logoText}>홈케어커넥트</Text>
          <Text style={styles.logoSubtext}>AI 기반 방문치료 매칭 플랫폼</Text>
        </View>

        {/* 폼 */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>이메일</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="이메일을 입력하세요"
              placeholderTextColor={Colors.onSurfaceVariant + '60'}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>비밀번호</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="비밀번호를 입력하세요"
              placeholderTextColor={Colors.onSurfaceVariant + '60'}
              secureTextEntry
              autoComplete="password"
            />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.85}
            style={styles.buttonWrapper}
          >
            <LinearGradient
              colors={[Colors.primary, Colors.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.button}
            >
              {isLoading ? (
                <ActivityIndicator color={Colors.onPrimary} />
              ) : (
                <Text style={styles.buttonText}>로그인</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* 소셜 로그인 */}
        <View style={styles.socialSection}>
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>또는</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            onPress={handleKakaoLogin}
            disabled={isLoading}
            activeOpacity={0.85}
            style={styles.kakaoButton}
          >
            <Text style={styles.kakaoIcon}>K</Text>
            <Text style={styles.kakaoButtonText}>카카오로 로그인</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleNaverLogin}
            disabled={isLoading || naverLoading}
            activeOpacity={0.85}
            style={styles.naverButton}
          >
            {naverLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.naverIcon}>N</Text>
                <Text style={styles.naverButtonText}>네이버로 로그인</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* 하단 링크 */}
        <View style={styles.links}>
          <Link href="/(auth)/register" asChild>
            <TouchableOpacity>
              <Text style={styles.linkText}>회원가입</Text>
            </TouchableOpacity>
          </Link>
          <Text style={styles.linkDivider}>|</Text>
          <TouchableOpacity>
            <Text style={styles.linkText}>비밀번호 찾기</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.surface },
  container: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxxl,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoIcon: {
    width: 64,
    height: 64,
    borderRadius: Radius.xl,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    ...Shadows.hero,
  },
  logoEmoji: {
    fontSize: 28,
    color: Colors.onPrimary,
    fontWeight: '700',
  },
  logoText: {
    fontSize: FontSize.hero,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: -0.5,
  },
  logoSubtext: {
    fontSize: FontSize.caption,
    color: Colors.onSurfaceVariant,
    marginTop: 4,
  },
  form: {
    gap: Spacing.lg,
  },
  inputGroup: {
    gap: Spacing.sm,
  },
  inputLabel: {
    fontSize: FontSize.label,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    fontSize: FontSize.body,
    color: Colors.onSurface,
  },
  error: {
    fontSize: FontSize.caption,
    color: Colors.error,
    textAlign: 'center',
  },
  buttonWrapper: {
    marginTop: Spacing.sm,
  },
  button: {
    height: 56,
    borderRadius: Radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.float,
  },
  buttonText: {
    fontSize: FontSize.body,
    fontWeight: '700',
    color: Colors.onPrimary,
  },
  links: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.xxl,
    gap: Spacing.md,
  },
  linkText: {
    fontSize: FontSize.caption,
    color: Colors.onSurfaceVariant,
    fontWeight: '500',
  },
  linkDivider: {
    fontSize: FontSize.caption,
    color: Colors.outlineVariant,
  },
  socialSection: {
    marginTop: Spacing.xxl,
    gap: Spacing.lg,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.outlineVariant + '40',
  },
  dividerText: {
    fontSize: FontSize.caption,
    color: Colors.onSurfaceVariant,
    fontWeight: '500',
  },
  kakaoButton: {
    height: 56,
    backgroundColor: '#FEE500',
    borderRadius: Radius.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  kakaoIcon: {
    fontSize: 20,
    fontWeight: '800',
    color: '#000000',
  },
  kakaoButtonText: {
    fontSize: FontSize.body,
    fontWeight: '700',
    color: '#000000',
  },
  naverButton: {
    height: 56,
    backgroundColor: '#03C75A',
    borderRadius: Radius.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  naverIcon: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  naverButtonText: {
    fontSize: FontSize.body,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
