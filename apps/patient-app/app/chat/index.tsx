import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { colors, spacing, radius, typography } from '@/constants/theme';
import type { ChatMessage as Message } from '@homecare/shared-types';

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        '안녕하세요! 홈케어커넥트 AI 상담봇입니다.\n\n방문간호, 장기요양, 건강 관리에 대해 궁금한 점을 물어보세요.',
      createdAt: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const [conversationId] = useState(() => crypto.randomUUID?.() ?? `conv-${Date.now()}`);

  const sendMessage = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('rag-chat', {
        body: {
          message: trimmed,
          conversation_id: conversationId,
        },
      });

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data?.answer ?? '죄송합니다. 일시적으로 응답을 생성할 수 없습니다. 잠시 후 다시 시도해주세요.',
        sources: data?.sources,
        actions: data?.follow_up_actions,
        createdAt: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: '네트워크 오류가 발생했습니다. 인터넷 연결을 확인 후 다시 시도해주세요.',
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, conversationId]);

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';

    return (
      <View style={[styles.messageBubbleRow, isUser && styles.messageBubbleRowUser]}>
        {isUser ? (
          // User bubble: navy gradient
          <LinearGradient
            colors={[colors.primary, colors.primaryContainer]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.messageBubble, styles.userBubble]}
          >
            <Text style={[styles.messageText, styles.userText]}>
              {item.content}
            </Text>
          </LinearGradient>
        ) : (
          // Assistant bubble: white on surface
          <View style={[styles.messageBubble, styles.assistantBubble]}>
            <Text style={styles.messageText}>
              {item.content}
            </Text>

            {item.sources && item.sources.length > 0 && (
              <View style={styles.sources}>
                <Text style={styles.sourcesLabel}>참고 자료:</Text>
                {item.sources.map((src, idx) => (
                  <Text key={idx} style={styles.sourceItem}>
                    {idx + 1}. {src.title}
                  </Text>
                ))}
              </View>
            )}

            {item.actions && item.actions.length > 0 && (
              <View style={styles.actions}>
                {item.actions.map((action, idx) => (
                  <TouchableOpacity key={idx} style={styles.actionButton}>
                    <Text style={styles.actionText}>{action.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  // Suggested questions in teal chips
  const suggestedQuestions = [
    '장기요양등급 신청 방법이 궁금해요',
    '방문간호 서비스에는 어떤 것이 포함되나요?',
    '혈압이 높을 때 주의할 점은?',
    '환자 식사 관리 방법을 알려주세요',
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
        keyboardVerticalOffset={90}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
          ListHeaderComponent={
            messages.length <= 1 ? (
              <View style={styles.suggestions}>
                <Text style={styles.suggestionsTitle}>이런 질문을 해보세요</Text>
                {suggestedQuestions.map((q, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.suggestionChip}
                    onPress={() => setInput(q)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.suggestionText}>{q}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null
          }
        />

        {isLoading && (
          <View style={styles.typingIndicator}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.typingText}>AI가 답변을 작성 중...</Text>
          </View>
        )}

        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            value={input}
            onChangeText={setInput}
            placeholder="질문을 입력하세요..."
            placeholderTextColor={colors.outlineVariant}
            multiline
            maxLength={2000}
            editable={!isLoading}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
          />
          <TouchableOpacity
            onPress={sendMessage}
            disabled={!input.trim() || isLoading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={
                !input.trim() || isLoading
                  ? [colors.surfaceContainerHigh, colors.surfaceContainerHigh]
                  : [colors.primary, colors.primaryContainer]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.sendButton}
            >
              <Text style={styles.sendText}>전송</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  flex: { flex: 1 },
  messageList: { padding: spacing.xl, paddingBottom: spacing.sm },

  messageBubbleRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    justifyContent: 'flex-start',
  },
  messageBubbleRowUser: {
    justifyContent: 'flex-end',
  },
  messageBubble: {
    maxWidth: '80%',
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  userBubble: {
    borderBottomRightRadius: spacing.xs,
  },
  assistantBubble: {
    backgroundColor: colors.surfaceContainerLowest,
    borderBottomLeftRadius: spacing.xs,
  },
  messageText: {
    ...typography.koreanBody,
    fontSize: 15,
    color: colors.onSurface,
  },
  userText: {
    color: colors.onPrimary,
  },

  sources: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    // Tonal separator
    backgroundColor: colors.surfaceContainerLow,
    marginHorizontal: -spacing.md,
    marginBottom: -spacing.md,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderBottomLeftRadius: spacing.xs,
    borderBottomRightRadius: radius.lg,
  },
  sourcesLabel: {
    ...typography.small,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  sourceItem: {
    fontSize: 12,
    color: colors.primary,
    marginBottom: 2,
  },
  actions: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  actionButton: {
    backgroundColor: colors.vital.normal.bg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondary,
  },

  suggestions: {
    marginBottom: spacing.xl,
  },
  suggestionsTitle: {
    ...typography.label,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.md,
  },
  suggestionChip: {
    backgroundColor: colors.vital.normal.bg,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  suggestionText: {
    ...typography.captionMedium,
    color: colors.secondary,
  },

  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  typingText: {
    ...typography.small,
  },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surfaceContainerLowest,
    // NO border - tonal shift from surface
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: 20,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 15,
    maxHeight: 100,
    color: colors.onSurface,
    lineHeight: 22,
  },
  sendButton: {
    marginLeft: spacing.sm,
    borderRadius: 20,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  sendText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.onPrimary,
  },
});
