import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Animated, AppState, Keyboard, KeyboardAvoidingView, PixelRatio, Platform, Pressable, StyleSheet, TextInput, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent, type TextInputInstance } from 'react-native';
import * as Network from 'expo-network';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect, useLocalSearchParams, usePreventRemove } from 'expo-router';
import { ActionButton, Icon, IconButton, Label, LoadingScreen, Wordmark, type IconName } from '../../components/chrome';
import { NotesDrawer } from '../../components/NotesDrawer';
import { NotePreview } from '../../components/NotePreview';
import { NoteRules } from '../../components/NoteRules';
import { EditHistory, type EditField, type EditSnapshot } from '../../lib/editHistory';
import { editMarkdown } from '../../lib/markdownEditing';
import { backspaceOutdent, caretAfterEdit, continueList, fromLive, toLive } from '../../lib/liveLists';
import { appAlert } from '../../components/AppDialog';
import { useAppTheme } from '../../lib/theme';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { cachedUserId, onSessionInvalidated, userScope, verifySession } from '../../lib/auth';
import { acceptCloudNote, addLocalNote, cloneNote, getNote, noteTitle, removeDraftAtSequence, saveDraft, setPreference, type CloudNote } from '../../lib/storage';
import { deleteCloudNote, fetchNote, isTransportError, saveCloudNote } from '../../lib/cloud';

const formats = [
  ['Heading', 'heading'],
  ['Subheading', 'subheading'],
  ['Bold', 'bold'],
  ['Italic', 'italic'],
  ['Task', 'task'],
  ['Table', 'table'],
  ['Code', 'code'],
  ['Link', 'link'],
] as const;

function splitNote(content: string) {
  const separator = content.indexOf('\n');
  if (separator === -1) return { title: content, body: '' };
  return { title: content.slice(0, separator).replace(/\r$/, ''), body: content.slice(separator + 1) };
}

function joinNote(title: string, body: string) {
  return title || body ? `${title}\n${body}` : '';
}

export default function NoteEditorScreen() {
  const { id, accountId } = useLocalSearchParams<{ id: string; accountId?: string }>();
  return <NoteEditor key={`${id}:${accountId ?? ''}`} id={id} accountId={accountId} />;
}

function NoteEditor({ id, accountId }: { id: string; accountId?: string }) {
  const { colors, fontsReady, scheme } = useAppTheme();
  const { top } = useSafeAreaInsets();
  const { width, fontScale } = useWindowDimensions();
  const showToolText = width >= 365 && fontScale < 1.25;
  const showFormatText = width >= 340 && fontScale < 1.35;
  const rowHeight = PixelRatio.roundToNearestPixel(26 * fontScale);
  const [userId, setUserId] = useState<string | null>(null);
  const [sessionChecked, setSessionChecked] = useState(!accountId);
  const scope = userScope(accountId ? userId : null);
  const currentScope = useRef(scope);
  const [content, setContent] = useState('');
  const [loadedScope, setLoadedScope] = useState<string | null>(null);
  const loaded = loadedScope === scope;
  const [bodyReady, setBodyReady] = useState(false);
  const [baseRevision, setBaseRevision] = useState<number | null>(null);
  const seqRef = useRef(0);
  const [sequence, setSequence] = useState(0);
  const [persistedSequence, setPersistedSequence] = useState(0);
  const writeQueue = useRef(Promise.resolve());
  const writeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [leaving, setLeaving] = useState(false);
  const latestDraft = useRef({ content, scope, baseRevision, sequence, persistedSequence });
  useLayoutEffect(() => {
    currentScope.current = scope;
    latestDraft.current = { content, scope, baseRevision, sequence, persistedSequence };
  }, [content, scope, baseRevision, sequence, persistedSequence]);
  const [preview, setPreview] = useState(false);
  const scrollY = useRef(0);
  const [editorOffset, setEditorOffset] = useState(0);
  const [bodyTop, setBodyTop] = useState(96);
  const [ruleScroll] = useState(() => new Animated.Value(0));
  const trackEditorScroll = useMemo(() => Animated.event(
    [{ nativeEvent: { contentOffset: { y: ruleScroll } } }],
    { useNativeDriver: true },
  ), [ruleScroll]);
  const rememberEditorScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollY.current = event.nativeEvent.contentOffset.y;
  }, []);
  const [formatBar, setFormatBar] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const bodyInput = useRef<TextInputInstance>(null);
  const titleInput = useRef<TextInputInstance>(null);
  const [history] = useState(() => new EditHistory());
  const { title, body } = splitNote(content);
  const titleFont = fontsReady ? 'PatrickHand' : undefined;
  const bodyFont = fontsReady ? 'Geist' : undefined;
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [remote, setRemote] = useState<CloudNote | null>(null);
  const [conflictActive, setConflictActive] = useState(false);
  const selections = useRef({ title: { start: 0, end: 0 }, body: { start: 0, end: 0 } });
  const activeField = useRef<EditField>('body');
  const pendingSelection = useRef<Pick<EditSnapshot, 'field' | 'selection'> | null>(null);
  const [{ canUndo, canRedo }, setHistoryState] = useState({ canUndo: false, canRedo: false });
  const syncHistoryState = useCallback(() => {
    const next = { canUndo: history.canUndo, canRedo: history.canRedo };
    setHistoryState((previous) => previous.canUndo === next.canUndo && previous.canRedo === next.canRedo ? previous : next);
  }, [history]);
  const resetHistory = useCallback(() => {
    history.reset();
    pendingSelection.current = null;
    syncHistoryState();
  }, [history, syncHistoryState]);

  useLayoutEffect(() => {
    const next = pendingSelection.current;
    if (!next) return;
    pendingSelection.current = null;
    const { field, selection } = next;
    selections.current[field] = selection;
    const input = field === 'title' ? titleInput : bodyInput;
    input.current?.setSelection(selection.start, selection.end);
  }, [content]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!id || (accountId && accountId !== userId)) {
        setBodyReady(false);
        setLoadedScope(scope);
        return;
      }
      try {
        let local = await getNote(scope, id);
        if (!active) return;
        if (userId && local?.hasBody === 0) {
          try {
            const remoteNote = await fetchNote(userId, id);
            if (!active) return;
            await acceptCloudNote(scope, remoteNote);
            local = await getNote(scope, id);
          } catch (error) {
            if (active) setStatus((error as Error).message);
          }
        }
        if (!active) return;
        resetHistory();
        setContent(local?.hasBody ? local.content : '');
        seqRef.current = local?.editedSeq ?? 0;
        setSequence(seqRef.current);
        setPersistedSequence(seqRef.current);
        setBaseRevision(local?.revision ?? null);
        setBodyReady(Boolean(local?.hasBody));
        if (local?.hasBody) setStatus(local.isDirty ? 'Saved on device' : 'Saved to account');
      } catch {
        if (active) setStatus('Could not open this note on the device.');
      } finally {
        if (active) setLoadedScope(scope);
      }
    };
    void load();
    return () => { active = false; };
  }, [accountId, id, resetHistory, scope, userId]);
  useEffect(() => {
    if (!accountId) return;
    const verifyWhenOnline = () => {
      void verifySession().then((user) => { if (user?.id) setUserId(user.id); }).catch(() => {});
    };
    const network = Network.addNetworkStateListener(({ isConnected }) => { if (isConnected) verifyWhenOnline(); });
    const appState = AppState.addEventListener('change', (state) => { if (state === 'active') verifyWhenOnline(); });
    return () => { network.remove(); appState.remove(); };
  }, [accountId]);
  useEffect(() => accountId ? onSessionInvalidated(() => { setUserId(null); setRemote(null); resetHistory(); setContent(''); setLoadedScope(null); setStatus('Session ended · sign in to access account notes'); }) : undefined, [accountId, resetHistory]);
  useFocusEffect(useCallback(() => {
    if (!accountId) return;
    let active = true;
    void verifySession().then((user) => { if (active) setUserId(user?.id ?? null); }).catch(async () => {
      const previousUser = await cachedUserId().catch(() => null);
      if (!active) return;
      setUserId(previousUser);
      if (previousUser) setStatus('Offline · draft stays in this account');
    }).finally(() => { if (active) setSessionChecked(true); });
    return () => { active = false; };
  }, [accountId]));

  function updateDraft(nextContent: string) {
    setContent(nextContent);
    if (!loaded || !id) return;
    const next = ++seqRef.current;
    latestDraft.current = { ...latestDraft.current, content: nextContent, sequence: next };
    setSequence(next);
    setStatus('Saving on device…');
    if (writeTimer.current) clearTimeout(writeTimer.current);
    writeTimer.current = setTimeout(() => {
      writeQueue.current = writeQueue.current.then(async () => {
        const latest = latestDraft.current;
        const sameScope = latest.scope === scope;
        await saveDraft(scope, id, sameScope && seqRef.current === next ? latest.content : nextContent, sameScope ? latest.baseRevision : baseRevision, next);
        if (seqRef.current === next) { setPersistedSequence(next); setStatus('Saved on device'); }
      }).catch(() => { if (seqRef.current === next) setStatus('Could not save on device · export this draft to keep it safe'); });
      writeTimer.current = null;
    }, 450);
  }

  const ensureLocalSaved = useCallback(async () => {
    if (!id || latestDraft.current.sequence === latestDraft.current.persistedSequence) return;
    if (writeTimer.current) { clearTimeout(writeTimer.current); writeTimer.current = null; }
    await writeQueue.current;
    const latest = latestDraft.current;
    await saveDraft(latest.scope, id, latest.content, latest.baseRevision, latest.sequence);
    setPersistedSequence(latest.sequence);
    setStatus('Saved on device');
  }, [id]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') void ensureLocalSaved().catch(() => {});
    });
    return () => subscription.remove();
  }, [ensureLocalSaved]);
  const disablePrevention = usePreventRemove(!leaving && loaded && (sequence !== persistedSequence || busy), ({ repeat }) => {
    if (busy) { appAlert('Save in progress', 'Wait for the account save to finish before leaving this note.'); return; }
    void ensureLocalSaved().then(() => {
      setLeaving(true);
      repeat();
    }).catch(() => {
      appAlert('Draft not saved', 'Your text is still open. Export it before leaving or try again.');
    });
  });

  function leaveNote(navigate: () => void) {
    setLeaving(true);
    disablePrevention();
    navigate();
  }

  async function saveToAccount() {
    if (scope === 'guest') {
      appAlert('Save to your account', 'This is a guest note. You can import it from the Account screen.', [
        { text: 'Cancel', style: 'cancel' }, { text: 'Open account', onPress: () => router.push('/account') },
      ]);
      return;
    }
    if (busy || !userId || !id) return;
    if (!content.trim()) { setStatus('Add text before saving this note to your account.'); return; }
    const submitted = content;
    const submittedSeq = seqRef.current;
    const submittedScope = scope;
    setBusy(true); setStatus('Saving to account…');
    try {
      await ensureLocalSaved();
      if (currentScope.current !== submittedScope) return;
      const saved = await saveCloudNote(userId, id, submitted, baseRevision);
      await acceptCloudNote(submittedScope, saved, { sequence: submittedSeq });
      if (currentScope.current === submittedScope) {
        latestDraft.current = { ...latestDraft.current, baseRevision: saved.revision };
        setBaseRevision(saved.revision);
        setStatus(seqRef.current === submittedSeq ? 'Saved to account' : 'Saved version · newer edits stay on device');
      }
    } catch (error) {
      if (currentScope.current !== submittedScope) return;
      const e = error as Error & { status?: number; current?: CloudNote | null };
      if (e.status === 401) return;
      if (e.status === 409) {
        setRemote(e.current ?? null); setConflictActive(true); setStatus('Conflict · keep your draft or use the cloud version');
      } else if (isTransportError(e)) {
        try {
          const latest = await fetchNote(userId, id);
          if (currentScope.current !== submittedScope) return;
          if (latest.content === submitted) {
            await acceptCloudNote(scope, latest, { sequence: submittedSeq });
            latestDraft.current = { ...latestDraft.current, baseRevision: latest.revision };
            setBaseRevision(latest.revision);
            setStatus('Saved to account · response confirmed by refresh');
          } else { setRemote(latest); setConflictActive(true); setStatus('Could not confirm save · compare with the cloud version'); }
        } catch (refreshError) {
          if (currentScope.current !== submittedScope) return;
          if ((refreshError as { status?: number }).status === 404 && baseRevision !== null) {
            setRemote(null); setConflictActive(true); setStatus('The cloud note was deleted · keep your draft as a copy');
          } else {
            setStatus('Save unconfirmed · your draft stays on this device');
          }
        }
      } else {
        setStatus(`Not saved to account · ${e.message}`);
      }
    } finally { setBusy(false); }
  }

  async function replaceWithCloudVersion() {
    if (!remote || !id) return;
    appAlert('Use the cloud version?', 'This replaces the text currently on this device.', [
      { text: 'Keep my draft', style: 'cancel' },
      { text: 'Use cloud version', style: 'destructive', onPress: async () => {
        await ensureLocalSaved();
        const expectedSequence = seqRef.current;
        if (currentScope.current !== scope) return;
        if (!await acceptCloudNote(scope, remote, { sequence: expectedSequence, replaceDraft: true })) return;
        if (currentScope.current !== scope || seqRef.current !== expectedSequence) return;
        resetHistory();
        setContent(remote.content); setBaseRevision(remote.revision); setPersistedSequence(seqRef.current); setRemote(null); setConflictActive(false); setStatus('Saved to account');
      } },
    ]);
  }
  async function keepDraftCopy() {
    try {
      await ensureLocalSaved();
      if (!id || currentScope.current !== scope) return;
      const draft = await getNote(scope, id);
      if (!draft || currentScope.current !== scope) return;
      const nextId = await cloneNote(scope, draft);
      if (currentScope.current !== scope || seqRef.current !== draft.editedSeq) {
        setStatus('Draft copied. Your newer edits are still in this note.');
        return;
      }
      if (remote) {
        await acceptCloudNote(scope, remote, { sequence: draft.editedSeq, replaceDraft: true });
      } else {
        await removeDraftAtSequence(scope, id, draft.editedSeq);
      }
      if (currentScope.current !== scope) return;
      leaveNote(() => router.replace({ pathname: '/note/[id]', params: { id: nextId, accountId } }));
    } catch {
      setStatus('Could not copy this draft. Your original text is still available.');
    }
  }
  async function exportNote(asText = false) {
    try {
      const title = noteTitle(content).normalize('NFKD').replace(/[^\p{L}\p{N}-]+/gu, '-').replace(/^-|-$/g, '').slice(0, 60) || 'QuickNote';
      const file = new FileSystem.File(FileSystem.Paths.cache, `${title}.${asText ? 'txt' : 'md'}`);
      file.create({ overwrite: true });
      await file.write(content);
      await Sharing.shareAsync(file.uri, { mimeType: asText ? 'text/plain' : 'text/markdown', dialogTitle: 'Export note' });
      setTimeout(() => { try { file.delete(); } catch { /* The OS can clear the cache later. */ } }, 60 * 60 * 1000);
    } catch (error) { appAlert('Could not export note', (error as Error).message); }
  }

  function chooseExport() {
    appAlert('Export note', 'Choose a UTF-8 file format.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Markdown (.md)', onPress: () => { void exportNote(false); } },
      { text: 'Plain text (.txt)', onPress: () => { void exportNote(true); } },
    ]);
  }

  function recordEdit(nextContent: string, field: EditField, delta = 0) {
    const previous = latestDraft.current.content;
    if (previous === nextContent) return;
    history.record({ content: previous, field, selection: selections.current[field] }, delta);
    syncHistoryState();
    updateDraft(nextContent);
  }

  function editTitle(nextTitle: string) {
    const current = splitNote(latestDraft.current.content);
    const pasted = splitNote(nextTitle);
    const nextBody = pasted.body ? (current.body ? `${pasted.body}\n${current.body}` : pasted.body) : current.body;
    recordEdit(joinNote(pasted.title, nextBody), 'title', pasted.body ? 0 : nextTitle.length - current.title.length);
    if (pasted.body) bodyInput.current?.focus();
  }

  function editBody(shownText: string) {
    const current = splitNote(latestDraft.current.content);
    // The editor shows "• " for "- ". Turn what's on screen back into Markdown before storing it.
    let nextBody = fromLive(shownText);
    const stepped = backspaceOutdent(toLive(current.body), shownText);
    const listed = stepped ? null : continueList(current.body, nextBody);
    if (stepped) {
      nextBody = fromLive(stepped.body);
      pendingSelection.current = { field: 'body', selection: { start: stepped.cursor, end: stepped.cursor } };
    } else if (listed) {
      nextBody = listed.body;
      pendingSelection.current = { field: 'body', selection: { start: listed.cursor, end: listed.cursor } };
    } else if (toLive(nextBody) !== shownText) {
      // A "- " was just typed and now shows as "• ": keep the caret right after it.
      const caret = caretAfterEdit(current.body, nextBody);
      pendingSelection.current = { field: 'body', selection: { start: caret, end: caret } };
    }
    recordEdit(joinNote(current.title, nextBody), 'body', nextBody.length - current.body.length);
  }

  function formatSelection(format: Parameters<typeof editMarkdown>[2]) {
    const current = splitNote(latestDraft.current.content);
    const next = editMarkdown(current.body, selections.current.body, format);
    bodyInput.current?.focus();
    if (next.body === current.body) {
      if (format === 'indent' || format === 'outdent') {
        setStatus(format === 'indent' ? 'Put the cursor on a bullet below another bullet to make it a sub-point.' : 'Put the cursor on an indented bullet to move it out.');
      }
      return;
    }
    pendingSelection.current = { field: 'body', selection: next.selection };
    recordEdit(joinNote(current.title, next.body), 'body');
  }

  function stepHistory(direction: 'undo' | 'redo') {
    const field = activeField.current;
    const next = history.step(direction, { content: latestDraft.current.content, field, selection: selections.current[field] });
    if (!next) return;
    pendingSelection.current = next;
    syncHistoryState();
    updateDraft(next.content);
  }

  async function pickNote(nextId: string, nextAccountId = accountId ?? '') {
    if (busy) return;
    try {
      await ensureLocalSaved();
      setDrawer(false);
      if (id === nextId && (accountId ?? '') === nextAccountId) return;
      leaveNote(() => router.replace({ pathname: '/note/[id]', params: { id: nextId, accountId: nextAccountId } }));
    } catch {
      setStatus('Could not save on device. Export this draft before leaving.');
    }
  }

  async function createNote() {
    if (busy || (accountId && accountId !== userId)) return;
    try {
      await ensureLocalSaved();
      const nextId = await addLocalNote(scope);
      await setPreference(`active-note:${scope}`, nextId);
      await pickNote(nextId);
    } catch {
      setStatus('Could not create a note on this device.');
    }
  }

  function togglePreview() {
    Keyboard.dismiss();
    setFormatBar(false);
    if (!preview) setEditorOffset(scrollY.current);
    setPreview(!preview);
  }

  function removeNote() {
    if (busy) return;
    const dirtyCloudNote = Boolean(baseRevision && !status.startsWith('Saved to account'));
    appAlert(dirtyCloudNote ? 'Delete and keep your draft?' : 'Delete this note?', dirtyCloudNote ? 'The account note will be deleted, and your unsent text will be kept as a separate device draft.' : 'This note will be removed from this device.', [
      { text: 'Cancel', style: 'cancel' },
      { text: dirtyCloudNote ? 'Delete and keep draft' : 'Delete', style: 'destructive', onPress: async () => {
        try {
          await ensureLocalSaved();
          if (currentScope.current !== scope) return;
          if (baseRevision && userId) await deleteCloudNote(userId, id, baseRevision);
          if (dirtyCloudNote) await cloneNote(scope, { id: id ?? '', scope, content, createdAt: Date.now().toString(), updatedAt: Date.now().toString(), revision: null, editedSeq: seqRef.current, isDirty: 1, hasBody: 1 });
          const { removeNote } = await import('../../lib/storage');
          await removeNote(scope, id);
          leaveNote(() => router.back());
        } catch (error) { appAlert('Could not delete note', (error as Error).message); }
      } },
    ]);
  }

  if (!sessionChecked || !loaded) return <LoadingScreen label="Opening note…" />;
  if (!bodyReady || (accountId && accountId !== userId)) {
    return (
      <View style={[styles.unavailable, { backgroundColor: colors.pad }]}>
        <Label style={{ color: colors.muted }}>
          {accountId && accountId !== userId ? 'Sign in to the original account to open this note.' : status || 'This note is unavailable on this device.'}
        </Label>
        <ActionButton onPress={() => router.back()}>Back to notes</ActionButton>
      </View>
    );
  }

  const hasContent = Boolean(content.trim());
  const statusText = hasContent || !['', 'Saved on device', 'Saved to account'].includes(status)
    ? status === 'Saved on device' ? 'On this device' : status
    : '';
  const statusColor = conflictActive ? colors.warning : status.startsWith('Saved to account') ? colors.success : colors.muted;
  const dockShadow = Platform.OS === 'android' && Number(Platform.Version) < 28
    ? { elevation: 2 }
    : { boxShadow: scheme === 'dark' ? '0px 2px 8px #00000055' : '0px 2px 8px #14141320' };

  return (
    <KeyboardAvoidingView style={[styles.screen, { backgroundColor: colors.pad }]} behavior="padding" keyboardVerticalOffset={top}>
      <View style={[styles.topbar, { backgroundColor: colors.pad, borderBottomColor: colors.line }]}>
        <IconButton icon="menu" label="Open notes" onPress={() => { Keyboard.dismiss(); setDrawer(true); }} disabled={busy} />
        <Wordmark />
        <IconButton icon="cloud" label="Save to account" onPress={() => void saveToAccount()} disabled={busy || !hasContent} />
        <IconButton icon="download" label="Export note" disabled={!hasContent} onPress={chooseExport} />
        <IconButton icon="edit" label="New note" color={colors.accent} onPress={() => void createNote()} disabled={busy} />
      </View>

      <View style={styles.document}>
        {!preview && <NoteRules scroll={ruleScroll} rowHeight={rowHeight} bodyTop={bodyTop} />}
        <Animated.ScrollView key={preview ? 'read' : 'write'} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.paperScroll}
          contentOffset={preview ? undefined : { x: 0, y: editorOffset }}
          onScroll={preview ? undefined : trackEditorScroll}
          onScrollEndDrag={preview ? undefined : rememberEditorScroll}
          onMomentumScrollEnd={preview ? undefined : rememberEditorScroll}
          scrollEventThrottle={16}>
          <View style={styles.paper}>
            {preview ? (
              <>
                <View style={[styles.previewHeader, { borderBottomColor: colors.line }]}>
                  <Label selectable accessibilityRole="header" style={[styles.previewTitle, { color: colors.ink, fontFamily: titleFont }]}>
                    {title || 'Untitled note'}
                  </Label>
                </View>
                <NotePreview body={body} />
              </>
            ) : (
              <>
                <TextInput
                  ref={titleInput}
                  value={title}
                  onFocus={() => { activeField.current = 'title'; }}
                  onSelectionChange={(event) => { selections.current.title = event.nativeEvent.selection; }}
                  onChangeText={editTitle}
                  onSubmitEditing={() => bodyInput.current?.focus()}
                  submitBehavior="submit"
                  returnKeyType="next"
                  placeholder="Untitled note"
                  placeholderTextColor={colors.muted}
                  selectionColor={colors.selection}
                  accessibilityLabel="Note title"
                  style={[styles.title, { color: colors.ink, fontFamily: titleFont }]}
                />
                <TextInput
                  ref={bodyInput}
                  onLayout={(event) => setBodyTop(event.nativeEvent.layout.y)}
                  value={toLive(body)}
                  onChangeText={editBody}
                  onFocus={() => { activeField.current = 'body'; }}
                  onSelectionChange={(event) => { selections.current.body = event.nativeEvent.selection; }}
                  multiline
                  scrollEnabled={false}
                  textAlignVertical="top"
                  placeholder="Start writing…"
                  placeholderTextColor={colors.muted}
                  selectionColor={colors.selection}
                  accessibilityLabel="Note content"
                  style={[styles.body, { color: colors.secondary, fontFamily: bodyFont }]}
                />
              </>
            )}
          </View>
        </Animated.ScrollView>
      </View>

      {conflictActive && (
        <View style={[styles.conflict, { borderTopColor: colors.line, backgroundColor: colors.canvas }]}>
          <Label strong>Cloud version changed</Label>
          <Label numberOfLines={3} style={{ color: colors.muted }}>{remote?.content ?? 'The cloud note is unavailable.'}</Label>
          <View style={styles.conflictActions}>
            <ActionButton onPress={() => void keepDraftCopy()}>Keep draft as a copy</ActionButton>
            {remote && <ActionButton danger onPress={() => void replaceWithCloudVersion()}>Use cloud version</ActionButton>}
          </View>
        </View>
      )}

      <View style={[styles.footer, preview && styles.previewFooter]}>
        <View style={[styles.dock, { borderColor: colors.line, backgroundColor: colors.canvas }, dockShadow]}>
          {formatBar && !preview && (
            <View accessibilityRole="toolbar" accessibilityLabel="Text formatting"
              style={[styles.formatBar, { borderBottomColor: colors.line }]}>
              {formats.map(([label, format]) => (
                <ToolbarButton key={format} icon={format} label={`Format as ${label}`}
                  text={showFormatText ? label : undefined} stacked onPress={() => formatSelection(format)} />
              ))}
            </View>
          )}
          <View style={styles.toolbar}>
            {!preview && (
              <>
                <ToolbarButton icon="undo" label="Undo" disabled={!canUndo} onPress={() => stepHistory('undo')} />
                <ToolbarButton icon="redo" label="Redo" disabled={!canRedo} onPress={() => stepHistory('redo')} />
                <View style={[styles.toolDivider, { backgroundColor: colors.line }]} />
                <ToolbarButton icon="bullet" label="Bullet list" onPress={() => formatSelection('bullet')} />
                <ToolbarButton icon="outdent" label="Move bullet out one level" onPress={() => formatSelection('outdent')} />
                <ToolbarButton icon="indent" label="Make bullet a sub-point" onPress={() => formatSelection('indent')} />
                <ToolbarButton icon="type" label="More formatting" active={formatBar} onPress={() => setFormatBar((open) => !open)} />
                <View style={styles.spacer} />
              </>
            )}
            <ToolbarButton icon={preview ? 'edit' : 'view'} label={preview ? 'Back to editor' : 'Preview note'}
              text={preview ? 'Back to editor' : showToolText ? 'Preview' : undefined} filled={preview} onPress={togglePreview} />
          </View>
        </View>
        {!!statusText && (
          <Label numberOfLines={2} accessibilityLiveRegion="polite" style={[styles.status, { color: statusColor }]}>
            {busy ? 'Saving…' : statusText}
          </Label>
        )}
      </View>

      <NotesDrawer open={drawer} activeId={id} onClose={() => setDrawer(false)}
        onDeleteActive={() => { setDrawer(false); removeNote(); }}
        onPick={(nextId, nextAccountId) => void pickNote(nextId, nextAccountId)} />
    </KeyboardAvoidingView>
  );
}

function ToolbarButton({ icon, label, text, onPress, active, filled, stacked, disabled }: {
  icon: IconName;
  label: string;
  text?: string;
  onPress: () => void;
  active?: boolean;
  filled?: boolean;
  stacked?: boolean;
  disabled?: boolean;
}) {
  const { colors, scheme } = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.tool, stacked && styles.stackedTool, disabled && { opacity: .38 }]}
    >
      {({ pressed }) => {
        const background = filled ? colors.primary : active || pressed ? colors.selection : 'transparent';
        const foreground = filled ? colors.onPrimary : active ? colors.accent : colors.ink;
        return (
          <View style={[styles.toolFace, stacked && styles.stackedFace]}>
            <View pointerEvents="none" style={[
              styles.toolBackground,
              { backgroundColor: background, borderColor: background, opacity: filled && pressed ? .78 : 1 },
            ]} />
            <Icon name={icon} color={foreground} size={stacked ? 19 : 17} />
            {text && (
              <Label strong numberOfLines={1} style={[
                styles.toolText,
                { color: foreground, textShadowColor: scheme === 'dark' ? '#00000055' : '#14141316' },
                stacked && styles.stackedText,
              ]}>{text}</Label>
            )}
          </View>
        );
      }}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  unavailable: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24 },
  topbar: { minHeight: 56, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  document: { flex: 1, overflow: 'hidden' },
  paperScroll: { flexGrow: 1 },
  paper: { flexGrow: 1, width: '100%', maxWidth: 740, alignSelf: 'center', paddingHorizontal: 24, paddingTop: 26, paddingBottom: 28 },
  title: { fontSize: 37, lineHeight: 46, minHeight: 52, padding: 0, includeFontPadding: false, marginBottom: 18 },
  previewHeader: { borderBottomWidth: StyleSheet.hairlineWidth, paddingBottom: 16, marginBottom: 19 },
  previewTitle: { fontSize: 41, lineHeight: 53 },
  body: { flexGrow: 1, fontSize: 16, lineHeight: 26, padding: 0, minHeight: 112, includeFontPadding: false },
  conflict: { borderTopWidth: StyleSheet.hairlineWidth, padding: 14, gap: 9 },
  conflictActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  formatBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 2, borderBottomWidth: StyleSheet.hairlineWidth },
  stackedTool: { flex: 1, minHeight: 48 },
  stackedFace: { flexDirection: 'column', gap: 2, minHeight: 42, paddingHorizontal: 2 },
  toolText: { fontSize: 12, flexShrink: 1, textShadowRadius: 1, textShadowOffset: { width: 0, height: .5 } },
  stackedText: { fontSize: 10 },
  footer: { marginHorizontal: 8, paddingTop: 3, paddingBottom: 3, gap: 3 },
  previewFooter: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  dock: { borderWidth: 1, borderRadius: 14, flexShrink: 1 },
  toolbar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 2 },
  toolDivider: { width: StyleSheet.hairlineWidth, height: 18, marginHorizontal: 2 },
  tool: { minHeight: 44, minWidth: 44, flexShrink: 1, justifyContent: 'center' },
  toolFace: { minHeight: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 7 },
  toolBackground: { position: 'absolute', top: 0, bottom: 0, left: 3, right: 3, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth },
  spacer: { flex: 1 },
  status: { flexShrink: 1, fontSize: 11, paddingHorizontal: 7, paddingBottom: 2 },
});
