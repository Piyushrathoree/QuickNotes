import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { useReducedMotion } from '../lib/motion';
import { useAppTheme } from '../lib/theme';
import { BrandMark, Label } from './chrome';

export function OpeningScene() {
  const { colors, fontsReady } = useAppTheme();
  const reduced = useReducedMotion();
  const [entrance] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (reduced) return;
    const animation = Animated.timing(entrance, {
      toValue: 1,
      easing: Easing.out(Easing.cubic),
      duration: 340,
      useNativeDriver: true,
      isInteraction: false,
    });
    animation.start();
    return () => animation.stop();
  }, [entrance, reduced]);

  return (
    <View style={[styles.scene, { backgroundColor: colors.pad }]}>
      <Animated.View
        accessible
        accessibilityLabel="Quick Notes. Opening notes"
        style={[styles.lockup, !reduced && {
          opacity: entrance.interpolate({ inputRange: [0, 1], outputRange: [.78, 1] }),
          transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }],
        }]}
      >
        <BrandMark size={68} />
        <Label style={[styles.name, { fontFamily: fontsReady ? 'PatrickHand' : undefined }]}>Quick Notes</Label>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  scene: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 36 },
  lockup: { alignItems: 'center', gap: 14 },
  name: { fontSize: 42, lineHeight: 52 },
});
