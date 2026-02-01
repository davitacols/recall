import React, { useEffect, useState } from 'react';
import { View, FlatList, TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { conversationService } from '../../services/api';

interface Conversation {
  id: number;
  title: string;
  content: string;
  post_type: string;
  priority: string;
  created_at: string;
}

export default function ConversationsScreen() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const response = await conversationService.list();
      setConversations(response.data.results || response.data);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderConversation = ({ item }: { item: Conversation }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/conversation/${item.id}`)}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={[styles.badge, styles[`badge_${item.post_type}`]]}>
          {item.post_type}
        </Text>
      </View>
      <Text style={styles.content} numberOfLines={2}>
        {item.content}
      </Text>
      <Text style={styles.date}>
        {new Date(item.created_at).toLocaleDateString()}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={conversations}
        renderItem={renderConversation}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  list: {
    padding: 12,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    color: '#000',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 8,
  },
  badge_decision: {
    backgroundColor: '#FF9500',
    color: '#fff',
  },
  badge_question: {
    backgroundColor: '#5AC8FA',
    color: '#fff',
  },
  badge_proposal: {
    backgroundColor: '#34C759',
    color: '#fff',
  },
  badge_update: {
    backgroundColor: '#A2845E',
    color: '#fff',
  },
  content: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  date: {
    fontSize: 12,
    color: '#999',
  },
});
