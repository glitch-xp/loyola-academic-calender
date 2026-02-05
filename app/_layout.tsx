import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '../hooks/useFrameworkReady';

import { useUpdateChecker } from '../hooks/useUpdateChecker';
import * as SystemUI from 'expo-system-ui';

import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold, Poppins_800ExtraBold } from '@expo-google-fonts/poppins';
import * as SplashScreen from 'expo-splash-screen';
import AddToHomeScreen from '../components/AddToHomeScreen';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useFrameworkReady();
  useUpdateChecker();

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    // Set system UI background to black to ensure white navigation bar icons are visible
    // or to ensure the bar itself is visible against the app background
    SystemUI.setBackgroundColorAsync("#000000");
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="welcome" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
      <AddToHomeScreen />
    </>
  );
}
