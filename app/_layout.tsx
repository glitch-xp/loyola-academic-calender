import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';

import * as SystemUI from 'expo-system-ui';

export default function RootLayout() {
  useFrameworkReady();

  useEffect(() => {
    // Set system UI background to black to ensure white navigation bar icons are visible
    // or to ensure the bar itself is visible against the app background
    SystemUI.setBackgroundColorAsync("#000000");
  }, []);

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="welcome" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}
