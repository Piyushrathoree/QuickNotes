import { useFonts } from 'expo-font';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { palette } from './palette';
import { getPreference, setPreference } from './storage';

export type Appearance = 'system' | 'light' | 'dark';

const fonts = {
  Geist: require('../../assets/fonts/Geist-Regular.ttf'),
  GeistSemibold: require('../../assets/fonts/Geist-SemiBold.ttf'),
  PatrickHand: require('../../assets/fonts/PatrickHand-Regular.ttf'),
  IBMPlexSerif: require('../../assets/fonts/IBMPlexSerif-Regular.ttf'),
};

const ThemeContext = createContext({
  appearance: 'light' as Appearance,
  scheme: 'light' as 'light' | 'dark',
  colors: palette.light as (typeof palette)[keyof typeof palette],
  fontsReady: false,
  appearanceReady: false,
  setAppearance: async (_value: Appearance) => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const [appearance, setAppearanceState] = useState<Appearance>('light');
  const [fontsReady, fontError] = useFonts(fonts);
  const [appearanceReady, setAppearanceReady] = useState(false);

  useEffect(() => {
    let current = true;
    getPreference('appearance').then((value) => {
      if (current && (value === 'light' || value === 'dark' || value === 'system')) {
        setAppearanceState(value);
      }
    }).catch(() => {}).finally(() => { if (current) setAppearanceReady(true); });
    return () => { current = false; };
  }, []);

  async function setAppearance(value: Appearance) {
    setAppearanceState(value);
    await setPreference('appearance', value);
  }

  const scheme = appearance === 'system' ? systemScheme : appearance;
  return (
    <ThemeContext.Provider value={{ appearance, scheme, colors: palette[scheme], fontsReady: fontsReady && !fontError, appearanceReady: appearanceReady && (fontsReady || Boolean(fontError)), setAppearance }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useAppTheme = () => useContext(ThemeContext);
