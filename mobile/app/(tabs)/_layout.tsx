import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HomeIcon, ChatIcon, DecisionIcon, KnowledgeIcon, SprintIcon } from '../../components/Icons';
import { Brand } from '../../constants/brand';

export default function TabLayout() {
  const c = Brand.colors;
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 6 : 0);

  const renderIcon = (Icon: React.ComponentType<{ size?: number; color?: string }>, color: string, focused: boolean) => (
    <View style={styles.iconWrap}>
      <Icon size={20} color={focused ? c.accentSoft : color} />
      <View style={[styles.indicator, focused && styles.indicatorActive]} />
    </View>
  );

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: c.accent,
        tabBarInactiveTintColor: c.textMuted,
        tabBarStyle: {
          backgroundColor: c.surface,
          borderTopColor: c.border,
          borderTopWidth: 1,
          height: 62 + bottomInset,
          paddingBottom: bottomInset + 2,
          paddingTop: 6,
          elevation: 0,
          shadowOpacity: 0.08,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 5 },
          position: 'absolute',
          left: 12,
          right: 12,
          bottom: 10,
          borderRadius: 14,
        },
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: {
          fontSize: 9,
          fontWeight: '800',
          letterSpacing: 0.3,
          marginTop: 0,
        },
        tabBarItemStyle: {
          paddingVertical: 1,
        },
        headerStyle: {
          backgroundColor: c.surface,
          borderBottomColor: c.border,
          borderBottomWidth: 1,
        },
        headerTintColor: c.text,
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 17,
          letterSpacing: 0.2,
        },
        headerTitleAlign: 'left',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            renderIcon(HomeIcon, color, focused)
          ),
          headerTitle: 'Knoledgr',
        }}
      />
      <Tabs.Screen
        name="conversations"
        options={{
          title: 'Conversations',
          tabBarIcon: ({ color, focused }) => (
            renderIcon(ChatIcon, color, focused)
          ),
        }}
      />
      <Tabs.Screen
        name="decisions"
        options={{
          title: 'Decisions',
          tabBarIcon: ({ color, focused }) => (
            renderIcon(DecisionIcon, color, focused)
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Knowledge',
          tabBarIcon: ({ color, focused }) => (
            renderIcon(KnowledgeIcon, color, focused)
          ),
        }}
      />
      <Tabs.Screen
        name="sprints"
        options={{
          title: 'Sprints',
          tabBarIcon: ({ color, focused }) => (
            renderIcon(SprintIcon, color, focused)
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    minWidth: 34,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  indicator: {
    width: 14,
    height: 2,
    backgroundColor: 'transparent',
  },
  indicatorActive: {
    backgroundColor: Brand.colors.accentSoft,
  },
});
