import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import 'react-native-reanimated';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/stores/authStore';
import { Brand } from '@/constants/brand';

export default function RootLayout() {
  useColorScheme();
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
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Brand.colors.bg }}>
        <ActivityIndicator size="large" color={Brand.colors.accent} />
      </View>
    );
  }

  return (
    <ThemeProvider value={DefaultTheme}>
      <Stack>
        <Stack.Screen name="login" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="conversation/[id]" options={{ title: 'Conversation', animation: 'slide_from_right' }} />
        <Stack.Screen name="sprint/[id]" options={{ title: 'Sprint', animation: 'slide_from_right' }} />
        <Stack.Screen name="conversations/new" options={{ title: 'New Conversation', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="decisions/new" options={{ title: 'New Decision', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="notifications" options={{ title: 'Notifications', animation: 'slide_from_right' }} />
        <Stack.Screen name="profile" options={{ title: 'Profile', animation: 'slide_from_right' }} />
        <Stack.Screen name="workspace-switch" options={{ title: 'Switch Workspace', animation: 'slide_from_right' }} />
      </Stack>
      <StatusBar style="dark" />
    </ThemeProvider>
  );
}
