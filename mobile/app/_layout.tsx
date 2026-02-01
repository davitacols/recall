import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useEffect } from 'react';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/stores/authStore';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { restoreToken } = useAuthStore();

  useEffect(() => {
    restoreToken();
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="conversation/[id]" options={{ title: 'Conversation' }} />
        <Stack.Screen name="sprint/[id]" options={{ title: 'Sprint' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
