import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { DialogHost } from '../components/AppDialog';
import { useReducedMotion } from '../lib/motion';
import { ThemeProvider, useAppTheme } from '../lib/theme';

// Keep the native splash up until fonts and the saved theme are ready, so the first frame is already right.
void SplashScreen.preventAutoHideAsync().catch(() => {});
SplashScreen.setOptions({ duration: 320, fade: true });

export default function RootLayout() {
  return <ThemeProvider><RootNavigator /></ThemeProvider>;
}

function RootNavigator() {
  const { scheme, colors, appearanceReady } = useAppTheme();
  const reducedMotion = useReducedMotion();
  const backgroundColor = colors.pad;

  useEffect(() => {
    if (appearanceReady) void SplashScreen.hideAsync().catch(() => {});
  }, [appearanceReady]);
  // Never hold the app hostage to a slow font: the splash goes after 2.5 s whatever happens.
  useEffect(() => {
    const timer = setTimeout(() => { void SplashScreen.hideAsync().catch(() => {}); }, 2500);
    return () => clearTimeout(timer);
  }, []);

  return <SafeAreaView style={{ flex: 1, backgroundColor }}>
    <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
    <Stack screenOptions={{ headerShown: false, animation: reducedMotion ? 'none' : 'fade', animationDuration: 260, contentStyle: { backgroundColor } }} />
    <DialogHost />
  </SafeAreaView>;
}
