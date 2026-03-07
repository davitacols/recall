import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import 'react-native-reanimated';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/stores/authStore';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const pathname = usePathname();
  const { bootstrap, token, initialized } = useAuthStore();

  useEffect(() => {
    bootstrap();
  }, []);

  useEffect(() => {
    if (!initialized) return;
    const onLoginRoute = pathname === '/login';

    if (!token && !onLoginRoute) {
      router.replace('/login');
      return;
    }
    if (token && onLoginRoute) {
      router.replace('/(tabs)');
    }
  }, [initialized, token, pathname, router]);

  if (!initialized) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f141d' }}>
        <ActivityIndicator size="large" color="#f0b36d" />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="conversation/[id]" options={{ title: 'Conversation' }} />
        <Stack.Screen name="sprint/[id]" options={{ title: 'Sprint' }} />
        <Stack.Screen name="conversations/new" options={{ title: 'New Conversation' }} />
        <Stack.Screen name="decisions/new" options={{ title: 'New Decision' }} />
        <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
        <Stack.Screen name="profile" options={{ title: 'Profile' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
