import { memo, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Markdown, { MarkdownIt, renderRules, type RenderRules } from 'react-native-markdown-display';
import { useAppTheme } from '../lib/theme';
import { Icon, Label } from './chrome';

type TaskToken = {
  type: string;
  content: string;
  children: TaskToken[] | null;
  attrSet(name: string, value: string): void;
};

const parser = MarkdownIt({ html: false, typographer: true }).enable(['table']);
parser.core.ruler.after('inline', 'quicknotes_tasks', ({ tokens }: { tokens: TaskToken[] }) => {
  for (const [index, item] of tokens.entries()) {
    if (item.type !== 'list_item_open' || tokens[index + 1]?.type !== 'paragraph_open') continue;
    const inline = tokens[index + 2];
    const text = inline?.children?.[0];
    if (inline?.type !== 'inline' || text?.type !== 'text') continue;
    const marker = /^\[([ xX])\](?:[ \t]+|$)/.exec(inline.content);
    if (!marker) continue;
    item.attrSet('data-checked', marker[1] === ' ' ? 'false' : 'true');
    text.content = text.content.slice(marker[0].length);
  }
});

const codeRule: NonNullable<RenderRules['fence']> = (node, _children, _parent, styles) => (
  <ScrollView key={node.key} horizontal nestedScrollEnabled style={styles._VIEW_SAFE_fence}>
    <Text selectable style={styles.code_block}>{node.content.replace(/\n$/, '')}</Text>
  </ScrollView>
);

export const NotePreview = memo(function NotePreview({ body }: { body: string }) {
  const { colors, fontsReady } = useAppTheme();
  const { width } = useWindowDimensions();
  const pageWidth = Math.min(width, 740) - 48;
  const styles = useMemo(() => {
    const heading = {
      color: colors.ink, fontFamily: fontsReady ? 'GeistSemibold' : undefined,
      fontWeight: fontsReady ? 'normal' as const : '600' as const, marginTop: 18, marginBottom: 5,
    };
    const cell = { flex: 1, minWidth: 112, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, lineHeight: 21 };
    return {
      body: { color: colors.secondary, fontFamily: fontsReady ? 'Geist' : undefined, fontSize: 16, lineHeight: 26 },
      paragraph: { marginTop: 0, marginBottom: 13 },
      heading1: { ...heading, fontSize: 27, lineHeight: 34 },
      heading2: { ...heading, fontSize: 23, lineHeight: 30 },
      heading3: { ...heading, fontSize: 20, lineHeight: 27 },
      heading4: { ...heading, fontSize: 18, lineHeight: 25 },
      heading5: { ...heading, fontSize: 16, lineHeight: 24 },
      heading6: { ...heading, fontSize: 15, lineHeight: 23 },
      strong: { color: colors.ink, fontFamily: fontsReady ? 'GeistSemibold' : undefined, fontWeight: fontsReady ? 'normal' as const : '700' as const },
      link: { color: colors.accent },
      blockquote: { borderLeftColor: colors.accent, borderLeftWidth: 1, borderRadius: 6, paddingTop: 9, paddingBottom: 0,
        paddingHorizontal: 14, marginVertical: 12, backgroundColor: colors.subtle },
      hr: { backgroundColor: colors.line, height: StyleSheet.hairlineWidth, marginVertical: 18 },
      code_inline: { color: colors.accent, backgroundColor: colors.subtle, fontSize: 14 },
      fence: { borderColor: colors.line, borderWidth: 1, borderRadius: 10, backgroundColor: colors.subtle,
        padding: 0, marginVertical: 10 },
      code_block: { color: colors.ink, backgroundColor: 'transparent', borderWidth: 0, fontSize: 14, lineHeight: 22,
        paddingHorizontal: 14, paddingVertical: 10 },
      bullet_list_icon: { color: colors.accent },
      ordered_list_icon: { color: colors.accent },
      list_item: { marginBottom: 3 },
      table: { borderColor: colors.line, borderRadius: 10, overflow: 'hidden' as const },
      thead: { backgroundColor: colors.subtle },
      tr: { borderColor: colors.line, borderBottomWidth: StyleSheet.hairlineWidth },
      th: { ...cell, color: colors.ink, fontFamily: fontsReady ? 'GeistSemibold' : undefined },
      td: cell,
    };
  }, [colors, fontsReady]);

  const rules = useMemo<RenderRules>(() => ({
    image: (node) => <Label key={node.key} style={{ color: colors.muted }}>[Image: {node.attributes.alt || 'remote media'}]</Label>,
    textgroup: (node, children, _parent, styles) => <Text key={node.key} selectable style={styles.textgroup}>{children}</Text>,
    fence: codeRule,
    code_block: codeRule,
    table: (node, children, _parent, styles) => {
      const columns = node.children[0]?.children[0]?.children.length ?? 1;
      const tableWidth = Math.max(pageWidth, columns * 112 + 2);
      return (
        <ScrollView key={node.key} horizontal nestedScrollEnabled style={layout.table} accessibilityLabel="Markdown table">
          <View style={[styles._VIEW_SAFE_table, { width: tableWidth }]}>{children}</View>
        </ScrollView>
      );
    },
    list_item: (node, children, parent, styles, inheritedStyles) => {
      const value = node.attributes['data-checked'];
      if (value === undefined) return renderRules.list_item?.(node, children, parent, styles, inheritedStyles);
      const checked = value === 'true';
      return (
        <View key={node.key} style={layout.task}>
          <View accessibilityRole="checkbox" accessibilityLabel={checked ? 'Completed task' : 'Incomplete task'}
            accessibilityState={{ checked, disabled: true }} accessible
            style={[layout.checkbox, { borderColor: colors.accent, backgroundColor: checked ? colors.accent : 'transparent' }]}>
            {checked && <Icon name="check" size={12} color={colors.pad} />}
          </View>
          <View style={layout.taskContent}>{children}</View>
        </View>
      );
    },
  }), [colors, pageWidth]);

  if (!body.trim()) return <Label style={[layout.empty, { color: colors.muted }]}>No body text to preview yet.</Label>;

  return <Markdown markdownit={parser} rules={rules} style={styles} onLinkPress={(url) => /^(https?:|mailto:)/i.test(url)}>
    {body}
  </Markdown>;
});

const layout = StyleSheet.create({
  empty: { fontSize: 15, lineHeight: 24 },
  table: { marginVertical: 12 },
  task: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, marginBottom: 3 },
  checkbox: { width: 16, height: 16, marginTop: 5, borderWidth: 1, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  taskContent: { flex: 1, minWidth: 0 },
});
