import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import { Colors, Spacing, Radius, FontSize, Shadows, TouchTarget } from '@/constants/theme';

type Condition = 'good' | 'okay' | 'bad' | null;

const conditionOptions: { key: Condition; label: string; icon: string; color: string }[] = [
  { key: 'good', label: '좋음', icon: '😊', color: Colors.secondary },
  { key: 'okay', label: '보통', icon: '😐', color: Colors.warning },
  { key: 'bad', label: '나쁨', icon: '😟', color: Colors.error },
];

export default function MemoScreen() {
  const { visitId, vitals, checklist } = useLocalSearchParams<{
    visitId: string;
    vitals?: string;
    checklist?: string;
  }>();
  const insets = useSafeAreaInsets();

  const [nurseNote, setNurseNote] = useState('');
  const [guardianMessage, setGuardianMessage] = useState('');
  const [painScore, setPainScore] = useState('');
  const [condition, setCondition] = useState<Condition>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);

  // -- Photo Picker --
  const handlePickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsMultipleSelection: true,
      selectionLimit: 5,
    });
    if (!result.canceled && result.assets) {
      setPhotos((prev) => [...prev, ...result.assets.map((a) => a.uri)].slice(0, 5));
    }
  };

  // -- Audio Recording --
  const handleToggleRecording = async () => {
    try {
      if (isRecording) {
        // Stop
        if (recordingRef.current) {
          await recordingRef.current.stopAndUnloadAsync();
          const uri = recordingRef.current.getURI();
          setAudioUri(uri ?? null);
          recordingRef.current = null;
        }
        setIsRecording(false);
      } else {
        // Start
        const { status } = await Audio.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('권한 필요', '음성 녹음을 위해 마이크 권한이 필요합니다');
          return;
        }
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
        const { recording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY,
        );
        recordingRef.current = recording;
        setIsRecording(true);
      }
    } catch (err) {
      Alert.alert('오류', '녹음 중 오류가 발생했습니다');
      setIsRecording(false);
    }
  };

  const handleNext = () => {
    const memoData = JSON.stringify({
      nurse_note: nurseNote,
      guardian_message: guardianMessage,
      pain_score: painScore ? parseInt(painScore) : null,
      condition,
      photo_count: photos.length,
      has_audio: !!audioUri,
    });
    router.push({
      pathname: `/nurse/visit/${visitId}/checkout`,
      params: {
        vitals: vitals ?? '{}',
        checklist: checklist ?? '[]',
        memo: memoData,
      },
    } as any);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={[styles.container, { paddingTop: insets.top }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* -- Header -- */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>{'<'} 뒤로</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>메모 입력</Text>
          <Text style={styles.stepBadge}>Step 4/5</Text>
        </View>

        {/* -- Nurse Note -- */}
        <View style={styles.fieldSection}>
          <Text style={styles.fieldLabel}>간호 노트</Text>
          <TextInput
            style={styles.textArea}
            value={nurseNote}
            onChangeText={setNurseNote}
            placeholder="방문 중 관찰사항, 특이사항 등을 기록하세요"
            placeholderTextColor={Colors.outlineVariant}
            multiline
            textAlignVertical="top"
          />
        </View>

        {/* -- Guardian Message -- */}
        <View style={styles.fieldSection}>
          <Text style={styles.fieldLabel}>보호자 전달 메시지</Text>
          <TextInput
            style={styles.textArea}
            value={guardianMessage}
            onChangeText={setGuardianMessage}
            placeholder="보호자에게 전달할 내용을 작성하세요"
            placeholderTextColor={Colors.outlineVariant}
            multiline
            textAlignVertical="top"
          />
        </View>

        {/* -- Pain Score -- */}
        <View style={styles.fieldSection}>
          <Text style={styles.fieldLabel}>통증 점수 (0-10)</Text>
          <View style={styles.painRow}>
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => {
              const selected = painScore === String(n);
              const painColor =
                n <= 3 ? Colors.secondary : n <= 6 ? Colors.warning : Colors.error;
              return (
                <TouchableOpacity
                  key={n}
                  style={[
                    styles.painButton,
                    selected && { backgroundColor: painColor },
                  ]}
                  onPress={() => setPainScore(String(n))}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.painButtonText,
                      selected && styles.painButtonTextActive,
                    ]}
                  >
                    {n}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* -- Condition -- */}
        <View style={styles.fieldSection}>
          <Text style={styles.fieldLabel}>기분 / 컨디션</Text>
          <View style={styles.conditionRow}>
            {conditionOptions.map((opt) => {
              const selected = condition === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    styles.conditionButton,
                    selected && { backgroundColor: opt.color, borderColor: opt.color },
                  ]}
                  onPress={() => setCondition(opt.key)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.conditionIcon}>{opt.icon}</Text>
                  <Text
                    style={[
                      styles.conditionLabel,
                      selected && styles.conditionLabelActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* -- Photo Attach -- */}
        <View style={styles.fieldSection}>
          <Text style={styles.fieldLabel}>사진 첨부</Text>
          <View style={styles.photoRow}>
            {photos.map((uri, i) => (
              <View key={i} style={styles.photoThumb}>
                <Image source={{ uri }} style={styles.photoImage} />
                <TouchableOpacity
                  style={styles.photoRemove}
                  onPress={() => setPhotos((p) => p.filter((_, idx) => idx !== i))}
                >
                  <Text style={styles.photoRemoveText}>X</Text>
                </TouchableOpacity>
              </View>
            ))}
            {photos.length < 5 && (
              <TouchableOpacity style={styles.photoAddButton} onPress={handlePickPhoto}>
                <Text style={styles.photoAddIcon}>+</Text>
                <Text style={styles.photoAddText}>사진</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* -- Audio Memo -- */}
        <View style={styles.fieldSection}>
          <Text style={styles.fieldLabel}>음성 메모</Text>
          <TouchableOpacity
            style={[styles.audioButton, isRecording && styles.audioButtonRecording]}
            onPress={handleToggleRecording}
            activeOpacity={0.7}
          >
            <Text style={styles.audioIcon}>{isRecording ? '⏹' : '🎤'}</Text>
            <Text style={[styles.audioText, isRecording && styles.audioTextRecording]}>
              {isRecording ? '녹음 중... (탭하여 중지)' : audioUri ? '녹음 완료 (다시 녹음)' : '탭하여 녹음 시작'}
            </Text>
          </TouchableOpacity>
          {audioUri && !isRecording && (
            <Text style={styles.audioSaved}>음성 메모가 저장되었습니다</Text>
          )}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* -- Next Button -- */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.lg }]}>
        <TouchableOpacity activeOpacity={0.8} onPress={handleNext}>
          <LinearGradient
            colors={[Colors.secondary, '#004D47']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.nextButton}
          >
            <Text style={styles.nextButtonText}>다음</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  content: { paddingHorizontal: Spacing.xl },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: Spacing.sm, marginBottom: Spacing.xl,
  },
  backButton: { paddingVertical: Spacing.sm },
  backText: { fontSize: FontSize.body, color: Colors.secondary, fontWeight: '600' },
  headerTitle: { fontSize: FontSize.bodyLarge, fontWeight: '700', color: Colors.onSurface },
  stepBadge: { fontSize: FontSize.label, color: Colors.onSurfaceVariant, fontWeight: '600' },

  // Field Section
  fieldSection: { marginBottom: Spacing.xl },
  fieldLabel: {
    fontSize: FontSize.body, fontWeight: '700', color: Colors.onSurface,
    marginBottom: Spacing.md,
  },

  // Text Area
  textArea: {
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: Radius.lg,
    padding: Spacing.lg, fontSize: FontSize.body, color: Colors.onSurface,
    minHeight: 100, lineHeight: 24, ...Shadows.ambient,
  },

  // Pain Score
  painRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm,
  },
  painButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.surfaceContainerLow,
    justifyContent: 'center', alignItems: 'center',
  },
  painButtonText: { fontSize: FontSize.caption, fontWeight: '700', color: Colors.onSurfaceVariant },
  painButtonTextActive: { color: Colors.onPrimary },

  // Condition
  conditionRow: { flexDirection: 'row', gap: Spacing.md },
  conditionButton: {
    flex: 1, alignItems: 'center', paddingVertical: Spacing.lg,
    borderRadius: Radius.lg, backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 2, borderColor: Colors.surfaceContainerHigh, ...Shadows.ambient,
  },
  conditionIcon: { fontSize: 32, marginBottom: Spacing.sm },
  conditionLabel: { fontSize: FontSize.caption, fontWeight: '700', color: Colors.onSurfaceVariant },
  conditionLabelActive: { color: Colors.onPrimary },

  // Photos
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  photoThumb: { width: 72, height: 72, borderRadius: Radius.md, overflow: 'hidden' },
  photoImage: { width: '100%', height: '100%' },
  photoRemove: {
    position: 'absolute', top: 2, right: 2, width: 20, height: 20,
    borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center', alignItems: 'center',
  },
  photoRemoveText: { fontSize: 10, color: Colors.onPrimary, fontWeight: '800' },
  photoAddButton: {
    width: 72, height: 72, borderRadius: Radius.md,
    backgroundColor: Colors.surfaceContainerLow,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: Colors.outlineVariant, borderStyle: 'dashed',
  },
  photoAddIcon: { fontSize: FontSize.title, color: Colors.onSurfaceVariant },
  photoAddText: { fontSize: FontSize.overline, color: Colors.onSurfaceVariant, marginTop: 2 },

  // Audio
  audioButton: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: Radius.lg,
    padding: Spacing.lg, minHeight: TouchTarget.comfortable, ...Shadows.ambient,
  },
  audioButtonRecording: { backgroundColor: Colors.errorContainer },
  audioIcon: { fontSize: 24 },
  audioText: { fontSize: FontSize.body, color: Colors.onSurfaceVariant, fontWeight: '600' },
  audioTextRecording: { color: Colors.error, fontWeight: '700' },
  audioSaved: {
    fontSize: FontSize.label, color: Colors.secondary, fontWeight: '600',
    marginTop: Spacing.sm, textAlign: 'center',
  },

  // Footer
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: Spacing.xl, paddingTop: Spacing.md,
    backgroundColor: Colors.surface,
  },
  nextButton: {
    borderRadius: Radius.lg, padding: Spacing.lg, alignItems: 'center',
    minHeight: TouchTarget.comfortable, justifyContent: 'center',
  },
  nextButtonText: { fontSize: FontSize.body, fontWeight: '800', color: Colors.onPrimary },
});
