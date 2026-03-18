import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Audio } from 'expo-av';
import { Colors, Spacing, FontSize, BorderRadius, TouchTarget } from '@/constants/theme';

interface VoiceMemoProps {
  voiceMemoUri: string | null;
  onVoiceMemoChange: (uri: string | null) => void;
}

export function VoiceMemo({ voiceMemoUri, onVoiceMemoChange }: VoiceMemoProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Pulse animation for recording
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    if (isRecording) {
      pulseScale.value = withRepeat(
        withTiming(1.15, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      );
    } else {
      pulseScale.value = withTiming(1, { duration: 200 });
    }
  }, [isRecording]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      soundRef.current?.unloadAsync();
    };
  }, []);

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('\uAD8C\uD55C \uD544\uC694', '\uC74C\uC131 \uB179\uC74C\uC744 \uC704\uD574 \uB9C8\uC774\uD06C \uAD8C\uD55C\uC774 \uD544\uC694\uD569\uB2C8\uB2E4.');
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
      setRecordingDuration(0);

      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('\uB179\uC74C \uC2DC\uC791 \uC2E4\uD328:', error);
      Alert.alert('\uC624\uB958', '\uB179\uC74C\uC744 \uC2DC\uC791\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.');
    }
  };

  const stopRecording = async () => {
    if (!recordingRef.current) return;

    try {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      setIsRecording(false);

      if (uri) {
        onVoiceMemoChange(uri);
      }
    } catch (error) {
      console.error('\uB179\uC74C \uC911\uC9C0 \uC2E4\uD328:', error);
    }
  };

  const playRecording = async () => {
    if (!voiceMemoUri) return;

    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      const { sound } = await Audio.Sound.createAsync(
        { uri: voiceMemoUri },
        { shouldPlay: true },
      );

      soundRef.current = sound;
      setIsPlaying(true);

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          setPlaybackPosition(status.positionMillis / 1000);
          setPlaybackDuration((status.durationMillis ?? 0) / 1000);

          if (status.didJustFinish) {
            setIsPlaying(false);
            setPlaybackPosition(0);
          }
        }
      });
    } catch (error) {
      console.error('\uC7AC\uC0DD \uC2E4\uD328:', error);
      Alert.alert('\uC624\uB958', '\uC74C\uC131 \uBA54\uBAA8\uB97C \uC7AC\uC0DD\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.');
    }
  };

  const stopPlaying = async () => {
    try {
      await soundRef.current?.stopAsync();
      setIsPlaying(false);
      setPlaybackPosition(0);
    } catch (error) {
      console.error('\uC7AC\uC0DD \uC911\uC9C0 \uC2E4\uD328:', error);
    }
  };

  const deleteRecording = () => {
    Alert.alert('\uC0AD\uC81C', '\uC74C\uC131 \uBA54\uBAA8\uB97C \uC0AD\uC81C\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?', [
      { text: '\uCDE8\uC18C', style: 'cancel' },
      {
        text: '\uC0AD\uC81C',
        style: 'destructive',
        onPress: () => {
          soundRef.current?.unloadAsync();
          onVoiceMemoChange(null);
          setPlaybackPosition(0);
          setPlaybackDuration(0);
        },
      },
    ]);
  };

  // Calculate progress
  const progress =
    playbackDuration > 0 ? (playbackPosition / playbackDuration) * 100 : 0;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{'\uC74C\uC131 \uBA54\uBAA8'}</Text>

      {!voiceMemoUri && !isRecording && (
        <TouchableOpacity
          style={styles.recordArea}
          onPress={startRecording}
          activeOpacity={0.8}
        >
          <View style={styles.recordCircle}>
            <View style={styles.recordDot} />
          </View>
          <Text style={styles.recordText}>
            {'\uD0ED\uD558\uC5EC \uB179\uC74C \uC2DC\uC791'}
          </Text>
        </TouchableOpacity>
      )}

      {isRecording && (
        <View style={styles.recordingContainer}>
          <Animated.View style={[styles.recordingPulse, pulseStyle]}>
            <View style={styles.recordingDotLarge} />
          </Animated.View>
          <Text style={styles.recordingTime}>
            {formatTime(recordingDuration)}
          </Text>
          <Text style={styles.recordingHint}>{'\uB179\uC74C \uC911...'}</Text>
          <TouchableOpacity
            style={styles.stopButton}
            onPress={stopRecording}
            activeOpacity={0.8}
          >
            <View style={styles.stopIcon} />
            <Text style={styles.stopText}>{'\uB179\uC74C \uC911\uC9C0'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {voiceMemoUri && !isRecording && (
        <View style={styles.playbackContainer}>
          <View style={styles.playbackInfo}>
            <View style={styles.playbackAvatar}>
              <Text style={styles.playbackAvatarIcon}>{'\uD83C\uDFA4'}</Text>
            </View>
            <View style={styles.playbackDetails}>
              <Text style={styles.playbackLabel}>{'\uC74C\uC131 \uBA54\uBAA8'}</Text>
              <Text style={styles.playbackTime}>
                {formatTime(playbackPosition)} /{' '}
                {formatTime(playbackDuration || recordingDuration)}
              </Text>
            </View>
          </View>

          {/* Progress bar */}
          <View style={styles.progressTrack}>
            <View
              style={[styles.progressFill, { width: `${progress}%` }]}
            />
          </View>

          <View style={styles.playbackActions}>
            {isPlaying ? (
              <TouchableOpacity
                style={styles.playButton}
                onPress={stopPlaying}
                activeOpacity={0.8}
              >
                <Text style={styles.playButtonText}>
                  {'\u23F8 \uC77C\uC2DC\uC815\uC9C0'}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.playButton}
                onPress={playRecording}
                activeOpacity={0.8}
              >
                <Text style={styles.playButtonText}>
                  {'\u25B6 \uC7AC\uC0DD'}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={deleteRecording}
              activeOpacity={0.8}
            >
              <Text style={styles.deleteText}>{'\uC0AD\uC81C'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.xl,
  },
  label: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.onSurface,
    marginBottom: Spacing.lg,
  },
  recordArea: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surfaceContainerLow,
    minHeight: 72,
  },
  recordCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 106, 99, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.lg,
  },
  recordDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.secondary,
  },
  recordText: {
    fontSize: FontSize.md,
    color: Colors.onSurfaceVariant,
    fontWeight: '500',
  },
  recordingContainer: {
    backgroundColor: 'rgba(0, 106, 99, 0.06)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  recordingPulse: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0, 106, 99, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  recordingDotLarge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.secondary,
  },
  recordingTime: {
    fontSize: FontSize['2xl'],
    fontWeight: '800',
    color: Colors.primary,
  },
  recordingHint: {
    fontSize: FontSize.sm,
    color: Colors.secondary,
    marginBottom: Spacing.xl,
    marginTop: Spacing.xs,
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    minHeight: TouchTarget.minimum,
  },
  stopIcon: {
    width: 16,
    height: 16,
    backgroundColor: Colors.onPrimary,
    borderRadius: 2,
    marginRight: Spacing.sm,
  },
  stopText: {
    fontSize: FontSize.md,
    color: Colors.onPrimary,
    fontWeight: '700',
  },
  playbackContainer: {
    backgroundColor: 'rgba(0, 32, 69, 0.04)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
  },
  playbackInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  playbackAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 32, 69, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  playbackAvatarIcon: {
    fontSize: 18,
  },
  playbackDetails: {
    flex: 1,
  },
  playbackLabel: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.onSurface,
  },
  playbackTime: {
    fontSize: FontSize.sm,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.surfaceContainerHigh,
    marginBottom: Spacing.lg,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: Colors.primary,
  },
  playbackActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  playButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    minHeight: TouchTarget.minimum,
    justifyContent: 'center',
  },
  playButtonText: {
    fontSize: FontSize.md,
    color: Colors.onPrimary,
    fontWeight: '700',
  },
  deleteButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.errorContainer,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: TouchTarget.minimum,
  },
  deleteText: {
    fontSize: FontSize.md,
    color: Colors.error,
    fontWeight: '600',
  },
});
