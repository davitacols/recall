import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

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
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#f0b36d" />
      </View>
    );
  }

  if (!conversation) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFound}>Conversation not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.type}>{(conversation.post_type || 'discussion').toUpperCase()}</Text>
      <Text style={styles.title}>{conversation.title}</Text>
      <Text style={styles.meta}>
        {(conversation.author?.full_name || conversation.author_name || 'Unknown author')} •{' '}
        {new Date(conversation.created_at).toLocaleString()}
      </Text>
      <Text style={styles.body}>{conversation.content}</Text>
      <View style={styles.stats}>
        <Text style={styles.stat}>{conversation.reply_count || 0} replies</Text>
        <Text style={styles.stat}>{conversation.view_count || 0} views</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0f141d' },
  content: { padding: 18, gap: 10 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f141d' },
  notFound: { color: '#f8fafc' },
  type: { color: '#f6c287', fontSize: 12, fontWeight: '700' },
  title: { color: '#f8fafc', fontSize: 24, fontWeight: '800' },
  meta: { color: '#90a0b5', fontSize: 12 },
  body: { color: '#d4deec', fontSize: 15, lineHeight: 23, marginTop: 8 },
  stats: { flexDirection: 'row', gap: 16, marginTop: 8 },
  stat: { color: '#90a0b5', fontSize: 12 },
});
