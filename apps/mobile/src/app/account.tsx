import { useEffect, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, TextInput, View, type TextInputInstance, type TextInputProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, usePreventRemove } from 'expo-router';
import { useFonts } from 'expo-font';
import * as WebBrowser from 'expo-web-browser';
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { authClient, apiOrigin, invalidateLocalSession, cachedUserId, onSessionInvalidated, verifySession } from '../lib/auth';
import { finishGuestImport, getImportAttempt, listNotes, makeId, removeNote, setImportAttempt, setPreference } from '../lib/storage';
import { saveCloudNote } from '../lib/cloud';
import { ActionButton, BrandMark, IconButton, Label, PageHeader } from '../components/chrome';
import { appAlert } from '../components/AppDialog';
import { useAppTheme } from '../lib/theme';
import { describeAuthError, EMAIL_PATTERN, MIN_PASSWORD_LENGTH } from '../../../../src/components/auth/errors';

const authFonts = { IBMPlexSerif: require('../../assets/fonts/IBMPlexSerif-Regular.ttf') };

type User = { id: string; email: string };

async function importableGuestNotes() {
  return (await listNotes('guest')).filter((note) => note.content.trim());
}
export default function AccountScreen() {
  const { colors, fontsReady } = useAppTheme();
  const [serifReady] = useFonts(authFonts);
  const { top } = useSafeAreaInsets();
  const emailInput = useRef<TextInputInstance>(null);
  const passwordInput = useRef<TextInputInstance>(null);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [guestCount, setGuestCount] = useState(0);
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [name, setName] = useState('');
  const [signup, setSignup] = useState(false); const [busy, setBusy] = useState(false); const [message, setMessage] = useState('');
  const [draftCount, setDraftCount] = useState(0);
  const [importing, setImporting] = useState(false);
  usePreventRemove(importing, () => {
    appAlert('Import in progress', 'Keep this screen open until the guest import has finished.');
  });
  useEffect(() => {
    verifySession().then(async (authUser) => {
      if (authUser?.id) { setUser({ id: authUser.id, email: authUser.email ?? '' }); setDraftCount((await listNotes(`account:${authUser.id}`)).filter((note) => note.isDirty).length); }
      setGuestCount((await importableGuestNotes()).length);
    }).catch(async () => {
      const previousUser = await cachedUserId().catch(() => null);
      if (previousUser) {
        setUser({ id: previousUser, email: '' });
        setDraftCount((await listNotes(`account:${previousUser}`)).filter((note) => note.isDirty).length);
        setMessage('Offline · account details will refresh when you reconnect.');
      }
      setGuestCount((await importableGuestNotes()).length);
    });
  }, []);
  useEffect(() => onSessionInvalidated(() => { setUser(null); setMessage('Session expired. Sign in again to access account notes.'); }), []);

  async function submit() {
    if (!apiOrigin) { setMessage('This build has no account service configured. Guest notes are available.'); return; }
    if (busy) return;
    if (!EMAIL_PATTERN.test(email.trim())) { setMessage('Enter a valid email address.'); emailInput.current?.focus(); return; }
    if (!password || (signup && password.length < MIN_PASSWORD_LENGTH)) {
      setMessage(signup ? `Use at least ${MIN_PASSWORD_LENGTH} characters.` : 'Enter your password.');
      passwordInput.current?.focus();
      return;
    }
    Keyboard.dismiss();
    setBusy(true); setMessage('');
    try {
      const result = signup ? await authClient.signUp.email({ name: name.trim() || email.split('@')[0], email: email.trim(), password }) : await authClient.signIn.email({ email: email.trim(), password });
      if (result.error?.code === 'INVALID_ORIGIN') {
        throw new Error('This account server does not trust this app origin. Check the configured Expo or APK origin.');
      }
      if (result.error) throw new Error(describeAuthError(result.error, signup ? 'Could not create your account. Try again.' : 'Could not sign in. Try again.'));
      const authUser = await verifySession();
      if (!authUser?.id) throw new Error('Your session could not be verified. Try signing in again.');
      setUser({ id: authUser.id, email: authUser.email ?? email }); setPassword(''); setMessage('Signed in.');
      setDraftCount((await listNotes(`account:${authUser.id}`)).filter((note) => note.isDirty).length);
      // Back to the notes, which now show this account. Guest notes can still be imported from Account.
      router.dismissTo('/');
    } catch (error) {
      const message = (error as Error).message;
      setMessage(/network|fetch|timeout/i.test(message) ? 'Could not reach the account service. Your device notes remain saved; try again when online.' : message || 'Could not complete sign in or signup. Check your details and try again.');
    }
    finally { setBusy(false); }
  }

  async function importGuest(confirmedFreshIds = false) {
    if (!user) return;
    const targetId = user.id;
    setBusy(true); setImporting(true); setMessage('Importing guest notes…');
    try {
      const sources = await importableGuestNotes();
      const attempts = await Promise.all(sources.map((source) => getImportAttempt(source.id)));
      const foreignPin = attempts.some((attempt) => attempt && attempt.destinationUserId !== targetId);
      const changedAttempt = sources.some((source, index) => attempts[index]?.destinationUserId === targetId && attempts[index]?.sourceSequence !== source.editedSeq);
      if ((foreignPin || changedAttempt) && !confirmedFreshIds) {
        setMessage(foreignPin ? 'Some guest notes have an unfinished import to another account.' : 'Some guest notes changed after an earlier import attempt.');
        appAlert('Create fresh cloud copies?', 'A new UUID will be assigned only for these notes after your confirmation. Their guest copies stay here until matching cloud text is confirmed.', [
          { text: 'Keep on this device', style: 'cancel' }, { text: 'Create fresh copies', onPress: () => { void importGuest(true); } },
        ]);
        return;
      }
      for (const source of sources) {
        const active = await verifySession();
        if (active?.id !== targetId) throw new Error('Account changed. The remaining guest notes were kept on this device.');
        try {
          const attempt = await getImportAttempt(source.id);
          const needsFreshId = Boolean(attempt && (attempt.destinationUserId !== targetId || attempt.sourceSequence !== source.editedSeq));
          const destinationNoteId = needsFreshId && confirmedFreshIds ? makeId() : attempt?.destinationUserId === targetId ? attempt.destinationNoteId : source.id;
          const pending = { sourceId: source.id, destinationUserId: targetId, destinationNoteId, sourceSequence: source.editedSeq };
          await setImportAttempt(pending);
          const saved = await saveCloudNote(targetId, destinationNoteId, source.content, null);
          if (saved.id !== destinationNoteId || saved.content !== source.content) {
            setMessage('A note stayed on this device because the cloud returned a different copy.');
            continue;
          }
          if (!await finishGuestImport(pending, source.content)) {
            setMessage('A guest note changed during import. Its device copy has been kept.');
          }
        } catch (error) {
          const attempt = await getImportAttempt(source.id);
          if ((error as { status?: number }).status === 409 || (error as { status?: number }).status === 404) {
            if (attempt) await setImportAttempt({ ...attempt, sourceSequence: -1 });
          }
          setMessage(`Some notes were not imported. They remain in Guest: ${(error as Error).message}`);
        }
      }
      setGuestCount((await importableGuestNotes()).length);
      setMessage((current) => current === 'Importing guest notes…' ? 'Import finished. Any changed or unavailable notes remain in Guest.' : current);
    } catch (error) { setMessage((error as Error).message); }
    finally { setBusy(false); setImporting(false); }
  }

  function confirmImport() {
    appAlert('Import guest notes?', 'Notes will be copied to this account one at a time. A guest note is removed only after its matching cloud copy is confirmed.', [
      { text: 'Keep on this device', style: 'cancel' }, { text: 'Import notes', onPress: () => { void importGuest(); } },
    ]);
  }
  function signOut() {
    appAlert('Sign out?', 'Unsent account drafts stay private to this account on this device. Export or discard them below before leaving if you prefer.', [
      { text: 'Cancel', style: 'cancel' }, { text: 'Sign out', style: 'destructive', onPress: async () => {
        try { await authClient.signOut(); } catch { /* Revoke may fail offline; remove local credentials below. */ }
        await setPreference('lastVerifiedUserId', '');
        for (const key of ['quicknotes-staging_cookie', 'quicknotes-staging_session_data']) {
          await SecureStore.deleteItemAsync(key).catch(() => {});
          for (let index = 0; index < 100; index++) {
            const chunk = `${key}.${index}`;
            const stored = await SecureStore.getItemAsync(chunk).catch(() => null);
            if (stored === null) break;
            await SecureStore.deleteItemAsync(chunk).catch(() => {});
          }
        }
        setUser(null); setMessage('Signed out. Account drafts are retained on this device.');
        await invalidateLocalSession();
      } },
    ]);
  }
  async function exportAccountDrafts() {
    if (!user) return;
    const drafts = (await listNotes(`account:${user.id}`)).filter((note) => note.isDirty);
    if (!drafts.length) { setDraftCount(0); setMessage('There are no unsent account drafts to export.'); return; }
    const text = drafts.map((note) => `# ${note.content.split('\n')[0]?.replace(/^#+\s*/, '') || 'Untitled'}\n\n${note.content}`).join('\n\n---\n\n');
    const file = new FileSystem.File(FileSystem.Paths.cache, 'quicknotes-account-drafts.md');
    file.create({ overwrite: true }); await file.write(text);
    await Sharing.shareAsync(file.uri, { mimeType: 'text/markdown', dialogTitle: 'Export unsent drafts' });
    setTimeout(() => { try { file.delete(); } catch { /* Cache is also cleared by the OS. */ } }, 60 * 60 * 1000);
  }
  function discardAccountDrafts() {
    if (!user) return;
    appAlert('Discard unsent drafts?', `This permanently removes ${draftCount} local account draft${draftCount === 1 ? '' : 's'}. Saved cloud notes are not affected.`, [
      { text: 'Cancel', style: 'cancel' }, { text: 'Discard drafts', style: 'destructive', onPress: async () => {
        const drafts = (await listNotes(`account:${user.id}`)).filter((note) => note.isDirty);
        for (const draft of drafts) await removeNote(`account:${user.id}`, draft.id);
        setDraftCount(0); setMessage('Unsent account drafts discarded.');
      } },
    ]);
  }
  async function passwordReset() {
    if (!apiOrigin) { setMessage('Set the staging API origin before opening account recovery.'); return; }
    await WebBrowser.openBrowserAsync(`${apiOrigin}/forgot-password`);
  }

  return (
    <KeyboardAvoidingView style={[styles.screen, { backgroundColor: user ? colors.pad : colors.canvas }]} behavior="padding" keyboardVerticalOffset={top}>
      {user ? <PageHeader title="Account" onBack={() => router.back()} /> : (
        <View style={styles.authHeader}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back to Quick Notes" onPress={() => router.back()}
            style={({ pressed }) => [styles.home, pressed && { opacity: .7 }]}>
            <BrandMark size={32} />
            <Label strong>Quick Notes</Label>
          </Pressable>
        </View>
      )}
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
        <View style={styles.content}>
          {user ? (
            <>
              <View style={styles.heading}>
                <Label accessibilityRole="header" style={[styles.title, { fontFamily: fontsReady ? 'PatrickHand' : undefined }]}>Your account</Label>
                <Label style={[styles.description, { color: colors.secondary }]}>
                  {user.email || 'Showing the last verified account offline.'}
                </Label>
              </View>
              {guestCount > 0 && (
                <View style={[styles.section, { borderColor: colors.line }]}>
                  <Label strong>Guest notes on this device</Label>
                  <Label style={{ color: colors.secondary }}>{guestCount} notes available to import.</Label>
                  <ActionButton filled disabled={busy} onPress={confirmImport}>
                    {importing ? 'Importing…' : 'Review import'}
                  </ActionButton>
                </View>
              )}
              {draftCount > 0 && (
                <View style={[styles.section, { borderColor: colors.line }]}>
                  <Label strong>{draftCount} unsent {draftCount === 1 ? 'draft' : 'drafts'}</Label>
                  <ActionButton onPress={() => void exportAccountDrafts().catch(() => setMessage('Could not export drafts. Try again.'))}>
                    Export drafts
                  </ActionButton>
                  <ActionButton danger onPress={discardAccountDrafts}>Discard drafts</ActionButton>
                </View>
              )}
              <AccountLink onPress={() => void passwordReset()}>Reset password in browser</AccountLink>
              <ActionButton disabled={busy} onPress={signOut}>Sign out</ActionButton>
            </>
          ) : (
            <>
              <View style={styles.heading}>
                <Label accessibilityRole="header" style={[styles.title, { fontFamily: serifReady ? 'IBMPlexSerif' : 'serif' }]}>
                  {signup ? 'Create your account' : 'Welcome back'}
                </Label>
                <Label style={[styles.description, { color: colors.secondary }]}>
                  {signup ? 'Save notes to your account and open them on any device. Your guest notes can come with you.' : 'Sign in to pick up where you left off.'}
                </Label>
              </View>
              <View accessibilityRole="radiogroup" accessibilityLabel="Account type" style={[styles.modeSwitch, { borderColor: colors.line }]}>
                {[false, true].map((choice) => (
                  <Pressable
                    key={String(choice)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: signup === choice, disabled: busy }}
                    disabled={busy}
                    onPress={() => { setSignup(choice); setMessage(''); setPasswordVisible(false); }}
                    style={({ pressed }) => [styles.tab, { borderBottomColor: signup === choice ? colors.ink : 'transparent' },
                      pressed && { backgroundColor: colors.subtle }]}
                  >
                    <Label strong={signup === choice} style={{ color: signup === choice ? colors.ink : colors.muted }}>
                      {choice ? 'Create account' : 'Sign in'}
                    </Label>
                  </Pressable>
                ))}
              </View>
              <View style={styles.form}>
                {signup && <Field label="Name" optional placeholder="Your name" value={name} onChangeText={setName}
                  autoComplete="name" editable={!busy} returnKeyType="next" onSubmitEditing={() => emailInput.current?.focus()} />}
                <Field inputRef={emailInput} label="Email" placeholder="you@example.com" value={email} onChangeText={setEmail}
                  editable={!busy} autoCapitalize="none" autoCorrect={false} keyboardType="email-address"
                  autoComplete={signup ? 'email' : 'username'} returnKeyType="next" onSubmitEditing={() => passwordInput.current?.focus()} />
                <View style={styles.passwordGroup}>
                  <Field inputRef={passwordInput} label="Password" value={password} onChangeText={setPassword}
                    placeholder={signup ? 'Create a password' : 'Enter your password'} editable={!busy}
                    secureTextEntry={!passwordVisible} autoCapitalize="none" autoCorrect={false}
                    autoComplete={signup ? 'new-password' : 'current-password'} returnKeyType="go"
                    onSubmitEditing={() => void submit()}
                    labelAction={signup ? undefined : { label: 'Forgot password?', onPress: () => void passwordReset() }}
                    passwordToggle={{ visible: passwordVisible, onPress: () => setPasswordVisible((visible) => !visible) }} />
                  {signup && <PasswordStrength password={password} />}
                </View>
                {!!message && <Label accessibilityLiveRegion="polite" style={[styles.message, { color: colors.danger, backgroundColor: colors.pad }]}>{message}</Label>}
                <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy, busy }} disabled={busy}
                  onPress={() => void submit()} style={({ pressed }) => [styles.submit, { backgroundColor: colors.ink, opacity: pressed || busy ? .8 : 1 }]}>
                  <Label strong style={{ color: colors.canvas, fontSize: 16 }}>
                    {signup ? (busy ? 'Creating account…' : 'Create account') : (busy ? 'Signing in…' : 'Sign in')}
                  </Label>
                </Pressable>
              </View>
              <View style={[styles.continue, { borderTopColor: colors.line }]}>
                <AccountLink onPress={() => router.back()}>Continue as guest</AccountLink>
              </View>
            </>
          )}
          {!!user && !!message && (
            <Label accessibilityLiveRegion="polite" style={[styles.message, { color: colors.secondary, backgroundColor: colors.pad }]}>
              {message}
            </Label>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, optional, labelAction, passwordToggle, inputRef, ...props }: TextInputProps & {
  label: string;
  optional?: boolean;
  labelAction?: { label: string; onPress: () => void };
  passwordToggle?: { visible: boolean; onPress: () => void };
  inputRef?: React.Ref<TextInputInstance>;
}) {
  const { colors, fontsReady } = useAppTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <View style={styles.fieldHeader}>
        <Label strong>{label}</Label>
        {optional && <Label style={{ color: colors.muted }}>Optional</Label>}
        {labelAction && <Pressable accessibilityRole="link" onPress={labelAction.onPress} hitSlop={10}>
          <Label style={{ color: colors.muted }}>{labelAction.label}</Label>
        </Pressable>}
      </View>
      <View style={[styles.inputShell, { backgroundColor: colors.pad, borderColor: focused ? colors.accent : colors.line }]}>
        <TextInput
          {...props}
          ref={inputRef}
          accessibilityLabel={label}
          placeholderTextColor={colors.muted}
          selectionColor={colors.selection}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[styles.input, { color: colors.ink, fontFamily: fontsReady ? 'Geist' : undefined }]}
        />
        {passwordToggle && <IconButton compact icon={passwordToggle.visible ? 'eyeOff' : 'view'}
          label={passwordToggle.visible ? 'Hide password' : 'Show password'} onPress={passwordToggle.onPress} />}
      </View>
    </View>
  );
}

function PasswordStrength({ password }: { password: string }) {
  const { colors } = useAppTheme();
  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((pattern) => pattern.test(password)).length;
  const level = !password ? 0 : password.length < MIN_PASSWORD_LENGTH ? 1
    : 1 + Number(kinds >= 2) + Number(kinds >= 3) + Number(password.length >= 12);
  const tone = [colors.selected, colors.danger, colors.muted, colors.accent, colors.success][level];
  const label = ['', 'Weak', 'Okay', 'Good', 'Strong'][level];
  return (
    <View style={styles.strength}>
      <Label style={{ color: colors.muted }}>At least {MIN_PASSWORD_LENGTH} characters.</Label>
      <View style={styles.strengthRow} accessible={false}>
        {[1, 2, 3, 4].map((segment) => <View key={segment}
          style={[styles.segment, { backgroundColor: segment <= level ? tone : colors.selected }]} />)}
      </View>
      <Label accessibilityLiveRegion="polite" style={[styles.strengthLabel, { color: colors.muted }]}>
        {label ? `Strength: ${label}` : ''}
      </Label>
    </View>
  );
}

function AccountLink({ children, onPress }: { children: string; onPress: () => void }) {
  const { colors } = useAppTheme();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.link}>
      <Label style={{ color: colors.muted }}>{children}</Label>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  authHeader: { paddingHorizontal: 20, paddingTop: 12 },
  home: { minHeight: 44, flexDirection: 'row', gap: 10, alignItems: 'center', alignSelf: 'flex-start' },
  scroll: { paddingHorizontal: 20, paddingTop: 34, paddingBottom: 30 },
  content: { alignSelf: 'center', width: '100%', maxWidth: 360, gap: 14 },
  heading: { alignItems: 'center', marginBottom: 14, gap: 12 },
  title: { fontSize: 36, lineHeight: 45, textAlign: 'center' },
  description: { maxWidth: 274, fontSize: 14, lineHeight: 24, textAlign: 'center' },
  modeSwitch: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  tab: { flex: 1, minHeight: 46, borderBottomWidth: 2, alignItems: 'center', justifyContent: 'center', padding: 4 },
  form: { gap: 20, paddingTop: 10 },
  passwordGroup: { gap: 8 },
  strength: { gap: 8 },
  strengthRow: { flexDirection: 'row', gap: 6 },
  segment: { flex: 1, height: 4, borderRadius: 2 },
  strengthLabel: { minHeight: 20 },
  submit: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  section: { gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, paddingBottom: 14, marginBottom: 3 },
  field: { gap: 6 },
  fieldHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  inputShell: { minHeight: 50, borderWidth: 1, borderRadius: 10, flexDirection: 'row', alignItems: 'center' },
  input: { flex: 1, minWidth: 0, minHeight: 48, paddingHorizontal: 13, fontSize: 16 },
  link: { alignItems: 'center', justifyContent: 'center', minHeight: 48 },
  continue: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 12, paddingTop: 8 },
  message: { borderRadius: 8, padding: 12, fontSize: 13, lineHeight: 19 },
});
