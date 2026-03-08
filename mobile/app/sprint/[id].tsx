import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { Brand } from '../../constants/brand';
import { normalizeList, sprintService } from '../../services/api';

interface Issue {
  id: number;
  key?: string;
  title: string;
  status?: string;
  priority?: string;
  story_points?: number;
}

interface Sprint {
  id: number;
  name: string;
  goal?: string;
  status?: string;
  start_date: string;
  end_date: string;
}

export default function SprintDetailScreen() {
  const c = Brand.colors;
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [sprint, setSprint] = useState<Sprint | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const sprintRes = await sprintService.get(Number(id));
        setSprint(sprintRes.data);

        try {
          const issuesRes = await sprintService.issues(Number(id));
          setIssues(normalizeList<Issue>(issuesRes.data));
        } catch {
          setIssues([]);
        }
      } catch (error) {
        console.error('Failed to load sprint:', error);
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

  if (!sprint) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <Text style={[styles.title, { color: c.text }]}>Sprint not found</Text>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: c.bg }]}>
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <Text style={[styles.status, { color: c.accentSoft }]}>{(sprint.status || 'unknown').toUpperCase()}</Text>
        <Text style={[styles.title, { color: c.text }]}>{sprint.name}</Text>
        <Text style={[styles.meta, { color: c.textMuted }]}>
          {new Date(sprint.start_date).toLocaleDateString()} - {new Date(sprint.end_date).toLocaleDateString()}
        </Text>
        <Text style={[styles.goal, { color: c.textMuted }]}>{sprint.goal || 'No sprint goal provided.'}</Text>
      </View>

      <Text style={[styles.sectionTitle, { color: c.text }]}>Issues ({issues.length})</Text>
      <FlatList
        data={issues}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={[styles.issueCard, { borderColor: c.border, backgroundColor: c.surface }]}>
            <View style={styles.row}>
              <Text style={[styles.issueKey, { color: c.accentSoft }]}>{item.key || `ISSUE-${item.id}`}</Text>
              <Text style={[styles.issueMeta, { color: c.textMuted }]}>{(item.status || 'unknown').toUpperCase()}</Text>
            </View>
            <Text style={[styles.issueTitle, { color: c.text }]}>{item.title}</Text>
            <Text style={[styles.issueMeta, { color: c.textMuted }]}> 
              {(item.priority || 'medium').toUpperCase()} | {item.story_points || 0} pts
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { padding: 16, borderBottomWidth: 1, gap: 6 },
  status: { fontSize: 11, fontWeight: '800', letterSpacing: 0.35 },
  title: { fontSize: 23, fontWeight: '900' },
  meta: { fontSize: 12 },
  goal: { fontSize: 14, marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '800', paddingHorizontal: 16, paddingTop: 14 },
  list: { padding: 16, gap: 10 },
  issueCard: {
    borderWidth: 1,
    borderRadius: 0,
    padding: 12,
    gap: 5,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  issueKey: { fontSize: 12, fontWeight: '800' },
  issueTitle: { fontSize: 14, fontWeight: '700' },
  issueMeta: { fontSize: 11 },
});
