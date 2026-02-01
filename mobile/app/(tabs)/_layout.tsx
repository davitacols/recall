import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { HomeIcon, ChatIcon, DecisionIcon, KnowledgeIcon, SprintIcon } from '../../components/Icons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#ffffff',
        tabBarInactiveTintColor: '#6b7280',
        tabBarStyle: {
          backgroundColor: '#000000',
          borderTopColor: '#1a1a1a',
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
          backgroundColor: '#000000',
          borderBottomColor: '#1a1a1a',
          borderBottomWidth: 1,
        },
        headerTintColor: '#ffffff',
        headerTitleStyle: {
          fontWeight: '900',
          fontSize: 20,
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
          headerTitle: 'Dashboard',
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