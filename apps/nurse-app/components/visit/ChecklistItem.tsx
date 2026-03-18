import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Colors, Spacing, FontSize, BorderRadius, TouchTarget } from '@/constants/theme';

interface ChecklistItemProps {
  item: string;
  done: boolean;
  note?: string;
  onToggle: (done: boolean) => void;
  onNoteChange: (note: string) => void;
}

export function ChecklistItem({
  item,
  done,
  note,
  onToggle,
  onNoteChange,
}: ChecklistItemProps) {
  const [showNote, setShowNote] = useState(!!note || !done);
  const [reasonRequired, setReasonRequired] = useState(false);

  const handleToggle = () => {
    const newDone = !done;
    onToggle(newDone);
    if (!newDone) {
      setReasonRequired(true);
      setShowNote(true);
    } else {
      setReasonRequired(false);
    }
  };

  return (
    <View
      style={[
        styles.container,
        done ? styles.doneContainer : undefined,
        !done && reasonRequired ? styles.missedContainer : undefined,
      ]}
    >
      <TouchableOpacity
        style={styles.row}
        onPress={handleToggle}
        activeOpacity={0.7}
      >
        <View style={[styles.checkbox, done && styles.checkboxDone]}>
          {done && <Text style={styles.checkMark}>{'\u2713'}</Text>}
        </View>
        <Text style={[styles.itemText, done && styles.itemTextDone]}>
          {item}
        </Text>
        <TouchableOpacity
          onPress={() => setShowNote(!showNote)}
          style={styles.noteToggle}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.noteToggleText}>
            {showNote ? '\uC811\uAE30' : '\uBA54\uBAA8'}
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>

      {showNote && (
        <View style={styles.noteContainer}>
          {!done && reasonRequired && (
            <Text style={styles.reasonLabel}>
              {'\uBBF8\uC218\uD589 \uC0AC\uC720\uB97C \uC785\uB825\uD574\uC8FC\uC138\uC694'}
            </Text>
          )}
          <TextInput
            style={styles.noteInput}
            value={note ?? ''}
            onChangeText={onNoteChange}
            placeholder={
              done
                ? '\uCC38\uACE0 \uBA54\uBAA8 (\uC120\uD0DD)'
                : '\uBBF8\uC218\uD589 \uC0AC\uC720\uB97C \uC785\uB825\uD558\uC138\uC694'
            }
            placeholderTextColor={Colors.outline}
            multiline
            textAlignVertical="top"
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  doneContainer: {
    backgroundColor: 'rgba(0, 106, 99, 0.06)',
  },
  missedContainer: {
    backgroundColor: 'rgba(50, 27, 0, 0.06)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    minHeight: TouchTarget.comfortable,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  checkboxDone: {
    backgroundColor: Colors.secondary,
  },
  checkMark: {
    color: '#FFFFFF',
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  itemText: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.onSurface,
    fontWeight: '500',
  },
  itemTextDone: {
    color: Colors.secondary,
  },
  noteToggle: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  noteToggleText: {
    fontSize: FontSize.xs,
    color: Colors.secondary,
    fontWeight: '600',
  },
  noteContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  reasonLabel: {
    fontSize: FontSize.xs,
    color: Colors.tertiary,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  noteInput: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    fontSize: FontSize.sm,
    color: Colors.onSurface,
    minHeight: TouchTarget.minimum,
  },
});
