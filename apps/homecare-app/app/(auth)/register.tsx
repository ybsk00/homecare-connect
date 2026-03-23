import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/auth-store';
import { Colors, Spacing, Radius, FontSize, Shadows } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';

type RoleOption = { key: 'guardian' | 'nurse' | 'org_admin'; label: string; desc: string };

const ROLES: RoleOption[] = [
  { key: 'guardian', label: '보호자', desc: '환자/어르신의 보호자' },
  { key: 'nurse', label: '간호사', desc: '방문간호 전문 인력' },
  { key: 'org_admin', label: '기관 관리자', desc: '방문간호센터 관리자' },
];

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const { signUp, isLoading } = useAuthStore();
  const [step, setStep] = useState<'role' | 'form'>('role');
  const [selectedRole, setSelectedRole] = useState<RoleOption['key']>('guardian');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleRegister = async () => {
    setError('');
    if (!fullName.trim() || !phone.trim() || !email.trim() || !password.trim()) {
      setError('모든 항목을 입력해주세요.');
      return;
    }
    if (password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.');
      return;
    }
    const result = await signUp(email.trim(), password, {
      full_name: fullName.trim(),
      phone: phone.replace(/\D/g, ''),
      role: selectedRole,
    });
    if (result.error) {
      setError(result.error);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 20 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* 뒤로가기 */}
        <TouchableOpacity onPress={() => step === 'form' ? setStep('role') : router.back()} style={styles.back}>
          <Text style={styles.backText}>← 뒤로</Text>
        </TouchableOpacity>

        <Text style={styles.title}>회원가입</Text>
        <Text style={styles.subtitle}>
          {step === 'role' ? '역할을 선택해주세요' : '정보를 입력해주세요'}
        </Text>

        {step === 'role' ? (
          <View style={styles.roleList}>
            {ROLES.map((role) => (
              <TouchableOpacity
                key={role.key}
                style={[
                  styles.roleCard,
                  selectedRole === role.key && styles.roleCardActive,
                ]}
                onPress={() => setSelectedRole(role.key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.roleLabel, selectedRole === role.key && styles.roleLabelActive]}>
                  {role.label}
                </Text>
                <Text style={styles.roleDesc}>{role.desc}</Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity onPress={() => setStep('form')} activeOpacity={0.85} style={styles.buttonWrapper}>
              <LinearGradient
                colors={[Colors.primary, Colors.secondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.button}
              >
                <Text style={styles.buttonText}>다음</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="이름"
              placeholderTextColor={Colors.onSurfaceVariant + '60'}
            />
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={(t) => setPhone(t.replace(/\D/g, ''))}
              placeholder="전화번호 (숫자만)"
              placeholderTextColor={Colors.onSurfaceVariant + '60'}
              keyboardType="phone-pad"
            />
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="이메일"
              placeholderTextColor={Colors.onSurfaceVariant + '60'}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="비밀번호 (6자 이상)"
              placeholderTextColor={Colors.onSurfaceVariant + '60'}
              secureTextEntry
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity onPress={handleRegister} disabled={isLoading} activeOpacity={0.85} style={styles.buttonWrapper}>
              <LinearGradient
                colors={[Colors.primary, Colors.secondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.button}
              >
                {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>가입하기</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.surface },
  container: { flexGrow: 1, paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxxl },
  back: { marginBottom: Spacing.xl },
  backText: { fontSize: FontSize.body, color: Colors.onSurfaceVariant, fontWeight: '500' },
  title: { fontSize: FontSize.title, fontWeight: '800', color: Colors.primary, marginBottom: Spacing.sm },
  subtitle: { fontSize: FontSize.body, color: Colors.onSurfaceVariant, marginBottom: Spacing.xxl },
  roleList: { gap: Spacing.md },
  roleCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    ...Shadows.ambient,
  },
  roleCardActive: { backgroundColor: Colors.primary },
  roleLabel: { fontSize: FontSize.subtitle, fontWeight: '700', color: Colors.onSurface },
  roleLabelActive: { color: '#fff' },
  roleDesc: { fontSize: FontSize.caption, color: Colors.onSurfaceVariant, marginTop: 4 },
  form: { gap: Spacing.lg },
  input: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    fontSize: FontSize.body,
    color: Colors.onSurface,
  },
  error: { fontSize: FontSize.caption, color: Colors.error, textAlign: 'center' },
  buttonWrapper: { marginTop: Spacing.md },
  button: { height: 56, borderRadius: Radius.lg, justifyContent: 'center', alignItems: 'center', ...Shadows.float },
  buttonText: { fontSize: FontSize.body, fontWeight: '700', color: '#fff' },
});
