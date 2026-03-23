import { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import { Colors, Spacing, Radius, FontSize, Shadows, TouchTarget } from '@/constants/theme';
import { Send, Bot, Mic, Volume2, Calendar, Heart, AlertTriangle } from '@/components/icons/TabIcons';

interface AgentMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const QUICK_ACTIONS = [
  { key: 'schedule', label: '오늘 일정', icon: Calendar },
  { key: 'medicine', label: '약 먹을 시간', icon: Heart },
  { key: 'feeling', label: '몸이 안 좋아요', icon: AlertTriangle },
];

export default function AgentScreen() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<AgentMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: '안녕하세요! 저는 홈케어 AI 도우미예요.\n무엇을 도와드릴까요?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isTyping) return;

      const userMsg: AgentMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: text.trim(),
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInput('');
      setIsTyping(true);

      try {
        const { data, error } = await supabase.functions.invoke('agent-patient-chat', {
          body: {
            message: text.trim(),
            user_id: user?.id,
            user_name: profile?.full_name,
            history: messages.slice(-6).map((m) => ({
              role: m.role,
              content: m.content,
            })),
          },
        });

        if (error) throw error;

        const assistantMsg: AgentMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data?.response ?? '죄송해요. 잠시 후 다시 말씀해주세요.',
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMsg]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            role: 'assistant',
            content: '연결이 잠시 끊겼어요. 다시 시도해주세요.',
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsTyping(false);
      }
    },
    [isTyping, messages, user?.id, profile?.full_name],
  );

  const handleQuickAction = (key: string) => {
    const actionMessages: Record<string, string> = {
      schedule: '오늘 방문 일정을 알려줘',
      medicine: '약 먹을 시간이야?',
      feeling: '몸이 안 좋아요',
    };
    sendMessage(actionMessages[key] ?? key);
  };

  const renderMessage = ({ item }: { item: AgentMessage }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.messageRow, isUser && styles.messageRowUser]}>
        {!isUser && (
          <View style={styles.botIconWrap}>
            <Bot color={Colors.onPrimary} size={20} />
          </View>
        )}
        <View
          style={[
            styles.messageBubble,
            isUser ? styles.userBubble : styles.assistantBubble,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isUser ? styles.userText : styles.assistantText,
            ]}
          >
            {item.content}
          </Text>
          {/* TTS 스피커 아이콘 (에이전트 메시지) */}
          {!isUser && (
            <TouchableOpacity style={styles.ttsBtn} activeOpacity={0.7}>
              <Volume2 color={Colors.onSurfaceVariant} size={18} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: 'AI 도우미' }} />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={100}
      >
        {/* 빠른 액션 (메시지가 적을 때) */}
        {messages.length <= 1 && (
          <View style={styles.quickSection}>
            <Text style={styles.quickTitle}>빠른 액션</Text>
            <View style={styles.quickGrid}>
              {QUICK_ACTIONS.map((action) => {
                const Icon = action.icon;
                return (
                  <TouchableOpacity
                    key={action.key}
                    style={styles.quickBtn}
                    activeOpacity={0.7}
                    onPress={() => handleQuickAction(action.key)}
                  >
                    <View style={styles.quickIconWrap}>
                      <Icon color={Colors.onPrimary} size={24} />
                    </View>
                    <Text style={styles.quickLabel}>{action.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* 메시지 리스트 */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={{
            padding: Spacing.xl,
            paddingBottom: Spacing.xxl,
          }}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
          showsVerticalScrollIndicator={false}
        />

        {/* 타이핑 인디케이터 */}
        {isTyping && (
          <View style={styles.typingRow}>
            <View style={styles.botIconWrapSmall}>
              <Bot color={Colors.onPrimary} size={14} />
            </View>
            <View style={styles.typingBubble}>
              <ActivityIndicator size="small" color={Colors.secondary} />
              <Text style={styles.typingText}>생각하고 있어요...</Text>
            </View>
          </View>
        )}

        {/* 입력 바 */}
        <View style={[styles.inputBar, { paddingBottom: insets.bottom + Spacing.sm }]}>
          {/* 마이크 버튼 (좌측, 56px) */}
          <TouchableOpacity style={styles.micBtn} activeOpacity={0.7}>
            <Mic color={Colors.onPrimary} size={24} />
          </TouchableOpacity>
          <TextInput
            style={styles.textInput}
            placeholder="말씀해주세요..."
            placeholderTextColor={Colors.onSurfaceVariant}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={1000}
            returnKeyType="send"
            onSubmitEditing={() => sendMessage(input)}
          />
          <TouchableOpacity
            style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
            activeOpacity={0.7}
            onPress={() => sendMessage(input)}
            disabled={!input.trim() || isTyping}
          >
            <Send color={Colors.onPrimary} size={20} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },

  // Quick Actions
  quickSection: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
  },
  quickTitle: {
    fontSize: FontSize.bodyLarge,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: Spacing.lg,
  },
  quickGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  quickBtn: {
    flex: 1,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
    ...Shadows.ambient,
  },
  quickIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickLabel: {
    fontSize: FontSize.caption,
    fontWeight: '700',
    color: Colors.onSurface,
    textAlign: 'center',
  },

  // Messages (큰 폰트 18px - 어르신용)
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  botIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  botIconWrapSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageBubble: {
    maxWidth: '75%',
    borderRadius: Radius.xl,
    padding: Spacing.lg,
  },
  userBubble: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: Spacing.xs,
  },
  assistantBubble: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderBottomLeftRadius: Spacing.xs,
    ...Shadows.ambient,
  },
  messageText: {
    fontSize: FontSize.bodyLarge, // 18px - 어르신용 큰 폰트
    lineHeight: 28,
  },
  userText: {
    color: Colors.onPrimary,
  },
  assistantText: {
    color: Colors.onSurface,
  },
  ttsBtn: {
    marginTop: Spacing.sm,
    alignSelf: 'flex-end',
    padding: Spacing.xs,
  },

  // Typing
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surfaceContainerLowest,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.xl,
    ...Shadows.ambient,
  },
  typingText: {
    fontSize: FontSize.caption,
    color: Colors.onSurfaceVariant,
  },

  // Input
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    backgroundColor: Colors.surfaceContainerLowest,
    gap: Spacing.sm,
    ...Shadows.float,
  },
  micBtn: {
    width: TouchTarget.comfortable,  // 56px
    height: TouchTarget.comfortable,
    borderRadius: TouchTarget.comfortable / 2,
    backgroundColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: FontSize.bodyLarge, // 18px
    color: Colors.onSurface,
    maxHeight: 100,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
});
