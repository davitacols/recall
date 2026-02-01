import { Tabs } from 'expo-router';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';
import { useAuthStore } from '../../stores/authStore';

export default function TabsLayout() {
  const { logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#999',
        headerRight: () => (
          <TouchableOpacity onPress={handleLogout} style={{ marginRight: 16 }}>
            <MaterialCommunityIcons name="logout" size={24} color="#007AFF" />
          </TouchableOpacity>
        ),
      }}
    >
      <Tabs.Screen
        name="conversations"
        options={{
          title: 'Conversations',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="chat-multiple" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="sprints"
        options={{
          title: 'Sprints',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="run-fast" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="decisions"
        options={{
          title: 'Decisions',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="check-circle" size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
