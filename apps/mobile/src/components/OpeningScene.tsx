import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { useReducedMotion } from '../lib/motion';
import { useAppTheme } from '../lib/theme';
import { BrandMark, Label } from './chrome';

/**
 * The first thing after the splash. It starts exactly where the splash ends (the mark, centred, on the pad colour),
 * then the mark settles up, the name is written in beneath it and a ruled line draws across. onDone fires once the
 * moment has played, so the note opens after it rather than cutting it short.
 */
export function OpeningScene({ onDone }: { onDone?: () => void }) {
  const { colors, fontsReady } = useAppTheme();
  const reduced = useReducedMotion();
  const [mark] = useState(() => new Animated.Value(0));
  const [name] = useState(() => new Animated.Value(0));
  const [rule] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (reduced) { onDone?.(); return; }
    const ease = Easing.bezier(0.16, 1, 0.3, 1);
    const sequence = Animated.sequence([
      Animated.delay(90),
      Animated.parallel([
        Animated.timing(mark, { toValue: 1, duration: 620, easing: ease, useNativeDriver: true }),
        Animated.sequence([
          Animated.delay(140),
          Animated.timing(name, { toValue: 1, duration: 520, easing: ease, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.delay(300),
          Animated.timing(rule, { toValue: 1, duration: 480, easing: ease, useNativeDriver: true }),
        ]),
      ]),
      Animated.delay(120),
    ]);
    sequence.start(({ finished }) => { if (finished) onDone?.(); });
    return () => sequence.stop();
  }, [mark, name, rule, reduced, onDone]);

  return (
    <View style={[styles.scene, { backgroundColor: colors.pad }]}>
      <View accessible accessibilityLabel="Quick Notes. Opening your notes" style={styles.lockup}>
        <Animated.View style={!reduced && {
          transform: [
            { translateY: mark.interpolate({ inputRange: [0, 1], outputRange: [34, 0] }) },
            { scale: mark.interpolate({ inputRange: [0, 1], outputRange: [1.12, 1] }) },
          ],
        }}>
          <BrandMark size={84} />
        </Animated.View>
        <Animated.View style={[styles.nameWrap, !reduced && {
          opacity: name,
          transform: [{ translateY: name.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
        }]}>
          <Label style={[styles.name, { fontFamily: fontsReady ? 'PatrickHand' : undefined }]}>Quick Notes</Label>
        </Animated.View>
        <Animated.View style={[styles.rule, { backgroundColor: colors.accent }, !reduced && {
          opacity: rule.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 1] }),
          transform: [{ scaleX: rule }],
        }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scene: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 36 },
  lockup: { alignItems: 'center' },
  nameWrap: { marginTop: 18 },
  name: { fontSize: 40, lineHeight: 50 },
  rule: { width: 132, height: 2, borderRadius: 1, marginTop: 4, opacity: 0.55 },
});
