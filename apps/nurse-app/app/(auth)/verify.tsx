import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';

export default function VerifyScreen() {
  const { userId, signOut } = useAuth();
  const [licenseNumber, setLicenseNumber] = useState('');
  const [orgCode, setOrgCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ license?: string; org?: string }>({});

  const validate = (): boolean => {
    const newErrors: { license?: string; org?: string } = {};

    if (!licenseNumber.trim()) {
      newErrors.license = '\uAC04\uD638\uC0AC \uBA74\uD5C8\uBC88\uD638\uB97C \uC785\uB825\uD574\uC8FC\uC138\uC694.';
    } else if (licenseNumber.trim().length < 4) {
      newErrors.license = '\uC62C\uBC14\uB978 \uBA74\uD5C8\uBC88\uD638\uB97C \uC785\uB825\uD574\uC8FC\uC138\uC694.';
    }

    if (!orgCode.trim()) {
      newErrors.org = '\uC18C\uC18D \uAE30\uAD00 \uCF54\uB4DC\uB97C \uC785\uB825\uD574\uC8FC\uC138\uC694.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleVerify = async () => {
    if (!validate() || !userId) return;

    setIsLoading(true);
    try {
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('id, name')
        .eq('business_number', orgCode.trim())
        .single();

      if (orgError || !org) {
        Alert.alert(
          '\uC624\uB958',
          '\uD574\uB2F9 \uAE30\uAD00 \uCF54\uB4DC\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4. \uAE30\uAD00 \uAD00\uB9AC\uC790\uC5D0\uAC8C \uBB38\uC758\uD558\uC138\uC694.',
        );
        return;
      }

      const { data: existingStaff } = await supabase
        .from('staff')
        .select('id')
        .eq('user_id', userId)
        .eq('org_id', org.id)
        .single();

      if (existingStaff) {
        await supabase
          .from('staff')
          .update({
            license_number: licenseNumber.trim(),
            is_active: true,
          })
          .eq('id', existingStaff.id);
      } else {
        const { error: staffError } = await supabase.from('staff').insert({
          user_id: userId,
          org_id: org.id,
          staff_type: 'nurse',
          license_number: licenseNumber.trim(),
          specialties: [],
          max_patients: 15,
          current_patient_count: 0,
          is_active: true,
        });

        if (staffError) {
          throw staffError;
        }
      }

      await supabase
        .from('profiles')
        .update({ role: 'nurse', updated_at: new Date().toISOString() })
        .eq('id', userId);

      Alert.alert(
        '\uC778\uC99D \uC644\uB8CC',
        `${org.name}\uC5D0 \uAC04\uD638\uC0AC\uB85C \uB4F1\uB85D\uB418\uC5C8\uC2B5\uB2C8\uB2E4.`,
        [
          {
            text: '\uD655\uC778',
            onPress: () => {
              router.replace('/');
            },
          },
        ],
      );
    } catch (error) {
      console.error('\uBA74\uD5C8 \uC778\uC99D \uC2E4\uD328:', error);
      Alert.alert('\uC624\uB958', '\uC778\uC99D\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4. \uB2E4\uC2DC \uC2DC\uB3C4\uD574\uC8FC\uC138\uC694.');
    } finally {
      setIsLoading(false);
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
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>{'\uD83E\uDEAA'}</Text>
            </View>
            <Text style={styles.title}>
              {'\uAC04\uD638\uC0AC \uBA74\uD5C8 \uC778\uC99D'}
            </Text>
            <Text style={styles.subtitle}>
              {'\uC11C\uBE44\uC2A4 \uC774\uC6A9\uC744 \uC704\uD574 \uAC04\uD638\uC0AC \uBA74\uD5C8\uBC88\uD638\uC640\n\uC18C\uC18D \uAE30\uAD00 \uCF54\uB4DC\uB97C \uC785\uB825\uD574\uC8FC\uC138\uC694.'}
            </Text>
          </View>

          <View style={styles.form}>
            <Input
              label={'\uAC04\uD638\uC0AC \uBA74\uD5C8\uBC88\uD638'}
              placeholder={'\uBA74\uD5C8\uBC88\uD638\uB97C \uC785\uB825\uD558\uC138\uC694'}
              value={licenseNumber}
              onChangeText={setLicenseNumber}
              error={errors.license}
              keyboardType="default"
              autoCapitalize="characters"
              required
            />

            <Input
              label={'\uC18C\uC18D \uAE30\uAD00 \uCF54\uB4DC'}
              placeholder={'\uAE30\uAD00 \uC0AC\uC5C5\uC790\uB4F1\uB85D\uBC88\uD638 (000-00-00000)'}
              value={orgCode}
              onChangeText={setOrgCode}
              error={errors.org}
              hint={'\uC18C\uC18D \uAE30\uAD00 \uAD00\uB9AC\uC790\uC5D0\uAC8C \uAE30\uAD00 \uCF54\uB4DC\uB97C \uBB38\uC758\uD558\uC138\uC694.'}
              required
            />

            <Button
              title={'\uC778\uC99D\uD558\uAE30'}
              onPress={handleVerify}
              loading={isLoading}
              variant="primary"
              size="xl"
              fullWidth
            />
          </View>

          <View style={styles.footer}>
            <Button
              title={'\uB85C\uADF8\uC544\uC6C3'}
              onPress={signOut}
              variant="ghost"
              size="md"
            />
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
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 32, 69, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  icon: {
    fontSize: 40,
  },
  title: {
    fontSize: FontSize['2xl'],
    fontWeight: '800',
    color: Colors.onSurface,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    marginBottom: Spacing['2xl'],
  },
  footer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
});
