import { memo, useMemo } from 'react';
import { Animated, StyleSheet } from 'react-native';
import Svg, { Defs, Pattern, Rect } from 'react-native-svg';
import { useAppTheme } from '../lib/theme';

export const NoteRules = memo(function NoteRules({
  scroll, rowHeight, bodyTop,
}: {
  scroll: Animated.Value;
  rowHeight: number;
  bodyTop: number;
}) {
  const { colors } = useAppTheme();
  // One viewport of rules follows the scroll modulo the line height.
  const translateY = useMemo(() =>
    Animated.subtract(Animated.modulo(Animated.multiply(scroll, -1), rowHeight), rowHeight),
  [rowHeight, scroll]);
  const ruleY = (bodyTop + rowHeight - 2) % rowHeight;

  return (
    <Animated.View pointerEvents="none" accessible={false}
      style={[styles.rules, { bottom: -rowHeight, transform: [{ translateY }] }]}>
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id="note-ruling" width={1} height={rowHeight} patternUnits="userSpaceOnUse">
            <Rect y={ruleY} width={1} height={StyleSheet.hairlineWidth} fill={colors.line} />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#note-ruling)" />
      </Svg>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  rules: {
    position: 'absolute', top: 0, left: 0, right: 0, alignSelf: 'center',
    marginHorizontal: 24, maxWidth: 692,
  },
});
