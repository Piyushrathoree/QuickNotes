import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useReducedMotion } from '../lib/motion';
import { useAppTheme } from '../lib/theme';
import { Label } from './chrome';

export type DialogButton = {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void | Promise<void>;
};

type Request = { title: string; message?: string; buttons: DialogButton[] };

let present: ((request: Request) => void) | null = null;
const waiting: Request[] = [];

/**
 * The app's own confirm dialog, called like Alert.alert(title, message, buttons). With no buttons it shows one "OK".
 * <DialogHost /> in the root layout renders it; requests made before it mounts wait their turn.
 */
export function appAlert(title: string, message?: string, buttons?: DialogButton[]) {
  const request = { title, message, buttons: buttons?.length ? buttons : [{ text: 'OK' }] };
  if (present) present(request);
  else waiting.push(request);
}

export function DialogHost() {
  const { colors, scheme, fontsReady } = useAppTheme();
  const reduced = useReducedMotion();
  const [request, setRequest] = useState<Request | null>(null);
  const queue = useRef<Request[]>([]);
  const [shown] = useState(() => new Animated.Value(0));
  const closing = useRef(false);

  useEffect(() => {
    present = (next) => {
      queue.current.push(next);
      setRequest((current) => current ?? queue.current.shift() ?? null);
    };
    for (const next of waiting.splice(0)) present(next);
    return () => { present = null; };
  }, []);

  useEffect(() => {
    if (!request) return;
    closing.current = false;
    shown.setValue(0);
    Animated.timing(shown, {
      toValue: 1,
      duration: reduced ? 0 : 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [request, reduced, shown]);

  function close(button?: DialogButton) {
    if (!request || closing.current) return;
    closing.current = true;
    Animated.timing(shown, {
      toValue: 0,
      duration: reduced ? 0 : 150,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setRequest(queue.current.shift() ?? null);
      // The action runs after the dialog has gone, so a follow-up dialog can open cleanly.
      if (button?.onPress) void Promise.resolve(button.onPress()).catch(() => {});
    });
  }

  if (!request) return null;

  const cancel = request.buttons.find((button) => button.style === 'cancel');
  const stacked = request.buttons.length > 2;
  // The safe choice comes first on the left (or at the bottom when stacked); the action sits on the right.
  const ordered = stacked
    ? [...request.buttons.filter((b) => b.style !== 'cancel'), ...request.buttons.filter((b) => b.style === 'cancel')]
    : [...request.buttons.filter((b) => b.style === 'cancel'), ...request.buttons.filter((b) => b.style !== 'cancel')];

  return (
    <Modal transparent visible animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={() => close(cancel)}>
      <Animated.View style={[styles.backdrop, { backgroundColor: scheme === 'dark' ? '#00000080' : '#14141352', opacity: shown }]}>
        <Pressable style={StyleSheet.absoluteFill} accessibilityLabel="Close dialog" onPress={() => cancel && close(cancel)} />
        <Animated.View
          accessibilityViewIsModal
          accessibilityRole="alert"
          style={[styles.card, {
            backgroundColor: colors.pad,
            borderColor: colors.line,
            opacity: shown,
            transform: [{ scale: shown.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
              { translateY: shown.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
            boxShadow: scheme === 'dark' ? '0px 18px 40px #00000080' : '0px 18px 40px #14141333',
          }]}
        >
          <Label accessibilityRole="header" style={[styles.title, { fontFamily: fontsReady ? 'IBMPlexSerif' : 'serif' }]}>
            {request.title}
          </Label>
          {!!request.message && <Label style={[styles.message, { color: colors.secondary }]}>{request.message}</Label>}
          <View style={[styles.actions, stacked && styles.stacked]}>
            {ordered.map((button) => {
              const danger = button.style === 'destructive';
              const quiet = button.style === 'cancel' || (stacked && !danger && button !== ordered[0]);
              const fill = danger ? colors.danger : colors.primary;
              return (
                <Pressable
                  key={button.text}
                  accessibilityRole="button"
                  onPress={() => close(button)}
                  style={({ pressed }) => [styles.button, !stacked && styles.grow, quiet
                    ? { borderColor: colors.line, backgroundColor: pressed ? colors.subtle : 'transparent' }
                    : { borderColor: fill, backgroundColor: fill, opacity: pressed ? 0.85 : 1 }]}
                >
                  <Label strong numberOfLines={1} style={{ color: quiet ? colors.ink : danger ? '#ffffff' : colors.onPrimary, fontSize: 15 }}>
                    {button.text}
                  </Label>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 360, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, padding: 22, gap: 10 },
  title: { fontSize: 22, lineHeight: 28, letterSpacing: -0.3 },
  message: { fontSize: 14.5, lineHeight: 22 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  stacked: { flexDirection: 'column' },
  button: { minHeight: 46, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  grow: { flex: 1 },
});
