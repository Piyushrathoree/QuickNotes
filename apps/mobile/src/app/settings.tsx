import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { Icon, Label, PageHeader } from '../components/chrome';
import { useAppTheme, type Appearance } from '../lib/theme';

const choices: readonly { value: Appearance; title: string }[] = [
  { value: 'light', title: 'Light' },
  { value: 'dark', title: 'Dark' },
  { value: 'system', title: 'System' },
];

export default function SettingsScreen() {
  const { appearance, colors, setAppearance } = useAppTheme();
  return (
    <View style={[styles.screen, { backgroundColor: colors.pad }]}>
      <PageHeader title="Settings" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Label strong accessibilityRole="header" style={styles.heading}>Appearance</Label>
        <View style={[styles.segmented, { backgroundColor: colors.subtle }]}>
          {choices.map(({ value, title }) => (
            <Pressable key={value} accessibilityRole="radio" accessibilityState={{ checked: appearance === value }}
              onPress={() => void setAppearance(value).catch(() => {})}
              style={[styles.choice, appearance === value && { backgroundColor: colors.pad }]}>
              <Label strong={appearance === value} style={{ color: appearance === value ? colors.ink : colors.secondary }}>
                {title}
              </Label>
            </Pressable>
          ))}
        </View>

        <Label strong accessibilityRole="header" style={styles.heading}>Account</Label>
        <SettingsRow title="Manage account" onPress={() => router.push('/account')} />

        <Label strong accessibilityRole="header" style={styles.heading}>About</Label>
        <SettingsRow title="About Quick Notes" onPress={() => void Linking.openURL('https://www.quicknotes.site/about')} />
        <SettingsRow title="Quick Notes website" onPress={() => void Linking.openURL('https://www.quicknotes.site')} />
        <View style={[styles.row, { borderBottomColor: colors.line }]}>
          <Label>Version</Label>
          <Label style={{ color: colors.muted }}>{Constants.expoConfig?.version ?? '0.1.0'}</Label>
        </View>
        <Label style={[styles.detail, { color: colors.muted }]}>
          Export guest notes and unsent drafts before uninstalling or clearing app data.
        </Label>
      </ScrollView>
    </View>
  );
}

function SettingsRow({ title, onPress }: { title: string; onPress: () => void }) {
  const { colors } = useAppTheme();
  return (
    <Pressable accessibilityRole="button" onPress={onPress}
      style={({ pressed }) => [styles.row, { borderBottomColor: colors.line, backgroundColor: pressed ? colors.subtle : 'transparent' }]}>
      <Label>{title}</Label>
      <Icon name="next" color={colors.muted} size={17} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 24, paddingBottom: 32 },
  heading: { fontSize: 16, marginTop: 26, marginBottom: 9 },
  segmented: { flexDirection: 'row', borderRadius: 10, padding: 4, gap: 4 },
  choice: { flex: 1, minHeight: 48, borderRadius: 8, justifyContent: 'center', alignItems: 'center', padding: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    minHeight: 52, borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 4, gap: 8 },
  detail: { fontSize: 13, lineHeight: 20, marginTop: 12 },
});
