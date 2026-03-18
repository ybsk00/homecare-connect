import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {},
  );
  const { signIn, isLoading } = useAuth();

  const validate = (): boolean => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      newErrors.email = '\uC774\uBA54\uC77C\uC744 \uC785\uB825\uD574\uC8FC\uC138\uC694.';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = '\uC62C\uBC14\uB978 \uC774\uBA54\uC77C \uD615\uC2DD\uC774 \uC544\uB2D9\uB2C8\uB2E4.';
    }

    if (!password) {
      newErrors.password = '\uBE44\uBC00\uBC88\uD638\uB97C \uC785\uB825\uD574\uC8FC\uC138\uC694.';
    } else if (password.length < 6) {
      newErrors.password = '\uBE44\uBC00\uBC88\uD638\uB294 6\uC790 \uC774\uC0C1\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;

    try {
      await signIn(email.trim(), password);
    } catch {
      // signIn handles Alert internally
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Navy branding header */}
          <View style={styles.header}>
            <LinearGradient
              colors={[
                Colors.gradient.primaryStart,
                Colors.gradient.primaryEnd,
              ]}
              style={styles.logoContainer}
            >
              <Text style={styles.logoText}>HC</Text>
            </LinearGradient>
            <Text style={styles.title}>
              {'\uD648\uCF00\uC5B4\uCEE4\uB125\uD2B8'}
            </Text>
            <Text style={styles.subtitle}>
              {'\uAC04\uD638\uC0AC \uC804\uC6A9 \uC571'}
            </Text>
          </View>

          <View style={styles.form}>
            <Input
              label={'\uC774\uBA54\uC77C'}
              placeholder="nurse@example.com"
              value={email}
              onChangeText={setEmail}
              error={errors.email}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              required
            />

            <Input
              label={'\uBE44\uBC00\uBC88\uD638'}
              placeholder={'\uBE44\uBC00\uBC88\uD638\uB97C \uC785\uB825\uD558\uC138\uC694'}
              value={password}
              onChangeText={setPassword}
              error={errors.password}
              secureTextEntry
              autoComplete="password"
              textContentType="password"
              required
            />

            <Button
              title={'\uB85C\uADF8\uC778'}
              onPress={handleLogin}
              loading={isLoading}
              variant="primary"
              size="xl"
              fullWidth
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {'\uACC4\uC815\uC774 \uC5C6\uC73C\uC2E0\uAC00\uC694? \uC18C\uC18D \uAE30\uAD00 \uAD00\uB9AC\uC790\uC5D0\uAC8C \uBB38\uC758\uD558\uC138\uC694.'}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing['2xl'],
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing['3xl'],
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  logoText: {
    fontSize: FontSize['2xl'],
    fontWeight: '800',
    color: '#FFFFFF',
  },
  title: {
    fontSize: FontSize['2xl'],
    fontWeight: '800',
    color: Colors.onSurface,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.primary,
    fontWeight: '600',
  },
  form: {
    marginBottom: Spacing['2xl'],
  },
  footer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  footerText: {
    fontSize: FontSize.sm,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 20,
  },
});
