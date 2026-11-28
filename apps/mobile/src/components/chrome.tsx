import { memo, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type TextProps } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import { useAppTheme } from '../lib/theme';

const paths = {
  menu: 'M4 6h16M4 12h16M4 18h16',
  sun: 'M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4m11.4-11.4 1.4-1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  moon: 'M20.5 14a8.5 8.5 0 0 1-10.5-10.5A8.6 8.6 0 1 0 20.5 14Z',
  edit: 'M13 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7m-9 3.8.7-3.4L18.8 4a1.7 1.7 0 1 1 2.4 2.4L14 13.9l-3 .9Z',
  cloud: 'M7 17h-.7a4.3 4.3 0 0 1-.5-8.6 6 6 0 0 1 11.4 1.2 3.8 3.8 0 0 1 .5 7.4H17m-5 4V11m-3 3 3-3 3 3',
  close: 'm6 6 12 12M18 6 6 18',
  trash: 'M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5',
  file: 'M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9m-6-6 6 6h-6V3M8 13h8m-8 4h6',
  download: 'M12 3v12m-4-4 4 4 4-4M5 17v3h14v-3',
  view: 'M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6Zm13 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  type: 'M3 19 8.5 5 14 19m-9-5h7m3-3a3 3 0 1 1 5 2.2V19m-5-2a2.4 2.4 0 0 0 5 0v-2h-2a3 3 0 0 0-3 2Z',
  back: 'm14 6-6 6 6 6',
  next: 'm10 6 6 6-6 6',
  person: 'M16 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a5 5 0 0 1 5-5h6a5 5 0 0 1 5 5v2',
  settings: 'M4 6h16M4 12h16M4 18h16M8 4v4m8 2v4m-8 2v4',
  check: 'm5 12 4 4L19 6',
  bullet: 'M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01',
  undo: 'M3 10h11a6 6 0 0 1 0 12h-2M7 6l-4 4 4 4',
  redo: 'M21 10H10a6 6 0 0 0 0 12h2m5-16 4 4-4 4',
  eyeOff: 'm3 3 18 18M10 6a11 11 0 0 1 2-.2C18.4 5.8 22 12 22 12a17 17 0 0 1-2.6 3.1M6 6.9A17 17 0 0 0 2 12s3.6 6.2 10 6.2c1.6 0 3-.4 4.3-1M10 10a2.8 2.8 0 0 0 4 4',
  heading: 'M5 5v14M15 5v14M5 12h10M19 19h2',
  indent: 'M4 6h16M11 12h9M4 18h16M4 9l3 3-3 3',
  outdent: 'M4 6h16M11 12h9M4 18h16M7 9l-3 3 3 3',
  subheading: 'M4 7v10M12 7v10M4 12h8M15.5 11.2a2.3 2.3 0 1 1 3.9 1.7L15.5 17H20',
  bold: 'M6 4h7a4 4 0 0 1 0 8H6m0-8v16h8a4 4 0 0 0 0-8H6',
  italic: 'M11 4h8M5 20h8M15 4 9 20',
  task: 'M20 12v7a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h9m-6 7 4 4 8-9',
  code: 'm8 7-5 5 5 5m8-10 5 5-5 5m-3-12-2 14',
  link: 'm10 13 4-4m-6 7-1 1a3 3 0 1 1-4-4l4-4a3 3 0 0 1 4 0m2 2a3 3 0 0 0 4 0l4-4a3 3 0 1 0-4-4l-1 1',
  table: 'M4 8h16M4 14h16m-8-10v16M4 4h16v16H4z',
} as const;

export type IconName = keyof typeof paths;

export const Icon = memo(function Icon({ name, color, size = 20 }: { name: IconName; color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
      <Path d={paths[name]} fill="none" stroke={color} strokeWidth={1.55} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
});

export function Label({ strong, style, ...props }: TextProps & { strong?: boolean }) {
  const { colors, fontsReady } = useAppTheme();
  return (
    <Text
      {...props}
      style={[{ color: colors.ink, fontFamily: fontsReady ? (strong ? 'GeistSemibold' : 'Geist') : undefined,
        fontWeight: strong && !fontsReady ? '600' : undefined }, style]}
    />
  );
}

export function BrandMark({ size = 24 }: { size?: number }) {
  const { colors } = useAppTheme();
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessible={false}>
      <Rect width={100} height={100} rx={24} fill={colors.logoTile} />
      <Rect x={28} y={20} width={44} height={56} rx={8} fill="#8fa3bf" transform="rotate(-12 50 82)" />
      <G transform="rotate(5 50 82)">
        <Rect x={28} y={20} width={44} height={56} rx={8} fill="#f8f5ec" />
        <Circle cx={45} cy={47} r={10} fill="none" stroke="#2b2a27" strokeWidth={6.5} />
        <Path d="M55 36V68" stroke="#2b2a27" strokeWidth={6.5} strokeLinecap="round" />
      </G>
    </Svg>
  );
}

export const Wordmark = memo(function Wordmark() {
  return (
    <View style={styles.wordmark}>
      <BrandMark />
      <Label strong numberOfLines={1} style={styles.brand}>Quick Notes</Label>
    </View>
  );
});

export function IconButton({ icon, label, onPress, active, disabled, color, compact }: {
  icon: IconName; label: string; onPress: () => void; active?: boolean; disabled?: boolean; color?: string; compact?: boolean;
}) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, selected: active }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.icon,
        (pressed || active) && { backgroundColor: colors.subtle }, disabled && { opacity: .38 }]}
    >
      <Icon name={icon} color={color ?? colors.secondary} size={compact ? 17 : 19} />
    </Pressable>
  );
}

export function ThemeButton() {
  const { scheme, setAppearance } = useAppTheme();
  return <IconButton icon={scheme === 'dark' ? 'moon' : 'sun'} label={scheme === 'dark' ? 'Switch to light appearance' : 'Switch to dark appearance'}
    onPress={() => { void setAppearance(scheme === 'dark' ? 'light' : 'dark').catch(() => {}); }} />;
}

export function PageHeader({ title, onBack }: { title: string; onBack: () => void }) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.pageHeader, { borderBottomColor: colors.line, backgroundColor: colors.pad }]}>
      <IconButton icon="back" label="Back" onPress={onBack} />
      <Label strong accessibilityRole="header" style={styles.pageTitle}>{title}</Label>
    </View>
  );
}

export function ActionButton({ children, onPress, filled, disabled, danger }: {
  children: ReactNode; onPress: () => void; filled?: boolean; disabled?: boolean; danger?: boolean;
}) {
  const { colors } = useAppTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
      style={({ pressed }) => [styles.action, {
        backgroundColor: filled ? colors.primary : pressed ? colors.subtle : 'transparent',
        borderColor: filled ? colors.primary : colors.line,
        opacity: disabled ? .55 : pressed && filled ? .82 : 1,
      }]}
    >
      <Label strong style={{ color: filled ? colors.onPrimary : danger ? colors.danger : colors.ink }}>{children}</Label>
    </Pressable>
  );
}

export function LoadingScreen({ label }: { label: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.loading, { backgroundColor: colors.pad }]}>
      <ActivityIndicator color={colors.accent} />
      <Label accessibilityLiveRegion="polite" style={{ color: colors.muted }}>{label}</Label>
    </View>
  );
}

const styles = StyleSheet.create({
  wordmark: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8 },
  brand: { fontSize: 15, flexShrink: 1, letterSpacing: -.15 },
  icon: { width: 48, height: 48, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  pageHeader: { minHeight: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, borderBottomWidth: StyleSheet.hairlineWidth },
  pageTitle: { fontSize: 16 },
  action: { minHeight: 48, borderWidth: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 8 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
});
