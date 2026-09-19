import { Redirect } from 'expo-router';

// Retained as a redirect so existing deep links do not break while the Agile
// product surface is out of the launch experience.
export default function SprintsRedirect() {
  return <Redirect href="/(tabs)" />;
}
