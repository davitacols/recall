import { Redirect } from 'expo-router';

// Preserve old mobile links without exposing the retired Agile experience.
export default function SprintDetailRedirect() {
  return <Redirect href="/(tabs)" />;
}
