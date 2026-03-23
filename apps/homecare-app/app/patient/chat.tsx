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
import { Colors, Spacing, Radius, FontSize, Shadows } from '@/constants/theme';
import { Send, Bot, User } from '@/components/icons/TabIcons';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const SUGGESTED_QUESTIONS = [
  '혈압이 높을 때 어떻게 해야 하나요?',
  '방문 간호 서비스는 어떤 것이 있나요?',
  '요양등급 신청 방법을 알려주세요',
  '약 복용 시 주의사항이 궁금합니다',
];

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: '안녕하세요! 홈케어커넥트 AI 상담사입니다.\n건강 관련 궁금한 점을 물어보세요.',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isTyping) return;

      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: text.trim(),
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInput('');
      setIsTyping(true);

      try {
        const { data, error } = await supabase.functions.invoke('rag-chat', {
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

        const assistantMsg: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data?.response ?? '죄송합니다. 잠시 후 다시 시도해주세요.',
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMsg]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            role: 'assistant',
            content: '네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsTyping(false);
      }
    },
    [isTyping, messages, user?.id, profile?.full_name],
  );

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.messageRow, isUser && styles.messageRowUser]}>
        {!isUser && (
          <View style={styles.botIconWrap}>
            <Bot color={Colors.onPrimary} size={18} />
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
        </View>
      </View>
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: 'AI 상담' }} />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={100}
      >
        {/* 추천 질문 (메시지가 적을 때) */}
        {messages.length <= 1 && (
          <View style={styles.suggestedSection}>
            <Text style={styles.suggestedTitle}>추천 질문</Text>
            <View style={styles.suggestedGrid}>
              {SUGGESTED_QUESTIONS.map((q, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.suggestedChip}
                  activeOpacity={0.7}
                  onPress={() => sendMessage(q)}
                >
                  <Text style={styles.suggestedText}>{q}</Text>
                </TouchableOpacity>
              ))}
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
            <View style={styles.botIconWrap}>
              <Bot color={Colors.onPrimary} size={14} />
            </View>
            <View style={styles.typingBubble}>
              <ActivityIndicator size="small" color={Colors.secondary} />
              <Text style={styles.typingText}>답변 작성 중...</Text>
            </View>
          </View>
        )}

        {/* 입력 바 */}
        <View style={[styles.inputBar, { paddingBottom: insets.bottom + Spacing.sm }]}>
          <TextInput
            style={styles.textInput}
            placeholder="메시지를 입력하세요..."
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

  // Suggested
  suggestedSection: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
  },
  suggestedTitle: {
    fontSize: FontSize.caption,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
    marginBottom: Spacing.sm,
  },
  suggestedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  suggestedChip: {
    backgroundColor: `${Colors.secondary}15`,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.xl,
  },
  suggestedText: {
    fontSize: FontSize.label,
    fontWeight: '600',
    color: Colors.secondary,
  },

  // Messages
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  botIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
    fontSize: FontSize.body,
    lineHeight: 24,
  },
  userText: {
    color: Colors.onPrimary,
  },
  assistantText: {
    color: Colors.onSurface,
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
    fontSize: FontSize.label,
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
  textInput: {
    flex: 1,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: FontSize.body,
    color: Colors.onSurface,
    maxHeight: 100,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
});
