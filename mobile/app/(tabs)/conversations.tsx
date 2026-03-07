import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import { ChatIcon, PlusIcon } from '../../components/Icons';
import { conversationService, normalizeList } from '../../services/api';

interface Conversation {
  id: number;
  title: string;
  content: string;
  author_name?: string;
  post_type?: string;
  priority?: string;
  created_at: string;
  reply_count?: number;
  view_count?: number;
}

export default function ConversationsScreen() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchConversations = async () => {
    try {
      const response = await conversationService.list();
      setConversations(normalizeList<Conversation>(response.data));
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  const formatDate = (raw: string) => {
    const date = new Date(raw);
    const diffHours = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60));
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffHours < 24 * 7) return `${Math.floor(diffHours / 24)}d ago`;
    return date.toLocaleDateString();
  };

  const renderItem = ({ item }: { item: Conversation }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/conversation/${item.id}`)}
      activeOpacity={0.85}
    >
      <View style={styles.row}>
        <Text style={styles.type}>{(item.post_type || 'discussion').toUpperCase()}</Text>
        <Text style={styles.time}>{formatDate(item.created_at)}</Text>
      </View>
      <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
      <Text style={styles.content} numberOfLines={2}>{item.content}</Text>
      <View style={styles.row}>
        <Text style={styles.meta}>{item.author_name || 'Unknown author'}</Text>
        <Text style={styles.meta}>
          {(item.reply_count || 0)} replies • {(item.view_count || 0)} views
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator size="large" color="#f0b36d" />
        <Text style={styles.loaderText}>Loading conversations...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <ChatIcon color="#f6c287" />
          <Text style={styles.headerTitle}>Conversations</Text>
        </View>
        <TouchableOpacity style={styles.plusBtn} onPress={() => router.push('/conversations/new')}>
          <PlusIcon color="#0f141d" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={conversations}
        renderItem={renderItem}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchConversations();
            }}
            tintColor="#f0b36d"
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0f141d' },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitle: { color: '#f8fafc', fontSize: 20, fontWeight: '700' },
  plusBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f0b36d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { padding: 16 },
  card: {
    backgroundColor: '#121a27',
    borderColor: '#263246',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    gap: 6,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  type: { color: '#f6c287', fontSize: 11, fontWeight: '700' },
  time: { color: '#90a0b5', fontSize: 11 },
  title: { color: '#f8fafc', fontSize: 16, fontWeight: '700' },
  content: { color: '#c6d2e3', fontSize: 13, lineHeight: 18 },
  meta: { color: '#90a0b5', fontSize: 12 },
  loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f141d' },
  loaderText: { color: '#dbe5f3', marginTop: 10 },
});
