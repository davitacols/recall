import React, { useEffect, useState } from 'react';
import { View, FlatList, TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { sprintService } from '../../services/api';

interface Sprint {
  id: number;
  name: string;
  status: string;
  start_date: string;
  end_date: string;
  goal: string;
}

export default function SprintsScreen() {
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadSprints();
  }, []);

  const loadSprints = async () => {
    try {
      const response = await sprintService.list();
      setSprints(response.data.results || response.data);
    } catch (error) {
      console.error('Failed to load sprints:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderSprint = ({ item }: { item: Sprint }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/sprint/${item.id}`)}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{item.name}</Text>
        <Text style={[styles.status, styles[`status_${item.status}`]]}>
          {item.status}
        </Text>
      </View>
      <Text style={styles.goal}>{item.goal}</Text>
      <View style={styles.dates}>
        <Text style={styles.date}>
          {new Date(item.start_date).toLocaleDateString()} - {new Date(item.end_date).toLocaleDateString()}
        </Text>
      </View>
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
        data={sprints}
        renderItem={renderSprint}
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
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    color: '#000',
  },
  status: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 12,
    fontWeight: '500',
    color: '#fff',
  },
  status_active: {
    backgroundColor: '#34C759',
  },
  status_planning: {
    backgroundColor: '#FF9500',
  },
  status_completed: {
    backgroundColor: '#5AC8FA',
  },
  goal: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  dates: {
    marginTop: 8,
  },
  date: {
    fontSize: 12,
    color: '#999',
  },
});
