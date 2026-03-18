import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { colors, spacing, radius, typography } from '@/constants/theme';

export default function LoginScreen() {
  const router = useRouter();
  const { signInWithEmail, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleEmailLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('입력 오류', '이메일과 비밀번호를 입력해주세요.');
      return;
    }

    try {
      await signInWithEmail(email.trim(), password);
      router.replace('/(tabs)/home');
    } catch (error: any) {
      Alert.alert('로그인 실패', error?.message ?? '이메일 또는 비밀번호를 확인해주세요.');
    }
  };

  const handleKakaoLogin = () => {
    Alert.alert('안내', '카카오 로그인은 추후 지원 예정입니다.');
  };

  const handleNaverLogin = () => {
    Alert.alert('안내', '네이버 로그인은 추후 지원 예정입니다.');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Premium branding */}
          <View style={styles.header}>
            <Text style={styles.logo}>HomeCare</Text>
            <Text style={styles.logoAccent}>Connect</Text>
            <Text style={styles.subtitle}>
              우리 가족을 위한{'\n'}방문 의료 서비스
            </Text>
          </View>

          <View style={styles.form}>
            <Input
              label="이메일"
              placeholder="example@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            <Input
              label="비밀번호"
              placeholder="비밀번호를 입력하세요"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
            />
            {/* Gradient CTA */}
            <Button
              title="로그인"
              onPress={handleEmailLogin}
              loading={isLoading}
              fullWidth
              size="lg"
            />
          </View>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>또는</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.social}>
            <TouchableOpacity style={styles.kakaoButton} onPress={handleKakaoLogin}>
              <Text style={styles.kakaoText}>카카오로 시작하기</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.naverButton} onPress={handleNaverLogin}>
              <Text style={styles.naverText}>네이버로 시작하기</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>아직 계정이 없으신가요? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text style={styles.registerLink}>회원가입</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xxxl,
  },
  logo: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -1,
  },
  logoAccent: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.secondary,
    letterSpacing: -1,
    marginTop: -8,
  },
  subtitle: {
    ...typography.koreanCaption,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  form: {
    gap: spacing.xs,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.xxl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.surfaceContainerHigh,
  },
  dividerText: {
    marginHorizontal: spacing.lg,
    ...typography.small,
  },
  social: {
    gap: spacing.md,
  },
  kakaoButton: {
    backgroundColor: '#FEE500',
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  kakaoText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#191919',
  },
  naverButton: {
    backgroundColor: '#03C75A',
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  naverText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.onPrimary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.xxl,
    marginBottom: spacing.xl,
  },
  footerText: {
    ...typography.caption,
  },
  registerLink: {
    ...typography.captionMedium,
    color: colors.secondary,
  },
});
