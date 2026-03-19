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
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { colors, spacing, radius, typography } from '@/constants/theme';

export default function RegisterScreen() {
  const router = useRouter();
  const { signUpWithEmail, isLoading } = useAuth();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (fullName.trim().length < 2) {
      newErrors.fullName = '이름은 2자 이상 입력해주세요';
    }
    if (!/^01[016789]\d{7,8}$/.test(phone.replace(/-/g, ''))) {
      newErrors.phone = '올바른 휴대폰 번호를 입력해주세요';
    }
    if (!email.includes('@')) {
      newErrors.email = '올바른 이메일을 입력해주세요';
    }
    if (password.length < 6) {
      newErrors.password = '비밀번호는 6자 이상이어야 합니다';
    }
    if (password !== passwordConfirm) {
      newErrors.passwordConfirm = '비밀번호가 일치하지 않습니다';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;

    try {
      const cleanPhone = phone.replace(/-/g, '');
      await signUpWithEmail(email.trim(), password, fullName.trim(), cleanPhone);
      Alert.alert('가입 완료', '환영합니다! 로그인되었습니다.', [
        { text: '확인', onPress: () => router.replace('/(tabs)/home') },
      ]);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '가입 중 오류가 발생했습니다.';
      Alert.alert('가입 실패', message);
    }
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
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.back}>
              <Text style={styles.backText}>{'< 뒤로'}</Text>
            </TouchableOpacity>
            <Text style={styles.title}>보호자 회원가입</Text>
            <Text style={styles.subtitle}>
              가입 후 환자를 등록하고 방문 서비스를 신청할 수 있습니다
            </Text>
          </View>

          {/* Role selection card (tonal, no borders) */}
          <View style={styles.roleCard}>
            <View style={styles.roleActive}>
              <Text style={styles.roleActiveText}>보호자</Text>
            </View>
            <View style={styles.roleInactive}>
              <Text style={styles.roleInactiveText}>의료진</Text>
            </View>
          </View>

          <View style={styles.form}>
            <Input
              label="이름"
              placeholder="홍길동"
              value={fullName}
              onChangeText={setFullName}
              error={errors.fullName}
              required
            />
            <Input
              label="휴대폰 번호"
              placeholder="01012345678"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              error={errors.phone}
              required
            />
            <Input
              label="이메일"
              placeholder="example@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
              required
            />
            <Input
              label="비밀번호"
              placeholder="6자 이상"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              error={errors.password}
              required
            />
            <Input
              label="비밀번호 확인"
              placeholder="비밀번호를 다시 입력하세요"
              value={passwordConfirm}
              onChangeText={setPasswordConfirm}
              secureTextEntry
              error={errors.passwordConfirm}
              required
            />
          </View>

          <View style={styles.terms}>
            <Text style={styles.termsText}>
              가입하면 이용약관 및 개인정보처리방침에 동의하는 것으로 간주합니다.
            </Text>
          </View>

          <Button
            title="가입하기"
            onPress={handleRegister}
            loading={isLoading}
            fullWidth
            size="lg"
          />
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
    paddingBottom: spacing.xxxl,
  },
  header: {
    marginTop: spacing.lg,
    marginBottom: spacing.xxl,
  },
  back: {
    marginBottom: spacing.lg,
  },
  backText: {
    ...typography.captionMedium,
    color: colors.primary,
  },
  title: {
    ...typography.headline,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.koreanCaption,
  },

  roleCard: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: radius.md,
    padding: spacing.xs,
    marginBottom: spacing.xxl,
  },
  roleActive: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.sm,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  roleActiveText: {
    ...typography.label,
    color: colors.primary,
  },
  roleInactive: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  roleInactiveText: {
    ...typography.captionMedium,
    color: colors.onSurfaceVariant,
  },

  form: {
    gap: spacing.xs,
  },
  terms: {
    marginVertical: spacing.xl,
  },
  termsText: {
    ...typography.small,
    textAlign: 'center',
  },
});
