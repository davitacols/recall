import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { HomeIcon, ChatIcon, DecisionIcon, KnowledgeIcon, SprintIcon } from '../../components/Icons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#f6c287',
        tabBarInactiveTintColor: '#8b97aa',
        tabBarStyle: {
          backgroundColor: '#0f141d',
          borderTopColor: '#1e293b',
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 4,
        },
        headerStyle: {
          backgroundColor: '#0f141d',
          borderBottomColor: '#1e293b',
          borderBottomWidth: 1,
        },
        headerTintColor: '#eef2ff',
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 18,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <HomeIcon size={24} color={color} />
          ),
          headerTitle: 'Knoledgr',
        }}
      />
      <Tabs.Screen
        name="conversations"
        options={{
          title: 'Conversations',
          tabBarIcon: ({ color, focused }) => (
            <ChatIcon size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="decisions"
        options={{
          title: 'Decisions',
          tabBarIcon: ({ color, focused }) => (
            <DecisionIcon size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Knowledge',
          tabBarIcon: ({ color, focused }) => (
            <KnowledgeIcon size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="sprints"
        options={{
          title: 'Sprints',
          tabBarIcon: ({ color, focused }) => (
            <SprintIcon size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
