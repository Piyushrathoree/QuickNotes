import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Alert, AppState, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import * as Network from 'expo-network';
import { router, useFocusEffect } from 'expo-router';
import { useAppTheme } from '../lib/theme';
import { Icon, IconButton, Label, ThemeButton, Wordmark } from './chrome';
import { OpeningScene } from './OpeningScene';
import { acceptSummary, addLocalNote, cloneNote, getNote, getPreference, listNoteTitles, reconcileSummaryIds, removeNote as removeStoredNote, setPreference } from '../lib/storage';
import { cachedUserId, onSessionInvalidated, userScope, verifySession } from '../lib/auth';
import { fetchSummaries, isTransportError } from '../lib/cloud';

type NoteTitle = Awaited<ReturnType<typeof listNoteTitles>>[number];

type LibraryProps = {
  activeId?: string;
  onClose?: () => void;
  onDeleteActive?: () => void;
  onPick?: (id: string, accountId: string) => void;
};

export function NoteLibrary({ activeId, onClose, onDeleteActive, onPick }: LibraryProps) {
  const { colors } = useAppTheme();
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [showGuest, setShowGuest] = useState(false);
  const [notes, setNotes] = useState<NoteTitle[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [opening, setOpening] = useState(!onClose);
  const openedOnStartup = useRef(false);
  const refreshingScopes = useRef(new Set<string>());
  const [status, setStatus] = useState('');
  const scope = userScope(showGuest ? null : userId);
  const currentScope = useRef(scope);
  useLayoutEffect(() => { currentScope.current = scope; }, [scope]);

  const refreshLocal = useCallback(async () => {
    try {
      const local = await listNoteTitles(scope);
      if (currentScope.current === scope) setNotes(local);
    } catch {
      if (currentScope.current === scope) setStatus('Could not open notes on this device.');
    }
  }, [scope]);
  const refreshCloud = useCallback(async () => {
    if (!userId || scope === 'guest' || currentScope.current !== scope || refreshingScopes.current.has(scope)) return;
    refreshingScopes.current.add(scope);
    setRefreshing(true);
    setStatus('');
    try {
      const summaries = await fetchSummaries(userId);
      if (currentScope.current !== scope) return;
      const ids: string[] = [];
      for (const item of summaries) {
        if (currentScope.current !== scope) return;
        if (!Number.isSafeInteger(item.revision) || item.revision < 1) throw new Error('The server returned an invalid note revision.');
        ids.push(item.id);
        await acceptSummary(scope, item);
      }
      await reconcileSummaryIds(scope, ids);
      if (currentScope.current === scope) setStatus('');
    } catch (error) {
      if (currentScope.current === scope) setStatus(isTransportError(error) ? 'Offline · showing saved notes' : `Account refresh failed · ${(error as Error).message}`);
    } finally {
      refreshingScopes.current.delete(scope);
      if (currentScope.current === scope) { setRefreshing(false); await refreshLocal(); }
    }
  }, [userId, scope, refreshLocal]);

  useEffect(() => {
    let alive = true;
    const checkSession = async () => {
      try {
        const user = await verifySession();
        if (!alive) return;
        setUserId(user?.id ?? null); setEmail(user?.email ?? null);
        if (user?.id === userId) void refreshCloud();
      } catch {
        const previousUser = await cachedUserId().catch(() => null);
        if (alive) { setUserId(previousUser); setStatus(previousUser ? 'Showing your downloaded notes offline' : ''); }
      } finally {
        if (alive) setSessionReady(true);
      }
    };
    void checkSession();
    const network = Network.addNetworkStateListener(({ isConnected }) => { if (isConnected) void checkSession(); });
    const appState = AppState.addEventListener('change', (state) => { if (state === 'active') void checkSession(); });
    return () => { alive = false; network.remove(); appState.remove(); };
  }, [refreshCloud, userId]);
  useEffect(() => onSessionInvalidated(() => { setUserId(null); setEmail(null); setRefreshing(false); setStatus('Sign in to access account notes'); }), []);
  useFocusEffect(useCallback(() => {
    let active = true;
    void refreshLocal();
    void verifySession().then((user) => {
      if (!active) return;
      setUserId(user?.id ?? null); setEmail(user?.email ?? null);
    }).catch(async () => {
      const previousUser = await cachedUserId().catch(() => null);
      if (active && previousUser) setUserId(previousUser);
    });
    return () => { active = false; };
  }, [refreshLocal]));

  useFocusEffect(useCallback(() => {
    return () => setOpening(false);
  }, []));

  const openNote = useCallback((id: string, noteScope: string) => {
    const accountId = noteScope.startsWith('account:') ? noteScope.slice('account:'.length) : '';
    void setPreference(`active-note:${noteScope}`, id).catch(() => {});
    if (onPick) onPick(id, accountId);
    else router.push({ pathname: '/note/[id]', params: { id, accountId } });
  }, [onPick]);

  useEffect(() => {
    if (onClose || !sessionReady || openedOnStartup.current) return;
    let current = true;
    const openPrevious = async () => {
      const previousId = await getPreference(`active-note:${scope}`);
      const previous = previousId && await getNote(scope, previousId);
      if (!current || currentScope.current !== scope) return;
      const id = previous ? previous.id : await addLocalNote(scope);
      if (current && currentScope.current === scope) {
        openedOnStartup.current = true;
        openNote(id, scope);
      }
    };
    void openPrevious().catch(() => {
      if (!current) return;
      openedOnStartup.current = true;
      setOpening(false);
      setStatus('Could not open a device note. Try creating a new one.');
    });
    return () => { current = false; };
  }, [onClose, openNote, scope, sessionReady]);

  async function createNote() {
    try {
      const id = await addLocalNote(scope);
      if (currentScope.current === scope) openNote(id, scope);
    } catch {
      setStatus('Could not create a note on this device.');
    }
  }

  async function deleteNote(item: NoteTitle) {
    if (item.scope !== scope) return;
    const note = await getNote(scope, item.id).catch(() => null);
    if (currentScope.current !== scope) return;
    if (!note) { setStatus('Could not find this note. Refresh your notes and try again.'); return; }
    const keepCopy = Boolean(note.revision && note.isDirty);
    Alert.alert(keepCopy ? 'Delete and keep draft?' : 'Delete this note?', keepCopy ? 'The account note will be deleted and your unsent text will stay as a separate device draft.' : 'This note will be removed from this device.', [
      { text: 'Cancel', style: 'cancel' },
      { text: keepCopy ? 'Delete and keep draft' : 'Delete', style: 'destructive', onPress: async () => {
        try {
          if (currentScope.current !== scope) return;
          if (note.revision) {
            const { deleteCloudNote } = await import('../lib/cloud');
            if (!userId) return;
            await deleteCloudNote(userId, note.id, note.revision);
          }
          if (keepCopy) await cloneNote(scope, note);
          await removeStoredNote(scope, note.id);
          await refreshLocal();
        } catch (error) { Alert.alert('Could not delete note', (error as Error).message); }
      } },
    ]);
  }

  function openDestination(destination: '/account' | '/settings') {
    onClose?.();
    router.push(destination);
  }

  const visibleNotes = notes.filter((note) => note.scope === scope);

  if (opening) return <OpeningScene />;

  return (
    <View style={[styles.surface, { backgroundColor: colors.sidebar }]}>
      <View style={styles.header}>
        <Wordmark />
        <ThemeButton />
        {onClose && <IconButton icon="close" label="Close notes" onPress={onClose} />}
      </View>
      <Pressable accessibilityRole="button" onPress={createNote}
        style={({ pressed }) => [styles.newNote, { backgroundColor: pressed ? colors.selected : colors.subtle }]}
      >
        <Icon name="edit" color={colors.accent} />
        <Label strong>New note</Label>
      </Pressable>
      {userId && (
        <Pressable accessibilityRole="button" style={styles.scope} onPress={() => setShowGuest((showing) => !showing)}>
          <Label style={{ color: colors.accent }}>{showGuest ? 'Show account notes' : 'Show guest notes'}</Label>
        </Pressable>
      )}
      <Label strong style={[styles.recents, { color: colors.muted }]}>Recents</Label>
      {!!status && <Label accessibilityLiveRegion="polite" style={[styles.message, { color: colors.muted }]}>{status}</Label>}
      <FlatList
        data={visibleNotes}
        keyExtractor={(item) => `${item.scope}:${item.id}`}
        contentContainerStyle={styles.list}
        refreshControl={scope === 'guest' ? undefined :
          <RefreshControl refreshing={refreshing} onRefresh={refreshCloud} tintColor={colors.accent} />}
        ListEmptyComponent={<Label style={[styles.message, { color: colors.muted }]}>
          {sessionReady ? 'No notes yet' : 'Opening notes…'}
        </Label>}
        renderItem={({ item }) => {
          const { title } = item;
          const selected = item.id === activeId;
          return (
            <View style={[styles.note, selected && { backgroundColor: colors.selected }]}>
              <Pressable accessibilityRole="button" accessibilityState={{ selected }}
                accessibilityLabel={`Open ${title}`} onPress={() => openNote(item.id, item.scope)}
                style={({ pressed }) => [styles.noteOpen, pressed && { backgroundColor: colors.subtle }]}
              >
                <Icon name="file" color={colors.muted} size={17} />
                <Label strong={selected} numberOfLines={1} style={styles.noteTitle}>{title}</Label>
                {scope !== 'guest' && !!item.isDirty && <View style={[styles.dot, { backgroundColor: colors.warning }]} />}
              </Pressable>
              <IconButton icon="trash" label={`Delete ${title}`} onPress={() => selected && onDeleteActive ? onDeleteActive() : void deleteNote(item)} />
            </View>
          );
        }}
      />
      <View style={[styles.footer, { borderTopColor: colors.line }]}>
        <Pressable accessibilityRole="button" accessibilityLabel={userId ? 'Manage account' : 'Sign in'}
          onPress={() => openDestination('/account')} style={styles.account}
        >
          <View style={[styles.avatar, { backgroundColor: colors.subtle }]}>
            <Icon name="person" color={colors.muted} size={17} />
          </View>
          <View style={styles.accountText}>
            <Label strong numberOfLines={1}>{email || (userId ? 'Account' : 'Sign in')}</Label>
            {!userId && <Label style={{ fontSize: 11, color: colors.muted }}>To save your notes</Label>}
          </View>
        </Pressable>
        <IconButton icon="settings" label="Settings" onPress={() => openDestination('/settings')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  surface: { flex: 1 },
  header: { minHeight: 62, paddingLeft: 20, paddingRight: 8, flexDirection: 'row', alignItems: 'center' },
  newNote: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 14,
    borderRadius: 12, minHeight: 48, paddingHorizontal: 12 },
  scope: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 22 },
  recents: { marginTop: 26, marginBottom: 8, paddingHorizontal: 24, fontSize: 12 },
  message: { paddingHorizontal: 10, paddingVertical: 9, fontSize: 13 },
  list: { paddingHorizontal: 12, paddingBottom: 12 },
  note: { minHeight: 48, borderRadius: 10, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
  noteOpen: { flex: 1, minHeight: 48, paddingLeft: 10, flexDirection: 'row', alignItems: 'center', gap: 9 },
  noteTitle: { flex: 1, fontSize: 14 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  footer: { minHeight: 65, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row',
    alignItems: 'center', paddingHorizontal: 8 },
  account: { flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 4 },
  accountText: { flex: 1 },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
