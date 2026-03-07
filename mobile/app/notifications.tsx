import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { notificationService } from '../services/api';

interface NotificationItem {
  id: number;
  type: string;
  title: string;
  message: string;
  link?: string;
  is_read: boolean;
  created_at: string;
}

export default function NotificationsScreen() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unread, setUnread] = useState(0);

  const load = async () => {
    try {
      const res = await notificationService.list();
      setItems(res.data?.notifications || []);
      setUnread(res.data?.unread_count || 0);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const markAll = async () => {
    try {
      await notificationService.markAllRead();
      load();
    } catch (error) {
      console.error('Failed to mark all read:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#f0b36d" />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Notifications</Text>
          <Text style={styles.sub}>{unread} unread</Text>
        </View>
        <TouchableOpacity style={styles.cta} onPress={markAll}>
          <Text style={styles.ctaText}>Mark all read</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor="#f0b36d"
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={[styles.card, item.is_read ? styles.read : styles.unread]}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardMsg}>{item.message}</Text>
            <Text style={styles.cardMeta}>{new Date(item.created_at).toLocaleString()}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0f141d' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f141d' },
  header: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { color: '#f8fafc', fontSize: 24, fontWeight: '800' },
  sub: { color: '#9db0c8', marginTop: 4 },
  cta: { backgroundColor: '#243146', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  ctaText: { color: '#d8e3f2', fontSize: 12, fontWeight: '600' },
  list: { padding: 16, gap: 10 },
  card: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  read: { backgroundColor: '#121a27', borderColor: '#263246' },
  unread: { backgroundColor: '#172131', borderColor: '#3a4b63' },
  cardTitle: { color: '#f8fafc', fontSize: 14, fontWeight: '700' },
  cardMsg: { color: '#c6d2e3', fontSize: 13, marginTop: 4 },
  cardMeta: { color: '#90a0b5', fontSize: 11, marginTop: 6 },
});
