import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, FontSize, BorderRadius, TouchTarget } from '@/constants/theme';

interface PhotoCaptureProps {
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
  maxPhotos?: number;
}

export function PhotoCapture({
  photos,
  onPhotosChange,
  maxPhotos = 5,
}: PhotoCaptureProps) {
  const handleTakePhoto = async () => {
    if (photos.length >= maxPhotos) {
      Alert.alert('\uC54C\uB9BC', `\uC0AC\uC9C4\uC740 \uCD5C\uB300 ${maxPhotos}\uC7A5\uAE4C\uC9C0 \uCCA8\uBD80\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.`);
      return;
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('\uAD8C\uD55C \uD544\uC694', '\uCE74\uBA54\uB77C \uC0AC\uC6A9\uC744 \uC704\uD574 \uAD8C\uD55C\uC774 \uD544\uC694\uD569\uB2C8\uB2E4.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets[0]) {
      onPhotosChange([...photos, result.assets[0].uri]);
    }
  };

  const handlePickImage = async () => {
    if (photos.length >= maxPhotos) {
      Alert.alert('\uC54C\uB9BC', `\uC0AC\uC9C4\uC740 \uCD5C\uB300 ${maxPhotos}\uC7A5\uAE4C\uC9C0 \uCCA8\uBD80\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.`);
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('\uAD8C\uD55C \uD544\uC694', '\uC0AC\uC9C4 \uB77C\uC774\uBE0C\uB7EC\uB9AC \uC811\uADFC\uC744 \uC704\uD574 \uAD8C\uD55C\uC774 \uD544\uC694\uD569\uB2C8\uB2E4.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsMultipleSelection: true,
      selectionLimit: maxPhotos - photos.length,
    });

    if (!result.canceled && result.assets.length > 0) {
      const newUris = result.assets.map((a) => a.uri);
      onPhotosChange([...photos, ...newUris].slice(0, maxPhotos));
    }
  };

  const handleRemovePhoto = (index: number) => {
    Alert.alert('\uC0AC\uC9C4 \uC0AD\uC81C', '\uC774 \uC0AC\uC9C4\uC744 \uC0AD\uC81C\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?', [
      { text: '\uCDE8\uC18C', style: 'cancel' },
      {
        text: '\uC0AD\uC81C',
        style: 'destructive',
        onPress: () => {
          const next = [...photos];
          next.splice(index, 1);
          onPhotosChange(next);
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {'\uC0AC\uC9C4 \uCCA8\uBD80'} ({photos.length}/{maxPhotos})
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.photoScroll}
        contentContainerStyle={styles.photoScrollContent}
      >
        {/* Camera button — navy gradient circle */}
        <TouchableOpacity
          style={styles.cameraButton}
          onPress={handleTakePhoto}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[Colors.gradient.primaryStart, Colors.gradient.primaryEnd]}
            style={styles.cameraGradient}
          >
            <Text style={styles.cameraIcon}>{'\uD83D\uDCF7'}</Text>
          </LinearGradient>
          <Text style={styles.cameraText}>{'\uCD2C\uC601'}</Text>
        </TouchableOpacity>

        {/* Gallery button */}
        <TouchableOpacity
          style={styles.galleryButton}
          onPress={handlePickImage}
          activeOpacity={0.8}
        >
          <View style={styles.galleryCircle}>
            <Text style={styles.galleryIcon}>{'\uD83D\uDDBC\uFE0F'}</Text>
          </View>
          <Text style={styles.galleryText}>{'\uAC24\uB7EC\uB9AC'}</Text>
        </TouchableOpacity>

        {/* Captured photos */}
        {photos.map((uri, index) => (
          <TouchableOpacity
            key={`photo-${index}`}
            style={styles.photoContainer}
            onPress={() => handleRemovePhoto(index)}
            activeOpacity={0.9}
          >
            <Image source={{ uri }} style={styles.photo} />
            <View style={styles.removeOverlay}>
              <Text style={styles.removeText}>{'\u2715'}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
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
  photoScroll: {
    flexGrow: 0,
  },
  photoScrollContent: {
    paddingRight: Spacing.lg,
    gap: Spacing.md,
  },
  cameraButton: {
    alignItems: 'center',
    width: 88,
  },
  cameraGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  cameraIcon: {
    fontSize: 24,
  },
  cameraText: {
    fontSize: FontSize.xs,
    color: Colors.onSurfaceVariant,
    fontWeight: '600',
  },
  galleryButton: {
    alignItems: 'center',
    width: 88,
  },
  galleryCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  galleryIcon: {
    fontSize: 24,
  },
  galleryText: {
    fontSize: FontSize.xs,
    color: Colors.onSurfaceVariant,
    fontWeight: '600',
  },
  photoContainer: {
    width: 88,
    height: 88,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  removeOverlay: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(24, 28, 30, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: {
    color: '#FFFFFF',
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
});
