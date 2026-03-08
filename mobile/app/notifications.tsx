import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import MotionScreen from '../components/MotionScreen';
import { DashboardIllustration } from '../components/TechnicalIllustrations';
import { Brand } from '../constants/brand';
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
  const c = Brand.colors;
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

  useFocusEffect(
    React.useCallback(() => {
      load();
    }, [])
  );

  const markAll = async () => {
    try {
      await notificationService.markAllRead();
      load();
    } catch (error) {
      console.error('Failed to mark all read:', error);
    }
  };

  const markOne = async (id: number) => {
    try {
      await notificationService.markRead(id);
      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, is_read: true } : item)));
      setUnread((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const sendTest = async () => {
    try {
      await notificationService.sendTest();
      Alert.alert('Sent', 'Test notification created.');
      load();
    } catch (error: any) {
      Alert.alert('Failed', error?.response?.data?.error || 'Could not send test notification.');
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <ActivityIndicator size="large" color={c.accent} />
      </View>
    );
  }

  return (
    <MotionScreen>
    <View style={[styles.screen, { backgroundColor: c.bg }]}>
      <View style={[styles.hero, { borderBottomColor: c.border, backgroundColor: c.surface }]}> 
        <View style={styles.headerTop}>
          <View>
            <Text style={[styles.title, { color: c.text }]}>Notifications</Text>
            <Text style={[styles.sub, { color: c.textMuted }]}>{unread} unread</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={[styles.cta, { backgroundColor: c.surfaceAlt, borderColor: c.border }]} onPress={sendTest}>
              <Text style={[styles.ctaText, { color: c.text }]}>Send test</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.cta, { backgroundColor: c.accent, borderColor: c.accent }]} onPress={markAll}>
              <Text style={[styles.ctaText, { color: '#fff' }]}>Mark all</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={[styles.artWrap, { borderColor: c.border, backgroundColor: c.surfaceAlt }]}>
          <DashboardIllustration />
        </View>
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
            tintColor={c.accent}
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.card,
              { borderColor: c.border },
              item.is_read ? { backgroundColor: c.surface } : { backgroundColor: c.surfaceAlt },
            ]}
            onPress={() => {
              if (!item.is_read) {
                markOne(item.id);
              }
            }}
          >
            <View style={[styles.topRule, { backgroundColor: item.is_read ? c.border : c.accent }]} />
            <Text style={[styles.cardTitle, { color: c.text }]}>{item.title}</Text>
            <Text style={[styles.cardMsg, { color: c.textMuted }]}>{item.message}</Text>
            <Text style={[styles.cardMeta, { color: c.textMuted }]}>{new Date(item.created_at).toLocaleString()}</Text>
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
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { fontSize: 24, fontWeight: '900', letterSpacing: -0.3 },
  sub: { marginTop: 4, fontSize: 12 },
  headerActions: { flexDirection: 'row', gap: 8 },
  cta: { borderWidth: 1, borderRadius: 0, paddingHorizontal: 10, paddingVertical: 8 },
  ctaText: { fontSize: 12, fontWeight: '800' },
  artWrap: { borderWidth: 1, padding: 8 },
  list: { padding: 16, gap: 10, paddingBottom: 32 },
  card: {
    borderRadius: 0,
    padding: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  topRule: { height: 2, marginBottom: 8 },
  cardTitle: { fontSize: 15, fontWeight: '900' },
  cardMsg: { fontSize: 13, marginTop: 4, lineHeight: 18 },
  cardMeta: { fontSize: 11, marginTop: 8 },
});
