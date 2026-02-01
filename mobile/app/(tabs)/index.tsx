import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { HomeIcon, ChatIcon, DecisionIcon, KnowledgeIcon, SprintIcon, BellIcon } from '../../components/Icons';

export default function HomeScreen() {
  const router = useRouter();

  const quickActions = [
    {
      title: 'New Conversation',
      subtitle: 'Start a discussion',
      icon: ChatIcon,
      color: '#7c3aed',
      onPress: () => router.push('/conversations'),
    },
    {
      title: 'Make Decision',
      subtitle: 'Document a choice',
      icon: DecisionIcon,
      color: '#0891b2',
      onPress: () => router.push('/decisions'),
    },
    {
      title: 'Search Knowledge',
      subtitle: 'Find information',
      icon: KnowledgeIcon,
      color: '#059669',
      onPress: () => router.push('/explore'),
    },
    {
      title: 'Current Sprint',
      subtitle: 'View progress',
      icon: SprintIcon,
      color: '#ea580c',
      onPress: () => router.push('/sprints'),
    },
  ];

  const recentActivity = [
    {
      type: 'conversation',
      title: 'Authentication Strategy Discussion',
      author: 'Sarah Chen',
      time: '2h ago',
      status: 'active',
    },
    {
      type: 'decision',
      title: 'Database Migration Approach',
      author: 'Mike Johnson',
      time: '4h ago',
      status: 'approved',
    },
    {
      type: 'sprint',
      title: 'Sprint 23 Planning Complete',
      author: 'Team Lead',
      time: '1d ago',
      status: 'completed',
    },
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'conversation': return ChatIcon;
      case 'decision': return DecisionIcon;
      case 'sprint': return SprintIcon;
      default: return HomeIcon;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'conversation': return '#7c3aed';
      case 'decision': return '#0891b2';
      case 'sprint': return '#ea580c';
      default: return '#6b7280';
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good morning</Text>
          <Text style={styles.subtitle}>Here's what's happening today</Text>
        </View>
        <TouchableOpacity style={styles.notificationButton}>
          <BellIcon size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          {quickActions.map((action, index) => {
            const IconComponent = action.icon;
            return (
              <TouchableOpacity
                key={index}
                style={styles.actionCard}
                onPress={action.onPress}
              >
                <View style={[styles.actionIcon, { backgroundColor: action.color }]}>
                  <IconComponent size={24} color="#ffffff" />
                </View>
                <Text style={styles.actionTitle}>{action.title}</Text>
                <Text style={styles.actionSubtitle}>{action.subtitle}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Recent Activity */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <View style={styles.activityList}>
          {recentActivity.map((item, index) => {
            const IconComponent = getActivityIcon(item.type);
            const iconColor = getActivityColor(item.type);
            return (
              <TouchableOpacity key={index} style={styles.activityItem}>
                <View style={[styles.activityIcon, { backgroundColor: iconColor }]}>
                  <IconComponent size={16} color="#ffffff" />
                </View>
                <View style={styles.activityContent}>
                  <Text style={styles.activityTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <View style={styles.activityMeta}>
                    <Text style={styles.activityAuthor}>{item.author}</Text>
                    <Text style={styles.activityTime}>• {item.time}</Text>
                  </View>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: iconColor }]}>
                  <Text style={styles.statusText}>{item.status}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Stats Overview */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Overview</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>24</Text>
            <Text style={styles.statLabel}>Active Conversations</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>12</Text>
            <Text style={styles.statLabel}>Pending Decisions</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>8</Text>
            <Text style={styles.statLabel}>Sprint Issues</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>156</Text>
            <Text style={styles.statLabel}>Knowledge Items</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 24,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '900',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  notificationButton: {
    width: 40,
    height: 40,
    backgroundColor: '#1a1a1a',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    width: '48%',
    backgroundColor: '#1a1a1a',
    borderRadius: 4,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  activityList: {
    gap: 12,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 4,
    padding: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  activityMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityAuthor: {
    fontSize: 12,
    color: '#6b7280',
  },
  activityTime: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ffffff',
    textTransform: 'uppercase',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#1a1a1a',
    borderRadius: 4,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '900',
    color: '#ffffff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
});