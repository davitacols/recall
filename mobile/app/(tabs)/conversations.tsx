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
import MotionScreen from '../../components/MotionScreen';
import { DashboardIllustration } from '../../components/TechnicalIllustrations';
import { Brand } from '../../constants/brand';
import { conversationService, normalizeList } from '../../services/api';

interface Conversation {
  id: number;
  title: string;
  content: string;
  author_name?: string;
  author?: { full_name?: string };
  post_type?: string;
  priority?: string;
  created_at: string;
  reply_count?: number;
  view_count?: number;
}

export default function ConversationsScreen() {
  const c = Brand.colors;
  const router = useRouter();
  const [items, setItems] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const res = await conversationService.list();
      setItems(normalizeList<Conversation>(res.data));
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const formatDate = (raw: string) => {
    const diffHours = Math.floor((Date.now() - new Date(raw).getTime()) / 3600000);
    if (diffHours < 1) return 'Now';
    if (diffHours < 24) return `${diffHours}h`;
    return `${Math.floor(diffHours / 24)}d`;
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <ActivityIndicator size="large" color={c.accent} />
      </View>
    );
  }

  return (
    <MotionScreen delay={30}>
    <View style={[styles.screen, { backgroundColor: c.bg }]}> 
      <View style={[styles.hero, { borderBottomColor: c.border, backgroundColor: c.surface }]}>
        <View style={styles.heroTop}>
          <View style={styles.headerLeft}>
            <ChatIcon color={c.accentSoft} />
            <Text style={[styles.title, { color: c.text }]}>Conversations</Text>
          </View>
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: c.accent }]} onPress={() => router.push('/conversations/new')}>
            <PlusIcon color="#ffffff" />
          </TouchableOpacity>
        </View>
        <Text style={[styles.sub, { color: c.textMuted }]}>Team context, blockers, and operating signals.</Text>
        <View style={[styles.artWrap, { borderColor: c.border, backgroundColor: c.surfaceAlt }]}>
          <DashboardIllustration />
        </View>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={c.accent} />}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, { borderColor: c.border, backgroundColor: c.surface }]}
            onPress={() => router.push(`/conversation/${item.id}`)}
            activeOpacity={0.9}
          >
            <View style={[styles.topRule, { backgroundColor: c.accent }]} />
            <View style={styles.row}>
              <Text style={[styles.badge, { color: c.accentSoft }]}>{(item.post_type || 'discussion').toUpperCase()}</Text>
              <Text style={[styles.time, { color: c.textMuted }]}>{formatDate(item.created_at)}</Text>
            </View>
            <Text style={[styles.cardTitle, { color: c.text }]} numberOfLines={2}>{item.title}</Text>
            <Text style={[styles.cardBody, { color: c.textMuted }]} numberOfLines={2}>{item.content}</Text>
            <View style={styles.row}>
              <Text style={[styles.meta, { color: c.textMuted }]} numberOfLines={1}>
                {item.author_name || item.author?.full_name || 'Unknown'}
              </Text>
              <Text style={[styles.meta, { color: c.textMuted }]}>{item.reply_count || 0} replies | {item.view_count || 0} views</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
    </MotionScreen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hero: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 8,
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 24, fontWeight: '900', letterSpacing: -0.3 },
  sub: { fontSize: 13 },
  addBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  artWrap: { borderWidth: 1, padding: 8 },
  list: { padding: 16, gap: 10, paddingBottom: 110 },
  card: {
    borderWidth: 1,
    padding: 12,
    minHeight: 126,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  topRule: { height: 2, marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: { fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },
  time: { fontSize: 11, fontWeight: '700' },
  cardTitle: { fontSize: 16, fontWeight: '900', marginTop: 8, letterSpacing: -0.2 },
  cardBody: { fontSize: 13, lineHeight: 19, marginTop: 4 },
  meta: { fontSize: 11, marginTop: 10 },
});
