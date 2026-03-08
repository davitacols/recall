import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { Brand } from '../../constants/brand';
import { conversationService } from '../../services/api';

interface Conversation {
  id: number;
  title: string;
  content: string;
  post_type?: string;
  priority?: string;
  author?: { full_name?: string };
  author_name?: string;
  created_at: string;
  reply_count?: number;
  view_count?: number;
}

export default function ConversationDetailScreen() {
  const c = Brand.colors;
  const { id } = useLocalSearchParams();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await conversationService.get(Number(id));
        setConversation(response.data);
      } catch (error) {
        console.error('Failed to load conversation:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <ActivityIndicator size="large" color={c.accent} />
      </View>
    );
  }

  if (!conversation) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <Text style={[styles.notFound, { color: c.text }]}>Conversation not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.screen, { backgroundColor: c.bg }]} contentContainerStyle={styles.content}>
      <View style={[styles.banner, { borderColor: c.border, backgroundColor: c.surface }]}>
        <Text style={[styles.type, { color: c.accentSoft }]}>{(conversation.post_type || 'discussion').toUpperCase()}</Text>
        <Text style={[styles.title, { color: c.text }]}>{conversation.title}</Text>
        <Text style={[styles.meta, { color: c.textMuted }]}>
          {(conversation.author?.full_name || conversation.author_name || 'Unknown author')} |{' '}
          {new Date(conversation.created_at).toLocaleString()}
        </Text>
      </View>

      <View style={[styles.bodyCard, { borderColor: c.border, backgroundColor: c.surface }]}>
        <Text style={[styles.body, { color: c.text }]}>{conversation.content}</Text>
      </View>

      <View style={[styles.stats, { borderColor: c.border, backgroundColor: c.surfaceAlt }]}>
        <Text style={[styles.stat, { color: c.textMuted }]}>{conversation.reply_count || 0} replies</Text>
        <Text style={[styles.stat, { color: c.textMuted }]}>{conversation.view_count || 0} views</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, gap: 10 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFound: { fontSize: 14, fontWeight: '700' },
  banner: { borderWidth: 1, padding: 12, gap: 6 },
  type: { fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },
  title: { fontSize: 23, fontWeight: '900', lineHeight: 30 },
  meta: { fontSize: 12 },
  bodyCard: { borderWidth: 1, padding: 12 },
  body: { fontSize: 15, lineHeight: 23 },
  stats: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stat: { fontSize: 12, fontWeight: '700' },
});
