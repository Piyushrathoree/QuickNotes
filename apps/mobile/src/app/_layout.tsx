import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useReducedMotion } from '../lib/motion';
import { ThemeProvider, useAppTheme } from '../lib/theme';

export default function RootLayout() {
  return <ThemeProvider><RootNavigator /></ThemeProvider>;
}

function RootNavigator() {
  const { scheme, colors } = useAppTheme();
  const reducedMotion = useReducedMotion();
  const backgroundColor = colors.pad;
  return <SafeAreaView style={{ flex: 1, backgroundColor }}>
    <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
    <Stack screenOptions={{ headerShown: false, animation: reducedMotion ? 'none' : 'fade', contentStyle: { backgroundColor } }} />
  </SafeAreaView>;
}
