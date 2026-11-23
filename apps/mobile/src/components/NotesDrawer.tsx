import { useEffect, useState } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useReducedMotion } from '../lib/motion';
import { useAppTheme } from '../lib/theme';
import { NoteLibrary } from './NoteLibrary';

export function NotesDrawer({ open, activeId, onClose, onDeleteActive, onPick }: {
  open: boolean; activeId: string; onClose: () => void; onDeleteActive: () => void; onPick: (id: string, accountId: string) => void;
}) {
  const { width } = useWindowDimensions();
  const { colors } = useAppTheme();
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(false);
  const [progress] = useState(() => new Animated.Value(0));
  const panelWidth = Math.min(Math.round(width * .82), 336);

  useEffect(() => {
    if (!shown) return;
    const animation = Animated.timing(progress, {
      toValue: open ? 1 : 0,
      easing: open ? Easing.out(Easing.cubic) : Easing.inOut(Easing.quad),
      duration: reduced ? 0 : open ? 230 : 165,
      useNativeDriver: true,
      isInteraction: false,
    });
    animation.start(({ finished }) => {
      if (finished && !open) setShown(false);
    });
    return () => animation.stop();
  }, [open, progress, reduced, shown]);

  if (!open && !shown) return null;

  return (
    <Modal transparent animationType="none" statusBarTranslucent navigationBarTranslucent
      onShow={() => setShown(true)} onRequestClose={onClose}>
      <View style={styles.root} pointerEvents={open ? 'auto' : 'none'}>
        <Animated.View pointerEvents="none" style={[styles.scrim, { opacity: progress }]} />
        <Pressable accessibilityRole="button" accessibilityLabel="Dismiss notes drawer"
          onPress={onClose} style={StyleSheet.absoluteFill} />
        <Animated.View style={[styles.panel, { width: panelWidth, backgroundColor: colors.sidebar,
          opacity: shown ? 1 : 0,
          transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [-panelWidth, 0] }) }] }]}>
          <SafeAreaView accessibilityViewIsModal edges={['top', 'bottom', 'left']} style={styles.safeArea}>
            <NoteLibrary activeId={activeId} onClose={onClose} onDeleteActive={onDeleteActive} onPick={onPick} />
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row' },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: '#14141354' },
  panel: { flex: 0, overflow: 'hidden', borderTopRightRadius: 22, borderBottomRightRadius: 22, elevation: 12 },
  safeArea: { flex: 1 },
});
