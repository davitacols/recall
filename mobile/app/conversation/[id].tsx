import React, { useEffect, useState } from 'react';
import { View, ScrollView, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { conversationService } from '../../services/api';

interface Conversation {
  id: number;
  title: string;
  content: string;
  post_type: string;
  priority: string;
  author: { full_name: string };
  created_at: string;
  reply_count: number;
  view_count: number;
}

export default function ConversationDetailScreen() {
  const { id } = useLocalSearchParams();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConversation();
  }, [id]);

  const loadConversation = async () => {
    try {
      const response = await conversationService.get(Number(id));
      setConversation(response.data);
    } catch (error) {
      console.error('Failed to load conversation:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!conversation) {
    return (
      <View style={styles.center}>
        <Text>Conversation not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{conversation.title}</Text>
        <View style={styles.meta}>
          <Text style={[styles.badge, styles[`badge_${conversation.post_type}`]]}>
            {conversation.post_type}
          </Text>
          <Text style={[styles.priority, styles[`priority_${conversation.priority}`]]}>
            {conversation.priority}
          </Text>
        </View>
      </View>

      <View style={styles.info}>
        <Text style={styles.author}>By {conversation.author.full_name}</Text>
        <Text style={styles.date}>
          {new Date(conversation.created_at).toLocaleDateString()}
        </Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.contentText}>{conversation.content}</Text>
      </View>

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Views</Text>
          <Text style={styles.statValue}>{conversation.view_count}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Replies</Text>
          <Text style={styles.statValue}>{conversation.reply_count}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#000',
  },
  meta: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 12,
    fontWeight: '500',
    color: '#fff',
  },
  badge_decision: {
    backgroundColor: '#FF9500',
  },
  badge_question: {
    backgroundColor: '#5AC8FA',
  },
  badge_proposal: {
    backgroundColor: '#34C759',
  },
  badge_update: {
    backgroundColor: '#A2845E',
  },
  priority: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 12,
    fontWeight: '500',
    color: '#fff',
  },
  priority_high: {
    backgroundColor: '#FF3B30',
  },
  priority_medium: {
    backgroundColor: '#FF9500',
  },
  priority_low: {
    backgroundColor: '#34C759',
  },
  info: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  author: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  date: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  content: {
    padding: 16,
  },
  contentText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  stats: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 4,
  },
});
