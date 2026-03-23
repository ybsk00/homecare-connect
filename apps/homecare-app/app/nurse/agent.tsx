import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import { Colors, Spacing, Radius, FontSize, Shadows, TouchTarget } from '@/constants/theme';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const QUICK_ACTIONS = [
  { key: 'briefing', label: '오늘 브리핑', icon: '📋' },
  { key: 'next_patient', label: '다음 환자', icon: '👤' },
  { key: 'alert_patients', label: '주의 환자', icon: '🔔' },
];

export default function AgentScreen() {
  const insets = useSafeAreaInsets();
  const { staffInfo, profile } = useAuthStore();
  const scrollRef = useRef<ScrollView>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      content: `안녕하세요, ${profile?.full_name ?? '간호사'}님! 무엇을 도와드릴까요?\n\n아래 빠른 액션을 사용하거나 직접 질문해 주세요.`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('agent-nurse-chat', {
        body: {
          message: text.trim(),
          nurse_id: staffInfo?.id,
          context: {
            nurse_name: profile?.full_name,
            staff_type: staffInfo?.staff_type,
          },
        },
      });

      const reply = data?.reply ?? data?.message ?? '응답을 생성할 수 없습니다.';
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: typeof reply === 'string' ? reply : JSON.stringify(reply),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '죄송합니다, 응답을 처리하는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (key: string) => {
    const prompts: Record<string, string> = {
      briefing: '오늘 방문 일정을 브리핑해 주세요.',
      next_patient: '다음 방문할 환자 정보를 알려주세요.',
      alert_patients: '현재 주의가 필요한 환자를 알려주세요.',
    };
    sendMessage(prompts[key] ?? key);
  };

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

  const formatTime = (date: Date) => {
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* -- Header -- */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>{'<'} 뒤로</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>AI 어시스턴트</Text>
          <View style={{ width: 60 }} />
        </View>

        {/* -- Messages -- */}
        <ScrollView
          ref={scrollRef}
          style={styles.messageList}
          contentContainerStyle={styles.messageContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Quick Actions (at top) */}
          <View style={styles.quickRow}>
            {QUICK_ACTIONS.map((action) => (
              <TouchableOpacity
                key={action.key}
                style={styles.quickButton}
                onPress={() => handleQuickAction(action.key)}
                activeOpacity={0.7}
              >
                <Text style={styles.quickIcon}>{action.icon}</Text>
                <Text style={styles.quickLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {messages.map((msg) => (
            <View
              key={msg.id}
              style={[
                styles.messageBubble,
                msg.role === 'user' ? styles.userBubble : styles.assistantBubble,
              ]}
            >
              {msg.role === 'assistant' && (
                <View style={styles.assistantHeader}>
                  <Text style={styles.assistantAvatar}>🤖</Text>
                  <Text style={styles.assistantName}>AI 어시스턴트</Text>
                </View>
              )}
              <Text
                style={[
                  styles.messageText,
                  msg.role === 'user' ? styles.userText : styles.assistantText,
                ]}
              >
                {msg.content}
              </Text>
              <Text
                style={[
                  styles.messageTime,
                  msg.role === 'user' ? styles.userTime : styles.assistantTime,
                ]}
              >
                {formatTime(msg.timestamp)}
              </Text>
            </View>
          ))}

          {isLoading && (
            <View style={styles.loadingBubble}>
              <ActivityIndicator size="small" color={Colors.secondary} />
              <Text style={styles.loadingText}>생각 중...</Text>
            </View>
          )}
        </ScrollView>

        {/* -- Input -- */}
        <View style={[styles.inputContainer, { paddingBottom: insets.bottom + Spacing.sm }]}>
          <View style={styles.inputRow}>
            <TouchableOpacity style={styles.micButton} activeOpacity={0.7}>
              <Text style={styles.micIcon}>🎤</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.textInput}
              value={input}
              onChangeText={setInput}
              placeholder="메시지를 입력하세요..."
              placeholderTextColor={Colors.outlineVariant}
              returnKeyType="send"
              onSubmitEditing={() => sendMessage(input)}
              editable={!isLoading}
            />
            <TouchableOpacity
              style={[styles.sendButton, (!input.trim() || isLoading) && styles.sendButtonDisabled]}
              onPress={() => sendMessage(input)}
              disabled={!input.trim() || isLoading}
              activeOpacity={0.7}
            >
              <Text style={styles.sendIcon}>{'>'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.xl, marginTop: Spacing.sm, marginBottom: Spacing.sm,
  },
  backButton: { paddingVertical: Spacing.sm },
  backText: { fontSize: FontSize.body, color: Colors.secondary, fontWeight: '600' },
  headerTitle: { fontSize: FontSize.bodyLarge, fontWeight: '700', color: Colors.onSurface },

  // Messages
  messageList: { flex: 1 },
  messageContent: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.md },

  // Quick Actions
  quickRow: {
    flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xl, marginTop: Spacing.sm,
  },
  quickButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.xs, backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg, paddingVertical: Spacing.md, paddingHorizontal: Spacing.sm,
    ...Shadows.ambient,
  },
  quickIcon: { fontSize: 16 },
  quickLabel: { fontSize: FontSize.label, fontWeight: '700', color: Colors.primary },

  // Bubbles
  messageBubble: {
    maxWidth: '85%', borderRadius: Radius.lg, padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  userBubble: {
    alignSelf: 'flex-end', backgroundColor: Colors.primary, borderBottomRightRadius: 4,
  },
  assistantBubble: {
    alignSelf: 'flex-start', backgroundColor: Colors.surfaceContainerLowest,
    borderBottomLeftRadius: 4, ...Shadows.ambient,
  },
  assistantHeader: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.sm,
  },
  assistantAvatar: { fontSize: 16 },
  assistantName: { fontSize: FontSize.label, fontWeight: '700', color: Colors.secondary },
  messageText: { fontSize: FontSize.body, lineHeight: 24 },
  userText: { color: Colors.onPrimary },
  assistantText: { color: Colors.onSurface },
  messageTime: { fontSize: FontSize.overline, marginTop: Spacing.xs },
  userTime: { color: 'rgba(255,255,255,0.6)', textAlign: 'right' },
  assistantTime: { color: Colors.onSurfaceVariant },

  // Loading
  loadingBubble: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, alignSelf: 'flex-start',
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: Radius.lg,
    padding: Spacing.lg, ...Shadows.ambient,
  },
  loadingText: { fontSize: FontSize.caption, color: Colors.onSurfaceVariant },

  // Input
  inputContainer: {
    paddingHorizontal: Spacing.xl, paddingTop: Spacing.sm,
    backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.surfaceContainerHigh,
  },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  micButton: {
    width: TouchTarget.min, height: TouchTarget.min, borderRadius: TouchTarget.min / 2,
    backgroundColor: Colors.surfaceContainerLow, justifyContent: 'center', alignItems: 'center',
  },
  micIcon: { fontSize: 20 },
  textInput: {
    flex: 1, backgroundColor: Colors.surfaceContainerLowest, borderRadius: Radius.xl,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    fontSize: FontSize.body, color: Colors.onSurface, minHeight: TouchTarget.min,
    ...Shadows.ambient,
  },
  sendButton: {
    width: TouchTarget.min, height: TouchTarget.min, borderRadius: TouchTarget.min / 2,
    backgroundColor: Colors.secondary, justifyContent: 'center', alignItems: 'center',
  },
  sendButtonDisabled: { backgroundColor: Colors.outlineVariant },
  sendIcon: { fontSize: FontSize.bodyLarge, fontWeight: '800', color: Colors.onPrimary },
});
