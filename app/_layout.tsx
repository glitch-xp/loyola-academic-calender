import { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '../hooks/useFrameworkReady';

import { useUpdateChecker } from '../hooks/useUpdateChecker';
import * as SystemUI from 'expo-system-ui';

import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold, Poppins_800ExtraBold } from '@expo-google-fonts/poppins';
import * as SplashScreen from 'expo-splash-screen';
import AddToHomeScreen from '../components/AddToHomeScreen';
import { Colors } from '../constants/Colors';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useFrameworkReady();
  useUpdateChecker({ autoCheck: true });

  const [fontsLoaded, fontError] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      SystemUI.setBackgroundColorAsync(Colors.background);
      return;
    }
    // Set system UI background to black on native so white navigation bar icons remain visible
    SystemUI.setBackgroundColorAsync("#000000");
  }, []);

  if (!fontsLoaded && !fontError) {
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
