import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';
import { editMarkdown } from '../apps/mobile/src/lib/markdownEditing.ts';

const require = createRequire(import.meta.url);
const requireFromRenderer = createRequire(require.resolve(
  '../apps/mobile/node_modules/react-native-markdown-display/package.json',
));
const markdown = requireFromRenderer('markdown-it')();

test('bullet wraps the current line and keeps the caret at the same word', () => {
  const result = editMarkdown('Intro\nOne item\nAfter', { start: 9, end: 9 }, 'bullet');
  assert.deepEqual(result, {
    body: 'Intro\n- One item\nAfter',
    selection: { start: 11, end: 11 },
  });
  assert.ok(markdown.parse(result.body, {}).some((token) => token.type === 'bullet_list_open'));
});

test('bullet formats just the selected lines and toggles them off', () => {
  const original = 'First\nSecond\nThird';
  const result = editMarkdown(original, { start: 0, end: 13 }, 'bullet');
  assert.equal(result.body, '- First\n- Second\nThird');
  assert.equal(editMarkdown(result.body, result.selection, 'bullet').body, original);
});

test('bullet inserts an editable marker on an empty line', () => {
  const result = editMarkdown('Paragraph\n', { start: 10, end: 10 }, 'bullet');
  assert.deepEqual(result, { body: 'Paragraph\n- ', selection: { start: 12, end: 12 } });
});

test('table keeps the selected paragraph and leaves the first header ready to edit', () => {
  const result = editMarkdown('One\nTwo\n\nThree', { start: 1, end: 5 }, 'table');
  assert.equal(result.body, 'One\nTwo\n\n| Column 1 | Column 2 |\n| --- | --- |\n|  |  |\n\nThree');
  assert.equal(result.body.slice(result.selection.start, result.selection.end), 'Column 1');
  assert.ok(markdown.parse(result.body, {}).some((token) => token.type === 'table_open'));
});

test('inserting a table inside a table leaves both tables valid', () => {
  const first = editMarkdown('', { start: 0, end: 0 }, 'table');
  const second = editMarkdown(first.body, first.selection, 'table');
  assert.equal(markdown.parse(second.body, {}).filter((token) => token.type === 'table_open').length, 2);
});

test('bold preserves spaces and can be toggled on the same selection', () => {
  const original = 'before emphasis after';
  const bold = editMarkdown(original, { start: 6, end: 16 }, 'bold');
  assert.equal(bold.body, 'before **emphasis** after');
  assert.equal(bold.body.slice(bold.selection.start, bold.selection.end), 'emphasis');
  assert.equal(editMarkdown(bold.body, bold.selection, 'bold').body, original);
});

test('italic toggles independently of bold and formats the selected word', () => {
  const original = '**emphasis**';
  const emphasis = editMarkdown(original, { start: 2, end: 10 }, 'italic');
  assert.equal(emphasis.body, '***emphasis***');
  assert.equal(editMarkdown(emphasis.body, emphasis.selection, 'italic').body, original);
  assert.equal(editMarkdown(original, { start: 0, end: original.length }, 'bold').body, 'emphasis');
});

test('inline code retains literal backticks and multiline code is fenced', () => {
  const tick = String.fromCharCode(96);
  const inline = 'a' + tick + 'b';
  const inlineResult = editMarkdown(inline, { start: 0, end: inline.length }, 'code');
  assert.equal(markdown.parseInline(inlineResult.body, {})[0].children[0].content, inline);
  const multiline = 'one\ntwo';
  const block = editMarkdown(multiline, { start: 0, end: multiline.length }, 'code');
  assert.equal(markdown.parse(block.body, {})[0].type, 'fence');
  assert.equal(block.body.slice(block.selection.start, block.selection.end), multiline);
});

test('links with selected text highlight the URL and escape bracket characters', () => {
  const text = 'See [notes]';
  const result = editMarkdown(text, { start: 0, end: text.length }, 'link');
  assert.equal(result.body, '[See \\[notes\\]](https://)');
  assert.equal(result.body.slice(result.selection.start, result.selection.end), 'https://');
});
